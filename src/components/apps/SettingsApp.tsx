/**
 * Sparrow Tracking Settings & Sensitivity Control Center
 * Provides full real-time adjustable sensitivity with two-way synchronized
 * sliders and numerical inputs, dynamic acceleration, jitter smoothing,
 * quick presets, and a live responsiveness test pad.
 */

import React, { useState, useEffect } from 'react';
import { TrackingConfig, CursorStyle, MouthAction, FaceTrackingState } from '../../types';
import { sounds } from '../../services/soundEffects';
import {
  Sliders,
  Eye,
  Sparkles,
  Volume2,
  Move,
  RotateCcw,
  Gauge,
  Zap,
  Target,
  Lock,
  Unlock,
  Check,
  Compass,
  Crosshair,
  Activity,
  Maximize,
  Mic,
  MicOff,
  Timer,
  ShieldCheck,
} from 'lucide-react';

interface SettingsAppProps {
  config: TrackingConfig;
  onUpdateConfig: (newConfig: Partial<TrackingConfig>) => void;
  onRecenter: () => void;
  onStartCalibration: (tab?: 'head' | 'blink') => void;
  trackingState?: FaceTrackingState;
  isVoiceListening?: boolean;
  onToggleVoice?: () => void;
}

type SettingsTab = 'sensitivity' | 'gestures' | 'cursor' | 'camera' | 'voice';

