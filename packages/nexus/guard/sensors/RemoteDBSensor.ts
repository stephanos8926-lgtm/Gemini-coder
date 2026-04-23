import { BaseSensor } from '../BaseSensor';
import { Signal } from '../Sensor';

export class RemoteDBSensor extends BaseSensor {
  public readonly name = 'RemoteDBSensor';
  public readonly capabilities = ['remote-db'];

  constructor(private connectionString: string) {
    super();
  }

  public async handle(signal: Signal): Promise<boolean> {
    try {
      // Simulated remote DB connection/insertion
      // In a real scenario, this would use a connection pool to write to PostgreSQL/MySQL
      // For now, we simulate the network delay and success
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Pipe to /dev/null equivalent (we just return true to indicate success)
      return true;
    } catch (error) {
      console.error('[RemoteDBSensor] Failed to write to remote DB:', error);
      return false;
    }
  }
}
