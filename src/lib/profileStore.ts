import { Settings, DEFAULT_SETTINGS } from './settingsStore';

export interface Profile {
  id: string;
  name: string;
  avatar?: string;
  apiKey: string;
  settings: Settings;
  createdAt: number;
}

const STORAGE_KEY = 'gide_profiles';
const ACTIVE_PROFILE_KEY = 'gide_active_profile_id';

export const profileStore = {
  getProfiles(): Profile[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  saveProfiles(profiles: Profile[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  },

  getActiveProfileId(): string | null {
    return localStorage.getItem(ACTIVE_PROFILE_KEY);
  },

  setActiveProfileId(id: string | null) {
    if (id) localStorage.setItem(ACTIVE_PROFILE_KEY, id);
    else localStorage.removeItem(ACTIVE_PROFILE_KEY);
  },

  getActiveProfile(): Profile | null {
    const id = this.getActiveProfileId();
    if (!id) return null;
    return this.getProfiles().find(p => p.id === id) || null;
  },

  createProfile(name: string, apiKey: string, avatar?: string): Profile {
    const profiles = this.getProfiles();
    const newProfile: Profile = {
      id: Math.random().toString(36).substring(2, 11),
      name,
      apiKey,
      avatar,
      settings: { ...DEFAULT_SETTINGS },
      createdAt: Date.now()
    };
    profiles.push(newProfile);
    this.saveProfiles(profiles);
    return newProfile;
  },

  updateProfile(id: string, updates: Partial<Profile>) {
    const profiles = this.getProfiles();
    const index = profiles.findIndex(p => p.id === id);
    if (index !== -1) {
      profiles[index] = { ...profiles[index], ...updates };
      this.saveProfiles(profiles);
    }
  },

  deleteProfile(id: string) {
    const profiles = this.getProfiles().filter(p => p.id !== id);
    this.saveProfiles(profiles);
    if (this.getActiveProfileId() === id) {
      this.setActiveProfileId(null);
    }
  }
};
