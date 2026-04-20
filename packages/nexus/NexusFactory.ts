import { ForgeGuard } from './guard/ForgeGuard';
import { PersistenceManager } from './utils/PersistenceManager';

export class NexusFactory {
  private static instance: NexusFactory;
  
  // Dependency container
  private container = new Map<string, any>();

  private constructor() {}

  public static getInstance(): NexusFactory {
    if (!NexusFactory.instance) NexusFactory.instance = new NexusFactory();
    return NexusFactory.instance;
  }

  public createForgeGuard(moduleName: string, persistence: PersistenceManager): ForgeGuard {
    // In the future this can be pulled from container or configured dynamically
    return ForgeGuard.init(moduleName, {}, persistence);
  }

  public getPersistenceManager(): PersistenceManager {
    if (!this.container.has('PersistenceManager')) {
      this.container.set('PersistenceManager', PersistenceManager.getInstance());
    }
    return this.container.get('PersistenceManager');
  }
}
