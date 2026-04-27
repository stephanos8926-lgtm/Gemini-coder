import React, { useState, useEffect } from 'react';
import { User, Plus, Trash2, Key, Check, LogIn, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { profileStore, Profile } from '../lib/profileStore';

interface ProfileSelectorProps {
  onSelect: (profile: Profile) => void;
}

export function ProfileSelector({ onSelect }: ProfileSelectorProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newAvatar, setNewAvatar] = useState('');

  useEffect(() => {
    setProfiles(profileStore.getProfiles());
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim() && newKey.trim()) {
      const profile = profileStore.createProfile(newName, newKey, newAvatar);
      setProfiles(profileStore.getProfiles());
      setIsCreating(false);
      setNewName('');
      setNewKey('');
      setNewAvatar('');
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this profile?')) {
      profileStore.deleteProfile(id);
      setProfiles(profileStore.getProfiles());
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#252526] border border-[#3c3c3c] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-[#3c3c3c] bg-[#1e1e1e]/50">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-[#007acc]/10 rounded-xl">
              <Sparkles className="w-8 h-8 text-[#007acc]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Welcome to RapidForge</h2>
              <p className="text-[#858585] text-sm">Select a profile to continue your workspace</p>
            </div>
          </div>
        </div>

        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {!isCreating ? (
              <motion.div 
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {profiles.map(profile => (
                  <div
                    key={profile.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(profile)}
                    onKeyDown={(e) => e.key === 'Enter' && onSelect(profile)}
                    className="group relative flex items-center gap-4 p-4 bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl hover:border-[#007acc] hover:bg-[#2d2d2d] transition-all text-left overflow-hidden cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-lg bg-[#252526] border border-[#3c3c3c] flex items-center justify-center text-[#007acc] shrink-0 overflow-hidden">
                      {profile.avatar ? (
                        <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold truncate">{profile.name}</h3>
                      <p className="text-[10px] text-[#858585] font-mono truncate opacity-60">
                        {profile.apiKey.substring(0, 8)}...{profile.apiKey.slice(-4)}
                      </p>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => handleDelete(e, profile.id)}
                        className="p-1.5 text-[#858585] hover:text-red-500 rounded-md hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <LogIn className="w-4 h-4 text-[#007acc]" />
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex items-center justify-center gap-3 p-4 border-2 border-dashed border-[#3c3c3c] rounded-xl hover:border-[#007acc] hover:bg-[#007acc]/5 transition-all text-[#858585] hover:text-[#007acc]"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-bold">New Profile</span>
                </button>
              </motion.div>
            ) : (
              <motion.form 
                key="create"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleCreate}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#858585] uppercase tracking-widest">Profile Name</label>
                    <input
                      autoFocus
                      required
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Personal, Work, Project X"
                      className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#007acc] transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#858585] uppercase tracking-widest">Gemini API Key</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#858585]" />
                      <input
                        required
                        type="password"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        placeholder="Enter your API key"
                        className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-[#007acc] transition-colors"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#858585] uppercase tracking-widest">Avatar URL (Optional)</label>
                    <input
                      type="url"
                      value={newAvatar}
                      onChange={(e) => setNewAvatar(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#007acc] transition-colors"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 px-6 py-3 bg-[#3c3c3c] text-white rounded-xl font-bold hover:bg-[#4d4d4d] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-[#007acc] text-white rounded-xl font-bold hover:bg-[#0062a3] shadow-lg shadow-[#007acc]/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Create Profile
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 bg-[#1e1e1e] border-t border-[#3c3c3c] text-center">
          <p className="text-[10px] text-[#858585] uppercase tracking-widest font-bold">
            Profiles are stored locally in your browser
          </p>
        </div>
      </motion.div>
    </div>
  );
}
