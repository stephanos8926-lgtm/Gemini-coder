import React, { useState } from 'react';
import { Settings as SettingsIcon, X, Monitor, Cpu, Layout, Save, RotateCcw, Type, Code, Terminal, Sparkles, User, Palette, Zap, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, DEFAULT_SETTINGS, settingsStore } from '../lib/settingsStore';
import AdminPage from './AdminPage';
import { ErudaToggle } from './ui/ErudaToggle';

interface SettingsModalProps {
  onClose: () => void;
  onSave: (settings: Settings) => void;
  initialSettings: Settings;
}

type Tab = 'profile' | 'editor' | 'ai' | 'ui' | 'workspace' | 'admin';

export function SettingsModal({ onClose, onSave, initialSettings }: SettingsModalProps) {
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const handleSave = () => {
    settingsStore.save(settings);
    onSave(settings);
    onClose();
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const TabButton = ({ id, icon: Icon, label }: { id: Tab, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 w-auto sm:w-full text-left transition-all rounded-lg whitespace-nowrap ${
        activeTab === id 
          ? 'bg-[#37373d] text-white shadow-sm' 
          : 'text-[#858585] hover:text-[#cccccc] hover:bg-[#2d2d2d]'
      }`}
    >
      <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === id ? 'text-[#007acc]' : ''}`} />
      <span className="text-xs sm:text-sm font-medium">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#252526] border border-[#454545] sm:rounded-xl shadow-2xl w-full h-full sm:h-[650px] max-w-3xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#3c3c3c] bg-[#2d2d2d]">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#007acc]" />
            <h2 className="text-base sm:text-lg font-semibold text-white">Project Settings</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[#3c3c3c] rounded-md text-[#858585] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Sidebar / Tabs */}
          <div className="flex sm:flex-col w-full sm:w-48 bg-[#252526] border-b sm:border-b-0 sm:border-r border-[#3c3c3c] p-2 sm:p-4 gap-1 overflow-x-auto no-scrollbar">
            <TabButton id="profile" icon={User} label="Profile" />
            <TabButton id="editor" icon={Code} label="Editor" />
            <TabButton id="ai" icon={Sparkles} label="AI Agent" />
            <TabButton id="ui" icon={Layout} label="Interface" />
            <TabButton id="workspace" icon={Terminal} label="Workspace" />
            <div className="border-t border-[#3c3c3c] my-2" />
            <TabButton id="admin" icon={Shield} label="Admin" />
          </div>

          {/* Content */}
          <div className="flex-1 bg-[#1e1e1e] p-4 sm:p-8 overflow-y-auto space-y-6 sm:space-y-8 custom-scrollbar">
            {activeTab === 'admin' ? (
              <AdminPage />
            ) : (
              <>
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <h3 className="text-xs sm:text-sm font-bold text-[#858585] uppercase tracking-widest">User Profile</h3>
                    
                    <div className="flex items-center gap-6 p-4 bg-[#252526] rounded-xl border border-[#3c3c3c]">
                      <div className="w-16 h-16 rounded-full bg-[#007acc]/20 border border-[#007acc]/40 flex items-center justify-center text-[#007acc]">
                        {settings.userAvatar ? (
                          <img src={settings.userAvatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <User className="w-8 h-8" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <h4 className="text-sm font-bold text-white">{settings.userName || 'Developer'}</h4>
                        <p className="text-xs text-[#858585]">GIDE Professional Tier</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] sm:text-xs text-[#cccccc]">Display Name</label>
                        <input
                          type="text"
                          value={settings.userName}
                          onChange={(e) => updateSetting('userName', e.target.value)}
                          className="w-full bg-[#252526] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#007acc]"
                          placeholder="Your name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] sm:text-xs text-[#cccccc]">Avatar URL</label>
                        <input
                          type="text"
                          value={settings.userAvatar}
                          onChange={(e) => updateSetting('userAvatar', e.target.value)}
                          className="w-full bg-[#252526] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#007acc]"
                          placeholder="https://example.com/avatar.png"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'editor' && (
                  <div className="space-y-6">
                    <h3 className="text-xs sm:text-sm font-bold text-[#858585] uppercase tracking-widest">Editor Configuration</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] sm:text-xs text-[#cccccc]">Font Size (px)</label>
                        <input
                          type="number"
                          value={settings.fontSize}
                          onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
                          className="w-full bg-[#252526] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#007acc]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] sm:text-xs text-[#cccccc]">Tab Size</label>
                        <select
                          value={settings.tabSize}
                          onChange={(e) => updateSetting('tabSize', parseInt(e.target.value))}
                          className="w-full bg-[#252526] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#007acc]"
                        >
                          <option value={2}>2 spaces</option>
                          <option value={4}>4 spaces</option>
                          <option value={8}>8 spaces</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] sm:text-xs text-[#cccccc]">Font Family</label>
                      <input
                        type="text"
                        value={settings.fontFamily}
                        onChange={(e) => updateSetting('fontFamily', e.target.value)}
                        className="w-full bg-[#252526] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#007acc] font-mono"
                      />
                    </div>

                    <div className="space-y-4 pt-2 sm:pt-4">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={settings.lineNumbers}
                          onChange={(e) => updateSetting('lineNumbers', e.target.checked)}
                          className="w-4 h-4 rounded border-[#3c3c3c] bg-[#252526] text-[#007acc] focus:ring-0"
                        />
                        <span className="text-sm text-[#cccccc] group-hover:text-white transition-colors">Show Line Numbers</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={settings.minimap}
                          onChange={(e) => updateSetting('minimap', e.target.checked)}
                          className="w-4 h-4 rounded border-[#3c3c3c] bg-[#252526] text-[#007acc] focus:ring-0"
                        />
                        <span className="text-sm text-[#cccccc] group-hover:text-white transition-colors">Show Minimap</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={settings.showErrorHighlighting}
                          onChange={(e) => updateSetting('showErrorHighlighting', e.target.checked)}
                          className="w-4 h-4 rounded border-[#3c3c3c] bg-[#252526] text-[#007acc] focus:ring-0"
                        />
                        <span className="text-sm text-[#cccccc] group-hover:text-white transition-colors">Enable Error Highlighting</span>
                      </label>
                    </div>
                  </div>
                )}

                {activeTab === 'ai' && (
                  <div className="space-y-6">
                    <h3 className="text-xs sm:text-sm font-bold text-[#858585] uppercase tracking-widest">AI Agent Settings</h3>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] sm:text-xs text-[#cccccc]">Default Model</label>
                      <select
                        value={settings.defaultModel}
                        onChange={(e) => updateSetting('defaultModel', e.target.value)}
                        className="w-full bg-[#252526] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#007acc]"
                      >
                        <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Fastest)</option>
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Balanced)</option>
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro (Most Powerful)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] sm:text-xs text-[#cccccc]">AI Behavior Style</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['terse', 'verbose', 'creative', 'technical'].map((style) => (
                          <button
                            key={style}
                            onClick={() => updateSetting('aiBehavior', style as any)}
                            className={`px-3 py-2 rounded border text-xs font-medium transition-all ${
                              settings.aiBehavior === style 
                                ? 'bg-[#007acc] border-[#007acc] text-white' 
                                : 'bg-[#252526] border-[#3c3c3c] text-[#858585] hover:border-[#454545]'
                            }`}
                          >
                            {style.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] sm:text-xs text-[#cccccc]">Temperature ({settings.temperature})</label>
                        <span className="text-[10px] text-[#858585]">Creative vs Precise</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.temperature}
                        onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-[#3c3c3c] rounded-lg appearance-none cursor-pointer accent-[#007acc]"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] sm:text-xs text-[#cccccc]">AI Persona</label>
                        <select
                          value={settings.aiPersona}
                          onChange={(e) => updateSetting('aiPersona', e.target.value)}
                          className="w-full bg-[#252526] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#007acc]"
                        >
                          <option value="helpful assistant">Helpful Assistant</option>
                          <option value="expert programmer">Expert Programmer</option>
                          <option value="code reviewer">Code Reviewer</option>
                          <option value="technical writer">Technical Writer</option>
                          <option value="custom">Custom Persona...</option>
                        </select>
                      </div>

                      <label className="flex items-center gap-3 cursor-pointer group pt-2">
                        <input
                          type="checkbox"
                          checked={settings.aiChainOfThought}
                          onChange={(e) => updateSetting('aiChainOfThought', e.target.checked)}
                          className="w-4 h-4 rounded border-[#3c3c3c] bg-[#252526] text-[#007acc] focus:ring-0"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm text-[#cccccc] group-hover:text-white transition-colors">Enable Chain of Thought</span>
                          <span className="text-[10px] text-[#858585]">AI will show its reasoning process in a &lt;thinking&gt; block.</span>
                        </div>
                      </label>

                      {settings.aiPersona === 'custom' && (
                        <div className="space-y-2">
                          <label className="text-[10px] sm:text-xs text-[#cccccc]">Custom Persona Instructions</label>
                          <textarea
                            value={settings.customPersona}
                            onChange={(e) => updateSetting('customPersona', e.target.value)}
                            placeholder="Describe how the AI should behave..."
                            className="w-full h-32 bg-[#252526] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#007acc] resize-none font-mono text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'ui' && (
                  <div className="space-y-6">
                    <h3 className="text-xs sm:text-sm font-bold text-[#858585] uppercase tracking-widest">Interface Customization</h3>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] sm:text-xs text-[#cccccc]">App Theme</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                        {['dark', 'light', 'high-contrast'].map((t) => (
                          <button
                            key={t}
                            onClick={() => updateSetting('theme', t as any)}
                            className={`px-3 py-2 rounded border text-xs font-medium transition-all ${
                              settings.theme === t 
                                ? 'bg-[#007acc] border-[#007acc] text-white' 
                                : 'bg-[#252526] border-[#3c3c3c] text-[#858585] hover:border-[#454545]'
                            }`}
                          >
                            {t.replace('-', ' ').toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] sm:text-xs text-[#cccccc]">Editor Theme</label>
                      <select
                        value={settings.editorTheme}
                        onChange={(e) => updateSetting('editorTheme', e.target.value as any)}
                        className="w-full bg-[#252526] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#007acc]"
                      >
                        <option value="vs-dark">Visual Studio Dark</option>
                        <option value="light">Visual Studio Light</option>
                        <option value="hc-black">High Contrast Black</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] sm:text-xs text-[#cccccc]">Sidebar Position</label>
                      <div className="flex gap-2">
                        {['left', 'right'].map((pos) => (
                          <button
                            key={pos}
                            onClick={() => updateSetting('sidebarPosition', pos as 'left' | 'right')}
                            className={`flex-1 px-3 py-2 rounded border text-xs font-medium transition-all ${
                              settings.sidebarPosition === pos 
                                ? 'bg-[#007acc] border-[#007acc] text-white' 
                                : 'bg-[#252526] border-[#3c3c3c] text-[#858585] hover:border-[#454545]'
                            }`}
                          >
                            {pos.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer group pt-2">
                      <input
                        type="checkbox"
                        checked={settings.compactMode}
                        onChange={(e) => updateSetting('compactMode', e.target.checked)}
                        className="w-4 h-4 rounded border-[#3c3c3c] bg-[#252526] text-[#007acc] focus:ring-0"
                      />
                      <span className="text-sm text-[#cccccc] group-hover:text-white transition-colors">Compact Mode (Smaller Text)</span>
                    </label>
                    <div className="pt-4">
                      <ErudaToggle />
                    </div>
                  </div>
                )}

                {activeTab === 'workspace' && (
                  <div className="space-y-6">
                    <h3 className="text-xs sm:text-sm font-bold text-[#858585] uppercase tracking-widest">Workspace Behavior</h3>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] sm:text-xs text-[#cccccc]">Auto-save Interval (ms)</label>
                      <input
                        type="number"
                        step="500"
                        min="500"
                        value={settings.autoSaveInterval}
                        onChange={(e) => updateSetting('autoSaveInterval', parseInt(e.target.value))}
                        className="w-full bg-[#252526] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#007acc]"
                      />
                      <p className="text-[10px] text-[#858585]">How often to save changes to the server while typing.</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-[#2d2d2d] border-t border-[#3c3c3c] flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-[#f48771] hover:bg-[#3c3c3c] rounded-md transition-colors order-2 sm:order-1"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Reset to Defaults
          </button>
          <div className="flex gap-2 sm:gap-3 order-1 sm:order-2">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 text-xs sm:text-sm font-medium text-[#cccccc] hover:text-white hover:bg-[#3c3c3c] rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-[#007acc] hover:bg-[#005f9e] text-white rounded-md text-xs sm:text-sm font-medium transition-colors shadow-lg shadow-[#007acc]/20"
            >
              <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
