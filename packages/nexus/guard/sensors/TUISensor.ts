import { BaseSensor } from '../BaseSensor';

export class TUISensor extends BaseSensor {
  public readonly name = 'TUISensor';
  public readonly capabilities = ['terminal-output'];

  public async handle(signal: any): Promise<boolean> {
    if (process.env.NODE_ENV !== 'production') {
      // Basic TUI output for development
      console.log(`[TUI]: ${JSON.stringify(signal)}`);
      return true;
    }
    return false;
  }
}
