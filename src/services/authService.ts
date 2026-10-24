/**
 * AeroFace Authentication & Profile Presets Service
 * Supports Email/Password login, Registration, Google Sign-In, and
 * comprehensive calibration & sensitivity profile presets for different
 * environment lighting conditions and seating ergonomics.
 */

import { TrackingConfig, CalibrationData } from '../types';

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

export interface RegisteredAccountRecord {
  id: string;
  name: string;
  email: string;
  pass?: string;
  passHash?: string;
  avatarUrl?: string;
  provider?: 'password' | 'google' | 'guest';
  createdAt: string;
  config?: Partial<TrackingConfig>;
  presets?: TrackingPreset[];
  activePresetId?: string;
  calibration?: Partial<CalibrationData>;
  preferences?: {
    cursorStyle?: string;
    soundFeedback?: boolean;
  };
}

export const DEFAULT_ACCOUNTS_SEED: Record<string, RegisteredAccountRecord> = {
  'harshvardhan32613261@gmail.com': {
    id: 'usr_harsh_vardhan',
    name: 'Harsh Vardhan',
    email: 'harshvardhan32613261@gmail.com',
    pass: 'sparrow123',
    passHash: '5e0f9b2a',
    avatarUrl: '/assets/aistudio/WhatsApp_Image_2026-07-26_at_3.25.36_PM_04076b3e.jpeg',
    createdAt: '2026-01-01T00:00:00.000Z',
    provider: 'password',
    presets: DEFAULT_PRESETS,
    activePresetId: DEFAULT_PRESETS[0].id,
  },
};

class AuthService {
  private currentUser: UserProfile | null = null;
  private listeners: ((user: UserProfile | null) => void)[] = [];
  private presetChangeListeners: ((preset: TrackingPreset) => void)[] = [];

  constructor() {
    this.initRegisteredAccounts();
    this.loadSession();
  }

  public hashPassword(pass: string): string {
    let hash = 0x811c9dc5;
    const salted = `sparrow_auth_v1_${pass}`;
    for (let i = 0; i < salted.length; i++) {
      hash ^= salted.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16);
  }

