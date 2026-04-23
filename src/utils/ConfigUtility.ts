import fs from 'fs';
import yaml from 'js-yaml';

const isServer = typeof window === 'undefined';

export class ConfigUtility {
  private config: Record<string, any> = {};

  constructor(defaultConfig: Record<string, any>) {
    this.config = { ...defaultConfig };
    if (isServer) {
        this.loadFromFile();
        this.loadFromEnv();
    }
  }

  private loadFromFile() {
    const path = fs.existsSync('config.yaml') ? 'config.yaml' : (fs.existsSync('config.json') ? 'config.json' : null);
    if (path) {
      const content = fs.readFileSync(path, 'utf8');
      const loaded = path.endsWith('.yaml') ? yaml.load(content) : JSON.parse(content);
      this.config = { ...this.config, ...(loaded as object) };
    }
  }

  private loadFromEnv() {
    Object.keys(process.env).forEach(key => {
      // Enforce RW_ prefix for environment variables
      if (key.startsWith('RW_')) {
        const configKey = key.slice(3); // Strip the 'RW_' prefix for internal use
        this.config[configKey] = process.env[key];
      }
    });
  }

  public get(key: string, defaultValue?: any) {
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }
}
