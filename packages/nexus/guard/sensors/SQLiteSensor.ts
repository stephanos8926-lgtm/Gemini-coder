import { BaseSensor } from '../BaseSensor';
import { Signal } from '../Sensor';
import { PersistenceManager } from '../../utils/PersistenceManager';

export class SQLiteSensor extends BaseSensor {
  public readonly name = 'SQLiteSensor';
  public readonly capabilities = ['database-persistence'];

  constructor(private persistence: PersistenceManager) {
    super();
  }

  public async handle(signal: Signal): Promise<boolean> {
    try {
      // We use the persistence manager to save to the local SQLite DB
      // We set a long TTL (e.g., 30 days) for analytics purposes
      await this.persistence.saveSignal(signal, 30 * 24 * 60 * 60 * 1000);
      return true;
    } catch (e) {
      console.error('[SQLiteSensor] Failed to write to DB:', e);
      return false;
    }
  }
}
