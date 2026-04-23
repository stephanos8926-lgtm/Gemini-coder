import { BaseSensor } from '../BaseSensor';
import { Signal } from '../Sensor';
import fs from 'fs/promises';
import path from 'path';

export class LocalFileSensor extends BaseSensor {
  public readonly name = 'LocalFileSensor';
  public readonly capabilities = ['file-system'];
  private logDir: string;

  constructor(baseDir: string, private format: 'json' | 'text' = 'json') {
    super();
    this.logDir = path.join(baseDir, 'local_files');
  }

  public async handle(signal: Signal): Promise<boolean> {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
      
      const date = new Date(signal.timestamp || Date.now());
      const filename = `${date.toISOString().slice(0, 13).replace('T', '-')}.${this.format === 'json' ? 'jsonl' : 'log'}`;
      const filepath = path.join(this.logDir, filename);

      let output = '';
      if (this.format === 'json') {
        output = JSON.stringify(signal) + '\n';
      } else {
        output = `[${date.toISOString()}] [${signal.type?.toUpperCase() || 'INFO'}] ${signal.source || 'unknown'}: ${JSON.stringify(signal.payload)}\n`;
      }

      await fs.appendFile(filepath, output);
      return true;
    } catch (e) {
      console.error('[LocalFileSensor] Failed to write:', e);
      return false;
    }
  }
}
