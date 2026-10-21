/**
 * AeroFace Authentication & Profile Presets Service
 * Supports Email/Password login, Registration, Google Sign-In, and
 * comprehensive calibration & sensitivity profile presets for different
 * environment lighting conditions and seating ergonomics.
 */

export type EnvironmentLighting = 'daylight' | 'dim_night' | 'office' | 'backlit';
export type SeatingPosition = 'desk_upright' | 'standing' | 'reclined_bed' | 'wheelchair' | 'custom';

export interface CalibrationSnapshot {
  restingNoseX: number;
  restingNoseY: number;
  minRangeX?: number;
  maxRangeX?: number;
  minRangeY?: number;
  maxRangeY?: number;
}

export interface TrackingPreset {
  id: string;
  name: string;
  description: string;
  lighting: EnvironmentLighting;
  seating: SeatingPosition;
  sensitivityX: number; // 0.5 - 5.0
  sensitivityY: number; // 0.5 - 5.0
  smoothing: number; // 0.05 (heavy filter / smooth) - 0.90 (fast raw)
  deadzone: number; // 0.005 - 0.05
  acceleration: number; // 1.0 - 2.5
  isDefault?: boolean;
  createdAt: string;
  updatedAt?: string;
  calibrationSnapshot?: CalibrationSnapshot | null;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  provider: 'google' | 'password' | 'guest';
  createdAt: string;
  activePresetId: string;
  presets: TrackingPreset[];
  preferences?: {
    cursorStyle?: string;
    soundFeedback?: boolean;
  };
}

