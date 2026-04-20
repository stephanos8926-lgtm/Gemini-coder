import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { ForgeGuard } from '../utils/ForgeWrappers';

const guard = ForgeGuard.init('WasmTerminalEngine');

export class WasmTerminalEngine {
  private terminal: Terminal;
  private fitAddon: FitAddon;

  constructor(container: HTMLElement) {
    this.terminal = new Terminal({
      cursorBlink: true,
      theme: { background: '#1e1e1e' },
      fontSize: 12,
      fontFamily: 'JetBrains Mono, monospace'
    });
    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.loadAddon(new WebLinksAddon());
    this.terminal.open(container);
    this.fitAddon.fit();
  }

  async onFileChanged(path: string, content: string) {
    return guard.protect(async () => {
      console.log(`Delta sync: ${path} updated.`);
    }, { path: 'onFileChanged' });
  }

  async onFileCreated(path: string, isDir: boolean) {
    return guard.protect(async () => {
      console.log(`Delta sync: ${path} created.`);
    }, { path: 'onFileCreated' });
  }

  async onFileDeleted(path: string) {
    return guard.protect(async () => {
      console.log(`Delta sync: ${path} deleted.`);
    }, { path: 'onFileDeleted' });
  }

  handleInput(data: string) {
    this.terminal.write(data);
  }

  resize() {
    this.fitAddon.fit();
  }
}
