/**
 * Profile & Calibration Presets Management App
 * Allows users to save, customize, and switch between sensitivity & calibration
 * presets for daylight, dim nighttime, standing desk sway, and high-precision modes.
 */

import React, { useState, useEffect } from 'react';
import {
  authService,
  UserProfile,
  TrackingPreset,
  EnvironmentLighting,
  SeatingPosition,
  DEFAULT_PRESETS,
} from '../../services/authService';
import { faceTracker } from '../../services/faceTracker';
import { sounds } from '../../services/soundEffects';
import { TrackingConfig } from '../../types';
import {
  Sliders,
  Sun,
  Moon,
  Building2,
  SunMedium,
  Laptop,
  User,
  Armchair,
  Accessibility,
  CheckCircle2,
  Plus,
  Copy,
  Trash2,
  Edit3,
  RotateCcw,
  Sparkles,
  Info,
  ShieldAlert,
  ArrowRight,
  Gauge,
  Crosshair,
  Zap,
  Save,
  X,
  UserCheck,
} from 'lucide-react';

interface ProfilePresetsAppProps {
  currentConfig?: TrackingConfig;
  onUpdateConfig?: (config: Partial<TrackingConfig>) => void;
  onOpenLogin?: () => void;
}

export const ProfilePresetsApp: React.FC<ProfilePresetsAppProps> = ({
  currentConfig,
  onUpdateConfig,
  onOpenLogin,
}) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(authService.getCurrentUser());
  const [presets, setPresets] = useState<TrackingPreset[]>(authService.getPresets());
  const [activePreset, setActivePreset] = useState<TrackingPreset | null>(authService.getActivePreset());

  // Editing / Creating State
  const [editingPreset, setEditingPreset] = useState<TrackingPreset | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState<string>('');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formLighting, setFormLighting] = useState<EnvironmentLighting>('daylight');
  const [formSeating, setFormSeating] = useState<SeatingPosition>('desk_upright');
  const [formSensX, setFormSensX] = useState<number>(2.2);
  const [formSensY, setFormSensY] = useState<number>(2.0);
  const [formSmoothing, setFormSmoothing] = useState<number>(0.35);
  const [formDeadzone, setFormDeadzone] = useState<number>(0.008);
  const [formAcceleration, setFormAcceleration] = useState<number>(1.25);
  const [includeCalibrationSnapshot, setIncludeCalibrationSnapshot] = useState<boolean>(true);

  // Subscribe to authService updates
  useEffect(() => {
    const unsub = authService.subscribe((user) => {
      setCurrentUser(user);
      if (user) {
        setPresets(user.presets);
        const active = user.presets.find((p) => p.id === user.activePresetId) || user.presets[0];
        setActivePreset(active);
      } else {
        setPresets(DEFAULT_PRESETS);
        setActivePreset(DEFAULT_PRESETS[0]);
      }
    });
    return () => unsub();
  }, []);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3200);
  };

  // Switch / Activate preset
  const handleActivatePreset = (presetId: string) => {
    const activated = authService.activatePreset(presetId);
    if (activated) {
      setActivePreset(activated);
      sounds.playPresetSwitch();

      // Immediately propagate to faceTracker and parent config
      if (onUpdateConfig) {
        onUpdateConfig({
          sensitivityX: activated.sensitivityX,
          sensitivityY: activated.sensitivityY,
          smoothing: activated.smoothing,
          deadzone: activated.deadzone,
          acceleration: activated.acceleration,
        });
      } else {
        faceTracker.updateConfig({
          sensitivityX: activated.sensitivityX,
          sensitivityY: activated.sensitivityY,
          smoothing: activated.smoothing,
          deadzone: activated.deadzone,
          acceleration: activated.acceleration,
        });
      }

      // If preset has resting calibration snapshot, apply it
      if (activated.calibrationSnapshot) {
        faceTracker.setCalibration({
          restingNoseX: activated.calibrationSnapshot.restingNoseX,
          restingNoseY: activated.calibrationSnapshot.restingNoseY,
          minRangeX: activated.calibrationSnapshot.minRangeX,
          maxRangeX: activated.calibrationSnapshot.maxRangeX,
          minRangeY: activated.calibrationSnapshot.minRangeY,
          maxRangeY: activated.calibrationSnapshot.maxRangeY,
        });
      }

      showFeedback(`Switched to "${activated.name}" preset!`);
    }
  };

  // Snapshot current live config as a new preset
  const handleSnapshotCurrentSettings = () => {
    const liveConfig = currentConfig || faceTracker.getConfig();
    const liveCalib = faceTracker.getCalibration();

    const newPreset = authService.savePreset({
      name: `Custom Preset ${presets.length + 1}`,
      description: 'Snapshot created from current live tracking and calibration settings.',
      lighting: 'daylight',
      seating: 'desk_upright',
      sensitivityX: Number(liveConfig.sensitivityX.toFixed(2)),
      sensitivityY: Number(liveConfig.sensitivityY.toFixed(2)),
      smoothing: Number(liveConfig.smoothing.toFixed(2)),
      deadzone: Number(liveConfig.deadzone.toFixed(3)),
      acceleration: Number(liveConfig.acceleration.toFixed(2)),
      calibrationSnapshot: {
        restingNoseX: liveCalib.restingNoseX,
        restingNoseY: liveCalib.restingNoseY,
        minRangeX: liveCalib.minRangeX,
        maxRangeX: liveCalib.maxRangeX,
        minRangeY: liveCalib.minRangeY,
        maxRangeY: liveCalib.maxRangeY,
      },
    });

    handleActivatePreset(newPreset.id);
    showFeedback(`Saved live settings as "${newPreset.name}"!`);
  };

  // Open edit modal
  const openEditModal = (preset: TrackingPreset) => {
    setEditingPreset(preset);
    setIsCreatingNew(false);
    setFormName(preset.name);
    setFormDesc(preset.description || '');
    setFormLighting(preset.lighting);
    setFormSeating(preset.seating);
    setFormSensX(preset.sensitivityX);
    setFormSensY(preset.sensitivityY);
    setFormSmoothing(preset.smoothing);
    setFormDeadzone(preset.deadzone);
    setFormAcceleration(preset.acceleration);
    setIncludeCalibrationSnapshot(!!preset.calibrationSnapshot);
  };

  // Open create new modal
  const openCreateModal = () => {
    setEditingPreset(null);
    setIsCreatingNew(true);
    const liveConfig = currentConfig || faceTracker.getConfig();
    setFormName('My Environment Preset');
    setFormDesc('Tailored sensitivity for my current workspace.');
    setFormLighting('daylight');
    setFormSeating('desk_upright');
    setFormSensX(Number(liveConfig.sensitivityX.toFixed(2)));
    setFormSensY(Number(liveConfig.sensitivityY.toFixed(2)));
    setFormSmoothing(Number(liveConfig.smoothing.toFixed(2)));
    setFormDeadzone(Number(liveConfig.deadzone.toFixed(3)));
    setFormAcceleration(Number(liveConfig.acceleration.toFixed(2)));
    setIncludeCalibrationSnapshot(true);
  };

  // Save form
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    let calibSnapshot = null;
    if (includeCalibrationSnapshot) {
      const liveCalib = faceTracker.getCalibration();
      calibSnapshot = {
        restingNoseX: liveCalib.restingNoseX,
        restingNoseY: liveCalib.restingNoseY,
        minRangeX: liveCalib.minRangeX,
        maxRangeX: liveCalib.maxRangeX,
        minRangeY: liveCalib.minRangeY,
        maxRangeY: liveCalib.maxRangeY,
      };
    }

    const payload = {
      ...(editingPreset ? { id: editingPreset.id } : {}),
      name: formName.trim(),
      description: formDesc.trim(),
      lighting: formLighting,
      seating: formSeating,
      sensitivityX: Number(formSensX),
      sensitivityY: Number(formSensY),
      smoothing: Number(formSmoothing),
      deadzone: Number(formDeadzone),
      acceleration: Number(formAcceleration),
      calibrationSnapshot: calibSnapshot,
    };

    const saved = authService.savePreset(payload);
    handleActivatePreset(saved.id);

    setEditingPreset(null);
    setIsCreatingNew(false);
    showFeedback(`Preset "${saved.name}" saved and activated!`);
  };

  // Duplicate preset
  const handleDuplicate = (presetId: string) => {
    const copy = authService.duplicatePreset(presetId);
    if (copy) {
      handleActivatePreset(copy.id);
      showFeedback(`Duplicated as "${copy.name}"!`);
    }
  };

  // Delete preset
  const handleDelete = (presetId: string, name: string) => {
    try {
      const success = authService.deletePreset(presetId);
      if (success) {
        showFeedback(`Deleted preset "${name}".`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showFeedback(message);
    }
  };

  // Reset to factory defaults
  const handleResetDefaults = () => {
    if (window.confirm('Reset all presets to factory defaults? Your custom presets will be replaced.')) {
      authService.resetPresetsToDefaults();
      handleActivatePreset(DEFAULT_PRESETS[0].id);
      showFeedback('Reset to default presets.');
    }
  };

  // Helpers for icons and labels
  const getLightingBadge = (lighting: EnvironmentLighting) => {
    switch (lighting) {
      case 'daylight':
        return {
          icon: <Sun className="w-3.5 h-3.5 text-amber-400" />,
          label: 'Daylight / Bright',
          bg: 'bg-amber-950/40 border-amber-800/60 text-amber-300',
        };
      case 'dim_night':
        return {
          icon: <Moon className="w-3.5 h-3.5 text-indigo-400" />,
          label: 'Dim Night / Bed',
          bg: 'bg-indigo-950/40 border-indigo-800/60 text-indigo-300',
        };
      case 'office':
        return {
          icon: <Building2 className="w-3.5 h-3.5 text-cyan-400" />,
          label: 'Office Lighting',
          bg: 'bg-cyan-950/40 border-cyan-800/60 text-cyan-300',
        };
      case 'backlit':
        return {
          icon: <SunMedium className="w-3.5 h-3.5 text-orange-400" />,
          label: 'Backlit Glare',
          bg: 'bg-orange-950/40 border-orange-800/60 text-orange-300',
        };
    }
  };

  const getSeatingBadge = (seating: SeatingPosition) => {
    switch (seating) {
      case 'desk_upright':
        return {
          icon: <Laptop className="w-3.5 h-3.5 text-blue-400" />,
          label: 'Desk Upright',
          bg: 'bg-blue-950/40 border-blue-800/60 text-blue-300',
        };
      case 'standing':
        return {
          icon: <User className="w-3.5 h-3.5 text-emerald-400" />,
          label: 'Standing Desk',
          bg: 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300',
        };
      case 'reclined_bed':
        return {
          icon: <Armchair className="w-3.5 h-3.5 text-purple-400" />,
          label: 'Reclined / Bed',
          bg: 'bg-purple-950/40 border-purple-800/60 text-purple-300',
        };
      case 'wheelchair':
        return {
          icon: <Accessibility className="w-3.5 h-3.5 text-rose-400" />,
          label: 'Wheelchair / Support',
          bg: 'bg-rose-950/40 border-rose-800/60 text-rose-300',
        };
      case 'custom':
        return {
          icon: <Sliders className="w-3.5 h-3.5 text-teal-400" />,
          label: 'Custom Ergonomics',
          bg: 'bg-teal-950/40 border-teal-800/60 text-teal-300',
        };
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-100 overflow-y-auto select-none p-5 space-y-6">
      {/* Toast Feedback Notification */}
      {feedbackMessage && (
        <div className="sticky top-2 z-50 self-center px-4 py-2 bg-cyan-600/90 text-white border border-cyan-400/50 rounded-xl shadow-2xl backdrop-blur-md text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Top Profile Summary Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          {currentUser?.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt=""
              className="w-12 h-12 rounded-xl border border-cyan-500/40 object-cover shadow-md"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-cyan-900/60 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-lg">
              {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white tracking-wide">
                {currentUser?.name || 'Harsh Vardhan'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950/80 border border-cyan-800 text-cyan-300 flex items-center gap-1">
                <UserCheck className="w-2.5 h-2.5" />
                {currentUser?.provider === 'google'
                  ? 'Google Account'
                  : currentUser?.provider === 'password'
                  ? 'Member Profile'
                  : 'Guest Profile'}
              </span>
            </div>
            <div className="text-xs text-neutral-400">
              {currentUser?.email || 'harshvardhan32613261@gmail.com'} • {presets.length} Presets Available
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSnapshotCurrentSettings}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium border border-neutral-700 transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
            title="Saves current live calibration and slider values as a new preset"
          >
            <Save className="w-3.5 h-3.5 text-cyan-400" />
            <span>Snapshot Live Setup</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-950 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Custom Preset</span>
          </button>

          {onOpenLogin && (
            <button
              onClick={onOpenLogin}
              className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-medium transition-colors"
            >
              Switch Account
            </button>
          )}
        </div>
      </div>

      {/* Currently Active Preset Hero Banner */}
      {activePreset && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-950/50 via-neutral-900/80 to-neutral-900/50 border border-cyan-500/40 p-5 shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[11px] font-bold uppercase tracking-wider animate-pulse">
                  <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                  Active Live Preset
                </span>
                <span className="text-xs text-neutral-400">Instantly driving head motion cursor</span>
              </div>

              <div className="text-xl font-bold text-white flex items-center gap-2">
                {activePreset.name}
              </div>

              <p className="text-xs text-neutral-300 max-w-xl leading-relaxed">
                {activePreset.description}
              </p>

              {/* Environmental Tags */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {(() => {
                  const lightBadge = getLightingBadge(activePreset.lighting);
                  return (
                    <span
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium ${lightBadge.bg}`}
                    >
                      {lightBadge.icon}
                      <span>{lightBadge.label}</span>
                    </span>
                  );
                })()}

                {(() => {
                  const seatBadge = getSeatingBadge(activePreset.seating);
                  return (
                    <span
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium ${seatBadge.bg}`}
                    >
                      {seatBadge.icon}
                      <span>{seatBadge.label}</span>
                    </span>
                  );
                })()}

                {activePreset.calibrationSnapshot && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg border bg-neutral-800/80 border-neutral-700 text-neutral-300 text-xs font-medium">
                    <Crosshair className="w-3 h-3 text-cyan-400" />
                    <span>Calibrated Center Active</span>
                  </span>
                )}
              </div>
            </div>

            {/* Quick Metrics Display */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 bg-neutral-950/70 p-3 rounded-xl border border-neutral-800">
              <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[10px] text-neutral-400">Sens X / Y</span>
                <span className="text-sm font-bold text-cyan-400">
                  {activePreset.sensitivityX.toFixed(1)}x / {activePreset.sensitivityY.toFixed(1)}x
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[10px] text-neutral-400">Smoothing</span>
                <span className="text-sm font-bold text-emerald-400">
                  {activePreset.smoothing.toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[10px] text-neutral-400">Deadzone</span>
                <span className="text-sm font-bold text-amber-400">
                  {activePreset.deadzone.toFixed(3)}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[10px] text-neutral-400">Acceleration</span>
                <span className="text-sm font-bold text-purple-400">
                  {activePreset.acceleration.toFixed(2)}x
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preset Cards Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Available Environment & Posture Presets</span>
            </h3>
            <p className="text-[11px] text-neutral-400">
              Click any card to switch instantly, or customize parameters for your room.
            </p>
          </div>

          <button
            onClick={handleResetDefaults}
            className="text-[11px] text-neutral-400 hover:text-cyan-400 flex items-center gap-1 hover:underline transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restore Defaults</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {presets.map((preset) => {
            const isActive = activePreset?.id === preset.id;
            const lightBadge = getLightingBadge(preset.lighting);
            const seatBadge = getSeatingBadge(preset.seating);

            return (
              <div
                key={preset.id}
                className={`flex flex-col justify-between p-4 rounded-xl border transition-all duration-150 ${
                  isActive
                    ? 'bg-neutral-900/90 border-cyan-500 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                    : 'bg-neutral-900/40 hover:bg-neutral-900/70 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-white">{preset.name}</span>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500 text-neutral-950">
                          Active
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(preset)}
                        className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                        title="Edit preset parameters"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(preset.id)}
                        className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                        title="Duplicate preset"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {presets.length > 1 && (
                        <button
                          onClick={() => handleDelete(preset.id, preset.name)}
                          className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors"
                          title="Delete preset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 mb-3 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>

                  {/* Badge tags */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${lightBadge.bg}`}
                    >
                      {lightBadge.icon}
                      <span>{lightBadge.label}</span>
                    </span>
                    <span
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${seatBadge.bg}`}
                    >
                      {seatBadge.icon}
                      <span>{seatBadge.label}</span>
                    </span>
                  </div>

                  {/* Quick parameter summary pills */}
                  <div className="flex items-center gap-2 text-[10px] text-neutral-400 bg-neutral-950/60 p-2 rounded-lg border border-neutral-800/80 mb-3">
                    <div>
                      Sens:{' '}
                      <span className="text-cyan-300 font-semibold">
                        {preset.sensitivityX}x / {preset.sensitivityY}x
                      </span>
                    </div>
                    <div>•</div>
                    <div>
                      Filter:{' '}
                      <span className="text-emerald-300 font-semibold">{preset.smoothing}</span>
                    </div>
                    <div>•</div>
                    <div>
                      Deadzone:{' '}
                      <span className="text-amber-300 font-semibold">{preset.deadzone}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom button */}
                <button
                  onClick={() => handleActivatePreset(preset.id)}
                  disabled={isActive}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 cursor-default'
                      : 'bg-neutral-800 hover:bg-cyan-600 hover:text-white text-neutral-200 border border-neutral-700 hover:border-cyan-500 active:scale-98'
                  }`}
                >
                  {isActive ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Current Active Preset</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Switch to This Preset</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lighting & Seating Ergonomics Advice Card */}
      <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800/80 space-y-3">
        <h4 className="text-xs font-bold text-white flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>Lighting & Ergonomic Advice for Best Tracking</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-neutral-400">
          <div className="p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800">
            <div className="font-semibold text-amber-300 flex items-center gap-1.5 mb-1">
              <Sun className="w-3.5 h-3.5" />
              <span>Face Frontal Light</span>
            </div>
            <span>
              Position ambient light sources directly in front or slightly to the side of your face.
              Harsh overhead lamps create deep nose shadows that cause cursor jitter.
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800">
            <div className="font-semibold text-indigo-300 flex items-center gap-1.5 mb-1">
              <Moon className="w-3.5 h-3.5" />
              <span>Low-Light Evening Setup</span>
            </div>
            <span>
              If tracking in a dark bedroom or evening desk, switch to the{' '}
              <strong className="text-neutral-200">Dim Evening</strong> preset. Its heavy smoothing
              dampens webcam image sensor noise.
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800">
            <div className="font-semibold text-emerald-300 flex items-center gap-1.5 mb-1">
              <User className="w-3.5 h-3.5" />
              <span>Standing Postural Sway</span>
            </div>
            <span>
              When standing, our bodies sway 1-2 cm naturally. The{' '}
              <strong className="text-neutral-200">Standing Sway-Guard</strong> preset has a wider
              deadzone (0.024) to keep the cursor completely motionless while you breathe or shift weight.
            </span>
          </div>
        </div>
      </div>

      {/* Create / Edit Preset Modal */}
      {(editingPreset || isCreatingNew) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-5 overflow-y-auto max-h-[90vh] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  {editingPreset ? `Edit "${editingPreset.name}"` : 'Create Custom Preset'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setEditingPreset(null);
                  setIsCreatingNew(false);
                }}
                className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
              {/* Preset Name */}
              <div className="space-y-1">
                <label className="font-semibold text-neutral-300">Preset Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Bedside Lamp / Reclined"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 focus:border-cyan-500 focus:outline-none text-white text-xs"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-semibold text-neutral-300">Description / Environmental Notes</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Notes about lighting lamps, distance to monitor, or chair recline..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 focus:border-cyan-500 focus:outline-none text-white text-xs"
                />
              </div>

              {/* Environment Lighting Selection */}
              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-300">Environment Lighting</label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'daylight', label: 'Daylight / Bright', icon: Sun },
                      { id: 'dim_night', label: 'Dim Night / Bed', icon: Moon },
                      { id: 'office', label: 'Office Lighting', icon: Building2 },
                      { id: 'backlit', label: 'Backlit Glare', icon: SunMedium },
                    ] as const
                  ).map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = formLighting === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFormLighting(opt.id)}
                        className={`p-2 rounded-lg border flex items-center gap-2 text-left transition-colors ${
                          isSelected
                            ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seating Position Selection */}
              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-300">Seating Ergonomics</label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'desk_upright', label: 'Desk Upright', icon: Laptop },
                      { id: 'standing', label: 'Standing Desk', icon: User },
                      { id: 'reclined_bed', label: 'Reclined / Bed', icon: Armchair },
                      { id: 'wheelchair', label: 'Wheelchair / Support', icon: Accessibility },
                    ] as const
                  ).map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = formSeating === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFormSeating(opt.id)}
                        className={`p-2 rounded-lg border flex items-center gap-2 text-left transition-colors ${
                          isSelected
                            ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sliders */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                {/* Sensitivity X */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-300">Horizontal Sensitivity (X)</span>
                    <span className="text-cyan-400 font-bold">{formSensX.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="5.0"
                    step="0.1"
                    value={formSensX}
                    onChange={(e) => setFormSensX(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>

                {/* Sensitivity Y */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-300">Vertical Sensitivity (Y)</span>
                    <span className="text-cyan-400 font-bold">{formSensY.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="5.0"
                    step="0.1"
                    value={formSensY}
                    onChange={(e) => setFormSensY(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>

                {/* Smoothing */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-300">Smoothing Factor (Noise Dampener)</span>
                    <span className="text-emerald-400 font-bold">{formSmoothing.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.80"
                    step="0.01"
                    value={formSmoothing}
                    onChange={(e) => setFormSmoothing(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500">
                    <span>0.05 (Heavy noise filter / low-light)</span>
                    <span>0.80 (Raw & snappy)</span>
                  </div>
                </div>

                {/* Deadzone */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-300">Resting Deadzone</span>
                    <span className="text-amber-400 font-bold">{formDeadzone.toFixed(3)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.004"
                    max="0.040"
                    step="0.001"
                    value={formDeadzone}
                    onChange={(e) => setFormDeadzone(parseFloat(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500">
                    <span>0.004 (Micro-motion)</span>
                    <span>0.040 (Sway resistance)</span>
                  </div>
                </div>

                {/* Acceleration */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-300">Acceleration Curve</span>
                    <span className="text-purple-400 font-bold">{formAcceleration.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="2.2"
                    step="0.05"
                    value={formAcceleration}
                    onChange={(e) => setFormAcceleration(parseFloat(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                </div>
              </div>

              {/* Calibration snapshot checkbox */}
              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-700">
                <input
                  type="checkbox"
                  checked={includeCalibrationSnapshot}
                  onChange={(e) => setIncludeCalibrationSnapshot(e.target.checked)}
                  className="rounded accent-cyan-500"
                />
                <span className="text-neutral-300">
                  Bind currently calibrated resting center to this preset
                </span>
              </label>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPreset(null);
                    setIsCreatingNew(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-md shadow-cyan-950 transition-colors flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingPreset ? 'Update Preset' : 'Save & Activate'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
