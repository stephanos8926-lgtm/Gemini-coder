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
    const paths = ['nexus-config.json', 'nexus-config.yaml', 'config.json', 'config.yaml'];
    for (const p of paths) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf8');
        const loaded = (p.endsWith('.yaml') || p.endsWith('.yml')) 
          ? yaml.load(content) 
          : JSON.parse(content);
        this.config = { ...this.config, ...(loaded as object) };
        break; // Stop at first found config
      }
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
