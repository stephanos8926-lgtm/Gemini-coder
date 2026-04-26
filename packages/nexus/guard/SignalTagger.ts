import { Signal } from './Sensor';

export interface SignalTagger {
  readonly name: string;
  tag(signal: Signal): Signal;
}