  private initRegisteredAccounts() {
    try {
      const existingRaw = localStorage.getItem(REGISTERED_USERS_KEY);
      if (!existingRaw) {
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(DEFAULT_ACCOUNTS_SEED));
      } else {
        // Safe merge without overwriting existing registered accounts
        const existing: Record<string, RegisteredAccountRecord> = JSON.parse(existingRaw);
        let changed = false;
        for (const [key, seed] of Object.entries(DEFAULT_ACCOUNTS_SEED)) {
          if (!existing[key]) {
            existing[key] = seed;
            changed = true;
          }
        }
        if (changed) {
          localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(existing));
        }
      }
    } catch {
      // ignore
    }
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
      id: user.id || `usr_${Date.now()}`,
      name: user.name || 'User',
      email: user.email || 'user@sparrow.local',
      avatarUrl: user.avatarUrl || '/assets/aistudio/WhatsApp_Image_2026-07-26_at_3.25.36_PM_04076b3e.jpeg',
      provider: user.provider || 'password',
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
        // Ensure legacy default auto-logins are cleared so user logs in safely
        if (parsed?.id === 'user_default' || !parsed?.email || parsed?.email === 'user_default@sparrow.local') {
          localStorage.removeItem(STORAGE_KEY);
          this.currentUser = null;
        } else {
          this.currentUser = this.ensurePresets(parsed);
        }
      } else {
        // Enforce safe login gate on startup - no auto-logged-in default user!
        this.currentUser = null;
      }
    } catch {
      this.currentUser = null;
    }
  }

  public getUserSettings(userKey?: string): {
    config?: Partial<TrackingConfig>;
    calibration?: Partial<CalibrationData>;
    presets?: TrackingPreset[];
    activePresetId?: string;
  } | null {
    const key = (userKey || this.currentUser?.email || this.currentUser?.id || '').toLowerCase().trim();
    if (!key) return null;
    try {
      const saved = localStorage.getItem(`aeroface_user_data_${key}`);
      if (saved) {
        return JSON.parse(saved);
      }
      const accountsJson = localStorage.getItem(REGISTERED_USERS_KEY);
      if (accountsJson) {
        const accounts = JSON.parse(accountsJson);
        if (accounts[key]) {
          return {
            config: accounts[key].config,
            presets: accounts[key].presets,
            activePresetId: accounts[key].activePresetId,
          };
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  public saveUserSettings(
    userKey: string | undefined,
    data: {
      config?: Partial<TrackingConfig>;
      calibration?: Partial<CalibrationData>;
      presets?: TrackingPreset[];
      activePresetId?: string;
    }
  ) {
    const key = (userKey || this.currentUser?.email || this.currentUser?.id || '').toLowerCase().trim();
    if (!key) return;
    try {
      const existing = this.getUserSettings(key) || {};
      const merged = {
        ...existing,
        ...data,
        config: { ...existing.config, ...data.config },
        calibration: { ...existing.calibration, ...data.calibration },
      };
      if (data.presets) merged.presets = data.presets;
      if (data.activePresetId) merged.activePresetId = data.activePresetId;

      localStorage.setItem(`aeroface_user_data_${key}`, JSON.stringify(merged));

      // Also persist back to REGISTERED_USERS_KEY
      const accountsJson = localStorage.getItem(REGISTERED_USERS_KEY);
      if (accountsJson) {
        const accounts = JSON.parse(accountsJson);
        if (accounts[key]) {
          accounts[key].config = merged.config;
          if (merged.presets) accounts[key].presets = merged.presets;
          if (merged.activePresetId) accounts[key].activePresetId = merged.activePresetId;
          localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(accounts));
        }
      }
    } catch {
      // ignore
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
      if (this.currentUser.email) {
        this.saveUserSettings(this.currentUser.email, {
          presets: this.currentUser.presets,
          activePresetId: this.currentUser.activePresetId,
        });
      }
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
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !pass) {
      throw new Error('Please enter both your email address and password.');
    }

    let accounts: Record<string, RegisteredAccountRecord> = {};
    try {
      const accountsJson = localStorage.getItem(REGISTERED_USERS_KEY);
      accounts = accountsJson ? JSON.parse(accountsJson) : {};
    } catch {
      accounts = {};
    }

    const userEntry = accounts[normalizedEmail];
    if (!userEntry) {
      // Reject login if account does not exist; never create a new account on login
      throw new Error('Account not found. Please register first.');
    }

    const hashedInput = this.hashPassword(pass);
    const isPasswordValid =
      (userEntry.passHash && userEntry.passHash === hashedInput) ||
      (userEntry.pass && userEntry.pass === pass);

    if (!isPasswordValid) {
      throw new Error('Incorrect password. Please check your credentials.');
    }

    // Preserve existing profile information, stable ID, and user settings
    const stableId = userEntry.id || `usr_${normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const savedData = this.getUserSettings(normalizedEmail);

    const user: UserProfile = {
      id: stableId,
      name: userEntry.name,
      email: normalizedEmail,
      avatarUrl:
        userEntry.avatarUrl ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userEntry.name)}`,
      provider: 'password',
      createdAt: userEntry.createdAt || new Date().toISOString(),
      activePresetId: savedData?.activePresetId || userEntry.activePresetId || DEFAULT_PRESETS[0].id,
      presets: savedData?.presets || userEntry.presets || JSON.parse(JSON.stringify(DEFAULT_PRESETS)),
      preferences: userEntry.preferences,
    };

    // Auto-migrate plaintext password to passHash if needed
    if (!userEntry.passHash) {
      userEntry.passHash = hashedInput;
      accounts[normalizedEmail] = userEntry;
      try {
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(accounts));
      } catch {
        // ignore
      }
    }

    this.currentUser = user;
    this.notify();
    const active = this.getActivePreset();
    if (active) this.notifyPresetChange(active);
    return user;
  }

  public async registerWithEmail(name: string, email: string, pass: string): Promise<UserProfile> {
    const cleanName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!cleanName) {
      throw new Error('Please enter your full name.');
    }
    if (!normalizedEmail || !normalizedEmail.includes('@') || !normalizedEmail.includes('.')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!pass || pass.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    let accounts: Record<string, RegisteredAccountRecord> = {};
    try {
      const accountsJson = localStorage.getItem(REGISTERED_USERS_KEY);
      accounts = accountsJson ? JSON.parse(accountsJson) : {};
    } catch {
      accounts = {};
    }

    // Prevent duplicate registration; do not overwrite existing accounts
    if (accounts[normalizedEmail]) {
      throw new Error('This email is already registered. Please log in instead.');
    }

    const stableId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const hashed = this.hashPassword(pass);
    const now = new Date().toISOString();

    const newAccount: RegisteredAccountRecord = {
      id: stableId,
      name: cleanName,
      email: normalizedEmail,
      passHash: hashed,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
      provider: 'password',
      createdAt: now,
      presets: JSON.parse(JSON.stringify(DEFAULT_PRESETS)),
      activePresetId: DEFAULT_PRESETS[0].id,
    };

    accounts[normalizedEmail] = newAccount;
    try {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(accounts));
    } catch (err) {
      console.warn('Failed to save to localStorage:', err);
    }

    const user: UserProfile = {
      id: stableId,
      name: cleanName,
      email: normalizedEmail,
      avatarUrl: newAccount.avatarUrl!,
      provider: 'password',
      createdAt: now,
      activePresetId: DEFAULT_PRESETS[0].id,
      presets: newAccount.presets!,
    };

    this.currentUser = user;
    this.notify();
    const active = this.getActivePreset();
    if (active) this.notifyPresetChange(active);
    return user;
  }

  public getAvailableGoogleAccounts(): { name: string; email: string; avatarUrl: string }[] {
    const list = [
      {
        name: 'Harsh Vardhan',
        email: 'harshvardhan32613261@gmail.com',
        avatarUrl: '/assets/aistudio/WhatsApp_Image_2026-07-26_at_3.25.36_PM_04076b3e.jpeg',
      },
    ];

    try {
      const accountsJson = localStorage.getItem(REGISTERED_USERS_KEY);
      if (accountsJson) {
        const accounts: Record<string, RegisteredAccountRecord> = JSON.parse(accountsJson);
        for (const [emailKey, acc] of Object.entries(accounts)) {
          if (emailKey !== 'harshvardhan32613261@gmail.com' && (acc.provider === 'google' || emailKey.includes('@gmail.com'))) {
            list.push({
              name: acc.name,
              email: acc.email,
              avatarUrl: acc.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(acc.name)}`,
            });
          }
        }
      }
    } catch {
      // ignore
    }

    return list;
  }

  public async loginWithGoogle(
    emailHint?: string,
    nameHint?: string,
    avatarUrlHint?: string
  ): Promise<UserProfile> {
    const targetEmail = (emailHint || this.currentUser?.email || 'harshvardhan32613261@gmail.com').trim().toLowerCase();

    let accounts: Record<string, RegisteredAccountRecord> = {};
    try {
      const accountsJson = localStorage.getItem(REGISTERED_USERS_KEY);
      accounts = accountsJson ? JSON.parse(accountsJson) : {};
    } catch {
      accounts = {};
    }

    const existing = accounts[targetEmail];

    // Determine user display name
    let userName = nameHint?.trim() || existing?.name;
    if (!userName) {
      if (targetEmail === 'harshvardhan32613261@gmail.com') {
        userName = 'Harsh Vardhan';
      } else {
        const prefix = targetEmail.split('@')[0] || 'User';
        userName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      }
    }

    // Determine user avatar
    let avatarUrl = avatarUrlHint || existing?.avatarUrl;
    if (!avatarUrl) {
      if (targetEmail === 'harshvardhan32613261@gmail.com') {
        avatarUrl = '/assets/aistudio/WhatsApp_Image_2026-07-26_at_3.25.36_PM_04076b3e.jpeg';
      } else {
        avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName)}`;
      }
    }

    const stableId = existing?.id || `usr_google_${targetEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const now = new Date().toISOString();

    if (!existing) {
      // Register new Google account and preserve in registered accounts
      accounts[targetEmail] = {
        id: stableId,
        name: userName,
        email: targetEmail,
        avatarUrl,
        provider: 'google',
        createdAt: now,
        presets: JSON.parse(JSON.stringify(DEFAULT_PRESETS)),
        activePresetId: DEFAULT_PRESETS[0].id,
      };
      try {
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(accounts));
      } catch (err) {
        console.warn('Failed to save to localStorage:', err);
      }
    } else {
      // Existing registered account: maintain settings and mark Google authorized
      let changed = false;
      if (existing.provider !== 'google') {
        existing.provider = 'google';
        changed = true;
      }
      if (!existing.avatarUrl) {
        existing.avatarUrl = avatarUrl;
        changed = true;
      }
      if (changed) {
        accounts[targetEmail] = existing;
        try {
          localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(accounts));
        } catch {
          // ignore
        }
      }
    }

    // Load existing presets, sensitivity and calibration settings
    const savedData = this.getUserSettings(targetEmail);
    const presets = savedData?.presets || existing?.presets || JSON.parse(JSON.stringify(DEFAULT_PRESETS));
    const activePresetId = savedData?.activePresetId || existing?.activePresetId || presets[0]?.id || DEFAULT_PRESETS[0].id;

    const user: UserProfile = {
      id: stableId,
      name: userName,
      email: targetEmail,
      avatarUrl,
      provider: 'google',
      createdAt: existing?.createdAt || now,
      activePresetId,
      presets,
      preferences: existing?.preferences,
    };

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
