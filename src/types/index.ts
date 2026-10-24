/**
 * Types for AeroFace Desktop Face & Head Motion Cursor Controller
 */

export type CursorStyle = 'modern_dot' | 'cyber_reticle' | 'laser_glow' | 'high_contrast';
export type MouthAction = 'left_click' | 'drag_toggle' | 'scroll_toggle';
export type DwellAction = 'left_click' | 'right_click' | 'double_click';

export interface TrackingConfig {
  masterSensitivity?: number; // 0.2 - 6.0 (overall scaling)
  sensitivityX: number; // 0.2 - 6.0
  sensitivityY: number; // 0.2 - 6.0
  smoothing: number; // 0.05 (heavy) - 0.95 (raw)
  deadzone: number; // 0.002 - 0.04
  acceleration: number; // 1.0 - 2.5
  invertX: boolean;
  invertY: boolean;
  dwellClickEnabled: boolean;
  dwellTimeMs: number; // 400 - 2000 ms
  dwellRadius: number; // pixels radius for dwell detection
  blinkClickEnabled: boolean;
  blinkThreshold: number; // 0.15 - 0.35 EAR
  blinkHoldDurationMs: number; // 150 - 1200 ms: hold time required to differentiate intentional click from normal blink
  blinkTriggerMode?: 'both_and_winks' | 'winks_only' | 'both_eyes_only';
  mouthClickEnabled: boolean;
  mouthThreshold: number; // 0.3 - 0.7 MAR
  mouthAction: MouthAction;
  cursorStyle: CursorStyle;
  cursorSize: number; // 16 - 48 px
  showWebcamFeed: boolean;
  showFaceMesh: boolean;
  soundFeedback: boolean;
  nativeBridgePort: number;
  autoConnectNativeBridge: boolean;
  isCursorFrozen: boolean; // Controls whether face motion moves the cursor or freezes it
}

export interface FaceTrackingState {
  hasFace: boolean;
  isTrackingActive: boolean;
  isCursorFrozen: boolean;
  rawNoseX: number; // 0 to 1 in video coordinates
  rawNoseY: number; // 0 to 1
  deltaX: number; // normalized relative to resting
  deltaY: number;
  cursorX: number; // absolute screen pixels
  cursorY: number;
  pitch: number; // degrees
  yaw: number;
  roll: number;
  leftEyeOpenRatio: number;
  rightEyeOpenRatio: number;
  mouthOpenRatio: number;
  isBlinkingLeft: boolean;
  isBlinkingRight: boolean;
  isBothEyesClosed?: boolean;
  isNormalBlink?: boolean;
  blinkDurationMs?: number;
  blinkHoldProgress?: number; // 0 to 1 hold progress towards click
  isMouthOpen: boolean;
  isDragging: boolean;
  fps: number;
  latencyMs: number;
  activeGesture: string | null;
}

export interface CalibrationData {
  restingNoseX: number;
  restingNoseY: number;
  restingYaw: number;
  restingPitch: number;
  minRangeX: number;
  maxRangeX: number;
  minRangeY: number;
  maxRangeY: number;
  isCalibrated: boolean;
}

export interface NativeBridgeStatus {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  packetsSent: number;
  url: string;
  lastMessageTime: number | null;
}

export interface DesktopWindow {
  id: string;
  title: string;
  icon: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}
