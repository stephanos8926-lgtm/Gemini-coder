import React from 'react';
import { FileTree } from '../FileTree';
import { ErrorBoundary } from '../ErrorBoundary';
import { useFileStore } from '../../store/useFileStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

interface LeftSidebarProps {
  onDownloadFile: (path: string) => void;
  onDownloadZip: () => void;
  onDeleteFile: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
  onCreateFile: (path: string) => void;
  onCreateFolder: (path: string) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  onDownloadFile,
  onDownloadZip,
  onDeleteFile,
  onRenameFile,
  onCreateFile,
  onCreateFolder
}) => {
  const { RW_fileStore, RW_activeFile, setActiveFile } = useFileStore();
  const { RW_workspaceName } = useWorkspaceStore();

  return (
    <div className="h-full bg-[#252526] flex flex-col">
      <ErrorBoundary name="File Tree">
        <FileTree
          files={RW_fileStore}
          selectedFile={RW_activeFile}
          onSelect={setActiveFile}
          onDownload={onDownloadFile}
          onDownloadZip={onDownloadZip}
          onImportZip={() => {}} 
          workspaceName={RW_workspaceName}
          onDelete={onDeleteFile}
          onRename={onRenameFile}
          onCreateFile={onCreateFile}
          onCreateFolder={onCreateFolder}
        />
      </ErrorBoundary>
    </div>
  );
};
