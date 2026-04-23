import { Signal } from './Sensor';

export abstract class BaseSensor {
  public abstract readonly name: string;
  public abstract readonly capabilities: string[];

  public abstract handle(signal: Signal): Promise<boolean>;
}
