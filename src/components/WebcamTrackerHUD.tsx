/**
 * Webcam Tracker HUD & Video Monitor Widget
 * Shows live facial mesh, telemetry, gesture meters, and instant Recenter action
 */

import React, { useState } from 'react';
import { FaceTrackingState } from '../types';
import { Camera, Minimize2, Maximize2, Sparkles, RefreshCw, Eye, Smile, Play, Pause } from 'lucide-react';
import { sounds } from '../services/soundEffects';
import { faceTracker } from '../services/faceTracker';

interface WebcamTrackerHUDProps {
  trackingState: FaceTrackingState;
  onRecenter: () => void;
  onToggleCursorFreeze?: () => void;
  showMesh: boolean;
}

export const WebcamTrackerHUD: React.FC<WebcamTrackerHUDProps> = ({
  trackingState,
  onRecenter,
  onToggleCursorFreeze,
  showMesh,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const hudVideoRef = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    const stream = faceTracker.getStream();
    if (hudVideoRef.current && stream) {
      if (hudVideoRef.current.srcObject !== stream) {
        hudVideoRef.current.srcObject = stream;
        hudVideoRef.current.muted = true;
        hudVideoRef.current.play().catch(() => {});
      }
    }
  }, [trackingState.isTrackingActive]);

  return (
    <div
      className={`fixed bottom-14 right-4 z-40 bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-xl shadow-2xl transition-all duration-200 select-none overflow-hidden ${
        isMinimized ? 'w-56 h-11' : 'w-72 sm:w-80'
      }`}
    >
      {/* Title Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-neutral-950/80 border-b border-neutral-800 text-xs">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              trackingState.hasFace ? 'bg-cyan-400 shadow-[0_0_8px_#38bdf8]' : 'bg-neutral-600'
            }`}
          />
          <span className="font-semibold text-neutral-200">
            {trackingState.hasFace ? 'Face Locked' : 'Searching Face...'}
          </span>
          <span className="font-mono text-[10px] text-neutral-500 tabular-nums">
            {trackingState.fps} FPS · {trackingState.latencyMs}ms
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onToggleCursorFreeze && (
            <button
              onClick={onToggleCursorFreeze}
              className={`p-1 rounded transition-colors ${
                trackingState.isCursorFrozen
                  ? 'text-amber-400 hover:text-amber-300 bg-amber-950/60'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
              title={trackingState.isCursorFrozen ? 'Move Cursor (P)' : 'Stop Cursor (P)'}
            >
              {trackingState.isCursorFrozen ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={() => {
              sounds.playRecenter();
              onRecenter();
            }}
            className="p-1 rounded text-cyan-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Recenter Resting Center (Space)"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title={isMinimized ? 'Expand Camera Feed' : 'Minimize Camera Feed'}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="p-3">
          {/* Video Preview */}
          <div className="relative aspect-video rounded-lg overflow-hidden bg-neutral-950 border border-neutral-800 mb-3">
            <video
              ref={hudVideoRef}
              playsInline
              muted
              autoPlay
              className="absolute inset-0 w-full h-full object-cover -scale-x-100"
            />

            {!trackingState.hasFace && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/70 p-3 text-center">
                <Camera className="w-6 h-6 text-neutral-500 mb-1 animate-pulse" />
                <span className="text-xs text-neutral-400">Position face in center frame</span>
              </div>
            )}

            {/* Resting Crosshair Indicator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border border-dashed border-cyan-400/50 rounded-full pointer-events-none" />
          </div>

          {/* Real-time Gesture & Pose Telemetry */}
          <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
            {/* Left Eye EAR */}
            <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800/80">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3 text-cyan-400" />
                  <span>Left Eye</span>
                </span>
                <span className="font-mono text-white tabular-nums">
                  {trackingState.isBlinkingLeft ? 'WINK' : trackingState.leftEyeOpenRatio.toFixed(2)}
                </span>
              </div>
              <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    trackingState.isBlinkingLeft ? 'bg-amber-400' : 'bg-cyan-400'
                  }`}
                  style={{ width: `${Math.min(100, trackingState.leftEyeOpenRatio * 250)}%` }}
                />
              </div>
            </div>

            {/* Right Eye EAR */}
            <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800/80">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3 text-cyan-400" />
                  <span>Right Eye</span>
                </span>
                <span className="font-mono text-white tabular-nums">
                  {trackingState.isBlinkingRight ? 'WINK' : trackingState.rightEyeOpenRatio.toFixed(2)}
                </span>
              </div>
              <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    trackingState.isBlinkingRight ? 'bg-amber-400' : 'bg-cyan-400'
                  }`}
                  style={{ width: `${Math.min(100, trackingState.rightEyeOpenRatio * 250)}%` }}
                />
              </div>
            </div>

            {/* Mouth MAR */}
            <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800/80 col-span-2">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="flex items-center gap-1">
                  <Smile className="w-3 h-3 text-cyan-400" />
                  <span>Mouth Open (MAR)</span>
                </span>
                <span className="font-mono text-white tabular-nums">
                  {trackingState.isMouthOpen ? 'OPEN (CLICK)' : trackingState.mouthOpenRatio.toFixed(2)}
                </span>
              </div>
              <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    trackingState.isMouthOpen ? 'bg-rose-400' : 'bg-cyan-400'
                  }`}
                  style={{ width: `${Math.min(100, trackingState.mouthOpenRatio * 200)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Recenter CTA */}
          <button
            onClick={() => {
              sounds.playRecenter();
              onRecenter();
            }}
            className="w-full py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Recenter Head (or Spacebar)</span>
          </button>
        </div>
      )}
    </div>
  );
};
