/**
 * Webcam Tracker HUD & Video Monitor Widget
 * Shows live facial mesh, telemetry, gesture meters, and instant Recenter action
 */

import React, { useState } from 'react';
import { FaceTrackingState } from '../types';
import { Camera, CameraOff, Minimize2, Maximize2, Sparkles, RefreshCw, Eye, Smile, Play, Pause, X } from 'lucide-react';
import { sounds } from '../services/soundEffects';
import { faceTracker } from '../services/faceTracker';

interface WebcamTrackerHUDProps {
  trackingState: FaceTrackingState;
  onRecenter: () => void;
  onToggleCursorFreeze?: () => void;
  showMesh: boolean;
  isCameraStarted?: boolean;
  onStopCamera?: () => void;
  onStartCamera?: () => void;
}

export const WebcamTrackerHUD: React.FC<WebcamTrackerHUDProps> = ({
  trackingState,
  onRecenter,
  onToggleCursorFreeze,
  showMesh,
  isCameraStarted = true,
  onStopCamera,
  onStartCamera,
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
          {/* Face Tracking Lock Symbol */}
          <div
            className="relative flex items-center justify-center w-4 h-4 shrink-0"
            title={trackingState.hasFace ? 'Face Tracking Lock Active' : 'Searching Face...'}
          >
            <svg
              className={`w-4 h-4 transition-colors ${
                trackingState.hasFace ? 'text-cyan-400' : 'text-neutral-500'
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              {/* Corner brackets */}
              <path d="M3 7V5a2 2 0 0 1 2-2h2" />
              <path d="M3 17v2a2 2 0 0 0 2 2h2" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <path d="M17 21h2a2 2 0 0 0 2-2v-2" />
              {/* Reticle crosshair ticks */}
              <line x1="12" y1="2" x2="12" y2="4.5" />
              <line x1="12" y1="19.5" x2="12" y2="22" />
              <line x1="2" y1="12" x2="4.5" y2="12" />
              <line x1="19.5" y1="12" x2="22" y2="12" />
              {/* Center tracking dot */}
              <circle
                cx="12"
                cy="12"
                r="3"
                className={trackingState.hasFace ? 'fill-cyan-400 stroke-cyan-300' : 'fill-neutral-600 stroke-neutral-500'}
              />
            </svg>
            {trackingState.hasFace && (
              <span className="absolute inset-0 rounded-full border border-cyan-400 animate-ping opacity-60" />
            )}
          </div>
          <span className={`font-semibold ${trackingState.hasFace ? 'text-cyan-300' : 'text-neutral-400'}`}>
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
              title={trackingState.isCursorFrozen ? 'Resume Moving Cursor (P)' : 'Stop Moving Cursor (P)'}
            >
              {trackingState.isCursorFrozen ? <Play className="w-3.5 h-3.5 fill-current text-white" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
            </button>
          )}
          {isCameraStarted && onStopCamera && (
            <button
              onClick={onStopCamera}
              className="p-1 rounded text-rose-400 hover:text-white hover:bg-rose-950/80 transition-colors"
              title="Close & Stop Camera Stream"
            >
              <CameraOff className="w-3.5 h-3.5" />
            </button>
          )}
          {!isCameraStarted && onStartCamera && (
            <button
              onClick={onStartCamera}
              className="p-1 rounded text-cyan-400 hover:text-white hover:bg-cyan-950/80 transition-colors animate-pulse"
              title="Start & Open Camera Stream"
            >
              <Camera className="w-3.5 h-3.5" />
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

      <div className={`p-3 ${isMinimized ? 'hidden' : 'block'}`}>
        {/* Video Preview with Live Face Tracking Lock Symbol, Dot, and Vector Line */}
        {(() => {
          const cal = faceTracker.getCalibration();
          const restingX = cal.restingNoseX * 100;
          const restingY = cal.restingNoseY * 100;
          const currentX = trackingState.rawNoseX * 100;
          const currentY = trackingState.rawNoseY * 100;

          return (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-neutral-950 border border-neutral-800 mb-3">
              <video
                ref={hudVideoRef}
                playsInline
                muted
                autoPlay
                className="absolute inset-0 w-full h-full object-cover -scale-x-100"
              />

              {!trackingState.hasFace && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/70 p-3 text-center z-10">
                  <Camera className="w-6 h-6 text-neutral-500 mb-1 animate-pulse" />
                  <span className="text-xs text-neutral-400">Position face in center frame</span>
                </div>
              )}

              {/* SVG Overlay: Vector Motion Line, Calibrated Target, and Coordinate Crosshair Lines */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {/* Neutral Calibrated Target Reticle */}
                <circle
                  cx={restingX}
                  cy={restingY}
                  r="3.5"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.4)"
                  strokeWidth="0.6"
                  strokeDasharray="1.2 1.2"
                />
                <line
                  x1={restingX - 5}
                  y1={restingY}
                  x2={restingX + 5}
                  y2={restingY}
                  stroke="rgba(255, 255, 255, 0.45)"
                  strokeWidth="0.5"
                />
                <line
                  x1={restingX}
                  y1={restingY - 5}
                  x2={restingX}
                  y2={restingY + 5}
                  stroke="rgba(255, 255, 255, 0.45)"
                  strokeWidth="0.5"
                />

                {trackingState.hasFace && (
                  <>
                    {/* Live Motion Vector Tracking Line from Resting Center to Detected Face */}
                    <line
                      x1={restingX}
                      y1={restingY}
                      x2={currentX}
                      y2={currentY}
                      stroke="#38bdf8"
                      strokeWidth="0.9"
                      strokeDasharray="2 1.5"
                    />

                    {/* Horizontal & Vertical Crosshair Lines intersecting at detected face position */}
                    <line
                      x1={Math.max(0, currentX - 8)}
                      y1={currentY}
                      x2={Math.min(100, currentX + 8)}
                      y2={currentY}
                      stroke="rgba(56, 189, 248, 0.75)"
                      strokeWidth="0.5"
                    />
                    <line
                      x1={currentX}
                      y1={Math.max(0, currentY - 8)}
                      x2={currentX}
                      y2={Math.min(100, currentY + 8)}
                      stroke="rgba(56, 189, 248, 0.75)"
                      strokeWidth="0.5"
                    />
                  </>
                )}
              </svg>

              {/* Dynamic Face Tracking Lock Symbol & Reticle Dot on Detected Face */}
              {trackingState.hasFace && (
                <div
                  className="absolute pointer-events-none z-20"
                  style={{
                    left: `${currentX}%`,
                    top: `${currentY}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    {/* 4 Corner Targeting Lock Brackets */}
                    <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400 drop-shadow-[0_0_4px_#38bdf8]" />
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-400 drop-shadow-[0_0_4px_#38bdf8]" />
                    <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400 drop-shadow-[0_0_4px_#38bdf8]" />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-400 drop-shadow-[0_0_4px_#38bdf8]" />

                    {/* Animated Pulsing Radar Lock Ring */}
                    <span className="absolute inset-1 rounded-full border border-cyan-400/50 animate-ping opacity-60" />

                    {/* Circular Reticle Frame */}
                    <span className="w-6 h-6 rounded-full border border-cyan-400/80 flex items-center justify-center bg-cyan-950/20">
                      {/* Core Glowing Tracking Dot */}
                      <span className="w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#38bdf8] ring-1 ring-white" />
                    </span>

                    {/* Face Lock Badge */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-1.5 py-0.2 bg-neutral-950/90 border border-cyan-400/70 rounded text-[8px] font-mono font-bold text-cyan-300 tracking-wider whitespace-nowrap shadow-md flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
                      <span>FACE LOCK</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Real-time Tracking Coordinate Badge */}
              {trackingState.hasFace && (
                <div className="absolute bottom-1.5 left-2 z-20 pointer-events-none px-1.5 py-0.5 rounded bg-neutral-950/80 border border-neutral-800 text-[9px] font-mono text-cyan-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span>
                    LOCK X: {Math.round(currentX)}% Y: {Math.round(currentY)}%
                  </span>
                </div>
              )}
            </div>
          );
        })()}

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
                  {trackingState.isBlinkingLeft ? (
                    <span className="text-amber-400 font-bold">CLICK</span>
                  ) : trackingState.isNormalBlink ? (
                    <span className="text-emerald-400 text-[10px] font-semibold">IGNORED</span>
                  ) : trackingState.blinkHoldProgress && trackingState.blinkHoldProgress > 0 && trackingState.leftEyeOpenRatio < 0.22 ? (
                    <span className="text-amber-400 font-bold text-[10px]">{Math.round(trackingState.blinkHoldProgress * 100)}%</span>
                  ) : (
                    trackingState.leftEyeOpenRatio.toFixed(2)
                  )}
                </span>
              </div>
              <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    trackingState.isBlinkingLeft
                      ? 'bg-amber-400'
                      : trackingState.blinkHoldProgress && trackingState.blinkHoldProgress > 0
                      ? 'bg-amber-500'
                      : 'bg-cyan-400'
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
                  {trackingState.isBlinkingRight ? (
                    <span className="text-amber-400 font-bold">CLICK</span>
                  ) : trackingState.isNormalBlink ? (
                    <span className="text-emerald-400 text-[10px] font-semibold">IGNORED</span>
                  ) : trackingState.blinkHoldProgress && trackingState.blinkHoldProgress > 0 && trackingState.rightEyeOpenRatio < 0.22 ? (
                    <span className="text-amber-400 font-bold text-[10px]">{Math.round(trackingState.blinkHoldProgress * 100)}%</span>
                  ) : (
                    trackingState.rightEyeOpenRatio.toFixed(2)
                  )}
                </span>
              </div>
              <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    trackingState.isBlinkingRight
                      ? 'bg-amber-400'
                      : trackingState.blinkHoldProgress && trackingState.blinkHoldProgress > 0
                      ? 'bg-amber-500'
                      : 'bg-cyan-400'
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

          {/* Quick Action Controls: Stop Moving Cursor & Stop Camera */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            {onToggleCursorFreeze && (
              <button
                onClick={onToggleCursorFreeze}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border shadow-sm ${
                  trackingState.isCursorFrozen
                    ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 animate-pulse'
                    : 'bg-amber-950/80 hover:bg-amber-900 text-amber-200 border-amber-600/70'
                }`}
                title={trackingState.isCursorFrozen ? 'Resume Moving Cursor' : 'Stop Moving Cursor (Freeze)'}
              >
                {trackingState.isCursorFrozen ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current text-white" />
                    <span>Move Cursor</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 text-amber-400" />
                    <span>Stop Cursor</span>
                  </>
                )}
              </button>
            )}

            {isCameraStarted && onStopCamera ? (
              <button
                onClick={onStopCamera}
                className="py-1.5 px-2 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-600/70 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                title="Turn Off Webcam & Stop Tracking"
              >
                <CameraOff className="w-3.5 h-3.5 text-rose-400" />
                <span>Stop Camera</span>
              </button>
            ) : onStartCamera ? (
              <button
                onClick={onStartCamera}
                className="py-1.5 px-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm animate-pulse"
                title="Turn On Webcam & Start Tracking"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Start Camera</span>
              </button>
            ) : null}
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
      </div>
    );
  };
