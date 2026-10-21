/**
 * Tracking Settings & Sensitivity Customization
 */

import React from 'react';
import { TrackingConfig, CursorStyle, MouthAction } from '../../types';
import { sounds } from '../../services/soundEffects';
import { Sliders, Eye, Sparkles, Volume2, Move, RotateCcw } from 'lucide-react';

interface SettingsAppProps {
  config: TrackingConfig;
  onUpdateConfig: (newConfig: Partial<TrackingConfig>) => void;
  onRecenter: () => void;
  onStartCalibration: () => void;
}

export const SettingsApp: React.FC<SettingsAppProps> = ({
  config,
  onUpdateConfig,
  onRecenter,
  onStartCalibration,
}) => {
  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-100 select-none overflow-y-auto p-5">
      {/* Quick Calibration Bar */}
      <div className="mb-6 bg-gradient-to-r from-cyan-950/40 via-neutral-900 to-neutral-900 border border-cyan-800/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 mb-1">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Instant Head Recenter & Calibration</span>
          </h3>
          <p className="text-xs text-neutral-400">
            Sit naturally facing your screen, then click recenter (or press <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded font-mono text-cyan-300">Space</kbd>) to lock your resting gaze.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              sounds.playRecenter();
              onRecenter();
            }}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            Recenter Now
          </button>
          <button
            onClick={onStartCalibration}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-medium transition-colors"
          >
            5-Point Wizard
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Motion & Speed */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Motion Dynamics & Speed</span>
          </h4>

          {/* Horizontal Sensitivity */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-neutral-400">Horizontal Sensitivity (X)</span>
              <span className="font-mono text-cyan-400">{config.sensitivityX.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="4.5"
              step="0.1"
              value={config.sensitivityX}
              onChange={(e) => onUpdateConfig({ sensitivityX: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Vertical Sensitivity */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-neutral-400">Vertical Sensitivity (Y)</span>
              <span className="font-mono text-cyan-400">{config.sensitivityY.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="4.5"
              step="0.1"
              value={config.sensitivityY}
              onChange={(e) => onUpdateConfig({ sensitivityY: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Motion Smoothing */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-neutral-400">Jitter Filter (Smoothing)</span>
              <span className="font-mono text-cyan-400">
                {config.smoothing < 0.2 ? 'Heavy Filter' : config.smoothing < 0.5 ? 'Balanced' : 'Crisp / Raw'}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.8"
              step="0.05"
              value={config.smoothing}
              onChange={(e) => onUpdateConfig({ smoothing: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Deadzone */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-neutral-400">Rest Deadzone (Ignores Micro-sway)</span>
              <span className="font-mono text-cyan-400">{(config.deadzone * 1000).toFixed(0)}</span>
            </div>
            <input
              type="range"
              min="0.002"
              max="0.03"
              step="0.002"
              value={config.deadzone}
              onChange={(e) => onUpdateConfig({ deadzone: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Axis Inversions */}
          <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
              <input
                type="checkbox"
                checked={config.invertX}
                onChange={(e) => onUpdateConfig({ invertX: e.target.checked })}
                className="rounded accent-cyan-500"
              />
              <span>Invert Horizontal (X)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
              <input
                type="checkbox"
                checked={config.invertY}
                onChange={(e) => onUpdateConfig({ invertY: e.target.checked })}
                className="rounded accent-cyan-500"
              />
              <span>Invert Vertical (Y)</span>
            </label>
          </div>
        </div>

        {/* Section 2: Clicks & Gestures */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>Click Actions & Gestures</span>
          </h4>

          {/* Dwell Click */}
          <div className="mb-4 pb-3 border-b border-neutral-800">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-xs font-medium text-white">Dwell Click (Hover to Click)</div>
                <div className="text-[11px] text-neutral-400">
                  Automatically clicks when cursor hovers motionless
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.dwellClickEnabled}
                onChange={(e) => onUpdateConfig({ dwellClickEnabled: e.target.checked })}
                className="w-4 h-4 rounded accent-cyan-500"
              />
            </div>
            {config.dwellClickEnabled && (
              <div className="mt-2">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-neutral-500">Dwell Hold Time</span>
                  <span className="font-mono text-cyan-400">{config.dwellTimeMs}ms</span>
                </div>
                <input
                  type="range"
                  min="400"
                  max="1800"
                  step="50"
                  value={config.dwellTimeMs}
                  onChange={(e) => onUpdateConfig({ dwellTimeMs: parseInt(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Eye Wink Clicks */}
          <div className="mb-4 pb-3 border-b border-neutral-800">
            <div className="flex items-center justify-between mb-1">
              <div>
                <div className="text-xs font-medium text-white">Eye Wink Clicks</div>
                <div className="text-[11px] text-neutral-400">
                  Left wink = Left click · Right wink = Right click
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.blinkClickEnabled}
                onChange={(e) => onUpdateConfig({ blinkClickEnabled: e.target.checked })}
                className="w-4 h-4 rounded accent-cyan-500"
              />
            </div>
          </div>

          {/* Mouth Open Action */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-xs font-medium text-white">Mouth Open Trigger</div>
                <div className="text-[11px] text-neutral-400">Gesture action when opening mouth</div>
              </div>
              <input
                type="checkbox"
                checked={config.mouthClickEnabled}
                onChange={(e) => onUpdateConfig({ mouthClickEnabled: e.target.checked })}
                className="w-4 h-4 rounded accent-cyan-500"
              />
            </div>
            {config.mouthClickEnabled && (
              <div className="flex items-center gap-1.5 mt-2">
                {(
                  [
                    { id: 'left_click', label: 'Click' },
                    { id: 'drag_toggle', label: 'Drag & Drop' },
                    { id: 'scroll_toggle', label: 'Scroll' },
                  ] as { id: MouthAction; label: string }[]
                ).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => onUpdateConfig({ mouthAction: opt.id })}
                    className={`flex-1 py-1 text-xs rounded border transition-colors ${
                      config.mouthAction === opt.id
                        ? 'bg-neutral-800 text-cyan-300 border-cyan-500/50 font-medium'
                        : 'border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sound feedback */}
          <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
              <Volume2 className="w-3.5 h-3.5 text-neutral-400" />
              <span>Click Sound Audio Feedback</span>
            </label>
            <input
              type="checkbox"
              checked={config.soundFeedback}
              onChange={(e) => {
                onUpdateConfig({ soundFeedback: e.target.checked });
                sounds.setEnabled(e.target.checked);
              }}
              className="rounded accent-cyan-500"
            />
          </div>
        </div>

        {/* Section 3: Cursor Appearance */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Move className="w-4 h-4 text-cyan-400" />
            <span>Pointer Appearance Style</span>
          </h4>

          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: 'laser_glow', label: 'Laser Glow', desc: 'Luminous cyan ring' },
                { id: 'cyber_reticle', label: 'Cyber Reticle', desc: 'Precision HUD crosshair' },
                { id: 'high_contrast', label: 'Accessibility Neon', desc: 'High visibility yellow' },
                { id: 'modern_dot', label: 'Minimal Dot', desc: 'Clean white pointer' },
              ] as { id: CursorStyle; label: string; desc: string }[]
            ).map((style) => (
              <button
                key={style.id}
                onClick={() => onUpdateConfig({ cursorStyle: style.id })}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  config.cursorStyle === style.id
                    ? 'bg-neutral-800 border-cyan-500 text-white shadow-sm'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                }`}
              >
                <div className="text-xs font-medium">{style.label}</div>
                <div className="text-[10px] text-neutral-500">{style.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Section 4: Camera & Preview */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>Camera & HUD Overlay</span>
            </h4>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <div className="text-white font-medium">Show Camera PiP Window</div>
                  <div className="text-[11px] text-neutral-400">Floating webcam monitor on screen</div>
                </div>
                <input
                  type="checkbox"
                  checked={config.showWebcamFeed}
                  onChange={(e) => onUpdateConfig({ showWebcamFeed: e.target.checked })}
                  className="w-4 h-4 rounded accent-cyan-500"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <div>
                  <div className="text-white font-medium">Render 3D Face Wireframe</div>
                  <div className="text-[11px] text-neutral-400">Overlays landmark mesh on webcam feed</div>
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

          <div className="pt-4 mt-4 border-t border-neutral-800 flex justify-end">
            <button
              onClick={() => {
                onUpdateConfig({
                  sensitivityX: 2.2,
                  sensitivityY: 2.2,
                  smoothing: 0.35,
                  deadzone: 0.008,
                  invertX: false,
                  invertY: false,
                  dwellClickEnabled: false,
                  dwellTimeMs: 900,
                  blinkClickEnabled: true,
                  mouthClickEnabled: true,
                  cursorStyle: 'laser_glow',
                });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
