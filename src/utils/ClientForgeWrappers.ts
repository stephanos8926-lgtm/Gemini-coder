export class LogTool {
  constructor(private name: string) {}
  info(message: string, ...args: any[]) { console.log(`[${this.name}] ${message}`, ...args); }
  error(message: string, error: Error) { console.error(`[${this.name}] ${message}`, error); }
}

export class ForgeGuard {
  static init(name: string) { return new ForgeGuard(name); }
  constructor(private name: string) {}
  protect<T>(fn: () => T, options: any): T { return fn(); }
}
