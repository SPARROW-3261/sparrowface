/**
 * AeroFace Desktop - Face & Head Motion Cursor Controller (Sparrow)
 * Complete interactive desktop application with real-time webcam tracking,
 * native OS bridge, performance monitoring logger, and speech-to-intent voice engine.
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
import { VoiceCheatsheetModal } from './components/VoiceCheatsheetModal';
import {
  Camera,
  CameraOff,
  Sparkles,
  MonitorCheck,
  AlertCircle,
  Play,
  Pause,
  Mic,
  MicOff,
  X,
  Volume2,
  Terminal,
} from 'lucide-react';

/**
 * Speech Recognition interface for browser compatibility
 */
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstanceLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructorLike {
  new (): SpeechRecognitionInstanceLike;
}

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: SpeechRecognitionConstructorLike;
  webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
}

/**
 * Voice Intent definition
 */
export interface VoiceIntent {
  raw: string;
  command: string;
  action:
    | 'recenter'
    | 'stop'
    | 'start'
    | 'stop_camera'
    | 'start_camera'
    | 'click'
    | 'right_click'
    | 'double_click'
    | 'open_app'
    | 'calibrate'
    | 'bridge'
    | 'login'
    | 'mute'
    | 'unmute'
    | 'help'
    | 'unknown';
  targetAppId?: string;
  label: string;
}

/**
 * Speech-to-Intent Parser: parses verbal utterances into structured actions.
 * Specifically checks for trigger words like 'Sparrow recenter', 'Sparrow stop', 'Sparrow open notes', etc.
 */
