/**
 * Virtual Cursor Component
 * Renders smooth floating cursor with dwell-click radial countdown,
 * interactive clicks, and gesture feedback.
 */

import React, { useEffect, useRef, useState } from 'react';
import { sounds } from '../services/soundEffects';
import { CursorStyle, TrackingConfig } from '../types';

interface VirtualCursorProps {
  x: number;
  y: number;
  isTracking: boolean;
  isDragging: boolean;
  isCursorFrozen?: boolean;
  activeGesture: string | null;
  config: TrackingConfig;
  onPerformClick?: (x: number, y: number, button: 'left' | 'right') => void;
}

export const VirtualCursor: React.FC<VirtualCursorProps> = ({
  x,
  y,
  isTracking,
  isDragging,
  isCursorFrozen,
  activeGesture,
  config,
  onPerformClick,
}) => {
  const [dwellProgress, setDwellProgress] = useState<number>(0);
  const [clickRipples, setClickRipples] = useState<{ id: number; x: number; y: number; type: string }[]>([]);

  // Dwell state tracking
  const dwellAnchorRef = useRef<{ x: number; y: number; startTime: number } | null>(null);
  const lastClickTimeRef = useRef<number>(0);

  // Trigger DOM click at (cx, cy)
  const triggerClickAt = (cx: number, cy: number, button: 'left' | 'right' = 'left') => {
    // Audio feedback
    sounds.playClick(button === 'right' ? 'right' : 'dwell');

    // Visual ripple
    const rippleId = Date.now();
    setClickRipples((prev) => [...prev.slice(-3), { id: rippleId, x: cx, y: cy, type: button }]);
    setTimeout(() => {
      setClickRipples((prev) => prev.filter((r) => r.id !== rippleId));
    }, 600);

    // External callback (e.g. for native bridge)
    if (onPerformClick) {
      onPerformClick(cx, cy, button);
    }

    // Dispatch real DOM event to element beneath
    try {
      const rawElement = document.elementFromPoint(cx, cy);
      if (rawElement) {
        // Resolve closest interactive element (button, link, input, taskbar tab, desktop shortcut)
        const target =
          (rawElement.closest('button, a, input, select, textarea, [role="button"], [tabindex]') as HTMLElement) ||
          (rawElement as HTMLElement);

        const mouseEventInit = {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: cx,
          clientY: cy,
          button: button === 'right' ? 2 : 0,
        };

        target.dispatchEvent(new MouseEvent('mousedown', mouseEventInit));
        target.dispatchEvent(new MouseEvent('mouseup', mouseEventInit));
        target.dispatchEvent(new MouseEvent('click', mouseEventInit));

        if (button === 'right') {
          target.dispatchEvent(new MouseEvent('contextmenu', mouseEventInit));
        }

        // Focus text inputs or trigger native click on interactive button
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          target.focus();
        } else if (button === 'left' && typeof target.click === 'function') {
          target.click();
        }
      }
    } catch {
      // Ignore click dispatch errors
    }
  };

  // Dwell calculation loop
  useEffect(() => {
    if (!config.dwellClickEnabled || !isTracking) {
      setDwellProgress((prev) => (prev !== 0 ? 0 : prev));
      dwellAnchorRef.current = null;
      return;
    }

    const now = performance.now();

    // Prevent immediate re-triggering right after a click
    if (now - lastClickTimeRef.current < 450) {
      return;
    }

    const anchor = dwellAnchorRef.current;
    if (!anchor) {
      dwellAnchorRef.current = { x, y, startTime: now };
      setDwellProgress((prev) => (prev !== 0 ? 0 : prev));
      return;
    }

    const dist = Math.hypot(x - anchor.x, y - anchor.y);
    if (dist > config.dwellRadius) {
      // User moved outside dwell radius, reset anchor to current position
      dwellAnchorRef.current = { x, y, startTime: now };
      setDwellProgress((prev) => (prev !== 0 ? 0 : prev));
    } else {
      const elapsed = now - anchor.startTime;
      const progress = Math.min(1, elapsed / config.dwellTimeMs);
      setDwellProgress(progress);

      if (progress >= 1) {
        // Dwell triggered!
        lastClickTimeRef.current = now;
        dwellAnchorRef.current = null;
        setDwellProgress(0);
        triggerClickAt(x, y, 'left');
      }
    }
  }, [x, y, isTracking, config.dwellClickEnabled, config.dwellRadius, config.dwellTimeMs]);

  // Handle active gestures (blink / mouth clicks)
  useEffect(() => {
    if (!activeGesture || !isTracking) return;

    if (activeGesture === 'wink_left' || activeGesture === 'mouth_click') {
      triggerClickAt(x, y, 'left');
    } else if (activeGesture === 'wink_right') {
      triggerClickAt(x, y, 'right');
    }
  }, [activeGesture]);

  if (!isTracking) return null;

  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - dwellProgress * circumference;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Click ripples */}
      {clickRipples.map((ripple) => (
        <div
          key={ripple.id}
          className={`absolute rounded-full border pointer-events-none animate-ping ${
            ripple.type === 'right' ? 'border-amber-400 bg-amber-400/20' : 'border-cyan-400 bg-cyan-400/20'
          }`}
          style={{
            left: ripple.x - 24,
            top: ripple.y - 24,
            width: 48,
            height: 48,
          }}
        />
      ))}

      {/* Main Cursor Element */}
      <div
        className="absolute transition-transform duration-75 ease-out will-change-transform"
        style={{
          transform: `translate3d(${x}px, ${y}px, 0)`,
        }}
      >
        {/* Style: Laser Glow */}
        {config.cursorStyle === 'laser_glow' && (
          <div className="relative -left-3 -top-3">
            <div className="w-6 h-6 rounded-full border border-cyan-400 bg-cyan-500/20 shadow-[0_0_16px_rgba(34,211,238,0.7)] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
            </div>
            {isDragging && (
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-mono bg-cyan-950/80 text-cyan-300 px-1 py-0.5 rounded border border-cyan-500/40">
                DRAG
              </span>
            )}
          </div>
        )}

        {/* Style: Cyber Reticle */}
        {config.cursorStyle === 'cyber_reticle' && (
          <div className="relative -left-4 -top-4 w-8 h-8">
            <div className="absolute inset-0 border border-teal-400/70 rounded-full animate-spin [animation-duration:8s]" />
            <div className="absolute inset-2 border border-teal-300 rounded-full" />
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-teal-400/60 -translate-y-1/2" />
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-teal-400/60 -translate-x-1/2" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full shadow" />
          </div>
        )}

        {/* Style: High Contrast Neon */}
        {config.cursorStyle === 'high_contrast' && (
          <div className="relative -left-1 -top-1">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 2L20 12L12 14L8 22L4 2Z"
                fill="#facc15"
                stroke="#000000"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {/* Style: Modern Dot */}
        {config.cursorStyle === 'modern_dot' && (
          <div className="relative -left-2.5 -top-2.5">
            <div className="w-5 h-5 rounded-full bg-white/90 border border-neutral-900 shadow-md flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-950" />
            </div>
          </div>
        )}

        {/* Dwell Progress Radial Ring */}
        {config.dwellClickEnabled && dwellProgress > 0 && (
          <div className="absolute -left-[26px] -top-[26px] w-[52px] h-[52px]">
            <svg className="w-full h-full -rotate-90">
              {/* Background trace */}
              <circle
                cx="26"
                cy="26"
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="3"
              />
              {/* Active countdown fill */}
              <circle
                cx="26"
                cy="26"
                r={radius}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="3.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
          </div>
        )}

        {/* Gesture badge feedback */}
        {activeGesture && (
          <div className="absolute left-6 -top-2 whitespace-nowrap bg-neutral-900/90 text-white border border-neutral-700 text-[11px] font-mono px-2 py-0.5 rounded shadow-lg backdrop-blur">
            {activeGesture === 'wink_left' && 'Left Click (Wink)'}
            {activeGesture === 'wink_right' && 'Right Click (Wink)'}
            {activeGesture === 'mouth_click' && 'Mouth Click'}
            {activeGesture === 'drag_start' && 'Dragging'}
            {activeGesture === 'drag_stop' && 'Released'}
          </div>
        )}

        {/* Cursor Frozen Indicator */}
        {isCursorFrozen && (
          <div className="absolute left-6 top-3 whitespace-nowrap bg-amber-950/90 text-amber-300 border border-amber-600/60 text-[10px] font-mono px-1.5 py-0.5 rounded shadow-lg backdrop-blur flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>FROZEN (Press P to Move)</span>
          </div>
        )}
      </div>
    </div>
  );
};
