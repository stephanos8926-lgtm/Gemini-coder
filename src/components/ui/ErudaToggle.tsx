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
    <div className="flex items-center space-x-2 p-4 bg-gray-100 rounded-md">
      <label htmlFor="eruda-toggle" className="text-sm font-medium text-gray-700">
        Enable Mobile Debug Console (Eruda)
      </label>
      <button
        id="eruda-toggle"
        onClick={toggle}
        className={`px-3 py-1 rounded text-white ${enabled ? 'bg-green-600' : 'bg-gray-400'}`}
      >
        {enabled ? 'On' : 'Off'}
      </button>
    </div>
  );
};
