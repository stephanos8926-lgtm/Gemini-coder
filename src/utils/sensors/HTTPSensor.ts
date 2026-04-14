import { Sensor } from '../Sensor';

export class HTTPSensor implements Sensor {
  constructor(private endpoint: string) {}

  public async handle(signal: any): Promise<boolean> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signal),
        // Important: Use keepalive for atomic-like background delivery
        keepalive: true 
      });
      return response.ok;
    } catch (error) {
      console.error('[HTTPSensor] Failed to transmit signal:', error);
      return false;
    }
  }
}
