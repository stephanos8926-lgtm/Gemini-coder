import { Sensor } from './Sensor';

export class TUISensor implements Sensor {
  public async handle(signal: any): Promise<boolean> {
    if (process.env.NODE_ENV !== 'production') {
      // Basic TUI output for development
      const timestamp = new Date(signal.timestamp || Date.now()).toISOString();
      const level = signal.type ? signal.type.toUpperCase() : 'INFO';
      console.log(`[${timestamp}] [${level}] (TUI):`, JSON.stringify(signal.payload));
      return true;
    }
    return false;
  }
}
