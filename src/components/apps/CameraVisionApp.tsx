/**
 * Live Face Camera & Motion Heatmap Vision Window
 * Displays live mirrored webcam video with real-time motion heatmap,
 * trailing head trajectory, range-of-motion coverage, and twitchiness/jitter diagnostics.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { FaceTrackingState } from '../../types';
import { faceTracker } from '../../services/faceTracker';
import { sounds } from '../../services/soundEffects';
import {
  Sparkles,
  Eye,
  Smile,
  Compass,
  Flame,
  Activity,
  RotateCcw,
  Info,
  CheckCircle2,
  AlertTriangle,
  Camera,
  CameraOff,
  Play,
  Pause,
} from 'lucide-react';

interface CameraVisionAppProps {
  trackingState: FaceTrackingState;
  onRecenter: () => void;
  showMesh: boolean;
  onToggleMesh: () => void;
  isCameraStarted?: boolean;
  onStartCamera?: () => void;
  onStopCamera?: () => void;
  onToggleCursorFreeze?: () => void;
  isCursorFrozen?: boolean;
}

interface MotionSample {
  x: number;
  y: number;
  time: number;
  vx: number;
  vy: number;
  speed: number;
  accel: number;
}

type HeatmapMode = 'combined' | 'heatmap' | 'trail' | 'mesh';

export const CameraVisionApp: React.FC<CameraVisionAppProps> = ({
  trackingState,
  onRecenter,
  showMesh,
  onToggleMesh,
  isCameraStarted = true,
  onStartCamera,
  onStopCamera,
  onToggleCursorFreeze,
  isCursorFrozen = false,
}) => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const meshCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Heatmap configuration
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('combined');
  const [trailDurationSec, setTrailDurationSec] = useState<number>(6);
  const [showBoundingEnvelope, setShowBoundingEnvelope] = useState<boolean>(true);

  // Sync state to refs for high-fps canvas rendering without React state loops
  const heatmapModeRef = useRef<HeatmapMode>(heatmapMode);
  heatmapModeRef.current = heatmapMode;
  const trailDurationSecRef = useRef<number>(trailDurationSec);
  trailDurationSecRef.current = trailDurationSec;
  const showEnvelopeRef = useRef<boolean>(showBoundingEnvelope);
  showEnvelopeRef.current = showBoundingEnvelope;

  // Latest tracking state ref
  const trackingRef = useRef<FaceTrackingState>(trackingState);
  trackingRef.current = trackingState;

  // Motion history buffer
  const motionHistoryRef = useRef<MotionSample[]>([]);
  const lastSampleRef = useRef<{ x: number; y: number; time: number; vx: number; vy: number } | null>(null);
  const lastMetricsUpdateRef = useRef<number>(0);
  const coveragePercentRef = useRef<number>(0);

  // Throttled UI diagnostics state (updates at most 3 times per second)
  const [rangeCoverage, setRangeCoverage] = useState<number>(0);
  const [twitchinessIndex, setTwitchinessIndex] = useState<number>(0);
  const [quadrantHits, setQuadrantHits] = useState<{ tl: boolean; tr: boolean; bl: boolean; br: boolean }>({
    tl: false,
    tr: false,
    bl: false,
    br: false,
  });

  // Sync webcam stream to video element on mount
  useEffect(() => {
    const stream = faceTracker.getStream();
    if (localVideoRef.current && stream) {
      if (localVideoRef.current.srcObject !== stream) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        localVideoRef.current.play().catch(() => {});
      }
    }
  }, []);

  // Connect mesh canvas to faceTracker for wireframe drawing
  useEffect(() => {
    if (meshCanvasRef.current) {
      faceTracker.registerCanvas(meshCanvasRef.current);
    }
    return () => {
      faceTracker.registerCanvas(null);
    };
  }, []);

  // Clear heatmap history
  const handleClearHeatmap = () => {
    motionHistoryRef.current = [];
    lastSampleRef.current = null;
    coveragePercentRef.current = 0;
    setRangeCoverage(0);
    setTwitchinessIndex(0);
    setQuadrantHits({ tl: false, tr: false, bl: false, br: false });
    sounds.playClick('left');
  };

  // Dedicated 60fps Animation Frame loop for sample sampling, calculations, and canvas rendering
  useEffect(() => {
    let animId: number;

    const renderLoop = () => {
      const now = performance.now();
      const currentTracking = trackingRef.current;
      const durationSec = trailDurationSecRef.current;
      const currentMode = heatmapModeRef.current;
      const showEnv = showEnvelopeRef.current;

      // 1. Process sample if face is detected
      if (currentTracking.hasFace) {
        const curX = currentTracking.rawNoseX;
        const curY = currentTracking.rawNoseY;
        const last = lastSampleRef.current;

        let vx = 0;
        let vy = 0;
        let accel = 0;

        if (last) {
          const dt = Math.max(8, now - last.time) / 1000;
          vx = (curX - last.x) / dt;
          vy = (curY - last.y) / dt;
          const speed = Math.hypot(vx, vy);
          const prevSpeed = Math.hypot(last.vx, last.vy);
          accel = Math.abs(speed - prevSpeed) / dt;

          motionHistoryRef.current.push({
            x: curX,
            y: curY,
            time: now,
            vx,
            vy,
            speed,
            accel,
          });
          lastSampleRef.current = { x: curX, y: curY, time: now, vx, vy };
        } else {
          lastSampleRef.current = { x: curX, y: curY, time: now, vx: 0, vy: 0 };
        }

        // Prune points outside window
        const cutoff = now - durationSec * 1000;
        motionHistoryRef.current = motionHistoryRef.current.filter((s) => s.time >= cutoff);

        // 2. Throttled UI state metrics calculations (at most once every 350ms)
        if (now - lastMetricsUpdateRef.current > 350 && motionHistoryRef.current.length > 8) {
          lastMetricsUpdateRef.current = now;
          const history = motionHistoryRef.current;

          let minX = 1;
          let maxX = 0;
          let minY = 1;
          let maxY = 0;
          let tl = false;
          let tr = false;
          let bl = false;
          let br = false;

          const cal = faceTracker.getCalibration();
          const restingX = cal.restingNoseX;
          const restingY = cal.restingNoseY;

          for (let i = 0; i < history.length; i++) {
            const s = history[i];
            if (s.x < minX) minX = s.x;
            if (s.x > maxX) maxX = s.x;
            if (s.y < minY) minY = s.y;
            if (s.y > maxY) maxY = s.y;

            if (s.x < restingX && s.y < restingY) tl = true;
            if (s.x >= restingX && s.y < restingY) tr = true;
            if (s.x < restingX && s.y >= restingY) bl = true;
            if (s.x >= restingX && s.y >= restingY) br = true;
          }

          const dx = Math.max(0.01, maxX - minX);
          const dy = Math.max(0.01, maxY - minY);
          const coveragePercent = Math.min(100, Math.round(((dx * dy) / 0.04) * 100));
          coveragePercentRef.current = coveragePercent;

          // Twitchiness / Jitter Index
          let reversals = 0;
          let jerkSum = 0;
          for (let i = 2; i < history.length; i++) {
            const prev = history[i - 1];
            const cur = history[i];
            if (cur.speed > 0.04 && prev.speed > 0.04) {
              if (Math.sign(cur.vx) !== Math.sign(prev.vx) && Math.abs(cur.vx - prev.vx) > 0.1) {
                reversals++;
              }
              if (Math.sign(cur.vy) !== Math.sign(prev.vy) && Math.abs(cur.vy - prev.vy) > 0.1) {
                reversals++;
              }
            }
            jerkSum += cur.accel;
          }

          const histDuration = Math.max(0.5, (history[history.length - 1].time - history[0].time) / 1000);
          const jitterScore = Math.min(100, Math.round((reversals / histDuration) * 10 + (jerkSum / history.length) * 1.8));

          setRangeCoverage((prev) => (Math.abs(prev - coveragePercent) > 2 ? coveragePercent : prev));
          setTwitchinessIndex((prev) => (Math.abs(prev - jitterScore) > 2 ? jitterScore : prev));
          setQuadrantHits((prev) => {
            if (prev.tl === tl && prev.tr === tr && prev.bl === bl && prev.br === br) return prev;
            return { tl, tr, bl, br };
          });
        }
      }

      // 3. Render Canvas (zero React re-renders, 60fps direct GPU compositing)
      const canvas = heatmapCanvasRef.current;
      if (canvas) {
        // Dynamically synchronize canvas resolution with device pixel ratio & container size
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
        const targetW = Math.max(320, Math.round((rect.width || 640) * dpr));
        const targetH = Math.max(240, Math.round((rect.height || 480) * dpr));

        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;
          // Responsive scale factor relative to 640px base for mobile/tablet/desktop
          const responsiveScale = Math.max(0.65, Math.min(1.5, width / (640 * dpr)));

          ctx.clearRect(0, 0, width, height);

          const cal = faceTracker.getCalibration();
          const rx = cal.restingNoseX * width;
          const ry = cal.restingNoseY * height;

          // Mode-specific Heatmap / Trails / Diagnostics
          if (currentMode !== 'mesh') {
            const history = motionHistoryRef.current;
            const durationMs = durationSec * 1000;

            // A. Thermal density spots
            if ((currentMode === 'combined' || currentMode === 'heatmap') && history.length > 0) {
              ctx.save();
              ctx.globalCompositeOperation = 'screen';

              for (let i = 0; i < history.length; i += 2) {
                const p = history[i];
                const age = Math.max(0, 1 - (now - p.time) / durationMs);
                if (age <= 0) continue;

                const px = p.x * width;
                const py = p.y * height;
                const isDwell = p.speed < 0.08;
                const radius = (isDwell ? 28 : 18) * responsiveScale;

                const grad = ctx.createRadialGradient(px, py, 2 * responsiveScale, px, py, radius);
                if (isDwell) {
                  grad.addColorStop(0, `rgba(244, 63, 94, ${0.45 * age})`);
                  grad.addColorStop(0.5, `rgba(251, 146, 60, ${0.25 * age})`);
                  grad.addColorStop(1, 'rgba(251, 146, 60, 0)');
                } else {
                  grad.addColorStop(0, `rgba(56, 189, 248, ${0.35 * age})`);
                  grad.addColorStop(0.5, `rgba(168, 85, 247, ${0.18 * age})`);
                  grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
                }

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(px, py, radius, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.restore();
            }

            // B. Trailing vector motion path ribbon
            if ((currentMode === 'combined' || currentMode === 'trail') && history.length > 1) {
              ctx.save();
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';

              for (let i = 1; i < history.length; i++) {
                const p0 = history[i - 1];
                const p1 = history[i];
                const age = Math.max(0, 1 - (now - p1.time) / durationMs);
                if (age <= 0.02) continue;

                const x0 = p0.x * width;
                const y0 = p0.y * height;
                const x1 = p1.x * width;
                const y1 = p1.y * height;

                ctx.lineWidth = Math.max(1.5, 5.5 * age * responsiveScale);
                const isTwitch = p1.accel > 12;
                ctx.strokeStyle = isTwitch
                  ? `rgba(244, 63, 94, ${0.9 * age})`
                  : `rgba(56, 189, 248, ${0.75 * age})`;

                ctx.beginPath();
                ctx.moveTo(x0, y0);
                ctx.lineTo(x1, y1);
                ctx.stroke();
              }
              ctx.restore();
            }

            // C. Bounding envelope
            if (showEnv && history.length > 8) {
              let minX = 1;
              let maxX = 0;
              let minY = 1;
              let maxY = 0;

              for (let i = 0; i < history.length; i++) {
                const s = history[i];
                if (s.x < minX) minX = s.x;
                if (s.x > maxX) maxX = s.x;
                if (s.y < minY) minY = s.y;
                if (s.y > maxY) maxY = s.y;
              }

              const bx = minX * width;
              const by = minY * height;
              const bw = (maxX - minX) * width;
              const bh = (maxY - minY) * height;

              ctx.save();
              ctx.setLineDash([4 * responsiveScale, 4 * responsiveScale]);
              ctx.strokeStyle = coveragePercentRef.current < 20 ? 'rgba(251, 191, 36, 0.6)' : 'rgba(52, 211, 153, 0.6)';
              ctx.lineWidth = 1.5 * responsiveScale;
              ctx.strokeRect(bx, by, bw, bh);

              ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
              ctx.fillRect(bx, Math.max(0, by - 18 * responsiveScale), 105 * responsiveScale, 16 * responsiveScale);
              ctx.fillStyle = '#e2e8f0';
              ctx.font = `${Math.round(10 * responsiveScale)}px monospace`;
              ctx.fillText(`Range: ${coveragePercentRef.current}%`, bx + 6 * responsiveScale, Math.max(12 * responsiveScale, by - 6 * responsiveScale));
              ctx.restore();
            }

            // D. Neutral target resting center
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.lineWidth = Math.max(1, 1.2 * responsiveScale);
            ctx.beginPath();
            ctx.arc(rx, ry, 12 * responsiveScale, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(rx - 16 * responsiveScale, ry);
            ctx.lineTo(rx + 16 * responsiveScale, ry);
            ctx.moveTo(rx, ry - 16 * responsiveScale);
            ctx.lineTo(rx, ry + 16 * responsiveScale);
            ctx.stroke();
            ctx.restore();
          }

          // Persistent Nose Landmark Tracking Marker (Tracking Circle & Crosshair)
          // Always rendered whenever face tracking is active, EVEN WHEN MESH IS DISABLED
          if (currentTracking.hasFace) {
            const curX = currentTracking.rawNoseX * width;
            const curY = currentTracking.rawNoseY * height;

            ctx.save();

            // 1. Subtle Motion displacement vector line from neutral center to active nose position
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.lineWidth = Math.max(1, 1.4 * responsiveScale);
            ctx.setLineDash([3 * responsiveScale, 3 * responsiveScale]);
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            ctx.lineTo(curX, curY);
            ctx.stroke();
            ctx.setLineDash([]);

            // 2. Outer pulsing tracking reticle circle
            const baseRadius = 13 * responsiveScale;
            const pulse = Math.sin(now / 180) * (2 * responsiveScale);
            const outerRadius = baseRadius + pulse;

            ctx.shadowColor = 'rgba(56, 189, 248, 0.7)';
            ctx.shadowBlur = 8 * responsiveScale;

            ctx.beginPath();
            ctx.arc(curX, curY, outerRadius, 0, Math.PI * 2);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = Math.max(1.2, 2 * responsiveScale);
            ctx.stroke();

            // 3. Precision cardinal crosshair lines extending outward
            const crosshairGap = outerRadius + 2 * responsiveScale;
            const crosshairLen = 8 * responsiveScale;
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = Math.max(1, 1.8 * responsiveScale);

            // Left tick
            ctx.beginPath();
            ctx.moveTo(curX - crosshairGap, curY);
            ctx.lineTo(curX - crosshairGap - crosshairLen, curY);
            ctx.stroke();

            // Right tick
            ctx.beginPath();
            ctx.moveTo(curX + crosshairGap, curY);
            ctx.lineTo(curX + crosshairGap + crosshairLen, curY);
            ctx.stroke();

            // Top tick
            ctx.beginPath();
            ctx.moveTo(curX, curY - crosshairGap);
            ctx.lineTo(curX, curY - crosshairGap - crosshairLen);
            ctx.stroke();

            // Bottom tick
            ctx.beginPath();
            ctx.moveTo(curX, curY + crosshairGap);
            ctx.lineTo(curX, curY + crosshairGap + crosshairLen);
            ctx.stroke();

            // 4. Subtle inner crosshair lines with center dot gap
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
            ctx.lineWidth = Math.max(0.8, 1 * responsiveScale);

            ctx.beginPath();
            ctx.moveTo(curX - (outerRadius - 3 * responsiveScale), curY);
            ctx.lineTo(curX - 4 * responsiveScale, curY);
            ctx.moveTo(curX + 4 * responsiveScale, curY);
            ctx.lineTo(curX + (outerRadius - 3 * responsiveScale), curY);

            ctx.moveTo(curX, curY - (outerRadius - 3 * responsiveScale));
            ctx.lineTo(curX, curY - 4 * responsiveScale);
            ctx.moveTo(curX, curY + 4 * responsiveScale);
            ctx.lineTo(curX, curY + (outerRadius - 3 * responsiveScale));
            ctx.stroke();

            // 5. Core solid nose tracking dot with high-contrast white center
            ctx.shadowColor = '#0284c7';
            ctx.shadowBlur = 6 * responsiveScale;

            ctx.beginPath();
            ctx.arc(curX, curY, Math.max(3, 4.5 * responsiveScale), 0, Math.PI * 2);
            ctx.fillStyle = '#38bdf8';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1, 1.6 * responsiveScale);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(curX, curY, Math.max(1.5, 2 * responsiveScale), 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            // 6. Responsive active tracking label tag
            const labelY = curY - outerRadius - 8 * responsiveScale;
            if (labelY > 15) {
              const fontSize = Math.max(8, Math.round(9 * responsiveScale));
              ctx.font = `600 ${fontSize}px monospace`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';

              const tagText = 'NOSE TRACK';
              const textWidth = ctx.measureText(tagText).width;
              const padX = 4 * responsiveScale;
              const padY = 2 * responsiveScale;

              ctx.shadowBlur = 0;
              ctx.fillStyle = 'rgba(10, 15, 26, 0.85)';
              ctx.fillRect(
                curX - textWidth / 2 - padX,
                labelY - fontSize / 2 - padY,
                textWidth + padX * 2,
                fontSize + padY * 2
              );

              ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
              ctx.lineWidth = 0.8;
              ctx.strokeRect(
                curX - textWidth / 2 - padX,
                labelY - fontSize / 2 - padY,
                textWidth + padX * 2,
                fontSize + padY * 2
              );

              ctx.fillStyle = '#7dd3fc';
              ctx.fillText(tagText, curX, labelY);
            }

            ctx.restore();
          }
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Qualitative Range Assessment
  const rangeAssessment = useMemo(() => {
    if (rangeCoverage < 18) {
      return {
        label: 'Limited Range',
        desc: 'Head movement is restricted. Turn your neck slightly further to reach screen corners, or increase sensitivity.',
        color: 'text-amber-400',
        badge: 'bg-amber-950/60 border-amber-700/50 text-amber-300',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
      };
    } else if (rangeCoverage <= 65) {
      return {
        label: 'Optimal Mobility',
        desc: 'Healthy, balanced head travel spanning screen quadrants without neck strain.',
        color: 'text-emerald-400',
        badge: 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
      };
    } else {
      return {
        label: 'Overextended',
        desc: 'Wide head rotations detected. Consider raising sensitivity so smaller head turns reach the edges.',
        color: 'text-cyan-400',
        badge: 'bg-cyan-950/60 border-cyan-700/50 text-cyan-300',
        icon: <Info className="w-3.5 h-3.5 text-cyan-400" />,
      };
    }
  }, [rangeCoverage]);

  // Qualitative Twitchiness Assessment
  const twitchAssessment = useMemo(() => {
    if (twitchinessIndex < 30) {
      return {
        label: 'Steady / Smooth',
        desc: 'Minimal micro-tremor. Excellent steady head control.',
        color: 'text-emerald-400',
        badge: 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
      };
    } else if (twitchinessIndex <= 60) {
      return {
        label: 'Moderate Sway',
        desc: 'Typical natural physiological head sway; well-damped by smoothing filter.',
        color: 'text-cyan-400',
        badge: 'bg-cyan-950/60 border-cyan-700/50 text-cyan-300',
        icon: <Activity className="w-3.5 h-3.5 text-cyan-400" />,
      };
    } else {
      return {
        label: 'Twitchy / Jittery',
        desc: 'Frequent rapid micro-sways or tremors detected. Recommendation: Raise Jitter Filter in Settings.',
        color: 'text-rose-400',
        badge: 'bg-rose-950/60 border-rose-700/50 text-rose-300',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />,
      };
    }
  }, [twitchinessIndex]);

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-100 select-none p-2.5 sm:p-4 overflow-y-auto">
      {/* Top Header & Mode Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2.5 mb-3 border-b border-neutral-800 text-xs">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                trackingState.hasFace ? 'bg-cyan-400 shadow-[0_0_8px_#38bdf8]' : 'bg-amber-400'
              }`}
            />
            <span className="font-semibold text-white text-xs sm:text-sm">Motion Heatmap & Diagnostics</span>
          </div>
          <span className="font-mono text-neutral-500 text-[10px] sm:text-[11px] tabular-nums">
            {trackingState.fps} FPS · {trackingState.latencyMs}ms
          </span>
        </div>

        {/* Heatmap View Selector Tabs (Scrollable on small mobile screens) */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-neutral-900 p-1 rounded-lg border border-neutral-800 text-[10px] sm:text-[11px] overflow-x-auto max-w-full">
          {(
            [
              { id: 'combined', label: 'Heatmap + Trail' },
              { id: 'heatmap', label: 'Thermal Only' },
              { id: 'trail', label: 'Motion Trail' },
              { id: 'mesh', label: 'Wireframe' },
            ] as { id: HeatmapMode; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setHeatmapMode(tab.id)}
              className={`px-2 py-1 sm:py-0.5 rounded whitespace-nowrap transition-colors ${
                heatmapMode === tab.id
                  ? 'bg-neutral-800 text-cyan-300 font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Duration Selector */}
          <div className="flex items-center gap-1 bg-neutral-900 px-2 py-1 rounded border border-neutral-800 text-[10px] sm:text-[11px] text-neutral-400">
            <span>Trail:</span>
            {[3, 6, 10].map((sec) => (
              <button
                key={sec}
                onClick={() => setTrailDurationSec(sec)}
                className={`px-1.5 py-0.5 rounded ${
                  trailDurationSec === sec ? 'bg-neutral-800 text-cyan-300 font-semibold' : 'hover:text-white'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>

          <button
            onClick={handleClearHeatmap}
            className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded border border-neutral-800 text-[10px] sm:text-xs transition-colors"
            title="Reset trailing heatmap history"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {/* Stop Moving Cursor Toggle Button */}
          {onToggleCursorFreeze && (
            <button
              onClick={onToggleCursorFreeze}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] sm:text-xs font-medium transition-colors border shadow-sm ${
                isCursorFrozen
                  ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 animate-pulse'
                  : 'bg-amber-950/70 hover:bg-amber-900 text-amber-200 border-amber-700/60'
              }`}
              title={isCursorFrozen ? 'Resume Moving Cursor (Press P)' : 'Stop Moving Cursor & Freeze (Press P)'}
            >
              {isCursorFrozen ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current text-white" />
                  <span>Move Cursor</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                  <span>Stop Moving</span>
                </>
              )}
            </button>
          )}

          {/* Stop / Start Camera Button */}
          {isCameraStarted && onStopCamera ? (
            <button
              onClick={onStopCamera}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-600/70 rounded text-[10px] sm:text-xs font-semibold transition-colors shadow-sm"
              title="Stop Webcam Stream & Face Tracking"
            >
              <CameraOff className="w-3.5 h-3.5 text-rose-400" />
              <span>Stop Camera</span>
            </button>
          ) : onStartCamera ? (
            <button
              onClick={onStartCamera}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] sm:text-xs font-semibold transition-colors shadow-sm animate-pulse"
              title="Start Webcam Stream & Face Tracking"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Start Camera</span>
            </button>
          ) : null}

          <button
            onClick={() => {
              sounds.playRecenter();
              onRecenter();
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded text-[10px] sm:text-xs transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Recenter</span>
          </button>
        </div>
      </div>

      {/* Main Video Viewport with Live Motion Heatmap & Persistent Tracking Marker */}
      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-xl mb-3 sm:mb-4 flex items-center justify-center min-h-[190px] max-h-[380px]">
        {/* Stopped Camera Overlay */}
        {!isCameraStarted && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-neutral-950/95 text-center p-4 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center text-rose-400 mb-2 shadow-lg">
              <CameraOff className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-white mb-1">Camera Stream is Stopped</div>
            <div className="text-xs text-neutral-400 mb-3 max-w-xs">
              Webcam video hardware is released. Click the button below to turn the camera back on.
            </div>
            {onStartCamera && (
              <button
                onClick={onStartCamera}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-900/40 cursor-pointer active:scale-95 transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>Start Camera</span>
              </button>
            )}
          </div>
        )}

        {/* Live video */}
        <video
          ref={localVideoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover -scale-x-100"
        />

        {/* 3D Face Wireframe canvas */}
        <canvas
          ref={meshCanvasRef}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity ${
            heatmapMode === 'mesh' || showMesh ? 'opacity-100' : 'opacity-0'
          }`}
          width={640}
          height={480}
        />

        {/* Real-time Motion Heatmap Canvas */}
        <canvas
          ref={heatmapCanvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
          width={640}
          height={480}
        />

        {/* Legend Overlay on Canvas */}
        <div className="absolute bottom-2 left-2 z-20 flex items-center gap-3 bg-neutral-950/80 backdrop-blur border border-neutral-800 rounded px-2.5 py-1 text-[10px] text-neutral-400 pointer-events-none">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm" />
            <span>Slow Dwell</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm" />
            <span>Fluid Motion</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm" />
            <span>Twitch / Jerk</span>
          </div>
        </div>
      </div>

      {/* Motion Range & Twitchiness Analysis Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {/* Card 1: Range of Motion Analysis */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-white">Range of Motion</span>
              </div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${rangeAssessment.badge} flex items-center gap-1`}>
                {rangeAssessment.icon}
                <span>{rangeAssessment.label}</span>
              </span>
            </div>

            {/* Range Progress Bar */}
            <div className="mb-2">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-neutral-400">Active Envelope Spread:</span>
                <span className="font-mono text-cyan-300 font-semibold">{rangeCoverage}%</span>
              </div>
              <div className="h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-cyan-400 transition-all duration-300"
                  style={{ width: `${rangeCoverage}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              {rangeAssessment.desc}
            </p>
          </div>

          {/* Quadrant Mini Radar */}
          <div className="mt-3 pt-2.5 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
            <span className="text-neutral-500">Quadrant Coverage:</span>
            <div className="grid grid-cols-2 gap-1 w-16 h-8">
              <div
                className={`rounded text-[9px] font-mono flex items-center justify-center transition-colors ${
                  quadrantHits.tl ? 'bg-cyan-500/40 text-cyan-200 border border-cyan-400/50' : 'bg-neutral-950 text-neutral-600'
                }`}
              >
                TL
              </div>
              <div
                className={`rounded text-[9px] font-mono flex items-center justify-center transition-colors ${
                  quadrantHits.tr ? 'bg-cyan-500/40 text-cyan-200 border border-cyan-400/50' : 'bg-neutral-950 text-neutral-600'
                }`}
              >
                TR
              </div>
              <div
                className={`rounded text-[9px] font-mono flex items-center justify-center transition-colors ${
                  quadrantHits.bl ? 'bg-cyan-500/40 text-cyan-200 border border-cyan-400/50' : 'bg-neutral-950 text-neutral-600'
                }`}
              >
                BL
              </div>
              <div
                className={`rounded text-[9px] font-mono flex items-center justify-center transition-colors ${
                  quadrantHits.br ? 'bg-cyan-500/40 text-cyan-200 border border-cyan-400/50' : 'bg-neutral-950 text-neutral-600'
                }`}
              >
                BR
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Twitchiness & Jitter Analysis */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-white">Twitchiness & Jitter Index</span>
              </div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${twitchAssessment.badge} flex items-center gap-1`}>
                {twitchAssessment.icon}
                <span>{twitchAssessment.label}</span>
              </span>
            </div>

            {/* Twitchiness Meter */}
            <div className="mb-2">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-neutral-400">Micro-Tremor Index:</span>
                <span className="font-mono text-cyan-300 font-semibold">{twitchinessIndex} / 100</span>
              </div>
              <div className="h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 transition-all duration-300"
                  style={{ width: `${twitchinessIndex}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              {twitchAssessment.desc}
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
            <span>Envelope Overlay:</span>
            <button
              onClick={() => setShowBoundingEnvelope(!showBoundingEnvelope)}
              className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                showBoundingEnvelope
                  ? 'bg-neutral-800 text-white border-neutral-700'
                  : 'bg-neutral-950 text-neutral-500 border-neutral-800'
              }`}
            >
              {showBoundingEnvelope ? 'Shown' : 'Hidden'}
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Head Angles & Gesture Diagnostics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {/* Head Pose */}
        <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
          <div className="text-neutral-400 text-[11px] flex items-center gap-1 mb-1">
            <Compass className="w-3 h-3 text-cyan-400" />
            <span>Head Pose Angle</span>
          </div>
          <div className="font-mono text-white text-xs tabular-nums">
            Yaw: {trackingState.yaw > 0 ? `+${trackingState.yaw.toFixed(1)}` : trackingState.yaw.toFixed(1)}°
          </div>
          <div className="font-mono text-neutral-400 text-[10px] tabular-nums">
            Pitch: {trackingState.pitch > 0 ? `+${trackingState.pitch.toFixed(1)}` : trackingState.pitch.toFixed(1)}°
          </div>
        </div>

        {/* Left Eye */}
        <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
          <div className="text-neutral-400 text-[11px] flex items-center gap-1 mb-1">
            <Eye className="w-3 h-3 text-cyan-400" />
            <span>Left Wink (Click)</span>
          </div>
          <div className="font-mono text-xs tabular-nums">
            {trackingState.isBlinkingLeft ? (
              <span className="text-amber-300 font-bold">CLICK</span>
            ) : trackingState.isNormalBlink ? (
              <span className="text-emerald-400 font-semibold text-[10px]">BLINK IGNORED</span>
            ) : trackingState.blinkHoldProgress && trackingState.blinkHoldProgress > 0 && trackingState.leftEyeOpenRatio < 0.22 ? (
              <span className="text-amber-400 font-bold text-[10px]">HOLD {Math.round(trackingState.blinkHoldProgress * 100)}%</span>
            ) : (
              <span className="text-neutral-300">EAR {trackingState.leftEyeOpenRatio.toFixed(2)}</span>
            )}
          </div>
          <div className="h-1 bg-neutral-800 rounded-full mt-1.5 overflow-hidden">
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

        {/* Right Eye */}
        <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
          <div className="text-neutral-400 text-[11px] flex items-center gap-1 mb-1">
            <Eye className="w-3 h-3 text-cyan-400" />
            <span>Right Wink (Click)</span>
          </div>
          <div className="font-mono text-xs tabular-nums">
            {trackingState.isBlinkingRight ? (
              <span className="text-amber-300 font-bold">CLICK</span>
            ) : trackingState.isNormalBlink ? (
              <span className="text-emerald-400 font-semibold text-[10px]">BLINK IGNORED</span>
            ) : trackingState.blinkHoldProgress && trackingState.blinkHoldProgress > 0 && trackingState.rightEyeOpenRatio < 0.22 ? (
              <span className="text-amber-400 font-bold text-[10px]">HOLD {Math.round(trackingState.blinkHoldProgress * 100)}%</span>
            ) : (
              <span className="text-neutral-300">EAR {trackingState.rightEyeOpenRatio.toFixed(2)}</span>
            )}
          </div>
          <div className="h-1 bg-neutral-800 rounded-full mt-1.5 overflow-hidden">
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

        {/* Mouth */}
        <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
          <div className="text-neutral-400 text-[11px] flex items-center gap-1 mb-1">
            <Smile className="w-3 h-3 text-cyan-400" />
            <span>Mouth Trigger</span>
          </div>
          <div className="font-mono text-xs tabular-nums">
            {trackingState.isMouthOpen ? (
              <span className="text-rose-400 font-bold">OPEN (CLICK)</span>
            ) : (
              <span className="text-neutral-300">MAR {trackingState.mouthOpenRatio.toFixed(2)}</span>
            )}
          </div>
          <div className="h-1 bg-neutral-800 rounded-full mt-1.5 overflow-hidden">
            <div
              className="h-full bg-rose-400 transition-all"
              style={{ width: `${Math.min(100, trackingState.mouthOpenRatio * 200)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
