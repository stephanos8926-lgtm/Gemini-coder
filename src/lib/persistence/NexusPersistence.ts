import { PersistenceTier, IPersistenceAdapter, PersistenceOptions, TenantContext } from './types';
import { IndexedDBAdapter } from './adapters/IndexedDBAdapter';
import type { StateStorage } from 'zustand/middleware';
import { auth } from '../../firebase';

const isServer = typeof window === 'undefined';

/**
 * NexusPersistence
 * Unified tiered persistence layer for RapidWebs Enterprise.
 * Environment-aware:
 *   Browser: Memory -> IndexedDB -> Firestore
 *   Server: Memory -> FileSystem/SQLite -> Firestore (Admin)
 */
export class NexusPersistence {
  private static instance: NexusPersistence;
  private memoryCache: Map<string, any> = new Map();
  private localAdapter: IPersistenceAdapter | null = null;
  private remoteAdapter: IPersistenceAdapter | null = null;

  private constructor() {
    this.initializeLocalAdapter();
  }

  private async initializeLocalAdapter() {
    if (isServer) {
      try {
        const { FilePersistenceAdapter } = await import('./adapters/FilePersistenceAdapter');
        this.localAdapter = new FilePersistenceAdapter();
      } catch (e) {
        console.error('[NexusPersistence] Failed to initialize server adapter', e);
      }
    } else {
      this.localAdapter = new IndexedDBAdapter();
    }
  }

  public static getInstance(): NexusPersistence {
    if (!NexusPersistence.instance) {
      NexusPersistence.instance = new NexusPersistence();
    }
    return NexusPersistence.instance;
  }

  private getTenantKey(key: string, tenant?: TenantContext): string {
    if (!tenant) return key;
    return `u:${tenant.userId}:w:${tenant.workspaceId}:${key}`;
  }

  /**
   * Set a value across tiered persistence
   */
  public async set<T>(key: string, value: T, options: PersistenceOptions = { tier: PersistenceTier.LOCAL }): Promise<void> {
    const tenantKey = this.getTenantKey(key, options.tenant);
    
    // 1. Memory is always updated for immediate access
    this.memoryCache.set(tenantKey, value);

    // 2. Local persistence (IndexedDB / FileSystem)
    if (this.localAdapter && (options.tier === PersistenceTier.LOCAL || options.tier === PersistenceTier.REMOTE)) {
      await this.localAdapter.set(tenantKey, value);
    }

    // 3. Remote persistence (Firestore)
    if (options.tier === PersistenceTier.REMOTE && this.remoteAdapter) {
      await this.remoteAdapter.set(tenantKey, value);
    }
  }

  /**
   * Get a value from the fastest available tier
   */
  public async get<T>(key: string, tenant?: TenantContext): Promise<T | null> {
    const tenantKey = this.getTenantKey(key, tenant);

    // 1. Check Memory
    if (this.memoryCache.has(tenantKey)) {
      return this.memoryCache.get(tenantKey);
    }

    // 2. Check Local
    if (this.localAdapter) {
      try {
        const localValue = await this.localAdapter.get<T>(tenantKey);
        if (localValue !== null) {
          this.memoryCache.set(tenantKey, localValue); // Prime memory cache
          return localValue;
        }
      } catch (e) {
        console.warn(`[NexusPersistence] Local read failed for ${tenantKey}`, e);
      }
    }

    // 3. Check Remote (Only if needed)
    if (this.remoteAdapter) {
      const remoteValue = await this.remoteAdapter.get<T>(tenantKey);
      if (remoteValue !== null) {
        this.memoryCache.set(tenantKey, remoteValue);
        if (this.localAdapter) await this.localAdapter.set(tenantKey, remoteValue); // Sync back to local
        return remoteValue;
      }
    }

    return null;
  }

  /**
   * Specifically for partial object merges (highly useful for context/weights)
   */
  public async merge<T extends object>(key: string, partial: Partial<T>, tenant?: TenantContext): Promise<void> {
    const existing = await this.get<T>(key, tenant) || {} as T;
    const merged = { ...existing, ...partial };
    await this.set(key, merged, { tier: PersistenceTier.LOCAL, tenant });
  }

  public registerRemoteAdapter(adapter: IPersistenceAdapter) {
    this.remoteAdapter = adapter;
  }
}

/**
 * createNexusStorage
 * Bridge for Zustand's persist middleware to use NexusPersistence (IndexedDB)
 */
export const createNexusStorage = (): StateStorage => {
  const nexus = NexusPersistence.getInstance();
  const getContext = (): TenantContext | undefined => {
    const user = auth.currentUser;
    if (user) return { userId: user.uid, workspaceId: 'default' };
    return undefined;
  };

  return {
    getItem: async (name: string): Promise<string | null> => {
      const value = await nexus.get(name, getContext());
      return value ? JSON.stringify(value) : null;
    },
    setItem: async (name: string, value: string): Promise<void> => {
      await nexus.set(name, JSON.parse(value), { tier: PersistenceTier.LOCAL, tenant: getContext() });
    },
    removeItem: async (name: string): Promise<void> => {
      await nexus.set(name, null, { tier: PersistenceTier.LOCAL, tenant: getContext() });
    },
  };
};

export const nexusPersist = NexusPersistence.getInstance();
