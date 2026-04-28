import { ForgeGuard } from './guard/ForgeGuard';
import { PersistenceManager } from './utils/PersistenceManager';
import { TUISensor } from './guard/sensors/TUISensor';
import { FirestoreSensor } from './guard/sensors/FirestoreSensor';
import { LocalFileSensor } from './guard/sensors/LocalFileSensor';

export class NexusFactory {
  private static instance: NexusFactory;
  
  // Dependency container
  private container = new Map<string, any>();

  private constructor() {}

  public static getInstance(): NexusFactory {
    if (!NexusFactory.instance) NexusFactory.instance = new NexusFactory();
    return NexusFactory.instance;
  }

  public createForgeGuard(moduleName: string, persistence?: PersistenceManager): ForgeGuard {
    const pm = persistence || this.getPersistenceManager();
    return ForgeGuard.init(moduleName, {}, pm);
  }

  public getPersistenceManager(): PersistenceManager {
    if (!this.container.has('PersistenceManager')) {
      this.container.set('PersistenceManager', PersistenceManager.getInstance());
    }
    return this.container.get('PersistenceManager');
  }

  /**
   * Registers standard suite of sensors to a guard instance
   */
  public setupStandardSensors(guard: ForgeGuard): void {
    guard.registerSensor('tui', new TUISensor());
    guard.registerSensor('local-file', new LocalFileSensor(process.cwd()));
    
    // Conditional sensors based on environment
    if (process.env.FIREBASE_PROJECT_ID) {
      guard.registerSensor('firestore', new FirestoreSensor());
    }
  }
}