export function parseVoiceIntent(transcript: string): VoiceIntent | null {
  const clean = transcript
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:]/g, '');

  if (!clean) return null;

  // Match trigger words 'sparrow' or 'hey sparrow' or 'ok sparrow'
  const triggerRegex = /(?:hey\s+|ok\s+)?sparrow\s*(.*)/i;
  const match = clean.match(triggerRegex);

  // If phrase doesn't contain trigger word 'sparrow', ignore to prevent accidental ambient triggers
  if (!match) {
    return null;
  }

  const remainder = match[1].trim();

  // If user just said 'sparrow' without an action
  if (!remainder) {
    return {
      raw: transcript,
      command: 'sparrow',
      action: 'unknown',
      label: 'Listening... (Say "recenter", "stop", "open notes", or "help")',
    };
  }

  // 1. Recenter Cursor & Head Alignment
  if (
    remainder === 'recenter' ||
    remainder === 'center' ||
    remainder === 'reset' ||
    remainder.startsWith('recenter') ||
    remainder.includes('center cursor') ||
    remainder.includes('recenter cursor') ||
    remainder.includes('reset cursor') ||
    remainder.includes('recalibrate center')
  ) {
    return {
      raw: transcript,
      command: `Sparrow ${remainder}`,
      action: 'recenter',
      label: 'Recenter Cursor to Head Rest Position',
    };
  }

  // Stop / Close Camera
  if (
    remainder === 'stop camera' ||
    remainder === 'close camera' ||
    remainder === 'turn off camera' ||
    remainder === 'camera off' ||
    remainder === 'kill camera'
  ) {
    return {
      raw: transcript,
      command: `Sparrow ${remainder}`,
      action: 'stop_camera',
      label: 'Turn Off Camera Stream & Tracking',
    };
  }

  // Start / Open Camera
  if (
    remainder === 'start camera' ||
    remainder === 'open camera' ||
    remainder === 'turn on camera' ||
    remainder === 'camera on'
  ) {
    return {
      raw: transcript,
      command: `Sparrow ${remainder}`,
      action: 'start_camera',
      label: 'Open Camera & Resume Tracking',
    };
  }

  // 2. Stop Cursor / Freeze Tracking
  if (
    remainder === 'stop' ||
    remainder === 'freeze' ||
    remainder === 'pause' ||
    remainder === 'halt' ||
    remainder === 'hold' ||
    remainder.startsWith('stop') ||
    remainder.includes('freeze cursor') ||
    remainder.includes('stop cursor') ||
    remainder.includes('stop moving') ||
    remainder.includes('stop moving cursor') ||
    remainder.includes('stop tracking') ||
    remainder.includes('pause cursor')
  ) {
    return {
      raw: transcript,
      command: `Sparrow ${remainder}`,
      action: 'stop',
      label: 'Pause Cursor Movement & Freeze Tracking',
    };
  }

  // 3. Start Cursor / Resume Tracking
  if (
    remainder === 'start' ||
    remainder === 'resume' ||
    remainder === 'unfreeze' ||
    remainder === 'move' ||
    remainder === 'go' ||
    remainder === 'play' ||
    remainder === 'continue' ||
    remainder.startsWith('resume') ||
    remainder.includes('start tracking') ||
    remainder.includes('resume tracking') ||
    remainder.includes('unfreeze cursor') ||
    remainder.includes('move cursor')
  ) {
    return {
      raw: transcript,
      command: `Sparrow ${remainder}`,
      action: 'start',
      label: 'Resume Cursor Movement & Live Tracking',
    };
  }

  // 4. Mouse Clicks
  if (remainder === 'double click' || remainder.includes('double click')) {
    return {
      raw: transcript,
      command: `Sparrow ${remainder}`,
      action: 'double_click',
      label: 'Double Click at Cursor Position',
    };
  }

  if (
    remainder === 'right click' ||
    remainder.includes('right click') ||
    remainder.includes('secondary click') ||
    remainder.includes('context menu')
  ) {
    return {
      raw: transcript,
      command: `Sparrow ${remainder}`,
      action: 'right_click',
      label: 'Right Click (Context Menu)',
    };
  }

  if (
    remainder === 'click' ||
    remainder === 'left click' ||
    remainder === 'select' ||
    remainder === 'press' ||
    remainder.includes('left click')
  ) {
    return {
      raw: transcript,
      command: `Sparrow ${remainder}`,
      action: 'click',
      label: 'Primary Left Click',
    };
  }

  // 5. Open Specific Apps
  const appMap: { [pattern: string]: { id: string; name: string } } = {
    camera: { id: 'camera', name: 'Face Camera & Sensor' },
    sensor: { id: 'camera', name: 'Face Camera & Sensor' },
    vision: { id: 'camera', name: 'Face Camera & Sensor' },
    webcam: { id: 'camera', name: 'Face Camera & Sensor' },

    notes: { id: 'notes', name: 'Quick Notes' },
    note: { id: 'notes', name: 'Quick Notes' },
    notepad: { id: 'notes', name: 'Quick Notes' },
    memo: { id: 'notes', name: 'Quick Notes' },

    paint: { id: 'paint', name: 'Face Paint & Canvas' },
    drawing: { id: 'paint', name: 'Face Paint & Canvas' },
    draw: { id: 'paint', name: 'Face Paint & Canvas' },
    canvas: { id: 'paint', name: 'Face Paint & Canvas' },

    calculator: { id: 'calculator', name: 'Calculator' },
    calc: { id: 'calculator', name: 'Calculator' },
    math: { id: 'calculator', name: 'Calculator' },

    keyboard: { id: 'keyboard', name: 'Accessibility Keyboard' },
    keys: { id: 'keyboard', name: 'Accessibility Keyboard' },
    virtualkeyboard: { id: 'keyboard', name: 'Accessibility Keyboard' },

    browser: { id: 'browser', name: 'Web Navigator' },
    web: { id: 'browser', name: 'Web Navigator' },
    internet: { id: 'browser', name: 'Web Navigator' },

    settings: { id: 'settings', name: 'Tracking & Sensitivity Settings' },
    options: { id: 'settings', name: 'Tracking & Sensitivity Settings' },
    config: { id: 'settings', name: 'Tracking & Sensitivity Settings' },
    preferences: { id: 'settings', name: 'Tracking & Sensitivity Settings' },

    preset: { id: 'profile_presets', name: 'Profile & Environment Presets' },
    presets: { id: 'profile_presets', name: 'Profile & Environment Presets' },
    profile: { id: 'profile_presets', name: 'Profile & Environment Presets' },
    profiles: { id: 'profile_presets', name: 'Profile & Environment Presets' },
    lighting: { id: 'profile_presets', name: 'Profile & Environment Presets' },

    logger: { id: 'performance_logger', name: 'Performance & Jitter Logger' },
    log: { id: 'performance_logger', name: 'Performance & Jitter Logger' },
    performance: { id: 'performance_logger', name: 'Performance & Jitter Logger' },
    telemetry: { id: 'performance_logger', name: 'Performance & Jitter Logger' },
    jitter: { id: 'performance_logger', name: 'Performance & Jitter Logger' },
    metrics: { id: 'performance_logger', name: 'Performance & Jitter Logger' },

    target: { id: 'target_practice', name: 'Target Practice Drill' },
    aim: { id: 'target_practice', name: 'Target Practice Drill' },
    practice: { id: 'target_practice', name: 'Target Practice Drill' },
    drill: { id: 'target_practice', name: 'Target Practice Drill' },
  };

  let candidateApp = remainder;
  if (candidateApp.startsWith('open ')) {
    candidateApp = candidateApp.substring(5).trim();
  } else if (candidateApp.startsWith('launch ')) {
    candidateApp = candidateApp.substring(7).trim();
  } else if (candidateApp.startsWith('show ')) {
    candidateApp = candidateApp.substring(5).trim();
  } else if (candidateApp.startsWith('start app ')) {
    candidateApp = candidateApp.substring(10).trim();
  }

  for (const [key, val] of Object.entries(appMap)) {
    if (candidateApp === key || candidateApp.includes(key)) {
      return {
        raw: transcript,
        command: `Sparrow ${remainder}`,
        action: 'open_app',
        targetAppId: val.id,
        label: `Open ${val.name}`,
      };
    }
  }

  // 6. Calibrate
  if (
    remainder === 'calibrate' ||
    remainder === 'calibration' ||
    remainder.includes('calibration wizard') ||
    remainder.includes('start calibration')
  ) {
    return {
      raw: transcript,
      command: `Sparrow ${remainder}`,
      action: 'calibrate',
      label: 'Launch 5-Point Calibration Wizard',
    };
  }

  // 7. Desktop Bridge
  if (
    remainder === 'bridge' ||
    remainder.includes('desktop bridge') ||
    remainder.includes('host bridge') ||
    remainder.includes('connect bridge')
  ) {
    return {
      raw: transcript,
      command: `Sparrow ${remainder}`,
      action: 'bridge',
      label: 'Open Host OS Desktop Bridge',
    };
  }

  // 8. Login / Account
  if (
    remainder === 'login' ||
    remainder === 'sign in' ||
    remainder === 'account' ||
    remainder.includes('user profile')
  ) {
    return {
      raw: transcript,
      command: `Sparrow ${remainder}`,
      action: 'login',
      label: 'Open Account & Sign In',
    };
  }

  // 9. Audio & Voice Mute / Unmute
  if (
    remainder === 'mute' ||
    remainder === 'mute voice' ||
    remainder === 'mute mic' ||
    remainder.includes('mute voice') ||
    remainder.includes('mute mic') ||
    remainder.includes('mute sound') ||
    remainder.includes('sound off')
  ) {
    return {
      raw: transcript,
      command: `Sparrow ${remainder}`,
      action: 'mute',
      label: 'Mute Audio Feedback & Voice Listening',
    };
  }
  if (
    remainder === 'unmute' ||
    remainder === 'unmute voice' ||
    remainder === 'unmute mic' ||
    remainder.includes('unmute voice') ||
    remainder.includes('unmute mic') ||
    remainder.includes('sound on') ||
    remainder.includes('audio on')
  ) {
    return {
      raw: transcript,
      command: `Sparrow ${remainder}`,
      action: 'unmute',
      label: 'Unmute Audio & Voice Recognition',
    };
  }

  // 10. Help / Commands cheat sheet
  if (
    remainder === 'help' ||
    remainder === 'commands' ||
    remainder.includes('voice commands') ||
    remainder.includes('what can i say')
  ) {
    return {
      raw: transcript,
      command: `Sparrow ${remainder}`,
      action: 'help',
      label: 'Show Voice Command Cheatsheet',
    };
  }

  return {
    raw: transcript,
    command: `Sparrow ${remainder}`,
    action: 'unknown',
    label: `Command "${remainder}" not recognized (Say "Sparrow help" for list)`,
  };
}

