import { useState, useEffect } from 'react';
import { Project, saveProjects, generateId } from '../lib/projectStore';
import { FileStore } from '../lib/fileStore';
import { filesystemService } from '../lib/filesystemService';

interface UseAppProjectProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  fileStore: FileStore;
  setFileStore: React.Dispatch<React.SetStateAction<FileStore>>;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  setActiveFile: (file: string | null) => void;
  createProject: (name: string) => Promise<Project>;
  deleteProject: (id: string) => void;
  isProjectsLoading: boolean;
}

export function useAppProject({
  projects,
  setProjects,
  currentProjectId,
  setCurrentProjectId,
  fileStore,
  setFileStore,
  setMessages,
  setActiveFile,
  createProject,
  deleteProject,
  isProjectsLoading
}: UseAppProjectProps) {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [isProjectsLoaded, setIsProjectsLoaded] = useState(false);

  // Save projects to IndexedDB whenever they change (only in non-filesystem mode)
  useEffect(() => {
    if (isProjectsLoaded && !isProjectsLoading) {
      saveProjects(projects);
    }
  }, [projects, isProjectsLoaded, isProjectsLoading]);

  // Auto-save current project files (only in non-filesystem mode)
  useEffect(() => {
    if (isProjectsLoaded && !isProjectsLoading && currentProjectId) {
      setProjects(prev => prev.map((p: Project) => 
        p.id === currentProjectId 
          ? { ...p, files: fileStore, updatedAt: Date.now() } 
          : p
      ));
    }
  }, [fileStore, currentProjectId, isProjectsLoaded, isProjectsLoading]);

  const handleCreateProject = async (name: string) => {
    const newProject = await createProject(name);
    setFileStore({});
    setActiveFile(null);
    setMessages([]);
    // Ensure the new project is saved to IndexedDB immediately
    await saveProjects([newProject, ...projects]);
    setShowProjectModal(false);
  };

  const handleSwitchProject = (id: string) => {
    const hasModifiedFiles = Object.values(fileStore).some((f: any) => f.isModified || f.isNew);
    
    if (hasModifiedFiles) {
      if (!window.confirm('You have unsaved changes in the current project. Are you sure you want to switch? Changes are auto-saved to local storage, but modified flags will be lost.')) {
        return;
      }
    }

    const project = projects.find(p => p.id === id);
    if (project) {
      setCurrentProjectId(id);
      setFileStore(project.files);
      setActiveFile(null);
      setMessages([]);
      setShowProjectModal(false);
    }
  };

  const handleDeleteProject = (id: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      deleteProject(id);
      if (currentProjectId === id) {
        setFileStore({});
        setActiveFile(null);
        setMessages([]);
      }
    }
  };

  const handleImportProject = async (file: File) => {
    if (!(window as any).JSZip) return;
    try {
      const zip = new (window as any).JSZip();
      const contents = await zip.loadAsync(file);
      const newFiles: FileStore = {};
      
      for (const [path, zipEntry] of Object.entries(contents.files)) {
        const entry = zipEntry as any;
        if (!entry.dir) {
          const content = await entry.async('string');
          newFiles[path] = {
            content,
            isNew: false,
            isModified: false,
            size: content.length
          };
        }
      }
      
      const newProject: Project = {
        id: generateId(),
        name: file.name.replace('.zip', ''),
        files: newFiles,
        updatedAt: Date.now()
      };
      
      setProjects(prev => [newProject, ...prev]);
      setCurrentProjectId(newProject.id);
      setFileStore(newFiles);
      setActiveFile(null);
      setMessages([]);
      setShowProjectModal(false);
    } catch (e) {
      console.error('Failed to import project', e);
      alert('Failed to import project. Make sure it is a valid ZIP file.');
    }
  };

  return {
    showProjectModal,
    setShowProjectModal,
    setIsProjectsLoaded,
    handleCreateProject,
    handleSwitchProject,
    handleDeleteProject,
    handleImportProject
  };
}
