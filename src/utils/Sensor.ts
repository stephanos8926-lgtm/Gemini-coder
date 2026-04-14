export interface Sensor {
  handle(signal: any): Promise<boolean>;
}
