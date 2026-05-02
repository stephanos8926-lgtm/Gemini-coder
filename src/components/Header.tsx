import React from 'react';
import { Terminal, Key, Plus, Menu, Search, Settings as SettingsIcon, LogIn, LogOut, GitBranch, Sparkles, Download, FolderOpen, Github, Code2, Play, PanelLeft, PanelRight } from 'lucide-react';
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
    <header className="h-12 border-b border-border-subtle bg-surface-card flex items-center justify-between px-4 shrink-0 z-50">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleLeftSidebar}
          id="toggle-left-sidebar-btn"
          className={`hidden sm:flex p-2 rounded-md transition-all duration-200 focus-visible:ring-2 focus-visible:ring-accent-intel focus-visible:outline-none ${isLeftSidebarOpen ? 'text-accent-intel bg-surface-base' : 'text-text-subtle hover:text-white hover:bg-surface-accent'}`}
          title="Toggle Side Bar (Ctrl+B)"
          aria-label="Toggle Side Bar"
        >
          <PanelLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent-intel rounded-lg flex items-center justify-center shadow-lg shadow-accent-intel/20 shrink-0">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:flex flex-col">
            <h1 className="text-sm font-bold text-text-primary tracking-tight leading-none">{RW_APP_NAME}</h1>
            <span className="text-[10px] text-text-subtle font-medium uppercase tracking-wider mt-1">{RW_APP_SUBTITLE}</span>
          </div>
          <button
            className="p-1.5 hover:bg-surface-accent rounded-lg transition-all duration-200 text-accent-intel sm:hidden focus-visible:ring-2 focus-visible:ring-accent-intel focus-visible:outline-none"
            onClick={() => onShowExplorer()}
            id="mobile-toggle-explorer-btn"
            aria-label="Toggle Project Explorer"
          >
            <FolderOpen className="w-5 h-5" />
          </button>
        </div>

        <div className="h-6 w-[1px] bg-border-subtle mx-2 hidden sm:block" />

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

        <div className="h-4 w-[1px] bg-border-subtle mx-1 hidden lg:block" />

        <div className="flex items-center gap-1">
          <button
            onClick={onSaveAll}
            id="header-save-all-btn"
            className="p-2 text-text-subtle hover:text-text-primary hover:bg-surface-accent rounded-md transition-all duration-200 focus-visible:ring-2 focus-visible:ring-accent-intel focus-visible:outline-none"
            title="Save All"
            aria-label="Save All Files"
          >
            <Download className="w-4 h-4 rotate-180" />
          </button>

          <button
            onClick={onShowCommandPalette}
            id="header-command-palette-btn"
            className="p-2 text-text-subtle hover:text-text-primary hover:bg-surface-accent rounded-md transition-all duration-200 focus-visible:ring-2 focus-visible:ring-accent-intel focus-visible:outline-none"
            title="Command Palette (Ctrl+K)"
            aria-label="Open Command Palette"
          >
            <Search className="w-4 h-4" />
          </button>
          
          <button
            onClick={onShowGitPanel}
            id="header-git-btn"
            className="p-2 text-text-subtle hover:text-text-primary hover:bg-surface-accent rounded-md transition-all duration-200 focus-visible:ring-2 focus-visible:ring-accent-intel focus-visible:outline-none"
            title="Git Operations"
            aria-label="Git Operations"
          >
            <GitBranch className="w-4 h-4" />
          </button>

          <button
            onClick={onShowSettingsModal}
            id="header-settings-btn"
            className="p-2 text-text-subtle hover:text-text-primary hover:bg-surface-accent rounded-md transition-all duration-200 focus-visible:ring-2 focus-visible:ring-accent-intel focus-visible:outline-none"
            title="Settings"
            aria-label="Open Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleRightSidebar}
            id="toggle-right-sidebar-btn"
            className={`hidden sm:flex p-2 rounded-md transition-all duration-200 focus-visible:ring-2 focus-visible:ring-accent-intel focus-visible:outline-none ${isRightSidebarOpen ? 'text-accent-intel bg-surface-base' : 'text-text-subtle hover:text-white hover:bg-surface-accent'}`}
            title="Toggle AI Assistant"
            aria-label="Toggle AI Assistant"
          >
            <PanelRight className="w-5 h-5" />
          </button>
        </div>

        <div className="h-4 w-[1px] bg-border-subtle mx-1" />

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
