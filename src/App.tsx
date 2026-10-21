/**
 * AeroFace Desktop - Face & Head Motion Cursor Controller
 * Complete interactive desktop application with real-time webcam tracking
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CalibrationData, FaceTrackingState, NativeBridgeStatus, TrackingConfig } from './types';
import { faceTracker, DEFAULT_TRACKING_CONFIG } from './services/faceTracker';
import { nativeBridge } from './services/nativeBridge';
import { sounds } from './services/soundEffects';
import { authService, UserProfile } from './services/authService';
import { performanceLogger } from './services/performanceLogger';
import { VirtualCursor } from './components/VirtualCursor';
import { InteractiveDesktop } from './components/InteractiveDesktop';
import { WebcamTrackerHUD } from './components/WebcamTrackerHUD';
import { CalibrationWizard } from './components/CalibrationWizard';
import { NativeBridgeModal } from './components/NativeBridgeModal';
import { LoginPage } from './components/LoginPage';
import { Camera, Sparkles, MonitorCheck, AlertCircle, Play } from 'lucide-react';

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [config, setConfig] = useState<TrackingConfig>(DEFAULT_TRACKING_CONFIG);
  const [trackingState, setTrackingState] = useState<FaceTrackingState>({
    hasFace: false,
    isTrackingActive: false,
    isCursorFrozen: false,
    rawNoseX: 0.5,
    rawNoseY: 0.5,
    deltaX: 0,
    deltaY: 0,
    cursorX: window.innerWidth / 2,
    cursorY: window.innerHeight / 2,
    pitch: 0,
    yaw: 0,
    roll: 0,
    leftEyeOpenRatio: 0.3,
    rightEyeOpenRatio: 0.3,
    mouthOpenRatio: 0.1,
    isBlinkingLeft: false,
    isBlinkingRight: false,
    isMouthOpen: false,
    isDragging: false,
    fps: 0,
    latencyMs: 0,
    activeGesture: null,
  });

  const [nativeStatus, setNativeStatus] = useState<NativeBridgeStatus>({
    connected: false,
    connecting: false,
    error: null,
    packetsSent: 0,
    url: 'ws://localhost:8765',
    lastMessageTime: null,
  });

  const [isCameraStarted, setIsCameraStarted] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [isNativeModalOpen, setIsNativeModalOpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(authService.getCurrentUser());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Subscribe to auth state updates
  useEffect(() => {
    const unsub = authService.subscribe((user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // Subscribe to preset changes to immediately synchronize faceTracker and config
  useEffect(() => {
    const unsub = authService.subscribePresetChange((preset) => {
      setConfig((prev) => {
        const updated = {
          ...prev,
          sensitivityX: preset.sensitivityX,
          sensitivityY: preset.sensitivityY,
          smoothing: preset.smoothing,
          deadzone: preset.deadzone,
          acceleration: preset.acceleration,
        };
        faceTracker.updateConfig(updated);
        return updated;
      });

      if (preset.calibrationSnapshot) {
        faceTracker.setCalibration({
          restingNoseX: preset.calibrationSnapshot.restingNoseX,
          restingNoseY: preset.calibrationSnapshot.restingNoseY,
          minRangeX: preset.calibrationSnapshot.minRangeX,
          maxRangeX: preset.calibrationSnapshot.maxRangeX,
          minRangeY: preset.calibrationSnapshot.minRangeY,
          maxRangeY: preset.calibrationSnapshot.maxRangeY,
        });
      }
    });

    return () => unsub();
  }, []);

  // Subscribe to native bridge WebSocket updates
  useEffect(() => {
    const unsub = nativeBridge.subscribe(setNativeStatus);
    return () => unsub();
  }, []);

  // Subscribe to FaceTracker updates & feed telemetry into performanceLogger
  useEffect(() => {
    const unsub = faceTracker.subscribe((state) => {
      setTrackingState(state);

      // Record performance telemetry sample
      performanceLogger.recordFrame({
        fps: state.fps,
        latencyMs: state.latencyMs,
        cursorX: state.cursorX,
        cursorY: state.cursorY,
        deltaX: state.deltaX,
        deltaY: state.deltaY,
        rawNoseX: state.rawNoseX,
        rawNoseY: state.rawNoseY,
        hasFace: state.hasFace,
        isCursorFrozen: state.isCursorFrozen,
      });

      // If connected to host OS desktop bridge, transmit normalized cursor coordinates
      if (nativeBridge) {
        const percentX = state.cursorX / window.innerWidth;
        const percentY = state.cursorY / window.innerHeight;
        nativeBridge.sendCursorMove(percentX, percentY);
      }
    });

    return () => unsub();
  }, []);

  const [cameraStatus, setCameraStatus] = useState<'idle' | 'starting' | 'active' | 'error'>('idle');

  // Start Camera tracking
  const startCamera = useCallback(async () => {
    if (!videoRef.current) return;
    setCameraStatus('starting');
    setCameraError(null);
    try {
      await faceTracker.start(videoRef.current, canvasRef.current || undefined);
      setIsCameraStarted(true);
      setCameraStatus('active');
      sounds.playRecenter();
    } catch (err: unknown) {
      console.error('Camera startup error:', err);
      setCameraStatus('error');
      const message = err instanceof Error ? err.message : String(err);
      setCameraError(
        message.includes('Permission') || message.includes('denied')
          ? 'Webcam permission was denied. Please click the camera icon in your browser address bar to allow camera access.'
          : 'Could not access webcam. Please ensure your camera is plugged in and allowed.'
      );
    }
  }, []);

  // Attempt auto-start on mount
  useEffect(() => {
    startCamera();
  }, [startCamera]);

  const handleUpdateConfig = useCallback((newConfig: Partial<TrackingConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      faceTracker.updateConfig(updated);
      return updated;
    });
  }, []);

  const handleRecenter = useCallback(() => {
    faceTracker.recenter(trackingState.rawNoseX, trackingState.rawNoseY);
  }, [trackingState.rawNoseX, trackingState.rawNoseY]);

  const handlePerformClick = useCallback((cx: number, cy: number, button: 'left' | 'right') => {
    nativeBridge.sendClick(button);
  }, []);

  const handleToggleCursorFreeze = useCallback(() => {
    setConfig((prev) => {
      const nextFrozen = !prev.isCursorFrozen;
      faceTracker.setCursorFrozen(nextFrozen);
      sounds.playClick('left');
      return { ...prev, isCursorFrozen: nextFrozen };
    });
  }, []);

  const handleSaveCalibration = useCallback((data: Partial<CalibrationData>) => {
    faceTracker.setCalibration(data);
    setIsCalibrating(false);
  }, []);

  // Keyboard shortcuts: Spacebar to Recenter, P to Stop/Move Cursor, Escape to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing in input or textarea
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        sounds.playRecenter();
        handleRecenter();
      } else if (e.code === 'KeyP') {
        e.preventDefault();
        handleToggleCursorFreeze();
      } else if (e.code === 'Escape') {
        setIsCalibrating(false);
        setIsNativeModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRecenter, handleToggleCursorFreeze]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 font-sans select-none">
      {/* Background tracking video & canvas with micro-geometry so browsers never suspend rendering */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        width="640"
        height="480"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '2px',
          height: '2px',
          opacity: 0.01,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />
      <canvas
        ref={canvasRef}
        width="640"
        height="480"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '2px',
          height: '2px',
          opacity: 0.01,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />

      {/* Main AeroOS Interactive Desktop Workspace */}
      <InteractiveDesktop
        trackingState={trackingState}
        config={config}
        nativeStatus={nativeStatus}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onUpdateConfig={handleUpdateConfig}
        onRecenter={handleRecenter}
        onToggleCursorFreeze={handleToggleCursorFreeze}
        onStartCalibration={() => setIsCalibrating(true)}
        onOpenNativeBridge={() => setIsNativeModalOpen(true)}
      />

      {/* Virtual Cursor Layer */}
      <VirtualCursor
        x={trackingState.cursorX}
        y={trackingState.cursorY}
        isTracking={isCameraStarted && trackingState.hasFace}
        isDragging={trackingState.isDragging}
        isCursorFrozen={config.isCursorFrozen}
        activeGesture={trackingState.activeGesture}
        config={config}
        onPerformClick={handlePerformClick}
      />

      {/* Webcam HUD Widget (Picture-in-Picture) */}
      {isCameraStarted && config.showWebcamFeed && (
        <WebcamTrackerHUD
          trackingState={trackingState}
          onRecenter={handleRecenter}
          onToggleCursorFreeze={handleToggleCursorFreeze}
          showMesh={config.showFaceMesh}
        />
      )}

      {/* Top Floating Camera Status / Activation Bar if not yet active */}
      {!isCameraStarted && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92%] bg-neutral-900/95 border border-cyan-500/40 rounded-xl p-3 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-cyan-500/40 shrink-0 shadow-sm">
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-07-26_at_3.25.36_PM_04076b3e.jpeg"
                alt="Sparrow"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="overflow-hidden">
              <div className="font-semibold text-white truncate flex items-center gap-1.5">
                <span className="text-cyan-400 font-bold">Sparrow</span>
                <span>•</span>
                <span>
                  {cameraStatus === 'starting'
                    ? 'Accessing Webcam...'
                    : cameraStatus === 'error'
                    ? 'Camera Permission Required'
                    : 'Webcam Ready to Connect'}
                </span>
              </div>
              <div className="text-[11px] text-neutral-400 truncate">
                {cameraError || 'Click to launch Sparrow live face tracking and start cursor navigation'}
              </div>
            </div>
          </div>

          <button
            onClick={startCamera}
            disabled={cameraStatus === 'starting'}
            className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium rounded-lg text-xs transition-colors shadow-sm shrink-0 flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{cameraStatus === 'starting' ? 'Opening...' : 'Open Camera'}</span>
          </button>
        </div>
      )}

      {/* 5-Point Calibration Wizard Modal */}
      {isCalibrating && (
        <CalibrationWizard
          trackingState={trackingState}
          onSaveCalibration={handleSaveCalibration}
          onClose={() => setIsCalibrating(false)}
        />
      )}

      {/* Native Desktop OS Bridge Modal */}
      {isNativeModalOpen && (
        <NativeBridgeModal
          status={nativeStatus}
          port={config.nativeBridgePort}
          onUpdatePort={(port) => handleUpdateConfig({ nativeBridgePort: port })}
          onClose={() => setIsNativeModalOpen(false)}
        />
      )}

      {/* Login & User Account Modal / Page */}
      {isLoginModalOpen && (
        <LoginPage
          isModal={true}
          onSuccess={(user) => {
            setCurrentUser(user);
            setIsLoginModalOpen(false);
          }}
          onClose={() => setIsLoginModalOpen(false)}
        />
      )}
    </div>
  );
}
