import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ModalsContainer } from './ModalsContainer';

// Mock the lazy components
vi.mock('../ApiKeyModal', () => ({ ApiKeyModal: () => <div>ApiKeyModal</div> }));
vi.mock('../ProjectModal', () => ({ ProjectModal: () => <div>ProjectModal</div> }));
vi.mock('../WorkspaceModal', () => ({ default: () => <div>WorkspaceModal</div> }));
vi.mock('../SettingsModal', () => ({ SettingsModal: () => <div>SettingsModal</div> }));

describe('ModalsContainer', () => {
  const defaultProps = {
    showProjectModal: false,
    setShowProjectModal: vi.fn(),
    showKeyModal: false,
    setShowKeyModal: vi.fn(),
    showWorkspaceModal: false,
    setShowWorkspaceModal: vi.fn(),
    showSettingsModal: false,
    setShowSettingsModal: vi.fn(),
    showMcpModal: false,
    setShowMcpModal: vi.fn(),
    projects: [],
    currentProjectId: null,
    handleSwitchProject: vi.fn(),
    handleCreateProject: vi.fn(),
    handleDeleteProject: vi.fn(),
    handleImportProject: vi.fn(),
    handleSaveKey: vi.fn(),
    apiKey: null,
    user: null,
    setWorkspaceName: vi.fn(),
    workspaceName: '',
    settings: {},
    setSettings: vi.fn(),
  };

  it('renders ProjectModal when showProjectModal is true', async () => {
    render(<ModalsContainer {...defaultProps} showProjectModal={true} />);
    await waitFor(() => expect(screen.getByText('ProjectModal')).toBeInTheDocument());
  });

  it('renders ApiKeyModal when showKeyModal is true', async () => {
    render(<ModalsContainer {...defaultProps} showKeyModal={true} />);
    await waitFor(() => expect(screen.getByText('ApiKeyModal')).toBeInTheDocument());
  });
});
