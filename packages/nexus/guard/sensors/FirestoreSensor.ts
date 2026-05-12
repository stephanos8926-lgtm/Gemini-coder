import { Sensor, Signal } from '../Sensor';
import { db } from '../../../../src/lib/firebaseAdmin.js';

/**
 * @class FirestoreSensor
 * @description Sensor that mirrors signals to Firestore for multi-agent observability 
 * and persistent cloud logging. Supports scheduled sync of buffered signals.
 */
export class FirestoreSensor implements Sensor {
  readonly name = 'firestore';
  readonly capabilities = ['remote-storage', 'sync', 'alerting'];

  public async handle(signal: Signal): Promise<boolean> {
    // Only mirror critical signals in real-time to avoid quota exhaustion.
    // Low priority signals are buffered for scheduled job sync.
    if (signal.priority === 'CRITICAL' || signal.type === 'error') {
      try {
        if (!db) return false;
        
        await db.collection('telemetry_signals').add({
          ...signal,
          processedAt: Date.now(),
          platform: 'RapidForge-IDE'
        });
        
        return true;
      } catch (e) {
        console.error('[FirestoreSensor] Failed to mirror signal:', e);
        return false;
      }
    }
    
    return false; // Handled by offline scheduler later
  }
}
