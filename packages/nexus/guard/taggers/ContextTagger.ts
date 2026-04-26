import { Signal } from '../Sensor';
import { SignalTagger } from '../SignalTagger';

export class ContextTagger implements SignalTagger {
  public readonly name = 'ContextTagger';

  constructor(private context: Record<string, unknown>) {}

  tag(signal: Signal): Signal {
    return {
      ...signal,
      context: {
        ...(signal.context || {}),
        ...this.context
      }
    };
  }
}
