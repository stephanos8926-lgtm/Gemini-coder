export interface Settings {
  // User Profile
  userName: string;
  userAvatar: string;
  
  // Editor
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  lineNumbers: boolean;
  wordWrap: 'on' | 'off';
  minimap: boolean;
  editorTheme: 'vs-dark' | 'light' | 'hc-black';
  showErrorHighlighting: boolean;
  
  // AI
  defaultModel: string;
  temperature: number;
  aiPersona: string;
  customPersona: string;
  aiBehavior: 'terse' | 'verbose' | 'creative' | 'technical';
  aiChainOfThought: boolean;
  
  // UI
  theme: 'dark' | 'light' | 'high-contrast';
  sidebarPosition: 'left' | 'right';
  compactMode: boolean;
  
  // Workspace
  autoSaveInterval: number;
}

export const DEFAULT_SETTINGS: Settings = {
  userName: 'Developer',
  userAvatar: '',
  
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  tabSize: 2,
  lineNumbers: true,
  wordWrap: 'on',
  minimap: true,
  editorTheme: 'vs-dark',
  showErrorHighlighting: true,
  
  defaultModel: 'gemini-2.5-flash-lite',
  temperature: 0.7,
  aiPersona: 'helpful assistant',
  customPersona: '',
  aiBehavior: 'technical',
  aiChainOfThought: true,
  
  theme: 'dark',
  sidebarPosition: 'left',
  compactMode: false,
  
  autoSaveInterval: 1000,
};

const SETTINGS_KEY = 'gide_settings';

export const settingsStore = {
  get(): Settings {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return DEFAULT_SETTINGS;
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },
  
  save(settings: Settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
};
