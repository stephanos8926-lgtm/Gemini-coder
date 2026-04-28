export enum PersistenceTier {
  MEMORY = 'memory',
  LOCAL = 'local', // IndexedDB / LocalStorage
  REMOTE = 'remote' // Firestore / Backend
}

export interface TenantContext {
  userId: string;
  workspaceId: string;
}

export interface PersistenceOptions {
  tier: PersistenceTier;
  ttl?: number;
  syncRemote?: boolean;
  tenant?: TenantContext;
}

export interface NexusEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  tier: PersistenceTier;
}

export interface IPersistenceAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
