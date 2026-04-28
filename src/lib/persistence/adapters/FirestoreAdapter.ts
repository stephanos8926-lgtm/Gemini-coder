import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../../firebase';
import { IPersistenceAdapter } from '../types';

/**
 * FirestoreAdapter
 * Long-term, cross-device persistence tier.
 * Keys are mapped to a 'nexus_persistence' collection under the user's UID.
 */
export class FirestoreAdapter implements IPersistenceAdapter {
  private collectionName = 'nexus_persistence';

  constructor() {}

  private getDocRef(key: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('[FirestoreAdapter] User must be authenticated');
    // Sanitize key for Firestore path
    const safeKey = key.replace(/\//g, '_');
    return doc(db, 'users', user.uid, this.collectionName, safeKey);
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      const docRef = this.getDocRef(key);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return snapshot.data().value as T;
      }
    } catch (e) {
      console.error(`[FirestoreAdapter] Get failed for ${key}`, e);
    }
    return null;
  }

  public async set<T>(key: string, value: T): Promise<void> {
    try {
      const docRef = this.getDocRef(key);
      await setDoc(docRef, { 
        value,
        updatedAt: Date.now()
      });
    } catch (e) {
      console.error(`[FirestoreAdapter] Set failed for ${key}`, e);
    }
  }

  public async delete(key: string): Promise<void> {
    try {
      const docRef = this.getDocRef(key);
      await deleteDoc(docRef);
    } catch (e) {
      console.error(`[FirestoreAdapter] Delete failed for ${key}`, e);
    }
  }

  public async clear(): Promise<void> {
    // Implementing clear in Firestore is expensive (must delete docs one by one or via cloud function)
    console.warn('[FirestoreAdapter] Clear not implemented - selective deletion recommended');
  }
}
