import React, { useState, useEffect } from 'react';
import { isErudaEnabled, setErudaEnabled } from '../../utils/ErudaManager';

export const ErudaToggle: React.FC = () => {
  const [enabled, setEnabled] = useState(isErudaEnabled());

  useEffect(() => {
    setEnabled(isErudaEnabled());
  }, []);

  const toggle = () => {
    const newState = !enabled;
    setErudaEnabled(newState);
    setEnabled(newState);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-surface-card border border-border-subtle rounded-xl shadow-sm">
      <label htmlFor="eruda-toggle" className="text-sm font-medium text-text-primary">
        Enable Mobile Debug Console (Eruda)
      </label>
      <button
        id="eruda-toggle"
        onClick={toggle}
        aria-label={enabled ? "Disable Mobile Debug Console" : "Enable Mobile Debug Console"}
        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all focus-visible:ring-2 focus-visible:ring-accent-intel focus:outline-none ${
          enabled
            ? 'bg-accent-ops text-white shadow-lg shadow-accent-ops/20'
            : 'bg-surface-accent text-text-subtle hover:text-text-primary border border-border-subtle'
        }`}
      >
        {enabled ? 'Enabled' : 'Disabled'}
      </button>
    </div>
  );
};
