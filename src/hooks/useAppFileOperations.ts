import { useState } from 'react';
import { FileStore } from '../lib/fileStore';
import { useFileSystemMutations } from './useFileSystem';
import { useAppStore } from '../store/useAppStore';

interface UseAppFileOperationsProps {
  workspaceName: string;
  fileStore: FileStore;
  setFileStore: React.Dispatch<React.SetStateAction<FileStore>>;
  mobileView: string;
  setMobileView: (view: 'chat' | 'editor' | 'preview') => void;
}

export function useAppFileOperations({
  workspaceName,
  fileStore,
  setFileStore,
  mobileView,
  setMobileView
}: UseAppFileOperationsProps) {
  const { saveFileMutation, createFileMutation, deleteFileMutation, renameFileMutation } = useFileSystemMutations();
  const { activeFile, setActiveFile } = useAppStore();
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [fileToRename, setFileToRename] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFilePath, setNewFilePath] = useState('');

  const handleSaveAll = async () => {
    try {
      const modifiedFiles = (Object.entries(fileStore) as [string, any][]).filter(([_, f]) => f.isModified || f.isNew);
      for (const [path, file] of modifiedFiles) {
        if (!file.isDir) {
          await saveFileMutation.mutateAsync({ workspace: workspaceName, path, content: file.content });
        }
      }
      
      setFileStore(prev => {
        const newStore = { ...prev };
        modifiedFiles.forEach(([path, file]) => {
          if (newStore[path] && newStore[path].content === file.content) {
            newStore[path] = { ...newStore[path], isModified: false, isNew: false };
          }
        });
        return newStore;
      });
    } catch (e) {
      alert('Failed to save some files to filesystem');
    }
  };

  const handleDownloadZip = async () => {
    if (!(window as any).JSZip) return;
    const zip = new (window as any).JSZip();
    Object.keys(fileStore).forEach((path) => {
      zip.file(path, fileStore[path].content);
    });
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gide-project.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadFile = (path: string) => {
    const file = fileStore[path];
    if (!file) return;
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = path.split('/').pop() || 'file.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteFile = (path: string) => {
    setFileToDelete(path);
  };

  const confirmDelete = async () => {
    if (fileToDelete) {
      try {
        await deleteFileMutation.mutateAsync({ workspace: workspaceName, path: fileToDelete });
      } catch (e) {
        alert('Failed to delete file from filesystem');
        return;
      }

      setFileStore(prev => {
        const newStore = { ...prev };
        Object.keys(newStore).forEach(path => {
          if (path === fileToDelete || path.startsWith(fileToDelete + '/')) {
            delete newStore[path];
          }
        });
        return newStore;
      });
      if (activeFile === fileToDelete || (activeFile && activeFile.startsWith(fileToDelete + '/'))) {
        setActiveFile(null);
      }
      setFileToDelete(null);
    }
  };

  const handleRenameFile = async (oldPath: string, newPath: string) => {
    if (!newPath || newPath === oldPath) return;

    try {
      await renameFileMutation.mutateAsync({ workspace: workspaceName, oldPath, newPath });
    } catch (e) {
      alert('Failed to rename file on filesystem');
      return;
    }

    setFileStore(prev => {
      const newStore = { ...prev };
      
      const parts = newPath.split('/');
      let currentPath = '';
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath += (currentPath ? '/' : '') + parts[i];
        if (!newStore[currentPath]) {
          newStore[currentPath] = { 
            content: '', 
            isNew: true, 
            isModified: false, 
            size: 0, 
            isDir: true 
          };
        }
      }

      Object.keys(newStore).forEach(path => {
        if (path === oldPath || path.startsWith(oldPath + '/')) {
          const updatedPath = path.replace(oldPath, newPath);
          newStore[updatedPath] = { ...newStore[path] };
          delete newStore[path];
        }
      });

      return newStore;
    });
    if (activeFile === oldPath || (activeFile && activeFile.startsWith(oldPath + '/'))) {
      setActiveFile(activeFile.replace(oldPath, newPath));
    }
  };

  const handleCreateFile = async (path: string) => {
    if (!path) return;

    try {
      await createFileMutation.mutateAsync({ workspace: workspaceName, path });
    } catch (e) {
      alert('Failed to create file on filesystem');
      return;
    }

    setFileStore(prev => {
      if (prev[path]) return prev;
      
      const newStore = { ...prev };
      const parts = path.split('/');
      let currentPath = '';
      
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath += (currentPath ? '/' : '') + parts[i];
        if (!newStore[currentPath]) {
          newStore[currentPath] = { 
            content: '', 
            isNew: true, 
            isModified: false, 
            size: 0, 
            isDir: true 
          };
        }
      }
      
      newStore[path] = { content: '', isNew: true, isModified: false, size: 0 };
      return newStore;
    });
    setActiveFile(path);
    if (mobileView !== 'editor') {
      setMobileView('editor');
    }
  };

  return {
    handleSaveAll,
    handleDownloadZip,
    handleDownloadFile,
    handleDeleteFile,
    confirmDelete,
    handleRenameFile,
    handleCreateFile,
    fileToDelete,
    setFileToDelete,
    fileToRename,
    setFileToRename,
    newFileName,
    setNewFileName,
    isCreatingFile,
    setIsCreatingFile,
    newFilePath,
    setNewFilePath
  };
}
