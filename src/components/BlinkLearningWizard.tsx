/**
 * Interactive 3-Step 'Blink Learning' Mini-Wizard
 * Detects the user's natural involuntary blink speed, measures deliberate click holds,
 * and calculates the mathematically ideal blink duration threshold to prevent accidental clicks.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Eye,
  CheckCircle2,
  Sparkles,
  Timer,
  ShieldCheck,
  Zap,
  ArrowRight,
  RotateCcw,
  Check,
  Target,
  Sliders,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../services/soundEffects';
import { FaceTrackingState } from '../types';

interface BlinkLearningWizardProps {
  trackingState?: FaceTrackingState;
  currentBlinkDurationMs?: number;
  blinkThreshold?: number;
  onSaveBlinkDuration: (durationMs: number) => void;
  onClose: () => void;
  isEmbedded?: boolean;
}

export const BlinkLearningWizard: React.FC<BlinkLearningWizardProps> = ({
  trackingState,
  currentBlinkDurationMs = 400,
  blinkThreshold = 0.19,
  onSaveBlinkDuration,
  onClose,
  isEmbedded = false,
}) => {
  // Wizard steps: 1 = Natural Blinks, 2 = Intentional Holds, 3 = Result & Validation Sandbox
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Natural involuntary blink samples
  const [naturalBlinks, setNaturalBlinks] = useState<number[]>([]);
  // Step 2: Deliberate click blink samples
  const [deliberateBlinks, setDeliberateBlinks] = useState<number[]>([]);

  // Real-time closure tracking state
  const [isEyesCurrentlyClosed, setIsEyesCurrentlyClosed] = useState<boolean>(false);
  const [liveClosureDurationMs, setLiveClosureDurationMs] = useState<number>(0);
  const eyeCloseStartTimeRef = useRef<number | null>(null);
  const liveTimerRef = useRef<number | null>(null);

  // Step 3: Calculated threshold & fine tuning
  const [recommendedDuration, setRecommendedDuration] = useState<number>(currentBlinkDurationMs);
  const [selectedDuration, setSelectedDuration] = useState<number>(currentBlinkDurationMs);
  const [sandboxClickSuccess, setSandboxClickSuccess] = useState<boolean>(false);
  const [sandboxHoldProgress, setSandboxHoldProgress] = useState<number>(0);

  // Live eye open ratio for rendering eye graphic
  const leftEAR = trackingState?.leftEyeOpenRatio ?? 0.3;
  const rightEAR = trackingState?.rightEyeOpenRatio ?? 0.3;
  const avgEAR = (leftEAR + rightEAR) / 2;
  const isBlinkingNow =
    avgEAR < blinkThreshold ||
    Boolean(trackingState?.isBlinkingLeft && trackingState?.isBlinkingRight) ||
    Boolean(trackingState?.isBothEyesClosed);

  // Track live eye closure duration
  useEffect(() => {
    if (isBlinkingNow) {
      if (eyeCloseStartTimeRef.current === null) {
        eyeCloseStartTimeRef.current = performance.now();
        setIsEyesCurrentlyClosed(true);

        liveTimerRef.current = window.setInterval(() => {
          if (eyeCloseStartTimeRef.current !== null) {
            setLiveClosureDurationMs(Math.round(performance.now() - eyeCloseStartTimeRef.current));
          }
        }, 30);
      }
    } else {
      if (eyeCloseStartTimeRef.current !== null) {
        const duration = Math.round(performance.now() - eyeCloseStartTimeRef.current);
        eyeCloseStartTimeRef.current = null;
        setIsEyesCurrentlyClosed(false);
        if (liveTimerRef.current) {
          clearInterval(liveTimerRef.current);
          liveTimerRef.current = null;
        }
        setLiveClosureDurationMs(0);

        // Process recorded blink based on active step
        handleBlinkCompleted(duration);
      }
    }

    return () => {
      if (liveTimerRef.current) {
        clearInterval(liveTimerRef.current);
      }
    };
  }, [isBlinkingNow, step]);

  // Handle completed blink measurement
  const handleBlinkCompleted = (durationMs: number) => {
    // Ignore glitches under 50ms
    if (durationMs < 50) return;

    if (step === 1) {
      // Step 1: Involuntary blinks are typically 80ms - 280ms
      if (naturalBlinks.length < 3) {
        sounds.playClick('dwell');
        setNaturalBlinks((prev) => {
          const next = [...prev, durationMs];
          if (next.length === 3) {
            sounds.playTargetHit();
            setTimeout(() => setStep(2), 700);
          }
          return next;
        });
      }
    } else if (step === 2) {
      // Step 2: Deliberate click blinks are typically >= 250ms
      if (deliberateBlinks.length < 3) {
        if (durationMs >= 220) {
          sounds.playClick('left');
          setDeliberateBlinks((prev) => {
            const next = [...prev, durationMs];
            if (next.length === 3) {
              sounds.playPresetSwitch();
              calculateOptimalDuration(naturalBlinks, next);
              setTimeout(() => setStep(3), 800);
            }
            return next;
          });
        }
      }
    }
  };

  // Compute optimal duration when moving to Step 3
  const calculateOptimalDuration = (naturals: number[], deliberates: number[]) => {
    const avgNat = naturals.length > 0 ? Math.round(naturals.reduce((a, b) => a + b, 0) / naturals.length) : 170;
    const maxNat = naturals.length > 0 ? Math.max(...naturals) : 220;
    const avgDelib = deliberates.length > 0 ? Math.round(deliberates.reduce((a, b) => a + b, 0) / deliberates.length) : 450;
    const minDelib = deliberates.length > 0 ? Math.min(...deliberates) : 380;

    // Ideal threshold: Safe buffer of at least 110ms above the longest natural blink,
    // but ~50-80ms lower than their deliberate hold for effortless clicking without fatigue.
    let computed = Math.round(maxNat + 120);
    if (computed < 300) computed = 300;
    if (computed >= minDelib) {
      computed = Math.round((maxNat + minDelib) / 2);
    }
    // Clamp to standard friendly bounds (225ms - 850ms)
    computed = Math.max(250, Math.min(850, Math.round(computed / 25) * 25));

    setRecommendedDuration(computed);
    setSelectedDuration(computed);
  };

  // Step 3: Sandbox validation testing loop
  useEffect(() => {
    if (step !== 3) return;

    if (isEyesCurrentlyClosed && liveClosureDurationMs > 0) {
      const progress = Math.min(1, liveClosureDurationMs / selectedDuration);
      setSandboxHoldProgress(progress);

      if (progress >= 1 && !sandboxClickSuccess) {
        sounds.playClick('left');
        sounds.playTargetHit();
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        setSandboxClickSuccess(true);
        setTimeout(() => setSandboxClickSuccess(false), 2400);
      }
    } else {
      setSandboxHoldProgress(0);
    }
  }, [step, isEyesCurrentlyClosed, liveClosureDurationMs, selectedDuration, sandboxClickSuccess]);

  // Manual fallback simulation handlers (helpful in dark rooms or when webcam is muted)
  const simulateNaturalBlink = () => {
    const simulated = 140 + Math.floor(Math.random() * 50);
    handleBlinkCompleted(simulated);
  };

  const simulateDeliberateHold = () => {
    const simulated = 380 + Math.floor(Math.random() * 80);
    handleBlinkCompleted(simulated);
  };

  // Reset entire learning flow
  const handleReset = () => {
    setNaturalBlinks([]);
    setDeliberateBlinks([]);
    setStep(1);
    setLiveClosureDurationMs(0);
    setIsEyesCurrentlyClosed(false);
  };

  // Save recommended duration
  const handleApply = () => {
    sounds.playTargetHit();
    onSaveBlinkDuration(selectedDuration);
    onClose();
  };

  const avgNatural =
    naturalBlinks.length > 0
      ? Math.round(naturalBlinks.reduce((a, b) => a + b, 0) / naturalBlinks.length)
      : 165;
  const avgDeliberate =
    deliberateBlinks.length > 0
      ? Math.round(deliberateBlinks.reduce((a, b) => a + b, 0) / deliberateBlinks.length)
      : 420;

  return (
    <div
      className={`relative w-full ${
        isEmbedded
          ? 'bg-neutral-900 border border-cyan-500/30 rounded-2xl p-6 shadow-xl'
          : 'fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4'
      }`}
    >
      <div
        className={`${
          isEmbedded
            ? 'w-full max-w-2xl mx-auto'
            : 'relative w-full max-w-2xl bg-neutral-900 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-sm">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  3-Step Blink Duration Learning Wizard
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Step {step} of 3
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Measures your natural eye blink speed to guarantee accurate clicks without false triggers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Restart Blink Learning"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3-Step Progress Indicators */}
        <div className="grid grid-cols-3 gap-2 my-5">
          {[
            { num: 1, title: 'Natural Blinks', desc: 'Sample 3 resting blinks' },
            { num: 2, title: 'Deliberate Clicks', desc: 'Sample 3 intent holds' },
            { num: 3, title: 'Ideal Duration', desc: 'Validate & Apply' },
          ].map((s) => (
            <div
              key={s.num}
              onClick={() => {
                if (s.num === 1) setStep(1);
                if (s.num === 2 && naturalBlinks.length >= 2) setStep(2);
                if (s.num === 3 && deliberateBlinks.length >= 2) setStep(3);
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                step === s.num
                  ? 'bg-cyan-950/70 border-cyan-500/60 shadow-md'
                  : step > s.num
                  ? 'bg-neutral-950/80 border-emerald-500/40 opacity-90'
                  : 'bg-neutral-950/40 border-neutral-800/80 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-neutral-400">Step 0{s.num}</span>
                {step > s.num ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : step === s.num ? (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                ) : null}
              </div>
              <div
                className={`text-xs font-semibold ${
                  step === s.num ? 'text-white' : step > s.num ? 'text-emerald-300' : 'text-neutral-400'
                }`}
              >
                {s.title}
              </div>
              <div className="text-[10px] text-neutral-500 truncate">{s.desc}</div>
            </div>
          ))}
        </div>

        {/* Real-Time Eye Diagnostic Banner */}
        <div className="mb-4 p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Animated Eye Representation */}
            <div className="relative w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="stroke-neutral-500"
                />
                {/* Eyelid closes dynamically */}
                <ellipse
                  cx="12"
                  cy="12"
                  rx="4"
                  ry={isEyesCurrentlyClosed ? 0.8 : Math.max(1, avgEAR * 12)}
                  className={isEyesCurrentlyClosed ? 'fill-amber-400 stroke-amber-400' : 'fill-cyan-400 stroke-cyan-400'}
                />
              </svg>
            </div>
            <div>
              <div className="text-xs font-semibold text-neutral-200 flex items-center gap-2">
                <span>Live Eye Tracking</span>
                <span
                  className={`text-[10px] px-2 py-0.2 rounded-full font-mono ${
                    isEyesCurrentlyClosed
                      ? 'bg-amber-950 text-amber-300 border border-amber-600 font-bold animate-pulse'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}
                >
                  {isEyesCurrentlyClosed ? `Closed: ${liveClosureDurationMs}ms` : 'Open'}
                </span>
              </div>
              <div className="text-[11px] text-neutral-400 font-mono">
                Left EAR: {leftEAR.toFixed(2)} · Right EAR: {rightEAR.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Quick simulation helper for instant testing without webcam */}
          <button
            onClick={step === 1 ? simulateNaturalBlink : step === 2 ? simulateDeliberateHold : undefined}
            disabled={step === 3}
            className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 text-[10px] transition-colors"
          >
            {step === 1 ? '+ Simulate Natural Blink' : step === 2 ? '+ Simulate Hold' : 'Testing Active'}
          </button>
        </div>

        {/* STEP 1: Natural Involuntary Blinks */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-4">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4" />
                <span>Step 1: Measuring Involuntary Blink Speed</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Look comfortably at your screen and blink <strong>3 times naturally</strong> as you normally do while reading. The wizard will measure how quickly your eyelids open and close involuntarily.
              </p>
            </div>

            {/* 3 Sample Cards */}
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((idx) => {
                const sample = naturalBlinks[idx];
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      sample
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                        : naturalBlinks.length === idx
                        ? 'bg-neutral-950 border-cyan-500/60 shadow-[0_0_12px_rgba(56,189,248,0.2)] animate-pulse'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-500'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-mono mb-1">Blink #{idx + 1}</div>
                    <div className="text-lg font-bold font-mono">
                      {sample ? `${sample}ms` : naturalBlinks.length === idx ? 'Waiting...' : '--'}
                    </div>
                    <div className="text-[10px] mt-1 text-neutral-400">
                      {sample ? '✓ Normal Blink' : naturalBlinks.length === idx ? 'Blink naturally now' : 'Pending'}
                    </div>
                  </div>
                );
              })}
            </div>

            {naturalBlinks.length >= 3 && (
              <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-emerald-300 font-semibold">Average Natural Blink: ~{avgNatural}ms</span>
                  <p className="text-[11px] text-neutral-400">All 3 involuntary blinks recorded successfully.</p>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md"
                >
                  <span>Next: Intentional Clicks</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Deliberate Intentional Clicks */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Timer className="w-4 h-4" />
                <span>Step 2: Calibrating Deliberate Click Hold</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Now perform <strong>3 intentional click blinks</strong>. Close your eyes with a brief, comfortable hold (around half a second) as if you want to click something, then open them.
              </p>
            </div>

            {/* 3 Sample Cards */}
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((idx) => {
                const sample = deliberateBlinks[idx];
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      sample
                        ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300'
                        : deliberateBlinks.length === idx
                        ? 'bg-neutral-950 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.2)] animate-pulse'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-500'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-mono mb-1">Click #{idx + 1}</div>
                    <div className="text-lg font-bold font-mono">
                      {sample ? `${sample}ms` : deliberateBlinks.length === idx ? 'Hold & release...' : '--'}
                    </div>
                    <div className="text-[10px] mt-1 text-neutral-400">
                      {sample ? '✓ Click Registered' : deliberateBlinks.length === idx ? 'Close eye for click' : 'Pending'}
                    </div>
                  </div>
                );
              })}
            </div>

            {deliberateBlinks.length >= 3 && (
              <div className="p-3 bg-cyan-950/30 border border-cyan-500/40 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-cyan-300 font-semibold">Average Intentional Hold: ~{avgDeliberate}ms</span>
                  <p className="text-[11px] text-neutral-400">Comfortable deliberate duration mapped.</p>
                </div>
                <button
                  onClick={() => {
                    calculateOptimalDuration(naturalBlinks, deliberateBlinks);
                    setStep(3);
                  }}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md"
                >
                  <span>See Calculated Result</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Ideal Duration Result & Live Sandbox */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Calculation Overview Banner */}
            <div className="bg-gradient-to-r from-neutral-950 via-cyan-950/40 to-neutral-950 border border-cyan-500/40 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Recommended Ideal Click Duration
                  </span>
                </div>
                <div className="text-xs font-mono text-cyan-300">
                  Natural: ~{avgNatural}ms vs Intent: ~{avgDeliberate}ms
                </div>
              </div>

              <div className="flex items-baseline gap-3 my-2">
                <span className="text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                  {selectedDuration}ms
                </span>
                <span className="text-xs text-neutral-300">
                  {selectedDuration === recommendedDuration
                    ? '(Calculated Ideal Sweet Spot)'
                    : '(Custom Tuned)'}
                </span>
              </div>

              {/* Visual Timeline Bar */}
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-[10px] text-neutral-400">
                  <span className="text-emerald-400">0 - {avgNatural + 40}ms: Involuntary Ignored</span>
                  <span className="text-amber-400">Safety Buffer ({avgNatural + 40} - {selectedDuration}ms)</span>
                  <span className="text-cyan-400">≥ {selectedDuration}ms: Click Trigger</span>
                </div>
                <div className="h-3 w-full rounded-full bg-neutral-950 border border-neutral-800 flex overflow-hidden">
                  <div
                    className="h-full bg-emerald-500/80"
                    style={{ width: `${Math.min(40, ((avgNatural + 40) / 1000) * 100)}%` }}
                    title="Involuntary blinks filtered"
                  />
                  <div
                    className="h-full bg-amber-500/70"
                    style={{
                      width: `${Math.max(
                        10,
                        ((selectedDuration - (avgNatural + 40)) / 1000) * 100
                      )}%`,
                    }}
                    title="Safety gap"
                  />
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 flex-1"
                    title="Intentional Click Zone"
                  />
                </div>
              </div>
            </div>

            {/* Live Sandbox Interactive Button */}
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <div className="text-xs font-semibold text-neutral-200 mb-1 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-cyan-400" />
                <span>Live Interactive Sandbox: Test Your New Click Speed</span>
              </div>
              <p className="text-[11px] text-neutral-400 mb-3">
                Close your eyes and hold for <strong className="text-cyan-300">≥ {selectedDuration}ms</strong> to trigger a test click:
              </p>

              <button
                type="button"
                className={`relative px-6 py-3 rounded-xl border text-xs font-bold transition-all overflow-hidden shadow-lg ${
                  sandboxClickSuccess
                    ? 'bg-emerald-500 text-white border-emerald-400 scale-105 shadow-[0_0_20px_#10b981]'
                    : sandboxHoldProgress > 0
                    ? 'bg-amber-950 border-amber-500 text-amber-200'
                    : 'bg-neutral-900 border-cyan-500/60 text-white hover:border-cyan-400'
                }`}
              >
                {/* Real-time fill animation as eyes are held */}
                {sandboxHoldProgress > 0 && !sandboxClickSuccess && (
                  <div
                    className="absolute inset-0 bg-cyan-500/30 transition-all duration-75"
                    style={{ width: `${Math.min(100, sandboxHoldProgress * 100)}%` }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-2">
                  {sandboxClickSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>✓ Click Successful! ({selectedDuration}ms verified)</span>
                    </>
                  ) : sandboxHoldProgress > 0 ? (
                    <>
                      <Timer className="w-4 h-4 animate-spin" />
                      <span>Holding: {Math.round(sandboxHoldProgress * 100)}%</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 text-cyan-400" />
                      <span>Blink & Hold for {selectedDuration}ms</span>
                    </>
                  )}
                </div>
              </button>
            </div>

            {/* Fine-Tuning Slider */}
            <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-3.5 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Fine-Tune Click Hold Duration</span>
                </span>
                <span className="font-mono text-cyan-400 font-bold bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                  {selectedDuration}ms
                </span>
              </div>
              <input
                type="range"
                min="200"
                max="800"
                step="25"
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(parseInt(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer h-2 bg-neutral-800 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[10px] text-neutral-500">
                <span>Faster Click (200ms)</span>
                <button
                  type="button"
                  onClick={() => setSelectedDuration(recommendedDuration)}
                  className="text-cyan-400 hover:underline"
                >
                  Reset to Calculated Ideal ({recommendedDuration}ms)
                </button>
                <span>Relaxed Hold (800ms)</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-600/30 flex items-center gap-1.5 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Apply {selectedDuration}ms to Settings</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