export const SettingsApp: React.FC<SettingsAppProps> = ({
  config,
  onUpdateConfig,
  onRecenter,
  onStartCalibration,
  trackingState,
  isVoiceListening = false,
  onToggleVoice,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('sensitivity');
  const [isAxesLinked, setIsAxesLinked] = useState<boolean>(
    Math.abs(config.sensitivityX - config.sensitivityY) < 0.05
  );

  // Test pad targets state
  const [hitTargets, setHitTargets] = useState<{ [key: string]: boolean }>({});
  const [hitCount, setHitCount] = useState<number>(0);

  // Compute master sensitivity value
  const masterSensitivity =
    typeof config.masterSensitivity === 'number'
      ? config.masterSensitivity
      : Number(((config.sensitivityX + config.sensitivityY) / 2).toFixed(1));

  // Handler for Master Sensitivity change (updates both X & Y when axes are linked)
  const handleMasterSensitivityChange = (val: number) => {
    const clamped = Math.max(0.2, Math.min(6.0, Number(val.toFixed(1))));
    if (isAxesLinked) {
      onUpdateConfig({
        masterSensitivity: clamped,
        sensitivityX: clamped,
        sensitivityY: clamped,
      });
    } else {
      // Scale proportionally
      const ratio = clamped / (masterSensitivity || 1);
      onUpdateConfig({
        masterSensitivity: clamped,
        sensitivityX: Math.max(0.2, Math.min(6.0, Number((config.sensitivityX * ratio).toFixed(1)))),
        sensitivityY: Math.max(0.2, Math.min(6.0, Number((config.sensitivityY * ratio).toFixed(1)))),
      });
    }
  };

  // Preset quick selectors
  const applyPreset = (preset: {
    name: string;
    sens: number;
    smoothing: number;
    deadzone: number;
    acceleration: number;
  }) => {
    sounds.playClick('left');
    onUpdateConfig({
      masterSensitivity: preset.sens,
      sensitivityX: preset.sens,
      sensitivityY: preset.sens,
      smoothing: preset.smoothing,
      deadzone: preset.deadzone,
      acceleration: preset.acceleration,
    });
  };

  // Interactive Target Hit Detection
  const handleTargetHover = (targetId: string) => {
    if (!hitTargets[targetId]) {
      sounds.playClick('left');
      setHitTargets((prev) => ({ ...prev, [targetId]: true }));
      setHitCount((c) => c + 1);

      // Reset target after 1.2s for continuous testing
      setTimeout(() => {
        setHitTargets((prev) => ({ ...prev, [targetId]: false }));
      }, 1200);
    }
  };

  // Smoothing label helper
  const getSmoothingLabel = (val: number) => {
    if (val >= 0.7) return 'Ultra Fast / Instant';
    if (val >= 0.45) return 'Snappy & Agile';
    if (val >= 0.25) return 'Balanced Natural';
    return 'Heavy Tremor Filter';
  };

  return (
    <div className="absolute inset-0 bg-neutral-950 text-neutral-100 select-none overflow-y-auto p-3.5 sm:p-5 flex flex-col">
      {/* Quick Calibration & Recenter Bar */}
      <div className="shrink-0 mb-4 bg-gradient-to-r from-cyan-950/40 via-neutral-900 to-neutral-900 border border-cyan-800/40 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-950/70 border border-cyan-700/50 flex items-center justify-center text-cyan-400 shrink-0">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white flex items-center gap-2">
              <span>Resting Head Calibration & Zeroing</span>
              {trackingState?.hasFace && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.2 rounded font-normal">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Face Locked
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Look comfortably at screen center and press <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded font-mono text-cyan-300 text-[10px]">Space</kbd> or click Recenter to lock neutral origin.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => {
              sounds.playRecenter();
              onRecenter();
            }}
            className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recenter Now</span>
          </button>
          <button
            onClick={() => onStartCalibration('head')}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-medium transition-all cursor-pointer"
            title="Calibrate 5-point screen extents"
          >
            5-Point Wizard
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar - Fixed Prominent Segmented Pill Container */}
      <div className="shrink-0 mb-4 bg-neutral-900/90 border border-neutral-800 rounded-xl p-1.5 shadow-lg">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {[
            { id: 'sensitivity', label: 'Sensitivity & Tuning', icon: Sliders },
            { id: 'gestures', label: 'Click Gestures & Blinks', icon: Eye },
            { id: 'cursor', label: 'Cursor Styling', icon: Move },
            { id: 'camera', label: 'Camera & Display', icon: Crosshair },
            { id: 'voice', label: 'Voice Commands', icon: isVoiceListening ? Mic : MicOff },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  sounds.playClick('left');
                  setActiveTab(tab.id as SettingsTab);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold shrink-0 whitespace-nowrap transition-all select-none cursor-pointer ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/60 ring-1 ring-cyan-400/50'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-800/80 bg-neutral-950/70 border border-neutral-800/80'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? 'text-white'
                      : tab.id === 'voice' && isVoiceListening
                      ? 'text-emerald-400 animate-pulse'
                      : 'text-cyan-400'
                  }`}
                />
                <span>{tab.label}</span>
                {tab.id === 'voice' && isVoiceListening && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Sensitivity & Responsiveness */}
      {activeTab === 'sensitivity' && (
        <div className="space-y-4">
          {/* Quick Presets Bar */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Quick Sensitivity Presets</span>
              </span>
              <span className="text-[11px] text-neutral-500">1-click tuning</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  id: 'ultra',
                  name: 'Ultra Fast (4.5x)',
                  desc: 'Micro head nod',
                  sens: 4.5,
                  smoothing: 0.65,
                  deadzone: 0.004,
                  acceleration: 1.4,
                },
                {
                  id: 'agile',
                  name: 'Agile & Fast (3.2x)',
                  desc: 'Quick navigation',
                  sens: 3.2,
                  smoothing: 0.5,
                  deadzone: 0.006,
                  acceleration: 1.3,
                },
                {
                  id: 'balanced',
                  name: 'Balanced (2.2x)',
                  desc: 'Standard desktop',
                  sens: 2.2,
                  smoothing: 0.35,
                  deadzone: 0.008,
                  acceleration: 1.25,
                },
                {
                  id: 'precision',
                  name: 'Precision (1.2x)',
                  desc: 'Fine pixel stability',
                  sens: 1.2,
                  smoothing: 0.2,
                  deadzone: 0.014,
                  acceleration: 1.1,
                },
              ].map((p) => {
                const isActive =
                  Math.abs(config.sensitivityX - p.sens) < 0.15 &&
                  Math.abs(config.sensitivityY - p.sens) < 0.15;
                return (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      isActive
                        ? 'bg-cyan-950/70 border-cyan-500 text-white shadow-sm ring-1 ring-cyan-500/40'
                        : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                    }`}
                  >
                    <div className="text-xs font-semibold flex items-center justify-between">
                      <span>{p.name}</span>
                      {isActive && <Check className="w-3 h-3 text-cyan-400" />}
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">{p.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Sensitivity Sliders & Numerical Inputs */}
            <div className="lg:col-span-7 space-y-4">
              {/* Master Sensitivity Card */}
              <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Gauge className="w-4 h-4 text-cyan-400" />
                      <span>Master Sensitivity Multiplier</span>
                    </h4>
                    <p className="text-[11px] text-neutral-400">
                      Overall cursor displacement per millimeter of facial movement
                    </p>
                  </div>

                  <button
                    onClick={() => setIsAxesLinked(!isAxesLinked)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                      isAxesLinked
                        ? 'bg-cyan-950/80 text-cyan-300 border-cyan-600/50'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                    }`}
                    title={isAxesLinked ? 'Axes Linked (Master controls both X & Y)' : 'Axes Unlinked'}
                  >
                    {isAxesLinked ? <Lock className="w-3 h-3 text-cyan-400" /> : <Unlock className="w-3 h-3" />}
                    <span>{isAxesLinked ? 'Linked X/Y' : 'Independent'}</span>
                  </button>
                </div>

                {/* Master Slider + Numerical Input */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="range"
                      min="0.2"
                      max="6.0"
                      step="0.1"
                      value={masterSensitivity}
                      onChange={(e) => handleMasterSensitivityChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
                      <span>0.2x (Subtle)</span>
                      <span>2.2x (Default)</span>
                      <span>4.0x (Fast)</span>
                      <span>6.0x (Ultra)</span>
                    </div>
                  </div>

                  {/* Numerical Input with Stepper */}
                  <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 shrink-0">
                    <input
                      type="number"
                      min="0.2"
                      max="6.0"
                      step="0.1"
                      value={masterSensitivity}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) handleMasterSensitivityChange(val);
                      }}
                      className="w-14 bg-transparent font-mono text-cyan-400 text-xs font-semibold focus:outline-none text-right"
                    />
                    <span className="text-[10px] font-mono text-neutral-500">x</span>
                  </div>
                </div>

                {/* Quick Multiplier Chips */}
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-neutral-800/80 overflow-x-auto">
                  <span className="text-[10px] text-neutral-500 mr-1">Quick:</span>
                  {[0.8, 1.5, 2.2, 3.2, 4.5, 5.5].map((val) => (
                    <button
                      key={val}
                      onClick={() => handleMasterSensitivityChange(val)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                        Math.abs(masterSensitivity - val) < 0.1
                          ? 'bg-cyan-500 text-white font-bold'
                          : 'bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-700'
                      }`}
                    >
                      {val.toFixed(1)}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Independent X & Y Axis Sensitivity */}
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-4">
                <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Move className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Axis-Specific Sensitivity</span>
                  </span>
                  <span className="text-[10px] font-normal text-neutral-400">
                    Tune horizontal vs vertical response
                  </span>
                </h4>

                {/* Horizontal Sensitivity (X) */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-neutral-300 font-medium">Horizontal Sensitivity (X-Axis)</span>
                    <span className="text-[11px] text-neutral-500">Left / Right head turn</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0.2"
                      max="6.0"
                      step="0.1"
                      value={config.sensitivityX}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        onUpdateConfig({ sensitivityX: val });
                      }}
                      className="flex-1 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 shrink-0">
                      <input
                        type="number"
                        min="0.2"
                        max="6.0"
                        step="0.1"
                        value={Number(config.sensitivityX.toFixed(1))}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) onUpdateConfig({ sensitivityX: Math.max(0.2, Math.min(6.0, val)) });
                        }}
                        className="w-14 bg-transparent font-mono text-cyan-400 text-xs font-semibold focus:outline-none text-right"
                      />
                      <span className="text-[10px] font-mono text-neutral-500">x</span>
                    </div>
                  </div>
                </div>

                {/* Vertical Sensitivity (Y) */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-neutral-300 font-medium">Vertical Sensitivity (Y-Axis)</span>
                    <span className="text-[11px] text-neutral-500">Up / Down head pitch</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0.2"
                      max="6.0"
                      step="0.1"
                      value={config.sensitivityY}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        onUpdateConfig({ sensitivityY: val });
                      }}
                      className="flex-1 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 shrink-0">
                      <input
                        type="number"
                        min="0.2"
                        max="6.0"
                        step="0.1"
                        value={Number(config.sensitivityY.toFixed(1))}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) onUpdateConfig({ sensitivityY: Math.max(0.2, Math.min(6.0, val)) });
                        }}
                        className="w-14 bg-transparent font-mono text-cyan-400 text-xs font-semibold focus:outline-none text-right"
                      />
                      <span className="text-[10px] font-mono text-neutral-500">x</span>
                    </div>
                  </div>
                </div>

                {/* Axis Inversions */}
                <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-neutral-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={config.invertX}
                      onChange={(e) => onUpdateConfig({ invertX: e.target.checked })}
                      className="rounded accent-cyan-500 w-3.5 h-3.5"
                    />
                    <span>Invert Horizontal (X)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-neutral-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={config.invertY}
                      onChange={(e) => onUpdateConfig({ invertY: e.target.checked })}
                      className="rounded accent-cyan-500 w-3.5 h-3.5"
                    />
                    <span>Invert Vertical (Y)</span>
                  </label>
                </div>
              </div>

              {/* Responsiveness, Smoothing & Deadzone Dynamics */}
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-4">
                <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Motion Dynamics & Filtering</span>
                </h4>

                {/* Responsiveness / Smoothing */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <div>
                      <span className="text-neutral-300 font-medium">Tracking Responsiveness (Smoothing Alpha)</span>
                      <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 font-mono">
                        {getSmoothingLabel(config.smoothing)}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-500">Higher = zero lag</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0.05"
                      max="0.95"
                      step="0.05"
                      value={config.smoothing}
                      onChange={(e) => onUpdateConfig({ smoothing: parseFloat(e.target.value) })}
                      className="flex-1 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 shrink-0">
                      <input
                        type="number"
                        min="0.05"
                        max="0.95"
                        step="0.05"
                        value={Number(config.smoothing.toFixed(2))}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) onUpdateConfig({ smoothing: Math.max(0.05, Math.min(0.95, val)) });
                        }}
                        className="w-14 bg-transparent font-mono text-cyan-400 text-xs font-semibold focus:outline-none text-right"
                      />
                    </div>
                  </div>
                </div>

                {/* Rest Deadzone */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-neutral-300 font-medium">Rest Deadzone (Cancels Involuntary Tremor)</span>
                    <span className="text-[11px] text-neutral-500">Radius of neutral zone</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0.001"
                      max="0.035"
                      step="0.001"
                      value={config.deadzone}
                      onChange={(e) => onUpdateConfig({ deadzone: parseFloat(e.target.value) })}
                      className="flex-1 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 shrink-0">
                      <input
                        type="number"
                        min="0.001"
                        max="0.035"
                        step="0.001"
                        value={Number(config.deadzone.toFixed(3))}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) onUpdateConfig({ deadzone: Math.max(0.001, Math.min(0.035, val)) });
                        }}
                        className="w-14 bg-transparent font-mono text-cyan-400 text-xs font-semibold focus:outline-none text-right"
                      />
                    </div>
                  </div>
                </div>

                {/* Speed Acceleration Curve */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-neutral-300 font-medium">Speed Acceleration (Dynamic Whip)</span>
                    <span className="text-[11px] text-neutral-500">1.0 = Linear · 2.5 = Fast Snap</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1.0"
                      max="2.5"
                      step="0.05"
                      value={config.acceleration || 1.25}
                      onChange={(e) => onUpdateConfig({ acceleration: parseFloat(e.target.value) })}
                      className="flex-1 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 shrink-0">
                      <input
                        type="number"
                        min="1.0"
                        max="2.5"
                        step="0.05"
                        value={Number((config.acceleration || 1.25).toFixed(2))}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) onUpdateConfig({ acceleration: Math.max(1.0, Math.min(2.5, val)) });
                        }}
                        className="w-14 bg-transparent font-mono text-cyan-400 text-xs font-semibold focus:outline-none text-right"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Sensitivity & Motion Response Testing Pad */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-4 flex flex-col flex-1 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-cyan-400" />
                    <span>Live Responsiveness Test Pad</span>
                  </h4>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    Hits: {hitCount}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mb-3">
                  Move your head or cursor across these targets to instantly test your current sensitivity:
                </p>

                {/* Real-Time Telemetry Bar */}
                <div className="grid grid-cols-2 gap-2 mb-3 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800/80">
                  <div>
                    <div className="text-[10px] text-neutral-500 uppercase">Head Offset ΔX / ΔY</div>
                    <div className="font-mono text-xs text-neutral-200">
                      {trackingState ? (
                        <>
                          <span className={Math.abs(trackingState.deltaX) > config.deadzone ? 'text-cyan-400 font-bold' : 'text-neutral-500'}>
                            {(trackingState.deltaX * 100).toFixed(1)}%
                          </span>
                          {' · '}
                          <span className={Math.abs(trackingState.deltaY) > config.deadzone ? 'text-cyan-400 font-bold' : 'text-neutral-500'}>
                            {(trackingState.deltaY * 100).toFixed(1)}%
                          </span>
                        </>
                      ) : (
                        '--'
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-neutral-500 uppercase">Motion State</div>
                    <div className="text-xs font-mono">
                      {trackingState?.hasFace ? (
                        Math.hypot(trackingState.deltaX, trackingState.deltaY) < config.deadzone ? (
                          <span className="text-amber-400">Resting in Deadzone</span>
                        ) : (
                          <span className="text-emerald-400 font-semibold">Active Motion</span>
                        )
                      ) : (
                        <span className="text-neutral-500">No Face</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Interactive Target Canvas Box */}
                <div className="relative flex-1 min-h-[220px] bg-neutral-950/90 rounded-xl border border-neutral-800 p-3 overflow-hidden flex flex-col justify-between">
                  {/* Subtle Grid Pattern */}
                  <div
                    className="absolute inset-0 opacity-15 pointer-events-none"
                    style={{
                      backgroundImage:
                        'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }}
                  />

                  {/* Top Targets */}
                  <div className="flex justify-between relative z-10">
                    <button
                      onMouseEnter={() => handleTargetHover('top_left')}
                      className={`px-3 py-2 rounded-lg border text-xs font-mono transition-all ${
                        hitTargets['top_left']
                          ? 'bg-cyan-500 text-white border-cyan-400 scale-105 shadow-[0_0_12px_#38bdf8]'
                          : 'bg-neutral-900/90 border-neutral-800 text-neutral-400 hover:border-cyan-500 hover:text-white'
                      }`}
                    >
                      Top-Left
                    </button>
                    <button
                      onMouseEnter={() => handleTargetHover('top_right')}
                      className={`px-3 py-2 rounded-lg border text-xs font-mono transition-all ${
                        hitTargets['top_right']
                          ? 'bg-cyan-500 text-white border-cyan-400 scale-105 shadow-[0_0_12px_#38bdf8]'
                          : 'bg-neutral-900/90 border-neutral-800 text-neutral-400 hover:border-cyan-500 hover:text-white'
                      }`}
                    >
                      Top-Right
                    </button>
                  </div>

                  {/* Center Crosshair Target */}
                  <div className="flex justify-center relative z-10 my-auto">
                    <button
                      onMouseEnter={() => handleTargetHover('center')}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                        hitTargets['center']
                          ? 'bg-emerald-500 text-white border-emerald-400 scale-110 shadow-[0_0_15px_#10b981]'
                          : 'bg-neutral-900/90 border-neutral-800 text-cyan-300 hover:border-cyan-500'
                      }`}
                    >
                      <Crosshair className="w-4 h-4" />
                      <span>Center Resting Origin</span>
                    </button>
                  </div>

                  {/* Bottom Targets */}
                  <div className="flex justify-between relative z-10">
                    <button
                      onMouseEnter={() => handleTargetHover('bottom_left')}
                      className={`px-3 py-2 rounded-lg border text-xs font-mono transition-all ${
                        hitTargets['bottom_left']
                          ? 'bg-cyan-500 text-white border-cyan-400 scale-105 shadow-[0_0_12px_#38bdf8]'
                          : 'bg-neutral-900/90 border-neutral-800 text-neutral-400 hover:border-cyan-500 hover:text-white'
                      }`}
                    >
                      Bottom-Left
                    </button>
                    <button
                      onMouseEnter={() => handleTargetHover('bottom_right')}
                      className={`px-3 py-2 rounded-lg border text-xs font-mono transition-all ${
                        hitTargets['bottom_right']
                          ? 'bg-cyan-500 text-white border-cyan-400 scale-105 shadow-[0_0_12px_#38bdf8]'
                          : 'bg-neutral-900/90 border-neutral-800 text-neutral-400 hover:border-cyan-500 hover:text-white'
                      }`}
                    >
                      Bottom-Right
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-400">
                  <span>Changes apply instantly to live cursor</span>
                  <button
                    onClick={() => setHitCount(0)}
                    className="text-cyan-400 hover:underline"
                  >
                    Reset Hit Counter
                  </button>
                </div>
              </div>

              {/* Reset to Default Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    sounds.playClick('left');
                    onUpdateConfig({
                      masterSensitivity: 2.2,
                      sensitivityX: 2.2,
                      sensitivityY: 2.2,
                      smoothing: 0.35,
                      deadzone: 0.008,
                      acceleration: 1.25,
                      invertX: false,
                      invertY: false,
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 hover:border-neutral-700 rounded-lg text-xs transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Reset Sensitivity Defaults</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Clicks & Gestures */}
      {activeTab === 'gestures' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Dwell Click */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-xs font-semibold text-white">Dwell Click (Hover to Click)</h4>
                <p className="text-[11px] text-neutral-400">
                  Automatically triggers click when hovering stationary over an item
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.dwellClickEnabled}
                onChange={(e) => onUpdateConfig({ dwellClickEnabled: e.target.checked })}
                className="w-4 h-4 rounded accent-cyan-500"
              />
            </div>

            {config.dwellClickEnabled && (
              <div className="mt-4 pt-3 border-t border-neutral-800 space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Hover Hold Duration</span>
                    <span className="font-mono text-cyan-400">{config.dwellTimeMs}ms</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="400"
                      max="2000"
                      step="50"
                      value={config.dwellTimeMs}
                      onChange={(e) => onUpdateConfig({ dwellTimeMs: parseInt(e.target.value) })}
                      className="flex-1 accent-cyan-500 cursor-pointer"
                    />
                    <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded px-2 py-0.5">
                      <input
                        type="number"
                        min="400"
                        max="2000"
                        step="50"
                        value={config.dwellTimeMs}
                        onChange={(e) => onUpdateConfig({ dwellTimeMs: parseInt(e.target.value) || 800 })}
                        className="w-12 bg-transparent font-mono text-cyan-400 text-xs text-right focus:outline-none"
                      />
                      <span className="text-[10px] text-neutral-500">ms</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Dwell Radius Tolerance</span>
                    <span className="font-mono text-cyan-400">{config.dwellRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min="14"
                    max="50"
                    step="2"
                    value={config.dwellRadius}
                    onChange={(e) => onUpdateConfig({ dwellRadius: parseInt(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Eye Blink & Wink Clicks */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Eye Blink & Wink Click Trigger</span>
                </h4>
                <p className="text-[11px] text-neutral-400">
                  Filters normal involuntary blinks (100–250ms) and clicks only on deliberate eye hold
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.blinkClickEnabled}
                onChange={(e) => onUpdateConfig({ blinkClickEnabled: e.target.checked })}
                className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
              />
            </div>

            {config.blinkClickEnabled && (
              <div className="mt-4 pt-3 border-t border-neutral-800 space-y-4">
                {/* 1. Eye Closed Hold Duration Slider (User Request) */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <div className="flex items-center gap-1.5">
                      <Timer className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-neutral-200 font-medium">Eye Closed Duration to Click</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-neutral-500">Normal blinks ignored</span>
                      <span className="font-mono text-cyan-400 font-bold bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                        {config.blinkHoldDurationMs || 400}ms
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="150"
                      max="1200"
                      step="25"
                      value={config.blinkHoldDurationMs || 400}
                      onChange={(e) => onUpdateConfig({ blinkHoldDurationMs: parseInt(e.target.value) })}
                      className="flex-1 accent-cyan-500 cursor-pointer h-2 bg-neutral-800 rounded-lg appearance-none"
                    />
                    <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 shrink-0">
                      <input
                        type="number"
                        min="150"
                        max="1200"
                        step="25"
                        value={config.blinkHoldDurationMs || 400}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val)) onUpdateConfig({ blinkHoldDurationMs: Math.max(150, Math.min(1200, val)) });
                        }}
                        className="w-12 bg-transparent font-mono text-cyan-400 text-xs font-semibold focus:outline-none text-right"
                      />
                      <span className="text-[10px] text-neutral-500 font-mono">ms</span>
                    </div>
                  </div>

                  {/* Hold Duration Quick Presets */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] text-neutral-500 mr-1">Presets:</span>
                    {[
                      { label: 'Fast (300ms)', value: 300 },
                      { label: 'Balanced (400ms)', value: 400 },
                      { label: 'Deliberate (550ms)', value: 550 },
                      { label: 'Relaxed (750ms)', value: 750 },
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => {
                          sounds.playClick('left');
                          onUpdateConfig({ blinkHoldDurationMs: preset.value });
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                          (config.blinkHoldDurationMs || 400) === preset.value
                            ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60 font-semibold shadow-sm'
                            : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Informational callout */}
                  <div className="mt-2.5 p-2 rounded-lg bg-neutral-950 border border-neutral-800/80 flex items-start gap-2 text-[11px] leading-relaxed">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-neutral-400">
                      Normal involuntary blinks (<strong className="text-neutral-200">100–250ms</strong>) will not trigger accidental clicks. Keeping your eye closed for <strong className="text-cyan-300">≥ {config.blinkHoldDurationMs || 400}ms</strong> registers a deliberate click.
                    </span>
                  </div>

                  {/* 3-Step Blink Learning Mini-Wizard Interactive Card */}
                  <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-cyan-950/60 via-blue-950/40 to-neutral-950 border border-cyan-500/40 flex items-center justify-between gap-3 shadow-md">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                        <Sparkles className="w-4 h-4 text-cyan-300" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                          <span>3-Step Blink Learning Wizard</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-400 text-neutral-950 font-bold uppercase tracking-tight">Auto-Detect</span>
                        </div>
                        <p className="text-[10px] text-neutral-300 truncate mt-0.5">
                          Detects your natural involuntary blink speed to calculate your ideal click threshold
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick('left');
                        onStartCalibration('blink');
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg text-xs shadow-md active:scale-95 transition-all shrink-0 flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Start Learning</span>
                    </button>
                  </div>
                </div>

                {/* 2. Trigger Mode Selection */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-neutral-300 font-medium">Click Trigger Mode</span>
                    <span className="text-[10px] text-neutral-500">Gesture mapping</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'both_and_winks', label: 'Winks & Both Eyes', desc: 'Left/Right or Both' },
                      { id: 'winks_only', label: 'Winks Only', desc: 'Single eye winks' },
                      { id: 'both_eyes_only', label: 'Both Eyes Only', desc: 'Long blink click' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          sounds.playClick('left');
                          onUpdateConfig({ blinkTriggerMode: mode.id as any });
                        }}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          (config.blinkTriggerMode || 'both_and_winks') === mode.id
                            ? 'bg-cyan-950/70 border-cyan-500/60 text-white shadow-sm'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                        }`}
                      >
                        <div className="text-[11px] font-semibold">{mode.label}</div>
                        <div className="text-[9px] text-neutral-500">{mode.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Wink Detection Sensitivity (EAR Threshold) */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Eye Closure Threshold (EAR Sensitivity)</span>
                    <span className="font-mono text-cyan-400">{config.blinkThreshold.toFixed(2)} EAR</span>
                  </div>
                  <input
                    type="range"
                    min="0.12"
                    max="0.32"
                    step="0.01"
                    value={config.blinkThreshold}
                    onChange={(e) => onUpdateConfig({ blinkThreshold: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
                    <span>Stricter (0.12)</span>
                    <span>Standard (0.19)</span>
                    <span>Gentle (0.32)</span>
                  </div>
                </div>

                {/* 4. Live Blink Diagnostic Meter */}
                {trackingState && (
                  <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                    <div className="flex items-center justify-between text-[11px] mb-2">
                      <span className="text-neutral-400 font-medium">Live Eye Diagnostic:</span>
                      <div>
                        {trackingState.isNormalBlink ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 font-medium animate-pulse">
                            ✓ Normal Blink Filtered ({trackingState.blinkDurationMs || 180}ms)
                          </span>
                        ) : trackingState.blinkHoldProgress && trackingState.blinkHoldProgress > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950/80 border border-amber-500/60 text-amber-300 font-mono font-bold animate-pulse">
                            Holding: {Math.round(trackingState.blinkHoldProgress * 100)}%
                          </span>
                        ) : trackingState.activeGesture?.includes('wink') || trackingState.activeGesture === 'blink_click' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 font-bold">
                            ⚡ Click Triggered!
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-500">Eyes Open</span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar for intentional hold */}
                    {trackingState.blinkHoldProgress && trackingState.blinkHoldProgress > 0 ? (
                      <div className="mb-2">
                        <div className="h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-75"
                            style={{ width: `${Math.min(100, trackingState.blinkHoldProgress * 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Left & Right EAR live gauges */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <div className="flex justify-between text-neutral-400 mb-0.5">
                          <span>Left Eye (EAR):</span>
                          <span className="font-mono text-cyan-300">{trackingState.leftEyeOpenRatio.toFixed(2)}</span>
                        </div>
                        <div className="h-1 bg-neutral-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              trackingState.leftEyeOpenRatio < config.blinkThreshold ? 'bg-amber-400' : 'bg-cyan-500'
                            }`}
                            style={{ width: `${Math.min(100, trackingState.leftEyeOpenRatio * 250)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-neutral-400 mb-0.5">
                          <span>Right Eye (EAR):</span>
                          <span className="font-mono text-cyan-300">{trackingState.rightEyeOpenRatio.toFixed(2)}</span>
                        </div>
                        <div className="h-1 bg-neutral-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              trackingState.rightEyeOpenRatio < config.blinkThreshold ? 'bg-amber-400' : 'bg-cyan-500'
                            }`}
                            style={{ width: `${Math.min(100, trackingState.rightEyeOpenRatio * 250)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mouth Open Action */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-xs font-semibold text-white">Mouth Open Trigger</h4>
                <p className="text-[11px] text-neutral-400">
                  Executes action when opening mouth beyond threshold
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.mouthClickEnabled}
                onChange={(e) => onUpdateConfig({ mouthClickEnabled: e.target.checked })}
                className="w-4 h-4 rounded accent-cyan-500"
              />
            </div>

            {config.mouthClickEnabled && (
              <div className="mt-3 pt-3 border-t border-neutral-800 space-y-3">
                <div className="flex items-center gap-2">
                  {(
                    [
                      { id: 'left_click', label: 'Left Click' },
                      { id: 'drag_toggle', label: 'Drag & Drop' },
                      { id: 'scroll_toggle', label: 'Scroll' },
                    ] as { id: MouthAction; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => onUpdateConfig({ mouthAction: opt.id })}
                      className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                        config.mouthAction === opt.id
                          ? 'bg-neutral-800 text-cyan-300 border-cyan-500/50 font-medium'
                          : 'border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Mouth Opening Sensitivity</span>
                    <span className="font-mono text-cyan-400">{config.mouthThreshold.toFixed(2)} MAR</span>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="0.65"
                    step="0.02"
                    value={config.mouthThreshold}
                    onChange={(e) => onUpdateConfig({ mouthThreshold: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sound Audio Feedback */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-semibold text-white">Acoustic Audio Feedback</h4>
                </div>
                <input
                  type="checkbox"
                  checked={config.soundFeedback}
                  onChange={(e) => {
                    onUpdateConfig({ soundFeedback: e.target.checked });
                    sounds.setEnabled(e.target.checked);
                  }}
                  className="w-4 h-4 rounded accent-cyan-500"
                />
              </div>
              <p className="text-[11px] text-neutral-400">
                Audible confirmation clicks for eye winks, dwells, and voice commands
              </p>
            </div>

            <button
              onClick={() => sounds.playClick('left')}
              className="mt-4 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs self-start"
            >
              Test Click Tone
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Cursor Appearance */}
      {activeTab === 'cursor' && (
        <div className="space-y-4">
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Move className="w-4 h-4 text-cyan-400" />
              <span>Pointer Reticle Style</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {(
                [
                  { id: 'laser_glow', label: 'Laser Glow', desc: 'Luminous cyan ring with trailing halo' },
                  { id: 'cyber_reticle', label: 'Cyber Reticle', desc: 'Precision HUD crosshair with telemetry markers' },
                  { id: 'high_contrast', label: 'Accessibility Neon', desc: 'High visibility neon yellow for contrast' },
                  { id: 'modern_dot', label: 'Minimal Dot', desc: 'Clean white pointer with dark outline' },
                ] as { id: CursorStyle; label: string; desc: string }[]
              ).map((style) => (
                <button
                  key={style.id}
                  onClick={() => onUpdateConfig({ cursorStyle: style.id })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    config.cursorStyle === style.id
                      ? 'bg-neutral-800 border-cyan-500 text-white shadow-md ring-1 ring-cyan-500/40'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                  }`}
                >
                  <div className="text-xs font-bold">{style.label}</div>
                  <div className="text-[11px] text-neutral-500 mt-1">{style.desc}</div>
                </button>
              ))}
            </div>

            {/* Cursor Size Slider + Number Input */}
            <div className="pt-3 border-t border-neutral-800">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-neutral-400">Pointer Dimension (Size)</span>
                <span className="font-mono text-cyan-400">{config.cursorSize}px</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="16"
                  max="48"
                  step="2"
                  value={config.cursorSize}
                  onChange={(e) => onUpdateConfig({ cursorSize: parseInt(e.target.value) })}
                  className="flex-1 accent-cyan-500 cursor-pointer"
                />
                <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded px-2 py-0.5">
                  <input
                    type="number"
                    min="16"
                    max="48"
                    step="2"
                    value={config.cursorSize}
                    onChange={(e) => onUpdateConfig({ cursorSize: parseInt(e.target.value) || 26 })}
                    className="w-12 bg-transparent font-mono text-cyan-400 text-xs text-right focus:outline-none"
                  />
                  <span className="text-[10px] text-neutral-500">px</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Camera & Display */}
      {activeTab === 'camera' && (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-4">
          <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>Camera Preview & HUD Options</span>
          </h4>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/80">
              <div>
                <div className="text-white font-medium">Show Camera PiP Monitor</div>
                <div className="text-[11px] text-neutral-400">Floating webcam monitor on screen corner</div>
              </div>
              <input
                type="checkbox"
                checked={config.showWebcamFeed}
                onChange={(e) => onUpdateConfig({ showWebcamFeed: e.target.checked })}
                className="w-4 h-4 rounded accent-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/80">
              <div>
                <div className="text-white font-medium">Render 3D Face Wireframe Mesh</div>
                <div className="text-[11px] text-neutral-400">Overlays 468 landmark points in real-time</div>
              </div>
              <input
                type="checkbox"
                checked={config.showFaceMesh}
                onChange={(e) => onUpdateConfig({ showFaceMesh: e.target.checked })}
                className="w-4 h-4 rounded accent-cyan-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Voice Commands & Speech Recognition */}
      {activeTab === 'voice' && (
        <div className="space-y-4">
          {/* Voice Microphone Control Card */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${
                    isVoiceListening
                      ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-400'
                      : 'bg-cyan-950/70 border-cyan-500/50 text-cyan-400'
                  }`}
                >
                  {isVoiceListening ? (
                    <Mic className="w-5 h-5 animate-pulse" />
                  ) : (
                    <MicOff className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">Speech-to-Intent Engine</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                        isVoiceListening
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isVoiceListening ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                        }`}
                      />
                      {isVoiceListening ? 'Microphone Active & Listening' : 'Microphone Muted'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Controls desktop actions hands-free using natural trigger words prefixed with "Sparrow".
                  </p>
                </div>
              </div>

              {onToggleVoice && (
                <button
                  onClick={onToggleVoice}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95 flex items-center gap-2 ${
                    isVoiceListening
                      ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                      : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400/50 animate-pulse'
                  }`}
                >
                  {isVoiceListening ? (
                    <>
                      <MicOff className="w-4 h-4 text-neutral-400" />
                      <span>Mute Voice</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>Unmute Microphone</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800/80">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="text-white font-medium">Audible Action Feedback Chimes</div>
                    <div className="text-[11px] text-neutral-400">Play confirmation sounds when voice triggers execute</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.soundFeedback}
                  onChange={(e) => {
                    const next = e.target.checked;
                    onUpdateConfig({ soundFeedback: next });
                    sounds.setEnabled(next);
                  }}
                  className="w-4 h-4 rounded accent-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Quick Voice Commands Reference */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Supported Sparrow Voice Triggers</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {[
                { cmd: 'Sparrow recenter', desc: 'Snaps cursor to current head rest pose' },
                { cmd: 'Sparrow stop', desc: 'Freezes cursor movement and tracking' },
                { cmd: 'Sparrow start', desc: 'Unfreezes and resumes cursor movement' },
                { cmd: 'Sparrow click', desc: 'Primary left click at cursor position' },
                { cmd: 'Sparrow right click', desc: 'Right click context menu' },
                { cmd: 'Sparrow double click', desc: 'Rapid double click' },
                { cmd: 'Sparrow open camera', desc: 'Launches face camera vision diagnostics' },
                { cmd: 'Sparrow open notes', desc: 'Opens Quick Notes app' },
                { cmd: 'Sparrow open paint', desc: 'Opens Face Paint & Canvas' },
                { cmd: 'Sparrow open calculator', desc: 'Opens math calculator' },
                { cmd: 'Sparrow open keyboard', desc: 'Opens accessibility on-screen keyboard' },
                { cmd: 'Sparrow open settings', desc: 'Opens this tracking & sensitivity settings panel' },
                { cmd: 'Sparrow unmute voice', desc: 'Unmutes speech recognition and starts listening' },
                { cmd: 'Sparrow mute voice', desc: 'Mutes speech recognition' },
              ].map((item) => (
                <div
                  key={item.cmd}
                  className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/80 flex items-center justify-between gap-2"
                >
                  <span className="font-mono text-cyan-300 font-semibold">{item.cmd}</span>
                  <span className="text-[11px] text-neutral-400 truncate">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
