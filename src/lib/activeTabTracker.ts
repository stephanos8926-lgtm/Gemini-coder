type TabListener = (path: string | null) => void;

class ActiveTabTracker {
  private static instance: ActiveTabTracker;
  private activeTab: string | null = null;
  private openTabs: Set<string> = new Set();
  private listeners: Set<TabListener> = new Set();

  private constructor() {}

  public static getInstance(): ActiveTabTracker {
    if (!ActiveTabTracker.instance) {
      ActiveTabTracker.instance = new ActiveTabTracker();
    }
    return ActiveTabTracker.instance;
  }

  public setActiveTab(path: string | null) {
    this.activeTab = path;
    if (path) this.openTabs.add(path);
    this.notify();
  }

  public setOpenTabs(paths: string[]) {
    this.openTabs = new Set(paths);
    this.notify();
  }

  public getActiveTab(): string | null {
    return this.activeTab;
  }

  public getOpenTabs(): string[] {
    return Array.from(this.openTabs);
  }

  public subscribe(listener: TabListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l(this.activeTab));
  }
}

export const activeTabTracker = ActiveTabTracker.getInstance();
