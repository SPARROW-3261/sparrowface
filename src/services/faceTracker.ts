/**
 * Face & Head Motion Tracking Engine
 * Uses MediaPipe FaceLandmarker with adaptive fallback computer vision
 */

import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { CalibrationData, FaceTrackingState, TrackingConfig } from '../types';

export const DEFAULT_TRACKING_CONFIG: TrackingConfig = {
  masterSensitivity: 2.2,
  sensitivityX: 2.2,
  sensitivityY: 2.2,
  smoothing: 0.35, // 0.1 = very smooth, 0.9 = fast
  deadzone: 0.008,
  acceleration: 1.25,
  invertX: false,
  invertY: false,
  dwellClickEnabled: false, // Auto-click disabled by default
  dwellTimeMs: 900,
  dwellRadius: 28,
  blinkClickEnabled: true,
  blinkThreshold: 0.19,
  blinkHoldDurationMs: 400, // 400ms threshold distinguishes intentional clicks from normal 100-250ms blinks
  blinkTriggerMode: 'both_and_winks',
  mouthClickEnabled: true,
  mouthThreshold: 0.42,
  mouthAction: 'left_click',
  cursorStyle: 'laser_glow',
  cursorSize: 26,
  showWebcamFeed: true,
  showFaceMesh: true,
  soundFeedback: true,
  nativeBridgePort: 8765,
  autoConnectNativeBridge: false,
  isCursorFrozen: false,
};

type FrameCallback = (state: FaceTrackingState, canvas?: HTMLCanvasElement) => void;

export class FaceTrackerService {
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private landmarker: FaceLandmarker | null = null;
  private isInitializing: boolean = false;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private stream: MediaStream | null = null;

  private config: TrackingConfig = { ...DEFAULT_TRACKING_CONFIG };
  private listeners: FrameCallback[] = [];

  private smoothedCursorX: number = window.innerWidth / 2;
  private smoothedCursorY: number = window.innerHeight / 2;

  private calibration: CalibrationData = {
    restingNoseX: 0.5,
    restingNoseY: 0.45,
    restingYaw: 0,
    restingPitch: 0,
    minRangeX: -0.15,
    maxRangeX: 0.15,
    minRangeY: -0.12,
    maxRangeY: 0.12,
    isCalibrated: false,
  };

  // Intelligent Eye Blink & Wink State & Timing
  private eyeClosedStartTime: number | null = null;
  private eyeClosedType: 'left' | 'right' | 'both' | null = null;
  private blinkClickFired: boolean = false;
  private lastBlinkClickTime: number = 0;
  private normalBlinkDetectedUntil: number = 0;
  private lastNormalBlinkDuration: number = 0;
  private currentBlinkHoldProgress: number = 0;
  private isBlinkingLeft: boolean = false;
  private isBlinkingRight: boolean = false;
  private isBothEyesClosed: boolean = false;
  private mouthOpenStartTime: number = 0;
  private isMouthOpen: boolean = false;
  private isDragging: boolean = false;

  // FPS calculation
  private lastFrameTime: number = performance.now();
  private frameCount: number = 0;
  private fps: number = 0;
  private latencyMs: number = 0;
  private backgroundTimerId: number | null = null;
  private prevNoseX: number | null = null;
  private prevNoseY: number | null = null;

