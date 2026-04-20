export interface ForgeGuardProtocol {
  /**
   * Called when a critical issue is detected during an autonomous scan.
   * Allows the hosting application (IDE) to decide how to handle the patching process.
   */
  onDangerousIssue: (filePath: string, issues: any[]) => Promise<void>;
  
  /**
   * Provides a way to inspect the host environment without the library
   * needing to know about Node.js internals (process/fs).
   */
  getFileSystemProbe: () => {
    exists: (path: string) => boolean;
    read: (path: string) => string;
    write: (path: string, content: string) => void;
  };
}
