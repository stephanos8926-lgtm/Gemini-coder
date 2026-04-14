import { Sensor } from '../Sensor';
import fs from 'fs';
import path from 'path';

export class LocalFileSensor implements Sensor {
  private logDir: string;

  constructor(baseDir: string, private format: 'json' | 'text' = 'json') {
    this.logDir = path.join(baseDir, 'local_files');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  public async handle(signal: any): Promise<boolean> {
    try {
      // Hourly rotation format: YYYY-MM-DD-HH.log
      const date = new Date(signal.timestamp);
      const filename = `${date.toISOString().slice(0, 13).replace('T', '-')}.${this.format === 'json' ? 'jsonl' : 'log'}`;
      const filepath = path.join(this.logDir, filename);

      let output = '';
      if (this.format === 'json') {
        output = JSON.stringify(signal) + '\n';
      } else {
        output = `[${date.toISOString()}] [${signal.type.toUpperCase()}] ${signal.source || 'unknown'}: ${JSON.stringify(signal.payload)}\n`;
      }

      fs.appendFileSync(filepath, output);
      return true;
    } catch (e) {
      console.error('[LocalFileSensor] Failed to write:', e);
      return false;
    }
  }
}
