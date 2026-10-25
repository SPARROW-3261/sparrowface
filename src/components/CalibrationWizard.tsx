/**
 * 5-Point Head Motion Range Calibration Wizard
 * Calibrates comfortable head pitch and yaw bounds to prevent neck strain
 */

import React, { useState, useEffect } from 'react';
import { sounds } from '../services/soundEffects';
import confetti from 'canvas-confetti';
import { Target, CheckCircle, X, Sparkles, Eye, Move } from 'lucide-react';
import { FaceTrackingState, CalibrationData, TrackingConfig } from '../types';
import { BlinkLearningWizard } from './BlinkLearningWizard';

interface CalibrationWizardProps {
  trackingState: FaceTrackingState;
  onSaveCalibration: (data: Partial<CalibrationData>) => void;
  onClose: () => void;
  config?: TrackingConfig;
  onUpdateConfig?: (newConfig: Partial<TrackingConfig>) => void;
  initialTab?: 'head' | 'blink';
}

const STEPS = [
  { id: 'center', label: 'Neutral Center', x: 50, y: 50, desc: 'Look comfortably straight ahead at this target' },
  { id: 'top_left', label: 'Top-Left Corner', x: 15, y: 20, desc: 'Tilt head slightly up and left' },
  { id: 'top_right', label: 'Top-Right Corner', x: 85, y: 20, desc: 'Tilt head slightly up and right' },
  { id: 'bottom_left', label: 'Bottom-Left Corner', x: 15, y: 80, desc: 'Tilt head slightly down and left' },
  { id: 'bottom_right', label: 'Bottom-Right Corner', x: 85, y: 80, desc: 'Tilt head slightly down and right' },
];

export const CalibrationWizard: React.FC<CalibrationWizardProps> = ({
  trackingState,
  onSaveCalibration,
  onClose,
  config,
  onUpdateConfig,
  initialTab = 'head',
}) => {
  const [activeTab, setActiveTab] = useState<'head' | 'blink'>(initialTab);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [recordedPoints, setRecordedPoints] = useState<Record<string, { x: number; y: number }>>({});
  const [isFinished, setIsFinished] = useState<boolean>(false);

  const step = STEPS[currentStepIdx];

  useEffect(() => {
    if (isFinished) return;

    // Automatic progress timer while holding position
    const interval = window.setInterval(() => {
      setHoldProgress((prev) => {
        if (prev >= 100) {
          // Record current position
          const nextRecorded = {
            ...recordedPoints,
            [step.id]: { x: trackingState.rawNoseX, y: trackingState.rawNoseY },
          };
          setRecordedPoints(nextRecorded);
          sounds.playTargetHit();

          if (currentStepIdx < STEPS.length - 1) {
            setCurrentStepIdx(currentStepIdx + 1);
            return 0;
          } else {
            // Completed all steps!
            setIsFinished(true);
            confetti({ particleCount: 70, spread: 60 });

            // Calculate range
            const center = nextRecorded.center || { x: 0.5, y: 0.5 };
            const minX = Math.min(nextRecorded.top_left.x, nextRecorded.bottom_left.x) - center.x;
            const maxX = Math.max(nextRecorded.top_right.x, nextRecorded.bottom_right.x) - center.x;
            const minY = Math.min(nextRecorded.top_left.y, nextRecorded.top_right.y) - center.y;
            const maxY = Math.max(nextRecorded.bottom_left.y, nextRecorded.bottom_right.y) - center.y;

            onSaveCalibration({
              restingNoseX: center.x,
              restingNoseY: center.y,
              minRangeX: minX,
              maxRangeX: maxX,
              minRangeY: minY,
              maxRangeY: maxY,
              isCalibrated: true,
            });
            return 100;
          }
        }
        return prev + 6; // ~1.5s per point
      });
    }, 90);

    return () => clearInterval(interval);
  }, [currentStepIdx, isFinished, step, trackingState.rawNoseX, trackingState.rawNoseY]);

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex flex-col justify-between p-6 sm:p-8 select-none overflow-y-auto">
      {/* Top Header & Mode Switcher */}
      <div className="flex items-center justify-between max-w-4xl mx-auto w-full gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 p-1 rounded-xl shadow-inner">
          <button
            onClick={() => setActiveTab('head')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'head'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            <span>5-Point Head Range</span>
          </button>
          <button
            onClick={() => setActiveTab('blink')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'blink'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>3-Step Blink Learning</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          title="Close Calibration"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      {activeTab === 'blink' ? (
        <div className="flex-1 max-w-3xl mx-auto w-full flex items-center justify-center my-4">
          <BlinkLearningWizard
            trackingState={trackingState}
            currentBlinkDurationMs={config?.blinkHoldDurationMs || 400}
            blinkThreshold={config?.blinkThreshold || 0.19}
            onSaveBlinkDuration={(newDuration) => {
              if (onUpdateConfig) {
                onUpdateConfig({ blinkHoldDurationMs: newDuration });
              }
            }}
            onClose={onClose}
            isEmbedded={true}
          />
        </div>
      ) : (
        <>
          {/* Main 5-Point Target Field */}
          <div className="relative flex-1 max-w-5xl mx-auto w-full my-6 flex items-center justify-center">
            {!isFinished ? (
              <div
                style={{
                  position: 'absolute',
                  left: `${step.x}%`,
                  top: `${step.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="flex flex-col items-center transition-all duration-300"
              >
                {/* Target Reticle with Circular Progress */}
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="42"
                      fill="rgba(15, 23, 42, 0.6)"
                      stroke="rgba(255, 255, 255, 0.2)"
                      strokeWidth="4"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="42"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="5"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={2 * Math.PI * 42 * (1 - holdProgress / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="w-6 h-6 rounded-full bg-cyan-400 text-neutral-950 flex items-center justify-center font-bold text-xs shadow-lg animate-pulse">
                    {currentStepIdx + 1}
                  </div>
                </div>

                <div className="mt-3 text-center">
                  <div className="text-sm font-semibold text-white">{step.label}</div>
                  <div className="text-xs text-neutral-400">{step.desc}</div>
                  <div className="text-[11px] font-mono text-cyan-400 mt-1">Holding... {holdProgress}%</div>
                </div>
              </div>
            ) : (
              <div className="max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center shadow-2xl">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Head Range Calibration Complete</h3>
                <p className="text-xs text-neutral-400 mb-5 leading-relaxed">
                  Your individual ergonomic head range has been mapped. Motion sensitivity will now scale smoothly across all four screen quadrants.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setActiveTab('blink')}
                    className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Next: 3-Step Blink Learning Wizard</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Apply & Return to Desktop
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-2 max-w-md mx-auto w-full">
            {STEPS.map((s, idx) => (
              <div
                key={s.id}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  idx < currentStepIdx || isFinished
                    ? 'bg-cyan-400'
                    : idx === currentStepIdx
                    ? 'bg-cyan-500/50'
                    : 'bg-neutral-800'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
