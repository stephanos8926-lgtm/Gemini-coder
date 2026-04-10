/// <reference types="vite/client" />

export {};

declare global {
  interface Window {
    hljs?: {
      highlightElement: (block: Element) => void;
    };
    JSZip: any;
  }

  // Shared Application Types
  interface Workspace {
    name: string;
    path: string;
    lastOpened: number;
  }

  interface FileNode {
    path: string;
    isDir: boolean;
    size: number;
    content?: string;
  }

  interface AIContext {
    workspaceName: string;
    fileStructure: FileNode[];
    activeFile?: string;
  }
}
