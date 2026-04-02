import React, { Suspense, lazy } from 'react';
import { AnimatePresence } from 'motion/react';

const ApiKeyModal = lazy(() => import('../ApiKeyModal').then(m => ({ default: m.ApiKeyModal })));
const ProjectModal = lazy(() => import('../ProjectModal').then(m => ({ default: m.ProjectModal })));
const WorkspaceModal = lazy(() => import('../WorkspaceModal'));
const SettingsModal = lazy(() => import('../SettingsModal').then(m => ({ default: m.SettingsModal })));
const McpModal = lazy(() => import('../AdminModal').then(m => ({ default: m.McpModal })));

interface ModalsContainerProps {
  showProjectModal: boolean;
  setShowProjectModal: (show: boolean) => void;
  showKeyModal: boolean;
  setShowKeyModal: (show: boolean) => void;
  showWorkspaceModal: boolean;
  setShowWorkspaceModal: (show: boolean) => void;
  showSettingsModal: boolean;
  setShowSettingsModal: (show: boolean) => void;
  showMcpModal: boolean;
  setShowMcpModal: (show: boolean) => void;
  
  projects: any[];
  currentProjectId: string | null;
  handleSwitchProject: (id: string) => void;
  handleCreateProject: (name: string) => void;
  handleDeleteProject: (id: string) => void;
  handleImportProject: (file: File) => void;
  handleSaveKey: (key: string) => void;
  apiKey: string | null;
  user: any;
  setWorkspaceName: (name: string) => void;
  workspaceName: string;
  settings: any;
  setSettings: (settings: any) => void;
}

export const ModalsContainer: React.FC<ModalsContainerProps> = ({
  showProjectModal, setShowProjectModal,
  showKeyModal, setShowKeyModal,
  showWorkspaceModal, setShowWorkspaceModal,
  showSettingsModal, setShowSettingsModal,
  showMcpModal, setShowMcpModal,
  projects, currentProjectId, handleSwitchProject, handleCreateProject, handleDeleteProject, handleImportProject,
  handleSaveKey, apiKey, user, setWorkspaceName, workspaceName, settings, setSettings
}) => {
  return (
    <AnimatePresence>
      {showProjectModal && (
        <Suspense fallback={null}>
          <ProjectModal
            projects={projects}
            currentProjectId={currentProjectId}
            onClose={() => setShowProjectModal(false)}
            onSwitchProject={handleSwitchProject}
            onCreateProject={handleCreateProject}
            onDeleteProject={handleDeleteProject}
            onImportProject={handleImportProject}
          />
        </Suspense>
      )}

      {showKeyModal && (
        <Suspense fallback={null}>
          <ApiKeyModal
            onSave={handleSaveKey}
            onClose={() => setShowKeyModal(false)}
            initialKey={apiKey || ''}
            canClose={!!apiKey}
          />
        </Suspense>
      )}

      {showWorkspaceModal && (
        <Suspense fallback={null}>
          <WorkspaceModal
            onClose={() => {
              console.log('WorkspaceModal onClose');
              setShowWorkspaceModal(false);
            }}
            onSelect={(name) => {
              console.log('WorkspaceModal onSelect:', name);
              const finalName = (user && name.startsWith(`${user.uid}/`)) ? name : (user ? `${user.uid}/${name.replace(/\//g, '-')}` : name);
              setWorkspaceName(finalName);
              setShowWorkspaceModal(false);
            }}
            currentWorkspace={workspaceName}
          />
        </Suspense>
      )}

      {showSettingsModal && (
        <Suspense fallback={null}>
          <SettingsModal
            onClose={() => setShowSettingsModal(false)}
            onSave={(newSettings) => setSettings(newSettings)}
            initialSettings={settings}
          />
        </Suspense>
      )}

      {showMcpModal && (
        <Suspense fallback={null}>
          <McpModal
            onClose={() => setShowMcpModal(false)}
          />
        </Suspense>
      )}
    </AnimatePresence>
  );
};
