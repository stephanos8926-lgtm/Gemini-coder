import { useState, useEffect } from 'react';
import { Profile, profileStore } from '../lib/profileStore';
import { Settings, settingsStore } from '../lib/settingsStore';
import { auth } from '../firebase';
import { signInWithPopup, signOut, GithubAuthProvider, GoogleAuthProvider } from 'firebase/auth';

interface UseAppAuthProps {
  user: any;
  setActiveProfile: (profile: Profile | null) => void;
  setApiKey: (key: string | null) => void;
  setSettings: (settings: Settings) => void;
  setShowKeyModal: (show: boolean) => void;
}

export function useAppAuth({
  user,
  setActiveProfile,
  setApiKey,
  setSettings,
  setShowKeyModal
}: UseAppAuthProps) {
  const [activeProfile, setLocalActiveProfile] = useState<Profile | null>(profileStore.getActiveProfile());

  useEffect(() => {
    if (user && user.email) {
      const profile = profileStore.getActiveProfile();
      if (profile && profile.name === 'User') {
        profileStore.updateProfile(profile.id, { name: user.email });
        const updatedProfile = { ...profile, name: user.email };
        setLocalActiveProfile(updatedProfile);
        setActiveProfile(updatedProfile);
      }
    }
  }, [user]);

  const handleProfileSelect = (profile: Profile) => {
    profileStore.setActiveProfileId(profile.id);
    setLocalActiveProfile(profile);
    setActiveProfile(profile);
    setApiKey(profile.apiKey);
    setSettings(profile.settings);
    setShowKeyModal(false);
  };

  const handleSaveKey = (key: string) => {
    if (activeProfile) {
      profileStore.updateProfile(activeProfile.id, { apiKey: key });
      const updatedProfile = { ...activeProfile, apiKey: key };
      setLocalActiveProfile(updatedProfile);
      setActiveProfile(updatedProfile);
    }
    localStorage.setItem('gide_api_key', key);
    setApiKey(key);
    setShowKeyModal(false);
  };

  const handleSignInGithub = async () => {
    try {
      await signInWithPopup(auth, new GithubAuthProvider());
    } catch (error) {
      console.error('Failed to sign in with GitHub', error);
    }
  };

  const handleSignInGoogle = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error('Failed to sign in with Google', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Failed to sign out', error);
    }
  };

  return {
    activeProfile,
    handleProfileSelect,
    handleSaveKey,
    handleSignInGithub,
    handleSignInGoogle,
    handleSignOut
  };
}
