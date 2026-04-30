import { useState } from 'react';
import { useFileStore } from '../store/useFileStore';

/**
 * @hook useLayoutState
 * @description Manages UI visibility and layout-related local state.
 */
export function useLayoutState() {
  const [showTerminal, setShowTerminal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showGitPanel, setShowGitPanel] = useState(false);
  
  const { 
    RW_isMobileTerminalOpen,
    RW_isMobileExplorerOpen,
    RW_mobileView,
    setMobileTerminalOpen,
    setMobileExplorerOpen,
    setMobileView
  } = useFileStore();

  return {
    showTerminal,
    setShowTerminal,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    showGitPanel,
    setShowGitPanel,
    RW_isMobileTerminalOpen,
    RW_isMobileExplorerOpen,
    RW_mobileView,
    setMobileTerminalOpen,
    setMobileExplorerOpen,
    setMobileView
  };
}
