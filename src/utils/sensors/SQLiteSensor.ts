import { Sensor } from '../Sensor';
import { PersistenceManager } from '../PersistenceManager';

export class SQLiteSensor implements Sensor {
  constructor(private persistence: PersistenceManager) {}

  public async handle(signal: any): Promise<boolean> {
    try {
      // We use the persistence manager to save to the local SQLite DB
      // We set a long TTL (e.g., 30 days) for analytics purposes
      this.persistence.saveSignal(signal, 30 * 24 * 60 * 60 * 1000);
      return true;
    } catch (e) {
      console.error('[SQLiteSensor] Failed to write to DB:', e);
      return false;
    }
  }
}
