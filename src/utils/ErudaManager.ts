import eruda from 'eruda';

const ERUDA_KEY = 'forge_eruda_enabled';

export function isErudaEnabled(): boolean {
  return localStorage.getItem(ERUDA_KEY) === 'true';
}

export function setErudaEnabled(enabled: boolean) {
  localStorage.setItem(ERUDA_KEY, enabled.toString());
  if (enabled) {
    eruda.init({
      tool: ['console', 'elements', 'info'] // Exclude 'network' which might be trying to mock fetch
    });
  } else {
    eruda.destroy();
  }
}

export function initEruda() {
  if (isErudaEnabled()) {
    eruda.init({
      tool: ['console', 'elements', 'info']
    });
    console.log('Eruda initialized.');
  }
}
