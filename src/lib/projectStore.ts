import { FileStore } from './fileStore';

export interface Project {
  id: string;
  name: string;
  files: FileStore;
  updatedAt: number;
}

const STORAGE_KEY = 'gide_projects';
const CURRENT_PROJECT_KEY = 'gide_current_project_id';

export function getProjects(): Project[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load projects', e);
    return [];
  }
}

export function saveProjects(projects: Project[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save projects', e);
  }
}

export function getCurrentProjectId(): string | null {
  return localStorage.getItem(CURRENT_PROJECT_KEY);
}

export function setCurrentProjectId(id: string | null) {
  if (id) {
    localStorage.setItem(CURRENT_PROJECT_KEY, id);
  } else {
    localStorage.removeItem(CURRENT_PROJECT_KEY);
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
