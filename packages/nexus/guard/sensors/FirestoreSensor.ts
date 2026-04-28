import { BaseSensor } from '../BaseSensor';
import { Signal } from '../Sensor';
import { db } from '../../../../src/firebase'; // assumes firebase setup
import { collection, addDoc } from 'firebase/firestore';

export class FirestoreSensor extends BaseSensor {
  public readonly name = 'FirestoreSensor';
  public readonly capabilities = ['firestore'];

  public async handle(signal: Signal): Promise<boolean> {
    try {
      const logsRef = collection(db, 'telemetry_logs');
      await addDoc(logsRef, {
        ...signal,
        timestamp: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('[FirestoreSensor] Failed to write to Firestore:', error);
      return false;
    }
  }
}