export const DEFAULT_PRESETS: TrackingPreset[] = [
  {
    id: 'preset_daylight_desk',
    name: 'Daylight & Desk Upright',
    description: 'Balanced sensitivity & natural damping for standard well-lit room and upright desk seating.',
    lighting: 'daylight',
    seating: 'desk_upright',
    sensitivityX: 2.2,
    sensitivityY: 2.0,
    smoothing: 0.35,
    deadzone: 0.008,
    acceleration: 1.25,
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'preset_dim_night_reclined',
    name: 'Dim Evening & Bed / Reclined',
    description: 'Heavy noise filter (smoothing 0.18) to absorb low-light sensor grain. Wider deadzone for relaxed head angle.',
    lighting: 'dim_night',
    seating: 'reclined_bed',
    sensitivityX: 2.7,
    sensitivityY: 2.5,
    smoothing: 0.18,
    deadzone: 0.018,
    acceleration: 1.2,
    isDefault: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'preset_standing_sway',
    name: 'Standing Desk Sway-Guard',
    description: 'Specially engineered for standing desks. Expanded deadzone (0.024) cancels natural postural weight shifts.',
    lighting: 'office',
    seating: 'standing',
    sensitivityX: 1.9,
    sensitivityY: 1.7,
    smoothing: 0.28,
    deadzone: 0.024,
    acceleration: 1.35,
    isDefault: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'preset_micro_motion',
    name: 'High-Precision Micro-Motion',
    description: 'Amplified 3.6x scaling with hairline deadzone for tiny head movements, targeting small buttons or artwork.',
    lighting: 'daylight',
    seating: 'desk_upright',
    sensitivityX: 3.6,
    sensitivityY: 3.4,
    smoothing: 0.45,
    deadzone: 0.005,
    acceleration: 1.55,
    isDefault: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'preset_backlit_window',
    name: 'Backlit Glare & Overhead Light',
    description: 'Robust filter against uneven contrast from windows behind you or harsh fluorescent glare.',
    lighting: 'backlit',
    seating: 'desk_upright',
    sensitivityX: 2.4,
    sensitivityY: 2.2,
    smoothing: 0.22,
    deadzone: 0.015,
    acceleration: 1.25,
    isDefault: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

const STORAGE_KEY = 'aeroface_user_session';
const REGISTERED_USERS_KEY = 'aeroface_registered_accounts';

class AuthService {
  private currentUser: UserProfile | null = null;
  private listeners: ((user: UserProfile | null) => void)[] = [];
  private presetChangeListeners: ((preset: TrackingPreset) => void)[] = [];

  constructor() {
    this.loadSession();
  }

  private ensurePresets(user: Partial<UserProfile>): UserProfile {
    const presets = Array.isArray(user.presets) && user.presets.length > 0
      ? user.presets
      : JSON.parse(JSON.stringify(DEFAULT_PRESETS));

    const activePresetId: string =
      user.activePresetId && presets.some((p: TrackingPreset) => p.id === user.activePresetId)
        ? user.activePresetId
        : presets[0]?.id || DEFAULT_PRESETS[0].id;

    return {
      id: user.id || 'usr_default',
      name: user.name || 'Harsh Vardhan',
      email: user.email || 'harshvardhan32613261@gmail.com',
      avatarUrl: user.avatarUrl || '/assets/aistudio/WhatsApp_Image_2026-07-26_at_3.25.36_PM_04076b3e.jpeg',
      provider: user.provider || 'google',
      createdAt: user.createdAt || new Date().toISOString(),
      activePresetId,
      presets,
      preferences: user.preferences,
    };
  }

  private loadSession() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.currentUser = this.ensurePresets(parsed);
      } else {
        // Default Google user with user's uploaded portrait avatar
        this.currentUser = this.ensurePresets({
          id: 'user_default',
          name: 'Harsh Vardhan',
          email: 'harshvardhan32613261@gmail.com',
          avatarUrl: '/assets/aistudio/WhatsApp_Image_2026-07-26_at_3.25.36_PM_04076b3e.jpeg',
          provider: 'google',
          createdAt: new Date().toISOString(),
        });
      }
    } catch {
      this.currentUser = this.ensurePresets({
        id: 'user_fallback',
        name: 'Guest User',
        email: 'guest@sparrow.local',
        avatarUrl: '/assets/aistudio/WhatsApp_Image_2026-07-26_at_3.25.36_PM_04076b3e.jpeg',
        provider: 'guest',
      });
    }
  }

  public subscribe(listener: (user: UserProfile | null) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public subscribePresetChange(listener: (preset: TrackingPreset) => void): () => void {
    this.presetChangeListeners.push(listener);
    const active = this.getActivePreset();
    if (active) listener(active);
    return () => {
      this.presetChangeListeners = this.presetChangeListeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    if (this.currentUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.listeners.forEach((l) => l(this.currentUser));
  }

  private notifyPresetChange(preset: TrackingPreset) {
    this.presetChangeListeners.forEach((l) => l(preset));
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public getPresets(): TrackingPreset[] {
    if (!this.currentUser) return DEFAULT_PRESETS;
    return this.currentUser.presets;
  }

  public getActivePreset(): TrackingPreset | null {
    if (!this.currentUser) return DEFAULT_PRESETS[0];
    const found = this.currentUser.presets.find((p) => p.id === this.currentUser?.activePresetId);
    return found || this.currentUser.presets[0] || DEFAULT_PRESETS[0];
  }

  public activatePreset(presetId: string): TrackingPreset | null {
    if (!this.currentUser) return null;
    const target = this.currentUser.presets.find((p) => p.id === presetId);
    if (!target) return null;

    this.currentUser.activePresetId = target.id;
    this.notify();
    this.notifyPresetChange(target);
    return target;
  }

  public savePreset(
    presetData: Omit<TrackingPreset, 'id' | 'createdAt'> & { id?: string }
  ): TrackingPreset {
    if (!this.currentUser) {
      this.currentUser = this.ensurePresets({});
    }

    const now = new Date().toISOString();
    let savedPreset: TrackingPreset;

    if (presetData.id) {
      // Update existing preset
      const index = this.currentUser.presets.findIndex((p) => p.id === presetData.id);
      if (index >= 0) {
        const existing = this.currentUser.presets[index];
        savedPreset = {
          ...existing,
          ...presetData,
          id: existing.id,
          createdAt: existing.createdAt,
          updatedAt: now,
        };
        this.currentUser.presets[index] = savedPreset;
      } else {
        savedPreset = {
          ...presetData,
          id: presetData.id,
          createdAt: now,
          updatedAt: now,
        };
        this.currentUser.presets.push(savedPreset);
      }
    } else {
      // Create new preset
      const newId = `preset_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      savedPreset = {
        ...presetData,
        id: newId,
        createdAt: now,
        updatedAt: now,
      };
      this.currentUser.presets.push(savedPreset);
      this.currentUser.activePresetId = newId;
    }

    this.notify();
    if (this.currentUser.activePresetId === savedPreset.id) {
      this.notifyPresetChange(savedPreset);
    }
    return savedPreset;
  }

  public duplicatePreset(presetId: string): TrackingPreset | null {
    if (!this.currentUser) return null;
    const existing = this.currentUser.presets.find((p) => p.id === presetId);
    if (!existing) return null;

    const duplicated: TrackingPreset = {
      ...existing,
      id: `preset_${Date.now()}_copy`,
      name: `${existing.name} (Copy)`,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.currentUser.presets.push(duplicated);
    this.currentUser.activePresetId = duplicated.id;
    this.notify();
    this.notifyPresetChange(duplicated);
    return duplicated;
  }

  public deletePreset(presetId: string): boolean {
    if (!this.currentUser) return false;
    const target = this.currentUser.presets.find((p) => p.id === presetId);
    if (!target) return false;

    // Never allow deleting the very last preset
    if (this.currentUser.presets.length <= 1) {
      throw new Error('You must keep at least one preset.');
    }

    this.currentUser.presets = this.currentUser.presets.filter((p) => p.id !== presetId);

    // If active preset was deleted, switch to the first available preset
    if (this.currentUser.activePresetId === presetId) {
      const nextActive = this.currentUser.presets[0];
      this.currentUser.activePresetId = nextActive.id;
      this.notifyPresetChange(nextActive);
    }

    this.notify();
    return true;
  }

  public resetPresetsToDefaults(): TrackingPreset[] {
    if (!this.currentUser) return DEFAULT_PRESETS;
    this.currentUser.presets = JSON.parse(JSON.stringify(DEFAULT_PRESETS));
    this.currentUser.activePresetId = DEFAULT_PRESETS[0].id;
    this.notify();
    this.notifyPresetChange(DEFAULT_PRESETS[0]);
    return this.currentUser.presets;
  }

  public async loginWithEmail(email: string, pass: string): Promise<UserProfile> {
    const accountsJson = localStorage.getItem(REGISTERED_USERS_KEY);
    const accounts: Record<string, { name: string; email: string; pass: string }> = accountsJson
      ? JSON.parse(accountsJson)
      : {};

    const userEntry = accounts[email.toLowerCase()];
    if (userEntry && userEntry.pass !== pass) {
      throw new Error('Incorrect password. Please check your credentials.');
    }

    const name = userEntry ? userEntry.name : email.split('@')[0];
    const user = this.ensurePresets({
      id: `usr_${Date.now()}`,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      email: email.toLowerCase(),
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      provider: 'password',
      createdAt: new Date().toISOString(),
    });

    this.currentUser = user;
    this.notify();
    const active = this.getActivePreset();
    if (active) this.notifyPresetChange(active);
    return user;
  }

  public async registerWithEmail(name: string, email: string, pass: string): Promise<UserProfile> {
    if (!name.trim() || !email.trim() || !pass) {
      throw new Error('All registration fields are required.');
    }
    if (pass.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const accountsJson = localStorage.getItem(REGISTERED_USERS_KEY);
    const accounts: Record<string, { name: string; email: string; pass: string }> = accountsJson
      ? JSON.parse(accountsJson)
      : {};

    const normalizedEmail = email.toLowerCase().trim();
    accounts[normalizedEmail] = {
      name: name.trim(),
      email: normalizedEmail,
      pass,
    };
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(accounts));

    const user = this.ensurePresets({
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`,
      provider: 'password',
      createdAt: new Date().toISOString(),
    });

    this.currentUser = user;
    this.notify();
    const active = this.getActivePreset();
    if (active) this.notifyPresetChange(active);
    return user;
  }

  public async loginWithGoogle(hintEmail?: string): Promise<UserProfile> {
    const email = hintEmail || 'harshvardhan32613261@gmail.com';
    const namePart = email.split('@')[0].replace(/[0-9]/g, '');
    const cleanName = namePart ? namePart.charAt(0).toUpperCase() + namePart.slice(1) : 'Google User';

    const isHarsh = email.toLowerCase().includes('harsh');
    const user = this.ensurePresets({
      id: `google_${Date.now()}`,
      name: cleanName === 'Harshvardhan' ? 'Harsh Vardhan' : cleanName,
      email: email,
      avatarUrl: isHarsh
        ? '/assets/aistudio/WhatsApp_Image_2026-07-26_at_3.25.36_PM_04076b3e.jpeg'
        : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
      provider: 'google',
      createdAt: new Date().toISOString(),
    });

    this.currentUser = user;
    this.notify();
    const active = this.getActivePreset();
    if (active) this.notifyPresetChange(active);
    return user;
  }

  public continueAsGuest(): UserProfile {
    const user = this.ensurePresets({
      id: `guest_${Date.now()}`,
      name: 'Guest User',
      email: 'guest@sparrow.local',
      avatarUrl: '/assets/aistudio/WhatsApp_Image_2026-07-26_at_3.25.36_PM_04076b3e.jpeg',
      provider: 'guest',
      createdAt: new Date().toISOString(),
    });
    this.currentUser = user;
    this.notify();
    const active = this.getActivePreset();
    if (active) this.notifyPresetChange(active);
    return user;
  }

  public logout() {
    this.currentUser = null;
    this.notify();
  }
}

export const authService = new AuthService();
