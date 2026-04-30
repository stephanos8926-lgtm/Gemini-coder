import { useState } from 'react';

/**
 * @hook useModalState
 * @description Manages visibility state for various IDE modal dialogs.
 */
export function useModalState() {
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showMcpModal, setShowMcpModal] = useState(false);

  return {
    showKeyModal,
    setShowKeyModal,
    showWorkspaceModal,
    setShowWorkspaceModal,
    showSettingsModal,
    setShowSettingsModal,
    showCommandPalette,
    setShowCommandPalette,
    showMcpModal,
    setShowMcpModal
  };
}
