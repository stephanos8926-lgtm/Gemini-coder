import { BaseSensor } from '../BaseSensor';
import { Signal } from '../Sensor';

export class HTTPSensor extends BaseSensor {
  public readonly name = 'HTTPSensor';
  public readonly capabilities = ['http-transmit'];

  constructor(private endpoint: string) {
    super();
  }

  public async handle(signal: Signal): Promise<boolean> {
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
