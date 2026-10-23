/**
 * AeroOS Interactive Desktop Environment
 * Complete interactive desktop operating system controlled entirely by face movement
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DesktopWindow, FaceTrackingState, NativeBridgeStatus, TrackingConfig } from '../types';
import { TargetPracticeApp } from './apps/TargetPracticeApp';
import { FacePaintApp } from './apps/FacePaintApp';
import { VirtualKeyboardApp } from './apps/VirtualKeyboardApp';
import { BrowserApp } from './apps/BrowserApp';
import { NotesApp } from './apps/NotesApp';
import { CalculatorApp } from './apps/CalculatorApp';
import { SettingsApp } from './apps/SettingsApp';
import { CameraVisionApp } from './apps/CameraVisionApp';
import { PerformanceLoggerApp } from './apps/PerformanceLoggerApp';
import { ProfilePresetsApp } from './apps/ProfilePresetsApp';
import { UserProfile, authService } from '../services/authService';
import { sounds } from '../services/soundEffects';
import {
  Target,
  Paintbrush,
  Keyboard,
  Globe,
  FileText,
  Calculator,
  Settings,
  MonitorCheck,
  Minus,
  Square,
  X,
  Sparkles,
  Sliders,
  Volume2,
  VolumeX,
  Camera,
  CameraOff,
  Maximize2,
  LayoutGrid,
  Play,
  Pause,
  Activity,
  User,
  Lock,
  LogOut,
  Mic,
  MicOff,
  HelpCircle,
} from 'lucide-react';

interface InteractiveDesktopProps {
  trackingState: FaceTrackingState;
  config: TrackingConfig;
  nativeStatus: NativeBridgeStatus;
  currentUser?: UserProfile | null;
  onOpenLogin?: () => void;
  onLogout?: () => void;
  onUpdateConfig: (newConfig: Partial<TrackingConfig>) => void;
  onRecenter: () => void;
  onToggleCursorFreeze: () => void;
  onStartCalibration: () => void;
  onOpenNativeBridge: () => void;
  isCameraStarted?: boolean;
  onStartCamera?: () => void;
  onStopCamera?: () => void;
  isVoiceListening?: boolean;
  voiceTranscript?: string;
  lastVoiceAction?: { command: string; label: string; timestamp: number } | null;
  voiceError?: string | null;
  isSpeechSupported?: boolean;
  onToggleVoice?: () => void;
  onOpenVoiceCheatsheet?: () => void;
  requestedAppOpen?: { id: string; timestamp: number } | null;
}

const INITIAL_WINDOWS: DesktopWindow[] = [
  {
    id: 'camera',
    title: 'Live Face Camera & Tracking',
    icon: 'camera',
    isOpen: true,
    isMinimized: false,
    isMaximized: false,
    zIndex: 12,
    x: 32,
    y: 28,
    width: 540,
    height: 480,
  },
  {
    id: 'target_practice',
    title: 'Precision Target Practice',
    icon: 'target',
    isOpen: true,
    isMinimized: false,
    isMaximized: false,
    zIndex: 11,
    x: 590,
    y: 28,
    width: 580,
    height: 480,
  },
  {
    id: 'performance_logger',
    title: 'Performance & Telemetry Logger',
    icon: 'activity',
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 10,
    x: 140,
    y: 45,
    width: 720,
    height: 540,
  },
  {
    id: 'paint',
    title: 'Face Paint & Canvas',
    icon: 'paint',
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 9,
    x: 80,
    y: 60,
    width: 720,
    height: 520,
  },
  {
    id: 'keyboard',
    title: 'Accessibility On-Screen Keyboard',
    icon: 'keyboard',
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 8,
    x: 120,
    y: 80,
    width: 640,
    height: 490,
  },
  {
    id: 'browser',
    title: 'Web Navigator',
    icon: 'browser',
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 7,
    x: 100,
    y: 50,
    width: 700,
    height: 500,
  },
  {
    id: 'notes',
    title: 'Quick Notes',
    icon: 'notes',
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 6,
    x: 140,
    y: 90,
    width: 580,
    height: 420,
  },
  {
    id: 'calculator',
    title: 'Calculator',
    icon: 'calculator',
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 5,
    x: 180,
    y: 110,
    width: 320,
    height: 440,
  },
  {
    id: 'settings',
    title: 'Tracking & Sensitivity Settings',
    icon: 'settings',
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 11,
    x: 70,
    y: 40,
    width: 740,
    height: 560,
  },
  {
    id: 'profile_presets',
    title: 'Profile & Environment Presets',
    icon: 'profile_presets',
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 10,
    x: 90,
    y: 35,
    width: 780,
    height: 570,
  },
];

export const InteractiveDesktop: React.FC<InteractiveDesktopProps> = ({
  trackingState,
  config,
  nativeStatus,
  currentUser,
  onOpenLogin,
  onLogout,
  onUpdateConfig,
  onRecenter,
  onToggleCursorFreeze,
  onStartCalibration,
  onOpenNativeBridge,
  isCameraStarted = true,
  onStartCamera,
  onStopCamera,
  isVoiceListening = false,
  voiceTranscript = '',
  lastVoiceAction = null,
  voiceError = null,
  isSpeechSupported = true,
  onToggleVoice,
  onOpenVoiceCheatsheet,
  requestedAppOpen,
}) => {
  const [windows, setWindows] = useState<DesktopWindow[]>(INITIAL_WINDOWS);
  const [activeWindowId, setActiveWindowId] = useState<string | null>('target_practice');
  const [startMenuOpen, setStartMenuOpen] = useState<boolean>(false);
  const [sensitivityQuickMenuOpen, setSensitivityQuickMenuOpen] = useState<boolean>(false);
  const [wallpaper, setWallpaper] = useState<'aurora' | 'minimal'>('aurora');

  // Dragging window state
  const draggingWindowRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const getAppIcon = (iconName: string, className: string = 'w-4 h-4') => {
    switch (iconName) {
      case 'target':
        return <Target className={className} />;
      case 'paint':
        return <Paintbrush className={className} />;
      case 'keyboard':
        return <Keyboard className={className} />;
      case 'browser':
        return <Globe className={className} />;
      case 'notes':
        return <FileText className={className} />;
      case 'calculator':
        return <Calculator className={className} />;
      case 'settings':
        return <Settings className={className} />;
      case 'activity':
        return <Activity className={className} />;
      case 'profile_presets':
        return <Sliders className={className} />;
      case 'bridge':
        return <MonitorCheck className={className} />;
      default:
        return <LayoutGrid className={className} />;
    }
  };

  const bringToFront = (id: string) => {
    setActiveWindowId(id);
    setWindows((prev) => {
      const maxZ = Math.max(...prev.map((w) => w.zIndex), 10);
      return prev.map((w) => (w.id === id ? { ...w, zIndex: maxZ + 1, isMinimized: false } : w));
    });
  };

  const openApp = (id: string) => {
    sounds.playClick('left');
    setStartMenuOpen(false);
    setWindows((prev) => {
      const maxZ = Math.max(...prev.map((w) => w.zIndex), 10);
      return prev.map((w) => (w.id === id ? { ...w, isOpen: true, isMinimized: false, zIndex: maxZ + 1 } : w));
    });
    setActiveWindowId(id);
  };

  // Automatically open window requested via speech-to-intent engine
  useEffect(() => {
    if (requestedAppOpen?.id) {
      openApp(requestedAppOpen.id);
    }
  }, [requestedAppOpen]);

  const closeWindow = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    sounds.playClick('left');
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, isOpen: false } : w)));
  };

  const toggleMinimize = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    sounds.playClick('left');
    setWindows((prev) => {
      const updated = prev.map((w) => {
        if (w.id === id) {
          const nextMin = !w.isMinimized;
          return { ...w, isMinimized: nextMin };
        }
        return w;
      });
      const targetWin = updated.find((w) => w.id === id);
      if (targetWin?.isMinimized) {
        // If minimizing current active window, focus next visible window or clear to desktop
        const nextActive = updated.find((w) => w.isOpen && !w.isMinimized);
        setActiveWindowId(nextActive ? nextActive.id : null);
      } else {
        setActiveWindowId(id);
      }
      return updated;
    });
  };

  const toggleMaximize = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    sounds.playClick('left');
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, isMaximized: !w.isMaximized } : w)));
  };

  // Dragging support
  const handleTitleBarMouseDown = (id: string, e: React.MouseEvent) => {
    bringToFront(id);
    const win = windows.find((w) => w.id === id);
    if (!win || win.isMaximized) return;

    draggingWindowRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: win.x,
      origY: win.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!draggingWindowRef.current) return;
      const dx = moveEvent.clientX - draggingWindowRef.current.startX;
      const dy = moveEvent.clientY - draggingWindowRef.current.startY;
      const targetId = draggingWindowRef.current.id;
      const newX = Math.max(0, Math.min(window.innerWidth - 200, draggingWindowRef.current.origX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, draggingWindowRef.current.origY + dy));

      setWindows((prev) =>
        prev.map((w) => (w.id === targetId ? { ...w, x: newX, y: newY } : w))
      );
    };

    const handleMouseUp = () => {
      draggingWindowRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex flex-col bg-neutral-950"
      style={{
        backgroundImage:
          wallpaper === 'aurora'
            ? 'url(/src/assets/images/desktop_wallpaper_aurora_1792595877552.jpg)'
            : 'url(/src/assets/images/desktop_wallpaper_minimal_1792595877832.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Subtle Desktop Vignette Scrim */}
      <div className="absolute inset-0 bg-neutral-950/20 backdrop-brightness-95 pointer-events-none" />

      {/* Desktop Main Workspace Area */}
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setActiveWindowId(null);
          }
        }}
        className="relative flex-1 p-6 overflow-hidden cursor-default"
      >
        {/* Desktop Application Icons Grid */}
        <div className="relative flex flex-col flex-wrap gap-4 h-full max-w-xs z-10 pointer-events-auto">
          {[
            { id: 'camera', label: 'Face Camera', icon: 'camera', desc: 'Live face tracking' },
            { id: 'performance_logger', label: 'Perf Logger', icon: 'activity', desc: 'FPS & jitter JSON' },
            { id: 'target_practice', label: 'Aim Drill', icon: 'target', desc: 'Precision test' },
            { id: 'paint', label: 'Face Paint', icon: 'paint', desc: 'Canvas sketch' },
            { id: 'keyboard', label: 'Keyboard', icon: 'keyboard', desc: 'Speech & type' },
            { id: 'browser', label: 'Browser', icon: 'browser', desc: 'Web articles' },
            { id: 'notes', label: 'Notes', icon: 'notes', desc: 'Quick memos' },
            { id: 'calculator', label: 'Calculator', icon: 'calculator', desc: 'Math tool' },
            { id: 'settings', label: 'Settings', icon: 'settings', desc: 'Sensitivity & pose' },
            { id: 'profile_presets', label: 'Presets & Profile', icon: 'profile_presets', desc: 'Lighting & postures' },
          ].map((app) => (
            <button
              key={app.id}
              onClick={() => openApp(app.id)}
              className="group flex items-center gap-3 w-44 p-2 rounded-xl bg-neutral-900/60 hover:bg-neutral-800/90 border border-neutral-800/70 hover:border-cyan-500/50 backdrop-blur-md transition-all text-left shadow-lg active:scale-95"
            >
              <div className="w-10 h-10 rounded-lg bg-neutral-950/80 border border-neutral-700/60 flex items-center justify-center text-cyan-400 group-hover:text-white group-hover:bg-cyan-600 transition-colors shrink-0 shadow-sm">
                {getAppIcon(app.icon, 'w-5 h-5')}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">
                  {app.label}
                </div>
                <div className="text-[10px] text-neutral-400 truncate">{app.desc}</div>
              </div>
            </button>
          ))}

          {/* Host OS Bridge Shortcut Button */}
          <button
            onClick={onOpenNativeBridge}
            className="group flex items-center gap-3 w-44 p-2 rounded-xl bg-neutral-900/60 hover:bg-neutral-800/90 border border-neutral-800/70 hover:border-emerald-500/50 backdrop-blur-md transition-all text-left shadow-lg active:scale-95 mt-2"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400 group-hover:text-white group-hover:bg-emerald-600 transition-colors shrink-0 shadow-sm">
              <MonitorCheck className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-emerald-300 group-hover:text-white transition-colors truncate">
                Host OS Cursor
              </div>
              <div className="text-[10px] text-neutral-400 truncate">
                {nativeStatus.connected ? 'Active Bridge' : 'Setup Real OS'}
              </div>
            </div>
          </button>

          {/* Voice Commands Cheat Sheet Shortcut */}
          <button
            onClick={onOpenVoiceCheatsheet}
            className="group flex items-center gap-3 w-44 p-2 rounded-xl bg-neutral-900/60 hover:bg-neutral-800/90 border border-neutral-800/70 hover:border-cyan-500/50 backdrop-blur-md transition-all text-left shadow-lg active:scale-95"
          >
            <div className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-colors shrink-0 shadow-sm ${
              isVoiceListening
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white'
                : 'bg-neutral-950/80 border-neutral-700/60 text-neutral-400 group-hover:text-cyan-300'
            }`}>
              {isVoiceListening ? <Mic className="w-5 h-5 animate-pulse" /> : <MicOff className="w-5 h-5" />}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors truncate flex items-center gap-1">
                <span>Voice Control</span>
              </div>
              <div className="text-[10px] text-neutral-400 truncate">
                {isVoiceListening ? 'Listening "Sparrow..."' : 'Voice command list'}
              </div>
            </div>
          </button>
        </div>

        {/* Windows Rendering Layer */}
        {windows
          .filter((w) => w.isOpen)
          .map((win) => {
            const isActive = activeWindowId === win.id;

            return (
              <div
                key={win.id}
                onClick={() => bringToFront(win.id)}
                style={{
                  position: 'absolute',
                  left: win.isMaximized ? 0 : `${win.x}px`,
                  top: win.isMaximized ? 0 : `${win.y}px`,
                  width: win.isMaximized ? '100%' : `${win.width}px`,
                  height: win.isMaximized ? 'calc(100% - 48px)' : `${win.height}px`,
                  zIndex: win.zIndex,
                  display: win.isMinimized ? 'none' : 'flex',
                }}
                className={`flex flex-col rounded-xl overflow-hidden bg-neutral-950/95 border backdrop-blur-xl shadow-2xl transition-[border-color,box-shadow] duration-150 ${
                  isActive
                    ? 'border-cyan-500/60 shadow-[0_16px_40px_rgba(0,0,0,0.6)] ring-1 ring-cyan-500/20'
                    : 'border-neutral-800 shadow-[0_8px_24px_rgba(0,0,0,0.4)] opacity-95'
                }`}
              >
                {/* Window Title Bar */}
                <div
                  onMouseDown={(e) => handleTitleBarMouseDown(win.id, e)}
                  className={`flex items-center justify-between px-3.5 py-2.5 cursor-move select-none border-b transition-colors ${
                    isActive ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-neutral-950 border-neutral-900 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-semibold truncate">
                    <span className="text-cyan-400">{getAppIcon(win.icon, 'w-3.5 h-3.5')}</span>
                    <span className="truncate">{win.title}</span>
                  </div>

                  {/* Window Control Buttons */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => toggleMinimize(win.id, e)}
                      className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                      title="Minimize"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => toggleMaximize(win.id, e)}
                      className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                      title="Maximize"
                    >
                      <Square className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => closeWindow(win.id, e)}
                      className="p-1 rounded text-neutral-400 hover:text-rose-400 hover:bg-rose-950/60 transition-colors"
                      title="Close"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Window App Content */}
                <div className="flex-1 overflow-hidden relative">
                  {win.id === 'camera' && (
                    <CameraVisionApp
                      trackingState={trackingState}
                      onRecenter={onRecenter}
                      showMesh={config.showFaceMesh}
                      onToggleMesh={() => onUpdateConfig({ showFaceMesh: !config.showFaceMesh })}
                      isCameraStarted={isCameraStarted}
                      onStartCamera={onStartCamera}
                      onStopCamera={onStopCamera}
                      onToggleCursorFreeze={onToggleCursorFreeze}
                      isCursorFrozen={config.isCursorFrozen}
                    />
                  )}
                  {win.id === 'target_practice' && <TargetPracticeApp />}
                  {win.id === 'performance_logger' && <PerformanceLoggerApp />}
                  {win.id === 'paint' && (
                    <FacePaintApp
                      cursorX={trackingState.cursorX}
                      cursorY={trackingState.cursorY}
                      isDragging={trackingState.isDragging}
                    />
                  )}
                  {win.id === 'keyboard' && <VirtualKeyboardApp />}
                  {win.id === 'browser' && <BrowserApp />}
                  {win.id === 'notes' && <NotesApp />}
                  {win.id === 'calculator' && <CalculatorApp />}
                  {win.id === 'settings' && (
                    <SettingsApp
                      config={config}
                      onUpdateConfig={onUpdateConfig}
                      onRecenter={onRecenter}
                      onStartCalibration={onStartCalibration}
                      trackingState={trackingState}
                      isVoiceListening={isVoiceListening}
                      onToggleVoice={onToggleVoice}
                    />
                  )}
                  {win.id === 'profile_presets' && (
                    <ProfilePresetsApp
                      currentConfig={config}
                      onUpdateConfig={onUpdateConfig}
                      onOpenLogin={onOpenLogin}
                    />
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Start Menu Popup */}
      {startMenuOpen && (
        <div className="absolute bottom-14 left-4 z-50 w-72 bg-neutral-900/95 border border-neutral-800 rounded-2xl shadow-2xl backdrop-blur-xl p-3 select-none">
          <div className="pb-3 border-b border-neutral-800 mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-07-26_at_3.25.36_PM_04076b3e.jpeg"
                alt="Sparrow"
                className="w-8 h-8 rounded-xl object-cover ring-2 ring-cyan-500/40 shadow-sm"
              />
              <div>
                <div className="text-xs font-bold text-white tracking-wide">Sparrow Desktop</div>
                <div className="text-[10px] text-neutral-400">Head Motion OS</div>
              </div>
            </div>
            <button
              onClick={() => setWallpaper(wallpaper === 'aurora' ? 'minimal' : 'aurora')}
              className="text-[10px] text-cyan-400 hover:underline px-1.5 py-0.5 rounded bg-neutral-800"
            >
              Wallpaper
            </button>
          </div>

          {/* User Account Card in Start Menu */}
          <div className="p-2 mb-2 rounded-xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              {currentUser?.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt="" className="w-7 h-7 rounded-full shrink-0 border border-cyan-500/40 object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-cyan-900/60 text-cyan-400 flex items-center justify-center text-xs font-bold">
                  {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
                </div>
              )}
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-white truncate">
                  {currentUser ? currentUser.name : 'Guest User'}
                </div>
                <div className="text-[10px] text-neutral-400 truncate">
                  {currentUser ? currentUser.email : 'guest@sparrow.local'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => {
                  setStartMenuOpen(false);
                  if (onOpenLogin) onOpenLogin();
                }}
                className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[10px] text-cyan-300 font-medium transition-colors"
                title="Account & Login"
              >
                {currentUser && currentUser.provider !== 'guest' ? 'Switch' : 'Sign In'}
              </button>
              {currentUser && onLogout && (
                <button
                  onClick={() => {
                    setStartMenuOpen(false);
                    onLogout();
                  }}
                  className="p-1 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 hover:text-white transition-colors"
                  title="Sign Out / Lock Screen"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1 mb-3">
            {[
              { id: 'camera', label: 'Face Camera & Sensor', icon: 'camera' },
              { id: 'performance_logger', label: 'Performance & Jitter Logger', icon: 'activity' },
              { id: 'target_practice', label: 'Target Practice Drill', icon: 'target' },
              { id: 'paint', label: 'Face Paint & Drawing', icon: 'paint' },
              { id: 'keyboard', label: 'Accessibility Keyboard', icon: 'keyboard' },
              { id: 'browser', label: 'Web Navigator', icon: 'browser' },
              { id: 'notes', label: 'Quick Notes', icon: 'notes' },
              { id: 'calculator', label: 'Calculator', icon: 'calculator' },
              { id: 'settings', label: 'Tracking & Sensitivity', icon: 'settings' },
              { id: 'profile_presets', label: 'Profile & Environment Presets', icon: 'profile_presets' },
            ].map((app) => (
              <button
                key={app.id}
                onClick={() => openApp(app.id)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors text-left"
              >
                <span className="text-cyan-400">{getAppIcon(app.icon, 'w-4 h-4')}</span>
                <span className="font-medium">{app.label}</span>
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-neutral-800 flex items-center justify-between gap-1">
            <button
              onClick={() => {
                sounds.playRecenter();
                onRecenter();
                setStartMenuOpen(false);
              }}
              className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium py-1 px-2 rounded hover:bg-neutral-800"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Recenter</span>
            </button>
            <button
              onClick={() => {
                onToggleCursorFreeze();
                setStartMenuOpen(false);
              }}
              className={`flex items-center gap-1 text-xs font-medium py-1 px-2 rounded hover:bg-neutral-800 ${
                config.isCursorFrozen ? 'text-amber-400' : 'text-neutral-300'
              }`}
            >
              {config.isCursorFrozen ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{config.isCursorFrozen ? 'Move Cursor (P)' : 'Stop Cursor (P)'}</span>
            </button>
            <button
              onClick={() => {
                onOpenNativeBridge();
                setStartMenuOpen(false);
              }}
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium py-1 px-2 rounded hover:bg-neutral-800"
            >
              <MonitorCheck className="w-3.5 h-3.5" />
              <span>Host Bridge</span>
            </button>
            <button
              onClick={() => {
                if (onOpenVoiceCheatsheet) onOpenVoiceCheatsheet();
                setStartMenuOpen(false);
              }}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium py-1 px-2 rounded hover:bg-neutral-800"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice</span>
            </button>
          </div>
        </div>
      )}

      {/* Taskbar */}
      <div className="relative z-40 h-12 bg-neutral-950/90 border-t border-neutral-800/80 backdrop-blur-md px-4 flex items-center justify-between select-none">
        {/* Left: Start Button + App Pins */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStartMenuOpen(!startMenuOpen)}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
              startMenuOpen
                ? 'bg-cyan-600 text-white ring-2 ring-cyan-400/50'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800'
            }`}
          >
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-07-26_at_3.25.36_PM_04076b3e.jpeg"
              alt="Sparrow"
              className="w-5 h-5 rounded-full object-cover ring-1 ring-cyan-400/60 shadow-sm"
            />
            <span>Sparrow</span>
          </button>

          {/* Running App Buttons in Taskbar */}
          <div className="hidden sm:flex items-center gap-1.5 ml-2 border-l border-neutral-800 pl-3">
            {windows
              .filter((w) => w.isOpen)
              .map((w) => (
                <button
                  key={w.id}
                  onClick={() => {
                    if (w.isMinimized) {
                      bringToFront(w.id);
                    } else if (activeWindowId === w.id) {
                      toggleMinimize(w.id);
                    } else {
                      bringToFront(w.id);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                    activeWindowId === w.id && !w.isMinimized
                      ? 'bg-neutral-800 text-cyan-300 border-cyan-500/40 shadow-sm'
                      : w.isMinimized
                      ? 'bg-neutral-950/80 text-neutral-400 hover:text-cyan-300 border-neutral-800/80'
                      : 'bg-neutral-900/60 text-neutral-300 hover:text-white border-neutral-800'
                  }`}
                  title={`${w.title} (${w.isMinimized ? 'Minimized - Click to restore' : 'Click to minimize/focus'})`}
                >
                  <span className="text-cyan-400">{getAppIcon(w.icon, 'w-3 h-3')}</span>
                  <span className="truncate max-w-[100px]">{w.title}</span>
                </button>
              ))}
          </div>
        </div>

        {/* Right: System Tray & Quick Actions */}
        <div className="flex items-center gap-2 text-xs">
          {/* Stop / Start Camera Button */}
          {onStopCamera && onStartCamera && (
            <button
              onClick={isCameraStarted ? onStopCamera : onStartCamera}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-xs transition-all shadow-sm ${
                isCameraStarted
                  ? 'bg-rose-950/80 hover:bg-rose-900 border border-rose-600/70 text-rose-300 hover:text-white'
                  : 'bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/70 text-cyan-300 hover:text-white animate-pulse'
              }`}
              title={isCameraStarted ? 'Close / Stop Webcam Camera Stream' : 'Open / Start Webcam Camera Stream'}
            >
              {isCameraStarted ? (
                <>
                  <CameraOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>Stop Camera</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Start Camera</span>
                </>
              )}
            </button>
          )}

          {/* Stop Moving Cursor / Move Cursor Toggle Button */}
          <button
            onClick={onToggleCursorFreeze}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-xs transition-all shadow-sm ${
              config.isCursorFrozen
                ? 'bg-amber-600 hover:bg-amber-500 text-white ring-2 ring-amber-400/50 animate-pulse'
                : 'bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-600/70'
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
            <kbd className="hidden lg:inline px-1 py-0.2 bg-neutral-950/70 rounded font-mono text-[10px] text-neutral-300">
              P
            </kbd>
          </button>

          {/* Recenter Action Button */}
          <button
            onClick={() => {
              sounds.playRecenter();
              onRecenter();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-700/50 rounded-lg font-medium text-xs transition-colors shadow-sm"
            title="Recenter Head Calibration (Spacebar)"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Recenter</span>
            <kbd className="hidden lg:inline px-1 py-0.2 bg-neutral-900/80 rounded font-mono text-[10px]">
              Space
            </kbd>
          </button>

          {/* Quick Sensitivity Control & Flyout */}
          <div className="relative">
            <button
              onClick={() => setSensitivityQuickMenuOpen(!sensitivityQuickMenuOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-all shadow-sm ${
                sensitivityQuickMenuOpen
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-500 ring-1 ring-cyan-500/50'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-700'
              }`}
              title="Quick Adjust Cursor Sensitivity (Slider & Inputs)"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>{config.sensitivityX.toFixed(1)}x</span>
            </button>

            {sensitivityQuickMenuOpen && (
              <div className="absolute bottom-11 right-0 w-72 bg-neutral-900/95 border border-neutral-800 rounded-xl shadow-2xl backdrop-blur-xl p-3 z-50 select-none animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Quick Sensitivity Tuning</span>
                  </div>
                  <button
                    onClick={() => {
                      setSensitivityQuickMenuOpen(false);
                      openApp('settings');
                    }}
                    className="text-[10px] text-cyan-400 hover:underline"
                  >
                    Full Settings
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-neutral-400">Responsiveness</span>
                      <span className="font-mono text-cyan-400">{config.sensitivityX.toFixed(1)}x</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0.2"
                        max="6.0"
                        step="0.1"
                        value={config.sensitivityX}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          onUpdateConfig({
                            masterSensitivity: val,
                            sensitivityX: val,
                            sensitivityY: val,
                          });
                        }}
                        className="flex-1 h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer accent-cyan-500"
                      />
                      <input
                        type="number"
                        min="0.2"
                        max="6.0"
                        step="0.1"
                        value={Number(config.sensitivityX.toFixed(1))}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            onUpdateConfig({
                              masterSensitivity: val,
                              sensitivityX: val,
                              sensitivityY: val,
                            });
                          }
                        }}
                        className="w-12 bg-neutral-950 border border-neutral-800 rounded px-1.5 py-0.5 text-xs font-mono text-cyan-400 text-right focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-neutral-800/80">
                    {[
                      { label: '1.2x', val: 1.2 },
                      { label: '2.2x', val: 2.2 },
                      { label: '3.2x', val: 3.2 },
                      { label: '4.5x', val: 4.5 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        onClick={() => {
                          onUpdateConfig({
                            masterSensitivity: p.val,
                            sensitivityX: p.val,
                            sensitivityY: p.val,
                          });
                        }}
                        className={`py-1 text-[10px] font-mono rounded border transition-colors ${
                          Math.abs(config.sensitivityX - p.val) < 0.15
                            ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Voice Commands Status / Quick Unmute / Cheatsheet */}
          <div className="flex items-center">
            <button
              onClick={onToggleVoice}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-l-lg border border-r-0 text-xs transition-all ${
                isVoiceListening
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/80 shadow-sm'
                  : 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300 hover:bg-cyan-900/90 shadow-sm animate-pulse'
              }`}
              title={
                isVoiceListening
                  ? 'Voice Commands: Active (Say "Sparrow recenter", "Sparrow stop", etc.) - Click to Mute'
                  : 'Voice Commands: Muted - Click to UNMUTE Microphone and start listening'
              }
            >
              {isVoiceListening ? (
                <>
                  <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-semibold text-emerald-300">
                    Voice Active
                  </span>
                </>
              ) : (
                <>
                  <MicOff className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px] font-semibold text-cyan-300">
                    Unmute Mic
                  </span>
                </>
              )}
            </button>
            <button
              onClick={onOpenVoiceCheatsheet}
              className={`px-1.5 py-1 rounded-r-lg border text-xs transition-colors ${
                isVoiceListening
                  ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-400 hover:bg-emerald-900/80'
                  : 'bg-neutral-900 border-cyan-500/60 text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
              title="Open Voice Command Cheatsheet & Test Simulator"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Host OS Bridge indicator */}
          <button
            onClick={onOpenNativeBridge}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors ${
              nativeStatus.connected
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border-neutral-800'
            }`}
            title="Host OS Desktop Cursor Control Status"
          >
            <MonitorCheck className={`w-3.5 h-3.5 ${nativeStatus.connected ? 'text-emerald-400' : 'text-neutral-500'}`} />
            <span className="hidden sm:inline">
              {nativeStatus.connected ? 'OS Active' : 'Host Bridge'}
            </span>
          </button>

          {/* Audio toggle */}
          <button
            onClick={() => {
              const next = !config.soundFeedback;
              onUpdateConfig({ soundFeedback: next });
              sounds.setEnabled(next);
            }}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title={config.soundFeedback ? 'Sound On' : 'Sound Muted'}
          >
            {config.soundFeedback ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Quick Active Preset Pill */}
          <button
            onClick={() => openApp('profile_presets')}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-xs text-cyan-300 hover:text-white transition-colors"
            title="Current Sensitivity & Lighting Preset (Click to manage)"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold truncate max-w-[110px]">
              {authService.getActivePreset()?.name || 'Preset'}
            </span>
          </button>

          {/* User Account Chip */}
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 hover:text-white transition-colors"
            title="User Account / Sign In / Lock"
          >
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="" className="w-4 h-4 rounded-full border border-cyan-500/40" />
            ) : (
              <User className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span className="hidden sm:inline truncate max-w-[85px] font-medium">
              {currentUser ? currentUser.name : 'Sign In'}
            </span>
          </button>

          {/* Digital Clock */}
          <div className="text-neutral-400 font-mono text-xs pl-2 border-l border-neutral-800">
            {currentTime}
          </div>
        </div>
      </div>
    </div>
  );
};
