import { useState, useEffect } from 'react';
import { generateId, type Project } from '../lib/projectStore';

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  const createProject = (name: string) => {
    const newProject: Project = {
      id: generateId(),
      name,
      files: {},
      updatedAt: Date.now()
    };
    setProjects(prev => [newProject, ...prev]);
    setCurrentProjectId(newProject.id);
    return newProject;
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (currentProjectId === id) {
      setCurrentProjectId(null);
    }
  };

  return {
    projects,
    setProjects,
    currentProjectId,
    setCurrentProjectId,
    createProject,
    deleteProject
  };
};
