import chokidar from 'chokidar';
import { Server } from 'socket.io';
import path from 'path';

export class ServerWatcher {
  private watcher: chokidar.FSWatcher;
  private debounceMap = new Map<string, NodeJS.Timeout>();

  constructor(private workspaceRoot: string, private io: Server) {
    this.watcher = chokidar.watch(workspaceRoot, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/.next/**',
        '**/.cache/**'
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100
      }
    });

    this.setupListeners();
  }

  private setupListeners() {
    this.watcher
      .on('add', path => this.handleEvent('add', path))
      .on('change', path => this.handleEvent('change', path))
      .on('unlink', path => this.handleEvent('unlink', path));
  }

  private handleEvent(event: string, filePath: string) {
    const relativePath = path.relative(this.workspaceRoot, filePath);
    
    // Debounce to prevent flooding
    if (this.debounceMap.has(relativePath)) {
      clearTimeout(this.debounceMap.get(relativePath));
    }

    const timeout = setTimeout(() => {
      this.io.emit('fs-event', { event, path: relativePath });
      console.log(`[Watcher] ${event.toUpperCase()} in ${relativePath}`);
      this.debounceMap.delete(relativePath);
    }, 150);

    this.debounceMap.set(relativePath, timeout);
  }

  public close() {
    this.watcher.close();
  }
}