  constructor() {
    this.smoothedCursorX = window.innerWidth / 2;
    this.smoothedCursorY = window.innerHeight / 2;

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (this.isRunning) {
          // Immediately kickstart loop upon window minimize or restore
          this.loop();
        }
      });
    }
  }

  public updateConfig(newConfig: Partial<TrackingConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): TrackingConfig {
    return { ...this.config };
  }

  public subscribe(callback: FrameCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  public setCalibration(data: Partial<CalibrationData>) {
    this.calibration = { ...this.calibration, ...data, isCalibrated: true };
  }

  public getCalibration(): CalibrationData {
    return { ...this.calibration };
  }

  public recenter(currentNoseX?: number, currentNoseY?: number) {
    if (typeof currentNoseX === 'number' && typeof currentNoseY === 'number') {
      this.calibration.restingNoseX = currentNoseX;
      this.calibration.restingNoseY = currentNoseY;
    }
    this.calibration.isCalibrated = true;
    this.smoothedCursorX = window.innerWidth / 2;
    this.smoothedCursorY = window.innerHeight / 2;
  }

  public toggleCursorFreeze(): boolean {
    this.config.isCursorFrozen = !this.config.isCursorFrozen;
    return this.config.isCursorFrozen;
  }

  public setCursorFrozen(frozen: boolean) {
    this.config.isCursorFrozen = frozen;
  }

  public getStream(): MediaStream | null {
    return this.stream;
  }

  public registerCanvas(canvas: HTMLCanvasElement | null) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
  }

  public async start(videoElement: HTMLVideoElement, previewCanvas?: HTMLCanvasElement): Promise<void> {
    if (this.isRunning && this.stream) {
      if (videoElement && videoElement.srcObject !== this.stream) {
        videoElement.srcObject = this.stream;
        videoElement.play().catch(() => {});
      }
      return;
    }

    this.video = videoElement;
    if (previewCanvas) {
      this.canvas = previewCanvas;
      this.ctx = previewCanvas.getContext('2d');
    }

    try {
      this.isInitializing = true;

      // 1. Get webcam stream with resilient constraints
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });
      } catch (err) {
        console.warn('Standard constraints failed, trying basic video constraints:', err);
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      this.stream = mediaStream;
      this.video.srcObject = mediaStream;
      this.video.muted = true;
      this.video.setAttribute('playsinline', 'true');
      this.video.setAttribute('muted', 'true');

      try {
        await this.video.play();
      } catch {
        // Fallback event listener
        this.video.onloadedmetadata = () => {
          this.video?.play().catch(() => {});
        };
      }

      // Start loop immediately with instant visual centroid tracking!
      this.isRunning = true;
      this.isInitializing = false;
      this.lastFrameTime = performance.now();
      this.loop();

      // 2. Asynchronously load MediaPipe in the background without blocking the camera
      this.initMediaPipeAsync();
    } catch (err) {
      this.isInitializing = false;
      this.isRunning = false;
      throw err;
    }
  }

  private async initMediaPipeAsync() {
    try {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      this.landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      });
      console.log('MediaPipe FaceLandmarker successfully initialized (GPU)');
    } catch (mpError) {
      console.warn('MediaPipe GPU initialization failed, attempting CPU mode:', mpError);
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );
        this.landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
        });
        console.log('MediaPipe FaceLandmarker successfully initialized (CPU)');
      } catch (fallbackError) {
        console.warn('Using high-performance visual centroid tracking:', fallbackError);
      }
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.backgroundTimerId) {
      clearTimeout(this.backgroundTimerId);
      this.backgroundTimerId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
    const stoppedState: FaceTrackingState = {
      hasFace: false,
      isTrackingActive: false,
      isCursorFrozen: this.config.isCursorFrozen,
      rawNoseX: 0.5,
      rawNoseY: 0.5,
      deltaX: 0,
      deltaY: 0,
      cursorX: this.smoothedCursorX,
      cursorY: this.smoothedCursorY,
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
    };
    this.listeners.forEach((listener) => listener(stoppedState, this.canvas || undefined));
  }

  private loop = () => {
    if (!this.isRunning || !this.video) return;

    const startTime = performance.now();

    if (this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      this.processVideoFrame(startTime);
    }

    // FPS measurement
    this.frameCount++;
    if (startTime - this.lastFrameTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (startTime - this.lastFrameTime));
      this.frameCount = 0;
      this.lastFrameTime = startTime;
    }

    if (this.backgroundTimerId) {
      clearTimeout(this.backgroundTimerId);
      this.backgroundTimerId = null;
    }

    // Resilient scheduling:
    // If the browser tab or window is minimized, Chrome suspends requestAnimationFrame callbacks.
    // Use setTimeout so head tracking and host desktop cursor forwarding never freeze when minimized!
    if (typeof document !== 'undefined' && document.hidden) {
      this.backgroundTimerId = window.setTimeout(this.loop, 16);
    } else {
      this.animationFrameId = requestAnimationFrame(this.loop);
      // Backup watchdog timer: if rAF is paused (e.g. window minimized right after rAF schedule)
      this.backgroundTimerId = window.setTimeout(() => {
        if (this.isRunning && typeof document !== 'undefined' && document.hidden) {
          this.loop();
        }
      }, 45);
    }
  };

  private processVideoFrame(timestamp: number) {
    if (!this.video) return;

    const videoW = this.video.videoWidth || 640;
    const videoH = this.video.videoHeight || 480;

    let noseX = 0.5;
    let noseY = 0.5;
    let leftEAR = 0.3;
    let rightEAR = 0.3;
    let mouthMAR = 0.1;
    let pitch = 0;
    let yaw = 0;
    let roll = 0;
    let hasFace = false;

    // Check if Landmarker is available
    if (this.landmarker) {
      try {
        const results = this.landmarker.detectForVideo(this.video, timestamp);
        if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
          const landmarks = results.faceLandmarks[0];
          hasFace = true;

          // Nose tip is landmark 1 or 4
          const nose = landmarks[1];
          // Video is mirrored horizontally for intuitive head control:
          // User turns head left -> mirrored nose moves left
          noseX = 1 - nose.x;
          noseY = nose.y;

          // Left Eye EAR (Landmarks 33, 133, 159, 145)
          // Because of mirroring, user's left eye is on right side of image
          const leftEyeOuter = landmarks[33];
          const leftEyeInner = landmarks[133];
          const leftEyeTop = landmarks[159];
          const leftEyeBottom = landmarks[145];
          const leftEyeWidth = Math.hypot(leftEyeOuter.x - leftEyeInner.x, leftEyeOuter.y - leftEyeInner.y);
          const leftEyeHeight = Math.hypot(leftEyeTop.x - leftEyeBottom.x, leftEyeTop.y - leftEyeBottom.y);
          leftEAR = leftEyeWidth > 0 ? leftEyeHeight / leftEyeWidth : 0.3;

          // Right Eye EAR (Landmarks 362, 263, 386, 374)
          const rightEyeOuter = landmarks[263];
          const rightEyeInner = landmarks[362];
          const rightEyeTop = landmarks[386];
          const rightEyeBottom = landmarks[374];
          const rightEyeWidth = Math.hypot(rightEyeOuter.x - rightEyeInner.x, rightEyeOuter.y - rightEyeInner.y);
          const rightEyeHeight = Math.hypot(rightEyeTop.x - rightEyeBottom.x, rightEyeTop.y - rightEyeBottom.y);
          rightEAR = rightEyeWidth > 0 ? rightEyeHeight / rightEyeWidth : 0.3;

          // Mouth MAR (Landmarks 13, 14, 61, 291)
          const upperLip = landmarks[13];
          const lowerLip = landmarks[14];
          const mouthCornerLeft = landmarks[61];
          const mouthCornerRight = landmarks[291];
          const mouthWidth = Math.hypot(mouthCornerLeft.x - mouthCornerRight.x, mouthCornerLeft.y - mouthCornerRight.y);
          const mouthHeight = Math.hypot(upperLip.x - lowerLip.x, upperLip.y - lowerLip.y);
          mouthMAR = mouthWidth > 0 ? mouthHeight / mouthWidth : 0.1;

          // Head Pose: forehead(10), chin(152)
          const forehead = landmarks[10];
          const chin = landmarks[152];
          pitch = (nose.y - (forehead.y + chin.y) / 2) * 100;
          yaw = (nose.x - (leftEyeOuter.x + rightEyeOuter.x) / 2) * 100;
          roll = Math.atan2(rightEyeOuter.y - leftEyeOuter.y, rightEyeOuter.x - leftEyeOuter.x) * (180 / Math.PI);

          // If calibration is not set yet, automatically adopt first resting pose
          if (!this.calibration.isCalibrated) {
            this.calibration.restingNoseX = noseX;
            this.calibration.restingNoseY = noseY;
            this.calibration.restingPitch = pitch;
            this.calibration.restingYaw = yaw;
            this.calibration.isCalibrated = true;
          }

          // Optional: render mesh overlay on preview canvas safely
          if (this.canvas && this.ctx && this.config.showFaceMesh) {
            try {
              this.drawMeshPreview(landmarks, videoW, videoH, noseX, noseY);
            } catch {
              // Canvas may be hidden or detached during window minimize, ignore
            }
          }
        }
      } catch (detectErr) {
        // detection dropped frame
      }
    } else {
      // Fallback: brightness / optical centroid tracker
      const fallbackData = this.detectCentroidFallback(this.video, videoW, videoH);
      if (fallbackData) {
        hasFace = true;
        noseX = fallbackData.x;
        noseY = fallbackData.y;
        if (!this.calibration.isCalibrated) {
          this.calibration.restingNoseX = noseX;
          this.calibration.restingNoseY = noseY;
          this.calibration.isCalibrated = true;
        }
      }
    }

    // Gesture detection
    let activeGesture: string | null = null;
    const now = performance.now();

    // Robust Blink vs. Wink vs. Normal Involuntary Blink Classifier
    const isLeftEyeClosed = leftEAR < this.config.blinkThreshold;
    const isRightEyeClosed = rightEAR < this.config.blinkThreshold;
    const isBothClosed = isLeftEyeClosed && isRightEyeClosed;
    const isLeftWink = isLeftEyeClosed && !isRightEyeClosed;
    const isRightWink = isRightEyeClosed && !isLeftEyeClosed;
    const isAnyEyeClosed = isLeftEyeClosed || isRightEyeClosed;

    const holdThreshold = this.config.blinkHoldDurationMs || 400;
    const triggerMode = this.config.blinkTriggerMode || 'both_and_winks';

    let isNormalBlink = now < this.normalBlinkDetectedUntil;
    let blinkHoldProgress = 0;

    if (this.config.blinkClickEnabled && hasFace) {
      if (isAnyEyeClosed) {
        // Eyes are currently closed
        const currentType: 'left' | 'right' | 'both' = isBothClosed ? 'both' : (isLeftWink ? 'left' : 'right');

        if (this.eyeClosedStartTime === null) {
          // Just closed! Record start time
          this.eyeClosedStartTime = now;
          this.eyeClosedType = currentType;
          this.blinkClickFired = false;
        } else {
          // If eye type upgraded to 'both' within first 120ms (e.g. slight natural eyelid closure asymmetry)
          if (currentType === 'both' && this.eyeClosedType !== 'both' && (now - this.eyeClosedStartTime < 120)) {
            this.eyeClosedType = 'both';
          }
        }

        const elapsed = now - this.eyeClosedStartTime;
        blinkHoldProgress = Math.min(1, elapsed / holdThreshold);
        this.currentBlinkHoldProgress = blinkHoldProgress;

        const activeType = this.eyeClosedType || currentType;
        this.isBlinkingLeft = activeType === 'left' && elapsed >= holdThreshold;
        this.isBlinkingRight = activeType === 'right' && elapsed >= holdThreshold;
        this.isBothEyesClosed = isBothClosed;

        // Check if held long enough to exceed normal involuntary blink duration
        // and qualify as an INTENTIONAL CLICK!
        if (elapsed >= holdThreshold && !this.blinkClickFired && (now - this.lastBlinkClickTime > 450)) {
          if (activeType === 'both' && (triggerMode === 'both_and_winks' || triggerMode === 'both_eyes_only')) {
            // Intentional Both-Eyes Long Blink Click
            activeGesture = 'blink_click';
            this.blinkClickFired = true;
            this.lastBlinkClickTime = now;
          } else if (activeType === 'left' && (triggerMode === 'both_and_winks' || triggerMode === 'winks_only')) {
            // Intentional Left Wink Click (Left click)
            activeGesture = 'wink_left';
            this.blinkClickFired = true;
            this.lastBlinkClickTime = now;
          } else if (activeType === 'right' && (triggerMode === 'both_and_winks' || triggerMode === 'winks_only')) {
            // Intentional Right Wink Click (Right click)
            activeGesture = 'wink_right';
            this.blinkClickFired = true;
            this.lastBlinkClickTime = now;
          }
        }
      } else {
        // Eyes are currently OPEN
        this.isBlinkingLeft = false;
        this.isBlinkingRight = false;
        this.isBothEyesClosed = false;

        if (this.eyeClosedStartTime !== null) {
          const closedDuration = now - this.eyeClosedStartTime;

          // If closed and opened before reaching intentional hold duration (and wasn't a micro-glitch < 40ms)
          // and click didn't fire:
          if (closedDuration >= 40 && closedDuration < holdThreshold && !this.blinkClickFired) {
            // NORMAL INVOLUNTARY BLINK!
            // Correctly identified and ignored without accidental click!
            this.lastNormalBlinkDuration = Math.round(closedDuration);
            this.normalBlinkDetectedUntil = now + 900;
            isNormalBlink = true;
          }

          // Reset timers for next blink/wink
          this.eyeClosedStartTime = null;
          this.eyeClosedType = null;
          this.blinkClickFired = false;
          this.currentBlinkHoldProgress = 0;
        }
      }
    } else {
      this.eyeClosedStartTime = null;
      this.eyeClosedType = null;
      this.blinkClickFired = false;
      this.currentBlinkHoldProgress = 0;
      this.isBlinkingLeft = false;
      this.isBlinkingRight = false;
      this.isBothEyesClosed = false;
    }

    // Mouth Open detection
    if (this.config.mouthClickEnabled && hasFace) {
      if (mouthMAR > this.config.mouthThreshold) {
        if (!this.isMouthOpen) {
          this.isMouthOpen = true;
          this.mouthOpenStartTime = now;
          if (this.config.mouthAction === 'drag_toggle') {
            this.isDragging = !this.isDragging;
            activeGesture = this.isDragging ? 'drag_start' : 'drag_stop';
          } else {
            activeGesture = 'mouth_click';
          }
        }
      } else {
        this.isMouthOpen = false;
      }
    }

    // Cursor movement calculations: only update when face is actively tracked and not frozen
    let deltaX = 0;
    let deltaY = 0;

    if (hasFace && !this.config.isCursorFrozen) {
      deltaX = (noseX - this.calibration.restingNoseX);
      deltaY = (noseY - this.calibration.restingNoseY);

      if (this.config.invertX) deltaX = -deltaX;
      if (this.config.invertY) deltaY = -deltaY;

      // Jitter dampening / frame noise gating:
      // If motion from previous frame is within small noise floor, hold steady to let user target/click cleanly
      const frameDelta = (this.prevNoseX !== null && this.prevNoseY !== null)
        ? Math.hypot(noseX - this.prevNoseX, noseY - this.prevNoseY)
        : 1;

      if (frameDelta > (this.config.deadzone * 0.35)) {
        this.prevNoseX = noseX;
        this.prevNoseY = noseY;
      }

      // Rest-pose deadzone: smooth continuous attenuation near center rather than a harsh snap
      const restDistance = Math.hypot(deltaX, deltaY);
      if (restDistance < this.config.deadzone) {
        const softFactor = Math.pow(restDistance / Math.max(0.0001, this.config.deadzone), 1.5);
        deltaX *= softFactor;
        deltaY *= softFactor;
      }

      // Dynamic responsiveness & progressive acceleration
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      const accelFactor = Math.max(1, this.config.acceleration || 1.25);
      const accelBoostX = 1 + (accelFactor - 1) * Math.min(2.5, absX * 14);
      const accelBoostY = 1 + (accelFactor - 1) * Math.min(2.5, absY * 14);
      const effectiveDeltaX = deltaX * accelBoostX;
      const effectiveDeltaY = deltaY * accelBoostY;

      // Compute target screen cursor position
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      const sensX = Math.max(0.1, this.config.sensitivityX);
      const sensY = Math.max(0.1, this.config.sensitivityY);
      const targetX = screenWidth / 2 + effectiveDeltaX * screenWidth * sensX * 5.5;
      const targetY = screenHeight / 2 + effectiveDeltaY * screenHeight * sensY * 5.5;

      // Subpixel deadband: do not jitter when hovering directly over a target
      const distToTarget = Math.hypot(targetX - this.smoothedCursorX, targetY - this.smoothedCursorY);
      if (distToTarget > 1.2) {
        const alpha = Math.max(0.04, Math.min(0.96, this.config.smoothing));
        this.smoothedCursorX = this.smoothedCursorX + (targetX - this.smoothedCursorX) * alpha;
        this.smoothedCursorY = this.smoothedCursorY + (targetY - this.smoothedCursorY) * alpha;

        // Clamp inside viewport
        this.smoothedCursorX = Math.max(0, Math.min(screenWidth - 1, this.smoothedCursorX));
        this.smoothedCursorY = Math.max(0, Math.min(screenHeight - 1, this.smoothedCursorY));
      }
    }

    this.latencyMs = Math.round(performance.now() - timestamp);

    const state: FaceTrackingState = {
      hasFace,
      isTrackingActive: this.isRunning,
      isCursorFrozen: this.config.isCursorFrozen,
      rawNoseX: noseX,
      rawNoseY: noseY,
      deltaX,
      deltaY,
      cursorX: this.smoothedCursorX,
      cursorY: this.smoothedCursorY,
      pitch,
      yaw,
      roll,
      leftEyeOpenRatio: leftEAR,
      rightEyeOpenRatio: rightEAR,
      mouthOpenRatio: mouthMAR,
      isBlinkingLeft: this.isBlinkingLeft,
      isBlinkingRight: this.isBlinkingRight,
      isBothEyesClosed: this.isBothEyesClosed,
      isNormalBlink,
      blinkDurationMs: this.lastNormalBlinkDuration,
      blinkHoldProgress,
      isMouthOpen: this.isMouthOpen,
      isDragging: this.isDragging,
      fps: this.fps,
      latencyMs: this.latencyMs,
      activeGesture,
    };

    // Notify listeners
    this.listeners.forEach((listener) => listener(state, this.canvas || undefined));
  }

  private drawMeshPreview(
    landmarks: { x: number; y: number; z: number }[],
    width: number,
    height: number,
    noseX: number,
    noseY: number
  ) {
    if (!this.canvas || !this.ctx || !this.video) return;
    if (width <= 0 || height <= 0) return;

    try {
      if (this.canvas.width !== width) this.canvas.width = width;
      if (this.canvas.height !== height) this.canvas.height = height;

      this.ctx.clearRect(0, 0, width, height);

      // Draw video frame mirrored
      this.ctx.save();
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(this.video, -width, 0, width, height);
      this.ctx.restore();

    // Subtle dark gradient vignette for high tech look
    this.ctx.fillStyle = 'rgba(10, 15, 26, 0.25)';
    this.ctx.fillRect(0, 0, width, height);

    // Draw facial landmark wireframe (connective key contours)
    const keyPoints = [
      10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
      400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
      54, 103, 67, 109
    ];

    this.ctx.beginPath();
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)'; // Cyan wireframe
    this.ctx.lineWidth = 1;

    for (let i = 0; i < keyPoints.length; i++) {
      const idx = keyPoints[i];
      const p = landmarks[idx];
      // Mirrored X coordinate
      const px = (1 - p.x) * width;
      const py = p.y * height;
      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }
    this.ctx.closePath();
    this.ctx.stroke();

    // Eye contours
    [33, 133, 159, 145].forEach((idx) => {
      const p = landmarks[idx];
      this.ctx!.fillStyle = '#38bdf8';
      this.ctx!.fillRect((1 - p.x) * width - 1, p.y * height - 1, 2, 2);
    });
    [362, 263, 386, 374].forEach((idx) => {
      const p = landmarks[idx];
      this.ctx!.fillStyle = '#38bdf8';
      this.ctx!.fillRect((1 - p.x) * width - 1, p.y * height - 1, 2, 2);
    });

    // Nose tracking crosshair
    const nx = noseX * width;
    const ny = noseY * height;

    this.ctx.beginPath();
    this.ctx.arc(nx, ny, 7, 0, Math.PI * 2);
    this.ctx.strokeStyle = '#a855f7'; // Purple neon
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.fillStyle = '#f43f5e'; // Red center
    this.ctx.beginPath();
    this.ctx.arc(nx, ny, 3, 0, Math.PI * 2);
    this.ctx.fill();

    // Resting center target reticle
    const rx = this.calibration.restingNoseX * width;
    const ry = this.calibration.restingNoseY * height;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(rx, ry, 12, 0, Math.PI * 2);
    this.ctx.stroke();

    // Hairline cross on resting target
    this.ctx.beginPath();
    this.ctx.moveTo(rx - 16, ry);
    this.ctx.lineTo(rx + 16, ry);
    this.ctx.moveTo(rx, ry - 16);
    this.ctx.lineTo(rx, ry + 16);
    this.ctx.stroke();
    } catch {
      // ignore preview rendering exceptions
    }
  }

  private detectCentroidFallback(video: HTMLVideoElement, width: number, height: number): { x: number; y: number } | null {
    // Lightweight canvas pixel difference tracker as fallback
    try {
      if (!this.canvas || !this.ctx) return null;
      this.canvas.width = 160;
      this.canvas.height = 120;
      this.ctx.drawImage(video, 0, 0, 160, 120);
      const imgData = this.ctx.getImageData(0, 0, 160, 120);
      const d = imgData.data;

      let totalWeight = 0;
      let sumX = 0;
      let sumY = 0;

      // Detect skin-toned or high-contrast face region in upper center
      for (let y = 10; y < 110; y += 4) {
        for (let x = 20; x < 140; x += 4) {
          const idx = (y * 160 + x) * 4;
          const r = d[idx];
          const g = d[idx + 1];
          const b = d[idx + 2];
          // Simple skin chrominance heuristic
          if (r > 60 && g > 40 && b > 20 && r > b && (r - g) > 8) {
            totalWeight += 1;
            sumX += x;
            sumY += y;
          }
        }
      }

      if (totalWeight > 40) {
        const cx = (sumX / totalWeight) / 160;
        const cy = (sumY / totalWeight) / 120;
        return { x: 1 - cx, y: cy };
      }
    } catch {
      // Fallback
    }
    return null;
  }
}

export const faceTracker = new FaceTrackerService();
