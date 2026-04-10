import React from 'react';
import { Terminal, Key, Plus, Menu, Search, Settings as SettingsIcon, LogIn, LogOut, GitBranch, Sparkles, Download, FolderOpen, Github } from 'lucide-react';
import { motion } from 'motion/react';
import type { Profile } from '../lib/profileStore';

interface HeaderProps {
  user: any;
  workspaceName: string;
  isWorkspacesLoading: boolean;
  workspaces: string[];
  model: string;
  setModel: (model: string) => void;
  onSignInGoogle: () => void;
  onSignInGithub: () => void;
  onSignOut: () => void;
  onShowWorkspaceModal: () => void;
  onShowSettingsModal: () => void;
  onShowGitPanel: () => void;
  onShowTerminal: () => void;
  onShowCommandPalette: () => void;
  onShowMcpModal: () => void;
  showMcpModal: boolean;
  onSaveAll: () => void;
  activeProfile: Profile | null;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  workspaceName,
  isWorkspacesLoading,
  workspaces,
  model,
  setModel,
  onSignInGoogle,
  onSignInGithub,
  onSignOut,
  onShowWorkspaceModal,
  onShowSettingsModal,
  onShowGitPanel,
  onShowTerminal,
  onShowCommandPalette,
  onShowMcpModal,
  showMcpModal,
  onSaveAll,
  activeProfile,
  isMobileMenuOpen,
  setIsMobileMenuOpen
}) => {
  return (
    <header className="h-12 border-b border-[#3c3c3c] bg-[#2d2d2d] flex items-center justify-between px-4 shrink-0 z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#007acc] rounded-lg flex items-center justify-center shadow-lg shadow-[#007acc]/20">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white tracking-tight leading-none">GIDE</span>
            <span className="text-[9px] text-[#858585] font-bold uppercase tracking-widest leading-none mt-1">v2.5.0</span>
          </div>
          <button
            className="p-1.5 hover:bg-[#3c3c3c] rounded transition-colors text-[#858585] hover:text-white lg:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        <div className="h-6 w-[1px] bg-[#3c3c3c] mx-2 hidden sm:block" />

        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={onShowWorkspaceModal}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#3c3c3c] border border-[#3c3c3c] rounded-md transition-all group"
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#007acc] group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-[#cccccc] group-hover:text-white">
              {workspaceName ? workspaceName.split('/').pop() : 'Select Workspace'}
            </span>
          </button>
          
          <button
            onClick={onShowWorkspaceModal}
            className="p-1.5 text-[#858585] hover:text-white hover:bg-[#3c3c3c] rounded-md transition-all"
            title="New Workspace"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-1 bg-[#1e1e1e] p-1 rounded-lg border border-[#3c3c3c]">
          <button
            onClick={() => setModel('gemini-2.5-flash-lite')}
            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${model === 'gemini-2.5-flash-lite' ? 'bg-[#007acc] text-white' : 'text-[#858585] hover:text-[#cccccc]'}`}
          >
            LITE
          </button>
          <button
            onClick={() => setModel('gemini-2.5-flash')}
            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${model === 'gemini-2.5-flash' ? 'bg-[#007acc] text-white' : 'text-[#858585] hover:text-[#cccccc]'}`}
          >
            FLASH
          </button>
          <button
            onClick={() => setModel('gemini-2.5-pro')}
            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${model === 'gemini-2.5-pro' ? 'bg-[#007acc] text-white' : 'text-[#858585] hover:text-[#cccccc]'}`}
          >
            PRO
          </button>
          
          <div className="w-px h-3 bg-[#3c3c3c] mx-1" />
          
          <button
            onClick={onShowMcpModal}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${showMcpModal ? 'bg-[#007acc] text-white' : 'text-[#858585] hover:text-[#cccccc]'}`}
          >
            <SettingsIcon className="w-3 h-3" />
            <span className="hidden md:inline">MCP</span>
          </button>
        </div>

        <div className="h-4 w-[1px] bg-[#3c3c3c] mx-1 hidden lg:block" />

        <div className="flex items-center gap-1">
          <button
            onClick={onSaveAll}
            className="p-2 text-[#858585] hover:text-white hover:bg-[#3c3c3c] rounded-md transition-all"
            title="Save All"
          >
            <Download className="w-4 h-4 rotate-180" />
          </button>

          <button
            onClick={onShowCommandPalette}
            className="p-2 text-[#858585] hover:text-white hover:bg-[#3c3c3c] rounded-md transition-all"
            title="Command Palette (Ctrl+K)"
          >
            <Search className="w-4 h-4" />
          </button>
          
          <button
            onClick={onShowGitPanel}
            className="p-2 text-[#858585] hover:text-white hover:bg-[#3c3c3c] rounded-md transition-all"
            title="Git Operations"
          >
            <GitBranch className="w-4 h-4" />
          </button>

          <button
            onClick={onShowSettingsModal}
            className="p-2 text-[#858585] hover:text-white hover:bg-[#3c3c3c] rounded-md transition-all"
            title="Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="h-4 w-[1px] bg-[#3c3c3c] mx-1" />

        {user ? (
          <div className="flex items-center gap-2 pl-1">
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-[10px] font-bold text-white leading-none">{user.displayName || 'User'}</span>
              <span className="text-[9px] text-[#858585] leading-none mt-0.5">{user.email}</span>
            </div>
            <button
              onClick={onSignOut}
              className="p-1.5 bg-[#3c3c3c] hover:bg-[#4c4c4c] rounded-full transition-all border border-[#4c4c4c]"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5 text-[#cccccc]" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={onSignInGithub}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-black hover:bg-[#e5e5e5] rounded-md transition-all"
              title="Sign In with GitHub"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </button>
            <button
              onClick={onSignInGoogle}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#4285F4] text-white hover:bg-[#357ae8] rounded-md transition-all"
              title="Sign In with Google"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Google</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
