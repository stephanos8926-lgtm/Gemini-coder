// Protect fetch from being overwritten
if (typeof window !== 'undefined') {
  const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
  if (desc && desc.get && !desc.set && desc.configurable) {
    Object.defineProperty(window, 'fetch', {
      get: desc.get,
      set: function() { console.warn('Eruda: ignoring fetch override'); },
      configurable: true,
      enumerable: desc.enumerable
    });
  }
}

const ERUDA_KEY = 'forge_eruda_enabled';

export function isErudaEnabled(): boolean {
  return false;
}

export function setErudaEnabled(enabled: boolean) {
  if (enabled) {
    console.warn('Eruda (Mobile Debug Console) cannot be enabled in this environment because it conflicts with AI Studio iframe sandbox restrictions (fetch is non-configurable). It has been disabled for stability.');
  }
}

export function initEruda() {
  // no-op
}
