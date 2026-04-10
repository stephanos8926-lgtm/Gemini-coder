import { FileStore } from './fileStore';
import { get, set, del } from 'idb-keyval';

export interface Project {
  id: string;
  name: string;
  files: FileStore;
  updatedAt: number;
}

const STORAGE_KEY = 'gide_projects';
const CURRENT_PROJECT_KEY = 'gide_current_project_id';

export async function getProjects(): Promise<Project[]> {
  try {
    const data = await get(STORAGE_KEY);
    return data || [];
  } catch (e) {
    console.error('Failed to load projects from IndexedDB', e);
    // Fallback to localStorage migration
    try {
      const localData = localStorage.getItem(STORAGE_KEY);
      if (localData) {
        const parsed = JSON.parse(localData);
        await set(STORAGE_KEY, parsed);
        return parsed;
      }
    } catch (err) {
      console.error('Failed to migrate from localStorage', err);
    }
    return [];
  }
}

export async function saveProjects(projects: Project[]): Promise<void> {
  try {
    await set(STORAGE_KEY, projects);
  } catch (e) {
    console.error('Failed to save projects to IndexedDB', e);
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
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
}