function loadSavedTrackingConfig(): TrackingConfig {
  try {
    const saved = localStorage.getItem('sparrow_tracking_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_TRACKING_CONFIG, ...parsed };
    }
  } catch {
    // fallback
  }
  return DEFAULT_TRACKING_CONFIG;
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [config, setConfig] = useState<TrackingConfig>(loadSavedTrackingConfig);
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

  // Voice Command Engine State
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(true);
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceToast, setVoiceToast] = useState<{
    command: string;
    label: string;
    action: string;
    success: boolean;
    timestamp: number;
  } | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(true);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [requestedAppOpen, setRequestedAppOpen] = useState<{ id: string; timestamp: number } | null>(null);

  const lastProcessedTimeRef = useRef<number>(0);
  const lastProcessedCommandRef = useRef<string>('');
  const restartTimeoutRef = useRef<number | null>(null);
  const activeRecognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);
  const isVoiceEnabledRef = useRef<boolean>(true);
  const isCancelledRef = useRef<boolean>(false);

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

  // Stop Camera tracking cleanly
  const stopCamera = useCallback(() => {
    faceTracker.stop();
    setIsCameraStarted(false);
    setCameraStatus('idle');
    sounds.playClick('right');
  }, []);

  // Safe Logout: clears session, halts camera, and returns to login gate
  const handleLogout = useCallback(() => {
    stopCamera();
    authService.logout();
    setCurrentUser(null);
  }, [stopCamera]);

  // Successful safe login handler: restores user's recorded settings & presets
  const handleLoginSuccess = useCallback((user: UserProfile) => {
    setCurrentUser(user);
    setIsLoginModalOpen(false);

    // Retrieve saved settings & presets for this specific user
    const saved = authService.getUserSettings(user.email || user.id);
    if (saved?.config) {
      const merged = { ...DEFAULT_TRACKING_CONFIG, ...saved.config };
      setConfig(merged);
      faceTracker.updateConfig(merged);
    }
    if (saved?.calibration) {
      faceTracker.setCalibration(saved.calibration);
    }

    // Launch camera after safe authentication
    setTimeout(() => {
      startCamera();
    }, 250);
  }, [startCamera]);

  // Only auto-start camera on mount IF an active user session is already present
  useEffect(() => {
    faceTracker.updateConfig(config);
    if (currentUser) {
      startCamera();
    }
  }, [currentUser, startCamera]);

  const handleUpdateConfig = useCallback((newConfig: Partial<TrackingConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      faceTracker.updateConfig(updated);
      try {
        localStorage.setItem('sparrow_tracking_config', JSON.stringify(updated));
      } catch {
        // ignore
      }
      if (currentUser?.email && currentUser.provider !== 'guest') {
        authService.saveUserSettings(currentUser.email, { config: updated });
      }
      return updated;
    });
  }, [currentUser]);

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
    if (currentUser?.email && currentUser.provider !== 'guest') {
      authService.saveUserSettings(currentUser.email, { calibration: data });
    }
  }, [currentUser]);

  // Dispatch virtual DOM click at coordinate with deep interactive button targeting
  const simulateVirtualClick = useCallback((x: number, y: number, button: 'left' | 'right' = 'left') => {
    const rawEl = document.elementFromPoint(x, y);
    if (rawEl) {
      const target =
        (rawEl.closest('button, a, input, select, textarea, [role="button"], [tabindex]') as HTMLElement) ||
        (rawEl as HTMLElement);

      target.dispatchEvent(
        new MouseEvent(button === 'right' ? 'contextmenu' : 'click', {
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
          view: window,
          button: button === 'right' ? 2 : 0,
        })
      );

      if (button === 'left' && typeof target.click === 'function') {
        target.click();
      }
    }
  }, []);

  /**
   * Stop Speech Recognition Engine cleanly
   */
  const stopVoiceEngine = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (activeRecognitionRef.current) {
      try {
        activeRecognitionRef.current.abort();
      } catch {
        // ignore
      }
      activeRecognitionRef.current = null;
    }
    setIsVoiceListening(false);
  }, []);

  /**
   * Continuous Speech Recognition Engine Setup
   * Uses Web Speech API with automatic resilience, fresh instance creation, and silence recovery
   */
  const startVoiceEngine = useCallback(() => {
    if (typeof window === 'undefined') return;
    const win = window as unknown as WindowWithSpeechRecognition;
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSpeechSupported(false);
      setVoiceError('Speech recognition is not natively supported in this browser. You can use the Voice Cheatsheet Simulator to test commands.');
      return;
    }

    if (!isVoiceEnabledRef.current || isCancelledRef.current) {
      return;
    }

    // Clean up any existing instance and restart timeouts
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (activeRecognitionRef.current) {
      try {
        activeRecognitionRef.current.abort();
      } catch {
        // ignore
      }
      activeRecognitionRef.current = null;
    }

    try {
      const rec = new SpeechRecognitionAPI();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        if (!isCancelledRef.current && isVoiceEnabledRef.current) {
          setIsVoiceListening(true);
          setVoiceError(null);
        }
      };

      rec.onresult = (event: SpeechRecognitionEventLike) => {
        if (isCancelledRef.current || !isVoiceEnabledRef.current) return;
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcript;
          } else {
            interimText += transcript;
          }
        }

        const currentText = (finalText || interimText).trim();
        setVoiceTranscript(currentText);

        const textToProcess = (finalText || interimText).trim();
        if (textToProcess) {
          const intent = parseVoiceIntent(textToProcess);
          if (intent && intent.action !== 'unknown') {
            const now = Date.now();
            // Debounce repeated identical triggers within 1.2 seconds
            if (
              now - lastProcessedTimeRef.current > 1200 ||
              lastProcessedCommandRef.current !== intent.command
            ) {
              lastProcessedTimeRef.current = now;
              lastProcessedCommandRef.current = intent.command;
              executeVoiceIntent(intent);

              // Auto-clear transcript after successful execution
              setTimeout(() => {
                if (!isCancelledRef.current) setVoiceTranscript('');
              }, 1400);
            }
          }
        }
      };

      rec.onerror = (event: SpeechRecognitionErrorEventLike) => {
        if (isCancelledRef.current) return;
        // 'no-speech' is expected during silent periods in continuous recognition
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setVoiceError('Microphone permission required. Click "Unmute Voice" to allow access.');
          setIsVoiceListening(false);
          return;
        }
        console.warn('Speech recognition notice:', event.error);
      };

      rec.onend = () => {
        activeRecognitionRef.current = null;
        if (!isCancelledRef.current && isVoiceEnabledRef.current) {
          // Restart with a freshly instantiated SpeechRecognition object
          restartTimeoutRef.current = window.setTimeout(() => {
            if (!isCancelledRef.current && isVoiceEnabledRef.current) {
              startVoiceEngine();
            }
          }, 250);
        } else {
          setIsVoiceListening(false);
        }
      };

      activeRecognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.warn('Speech recognition start notice:', err);
      setIsVoiceListening(false);
    }
  }, []);

  /**
   * Explicitly Unmute Voice & Request Mic Access
   */
  const handleUnmuteVoice = useCallback(async () => {
    setVoiceError(null);
    sounds.playVoiceCommand();

    // Explicitly prompt for mic permission with getUserMedia to unlock in-browser audio
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop audio tracks after obtaining permission grant
        stream.getTracks().forEach((track) => track.stop());
      } catch (err: unknown) {
        console.warn('Microphone permission request error:', err);
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('Permission') || msg.includes('denied') || msg.includes('NotAllowedError')) {
          setVoiceError('Microphone permission blocked. Please click the lock or camera icon in your address bar to allow mic access.');
        }
      }
    }

    setIsVoiceEnabled(true);
    isVoiceEnabledRef.current = true;
    startVoiceEngine();
  }, [startVoiceEngine]);

  /**
   * Explicitly Mute Voice Recognition
   */
  const handleMuteVoice = useCallback(() => {
    sounds.playClick('right');
    setIsVoiceEnabled(false);
    isVoiceEnabledRef.current = false;
    setIsVoiceListening(false);
    setVoiceTranscript('');
    stopVoiceEngine();
  }, [stopVoiceEngine]);

  /**
   * Toggle Voice: if not currently listening/unmuted, always Unmute!
   */
  const handleToggleVoice = useCallback(() => {
    if (isVoiceListening) {
      handleMuteVoice();
    } else {
      handleUnmuteVoice();
    }
  }, [isVoiceListening, handleMuteVoice, handleUnmuteVoice]);

  /**
   * Speech-to-Intent Execution Engine
   * Executes recognized actions with sound feedback and visual notification HUD
   */
  const executeVoiceIntent = useCallback(
    (intent: VoiceIntent) => {
      setVoiceToast({
        command: intent.command,
        label: intent.label,
        action: intent.action,
        success: intent.action !== 'unknown',
        timestamp: Date.now(),
      });

      if (intent.action === 'unknown') {
        return;
      }

      // Audio confirmation chime
      sounds.playVoiceCommand();

      switch (intent.action) {
        case 'recenter':
          faceTracker.recenter(trackingState.rawNoseX, trackingState.rawNoseY);
          break;

        case 'stop':
          setConfig((prev) => {
            faceTracker.setCursorFrozen(true);
            return { ...prev, isCursorFrozen: true };
          });
          break;

        case 'start':
          setConfig((prev) => {
            faceTracker.setCursorFrozen(false);
            return { ...prev, isCursorFrozen: false };
          });
          if (!isCameraStarted) {
            startCamera();
          }
          break;

        case 'click':
          nativeBridge.sendClick('left');
          sounds.playClick('left');
          simulateVirtualClick(trackingState.cursorX, trackingState.cursorY, 'left');
          break;

        case 'right_click':
          nativeBridge.sendClick('right');
          sounds.playClick('right');
          simulateVirtualClick(trackingState.cursorX, trackingState.cursorY, 'right');
          break;

        case 'double_click':
          nativeBridge.sendClick('left');
          sounds.playClick('left');
          simulateVirtualClick(trackingState.cursorX, trackingState.cursorY, 'left');
          setTimeout(() => {
            nativeBridge.sendClick('left');
            sounds.playClick('left');
            simulateVirtualClick(trackingState.cursorX, trackingState.cursorY, 'left');
          }, 120);
          break;

        case 'open_app':
          if (intent.targetAppId) {
            setRequestedAppOpen({ id: intent.targetAppId, timestamp: Date.now() });
          }
          break;

        case 'calibrate':
          setIsCalibrating(true);
          break;

        case 'bridge':
          setIsNativeModalOpen(true);
          break;

        case 'login':
          setIsLoginModalOpen(true);
          break;

        case 'mute':
          setConfig((prev) => ({ ...prev, soundFeedback: false }));
          sounds.setEnabled(false);
          handleMuteVoice();
          break;

        case 'unmute':
          setConfig((prev) => ({ ...prev, soundFeedback: true }));
          sounds.setEnabled(true);
          handleUnmuteVoice();
          break;

        case 'stop_camera':
          stopCamera();
          break;

        case 'start_camera':
          startCamera();
          break;

        case 'help':
          setIsVoiceModalOpen(true);
          break;
      }
    },
    [
      trackingState.rawNoseX,
      trackingState.rawNoseY,
      trackingState.cursorX,
      trackingState.cursorY,
      isCameraStarted,
      startCamera,
      stopCamera,
      simulateVirtualClick,
      handleMuteVoice,
      handleUnmuteVoice,
    ]
  );

  // Auto-start voice recognition on mount
  useEffect(() => {
    isCancelledRef.current = false;
    isVoiceEnabledRef.current = true;
    startVoiceEngine();

    return () => {
      isCancelledRef.current = true;
      stopVoiceEngine();
    };
  }, [startVoiceEngine, stopVoiceEngine]);

  // Auto-dismiss recognized voice HUD toast after 3.8 seconds
  useEffect(() => {
    if (!voiceToast) return;
    const timer = setTimeout(() => {
      setVoiceToast(null);
    }, 3800);
    return () => clearTimeout(timer);
  }, [voiceToast]);

  // Keyboard shortcuts: Spacebar to Recenter, P to Stop/Move Cursor, Escape to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
        setIsVoiceModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRecenter, handleToggleCursorFreeze]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 font-sans select-none">
      {/* Primary continuous tracking video & canvas: maintain 640x480 geometry so MediaPipe and browser decodes never pause when windows are minimized */}
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
          width: '640px',
          height: '480px',
          opacity: 0.0001,
          pointerEvents: 'none',
          zIndex: 1,
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
          width: '640px',
          height: '480px',
          opacity: 0.0001,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* If no user session, render LoginPage first as the mandatory initial authentication gate */}
      {!currentUser ? (
        <LoginPage
          isModal={false}
          onSuccess={handleLoginSuccess}
        />
      ) : (
        <>
          {/* Main Sparrow Interactive Desktop Workspace */}
          <InteractiveDesktop
            trackingState={trackingState}
            config={config}
            nativeStatus={nativeStatus}
            currentUser={currentUser}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onLogout={handleLogout}
            onUpdateConfig={handleUpdateConfig}
            onRecenter={handleRecenter}
            onToggleCursorFreeze={handleToggleCursorFreeze}
            onStartCalibration={() => setIsCalibrating(true)}
            onOpenNativeBridge={() => setIsNativeModalOpen(true)}
            isCameraStarted={isCameraStarted}
            onStartCamera={startCamera}
            onStopCamera={stopCamera}
            isVoiceListening={isVoiceListening}
            voiceTranscript={voiceTranscript}
            lastVoiceAction={voiceToast}
            voiceError={voiceError}
            isSpeechSupported={isSpeechSupported}
            onToggleVoice={handleToggleVoice}
            onOpenVoiceCheatsheet={() => setIsVoiceModalOpen(true)}
            requestedAppOpen={requestedAppOpen}
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
          {config.showWebcamFeed && (
            <WebcamTrackerHUD
              trackingState={trackingState}
              onRecenter={handleRecenter}
              onToggleCursorFreeze={handleToggleCursorFreeze}
              showMesh={config.showFaceMesh}
              isCameraStarted={isCameraStarted}
              onStopCamera={stopCamera}
              onStartCamera={startCamera}
            />
          )}

          {/* Floating Top Quick Controls Bar for Camera & Moving Cursor */}
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 hidden sm:flex items-center gap-2 bg-neutral-900/90 border border-neutral-800 rounded-xl p-1.5 px-3 shadow-xl backdrop-blur-md text-xs">
            {isCameraStarted ? (
              <button
                onClick={stopCamera}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                title="Stop / Close Webcam Camera"
              >
                <CameraOff className="w-3.5 h-3.5 text-rose-400" />
                <span>Stop Camera</span>
              </button>
            ) : (
              <button
                onClick={startCamera}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm animate-pulse"
                title="Start / Open Webcam Camera"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Start Camera</span>
              </button>
            )}

            <button
              onClick={handleToggleCursorFreeze}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border shadow-sm ${
                config.isCursorFrozen
                  ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 animate-pulse'
                  : 'bg-amber-950/80 hover:bg-amber-900 text-amber-200 border-amber-700/60'
              }`}
              title={config.isCursorFrozen ? 'Resume Moving Cursor (Press P)' : 'Stop Moving Cursor & Freeze (Press P)'}
            >
              {config.isCursorFrozen ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current text-white" />
                  <span>Move Cursor</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                  <span>Stop Moving Cursor</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                sounds.playRecenter();
                handleRecenter();
              }}
              className="p-1.5 text-cyan-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              title="Recenter Head Resting Center"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}

      {/* Floating Voice Indicator HUD (Top Right) */}
      {currentUser && (
        <div className="fixed top-4 right-4 z-40 hidden sm:flex items-center gap-2 bg-neutral-900/90 border border-neutral-800 hover:border-cyan-500/40 rounded-xl p-1.5 pl-3 shadow-xl backdrop-blur-md text-xs transition-colors">
          {isVoiceListening ? (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-neutral-300 text-[11px] font-medium">
                {voiceTranscript ? (
                  <span className="text-cyan-300 font-mono">"{voiceTranscript}"</span>
                ) : (
                  <span>
                    Listening: say <strong className="text-cyan-400">"Sparrow ..."</strong>
                  </span>
                )}
              </span>
              <button
                onClick={handleToggleVoice}
                className="p-1.5 rounded-lg text-xs text-emerald-400 hover:bg-emerald-950/60 transition-colors"
                title="Click to Mute Voice Recognition"
              >
                <Mic className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500/80" />
              <span className="text-neutral-400 text-[11px]">Voice Muted</span>
              <button
                onClick={handleToggleVoice}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold shadow-md active:scale-95 transition-all animate-pulse"
                title="Click to Unmute Microphone & Start Voice Commands"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Unmute</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg text-[10px] font-medium transition-colors"
            title="Open Voice Commands Reference & Test Simulator"
          >
            Commands
          </button>
        </div>
      )}

      {/* Speech-to-Intent Recognized Toast HUD (Top Center) */}
      {currentUser && voiceToast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center justify-between gap-3 text-xs animate-in slide-in-from-top-4 duration-200 ${
            voiceToast.action === 'stop'
              ? 'bg-amber-950/95 border-amber-500/60 text-amber-100 shadow-amber-950/40'
              : voiceToast.action === 'start'
              ? 'bg-emerald-950/95 border-emerald-500/60 text-emerald-100 shadow-emerald-950/40'
              : 'bg-neutral-900/95 border-cyan-500/60 text-white shadow-cyan-950/40'
          }`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles className="w-4 h-4 text-cyan-300" />
            </div>
            <div className="overflow-hidden">
              <div className="font-bold flex items-center gap-1.5 truncate">
                <span className="text-cyan-400">⚡ Voice Action</span>
                <span>•</span>
                <span className="font-mono text-cyan-200 truncate">"{voiceToast.command}"</span>
              </div>
              <div className="text-[11px] text-neutral-300 truncate mt-0.5">
                {voiceToast.label}
              </div>
            </div>
          </div>
          <button
            onClick={() => setVoiceToast(null)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Floating Camera Status / Activation Bar if not yet active */}
      {currentUser && !isCameraStarted && !voiceToast && (
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
                {cameraError || 'Click to launch Sparrow live face tracking or say "Sparrow start"'}
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

      {/* Voice Commands Cheatsheet & Interactive Testing Simulator Modal */}
      {isVoiceModalOpen && (
        <VoiceCheatsheetModal
          isOpen={isVoiceModalOpen}
          isListening={isVoiceListening}
          isSupported={isSpeechSupported}
          voiceError={voiceError}
          onClose={() => setIsVoiceModalOpen(false)}
          onToggleVoice={handleToggleVoice}
          onSimulateCommand={(commandText) => {
            const intent = parseVoiceIntent(commandText);
            if (intent) {
              executeVoiceIntent(intent);
            }
          }}
        />
      )}
    </div>
  );
}
