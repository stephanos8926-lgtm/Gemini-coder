import { useState, useEffect } from 'react';
import { generateId, getProjects, saveProjects, type Project } from '../lib/projectStore';

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProjects = async () => {
      const loadedProjects = await getProjects();
      setProjects(loadedProjects);
      setIsLoading(false);
    };
    loadProjects();
  }, []);

  const createProject = async (name: string) => {
    const newProject: Project = {
      id: generateId(),
      name,
      files: {},
      updatedAt: Date.now()
    };
    const newProjects = [newProject, ...projects];
    setProjects(newProjects);
    setCurrentProjectId(newProject.id);
    await saveProjects(newProjects);
    return newProject;
  };

  const deleteProject = async (id: string) => {
    const newProjects = projects.filter(p => p.id !== id);
    setProjects(newProjects);
    if (currentProjectId === id) {
      setCurrentProjectId(null);
    }
    await saveProjects(newProjects);
  };

  return {
    projects,
    setProjects,
    currentProjectId,
    setCurrentProjectId,
    createProject,
    deleteProject,
    isLoading
  };
};
