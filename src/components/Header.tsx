import React from 'react';
import { Terminal, Key, Plus, Menu, Search, Settings as SettingsIcon, LogIn, LogOut, GitBranch, Sparkles, Download, FolderOpen, Github, Code2, Play, PanelLeft, PanelRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Profile } from '../lib/profileStore';
import { RW_APP_NAME, RW_APP_SUBTITLE } from '../constants/app';
import { WorkspaceSelector } from './header/WorkspaceSelector';
import { UserProfile } from './header/UserProfile';
import { MobileViewToggles } from './header/MobileViewToggles';
import { ModelSelector } from './header/ModelSelector';

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
  onShowExplorer: () => void;
  mobileView: 'chat' | 'editor' | 'preview';
  setMobileView: (view: 'chat' | 'editor' | 'preview') => void;
  isLeftSidebarOpen: boolean;
  onToggleLeftSidebar: () => void;
  isRightSidebarOpen: boolean;
  onToggleRightSidebar: () => void;
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
  setIsMobileMenuOpen,
  onShowExplorer,
  mobileView,
  setMobileView,
  isLeftSidebarOpen,
  onToggleLeftSidebar,
  isRightSidebarOpen,
  onToggleRightSidebar
}) => {
  return (
    <header className="h-12 border-b border-[#3c3c3c] bg-[#2d2d2d] flex items-center justify-between px-4 shrink-0 z-50">
      <div className="flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleLeftSidebar}
          id="toggle-left-sidebar-btn"
          className={`hidden sm:flex p-2 rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007acc] focus-visible:ring-offset-2 focus-visible:ring-offset-[#2d2d2d] ${isLeftSidebarOpen ? 'text-[#007acc] bg-[#1e1e1e]' : 'text-[#858585] hover:text-white'}`}
          title="Toggle Side Bar (Ctrl+B)"
          aria-label={isLeftSidebarOpen ? "Collapse Side Bar" : "Expand Side Bar"}
        >
          <PanelLeft className="w-5 h-5" />
        </motion.button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#007acc] rounded-lg flex items-center justify-center shadow-lg shadow-[#007acc]/20 shrink-0">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:flex flex-col">
            <h1 className="text-sm font-bold text-white tracking-tight leading-none">{RW_APP_NAME}</h1>
            <span className="text-[10px] text-[#858585] font-medium uppercase tracking-wider mt-1">{RW_APP_SUBTITLE}</span>
          </div>
          <button
            className="p-1.5 hover:bg-[#3c3c3c] rounded-lg transition-colors text-[#007acc] sm:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007acc]"
            onClick={() => onShowExplorer()}
            id="mobile-toggle-explorer-btn"
            aria-label="Toggle Project Explorer"
            title="Project Explorer"
          >
            <FolderOpen className="w-5 h-5" />
          </button>
        </div>

        <div className="h-6 w-[1px] bg-[#3c3c3c] mx-2 hidden sm:block" />

        <WorkspaceSelector 
          workspaceName={workspaceName}
          onShowWorkspaceModal={onShowWorkspaceModal}
        />
      </div>

      <div className="flex items-center gap-1 sm:gap-3">
        <MobileViewToggles 
          mobileView={mobileView}
          setMobileView={setMobileView}
        />

        <ModelSelector 
          model={model}
          setModel={setModel}
          onShowMcpModal={onShowMcpModal}
          showMcpModal={showMcpModal}
        />

        <div className="h-4 w-[1px] bg-[#3c3c3c] mx-1 hidden lg:block" />

        <div className="flex items-center gap-1">
          <button
            onClick={onSaveAll}
            id="header-save-all-btn"
            className="p-2 text-[#858585] hover:text-white hover:bg-[#3c3c3c] rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007acc]"
            title="Save All (Ctrl+S)"
            aria-label="Save all changes"
          >
            <Download className="w-4 h-4 rotate-180" />
          </button>

          <button
            onClick={onShowCommandPalette}
            id="header-command-palette-btn"
            className="p-2 text-[#858585] hover:text-white hover:bg-[#3c3c3c] rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007acc]"
            title="Command Palette (Ctrl+K)"
            aria-label="Open Command Palette"
          >
            <Search className="w-4 h-4" />
          </button>
          
          <button
            onClick={onShowGitPanel}
            id="header-git-btn"
            className="p-2 text-[#858585] hover:text-white hover:bg-[#3c3c3c] rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007acc]"
            title="Git Operations"
            aria-label="Open Git Panel"
          >
            <GitBranch className="w-4 h-4" />
          </button>

          <button
            onClick={onShowSettingsModal}
            id="header-settings-btn"
            className="p-2 text-[#858585] hover:text-white hover:bg-[#3c3c3c] rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007acc]"
            title="Settings"
            aria-label="Open Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleRightSidebar}
            id="toggle-right-sidebar-btn"
            className={`hidden sm:flex p-2 rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007acc] focus-visible:ring-offset-2 focus-visible:ring-offset-[#2d2d2d] ${isRightSidebarOpen ? 'text-[#007acc] bg-[#1e1e1e]' : 'text-[#858585] hover:text-white'}`}
            title="Toggle AI Assistant (Ctrl+J)"
            aria-label={isRightSidebarOpen ? "Collapse AI Assistant" : "Expand AI Assistant"}
          >
            <PanelRight className="w-5 h-5" />
          </motion.button>
        </div>

        <div className="h-4 w-[1px] bg-[#3c3c3c] mx-1" />

        <UserProfile 
          user={user}
          onSignInGoogle={onSignInGoogle}
          onSignInGithub={onSignInGithub}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  );
};
