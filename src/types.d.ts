export {};

declare global {
  interface Window {
    hljs?: {
      highlightElement: (block: Element) => void;
    };
    JSZip: any;
  }
}
