import React, { Suspense, lazy } from 'react';
import { MainLayout } from './MainLayout';
import { useChatStore } from '../../store/useChatStore';

const PanelLoader = () => (
  <div className="flex-1 flex flex-col items-center justify-center h-full bg-surface-base text-text-subtle gap-3">
    <div className="p-2 bg-accent-intel/10 rounded-xl border border-accent-intel/20 animate-pulse">
      <div className="w-6 h-6 bg-accent-intel rounded-full" />
    </div>
    <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Hydrating Panel</span>
  </div>
);

interface DesktopIDEProps {
  settings: any;
  showTerminal: boolean;
  onSendMessage: (msg: string) => Promise<void>;
  onDownloadFile: (path: string) => void;
  onDownloadZip: () => void;
  onDeleteFile: (path: string) => void;
}

export const DesktopIDE: React.FC<DesktopIDEProps> = ({
  settings,
  showTerminal,
  onSendMessage,
  onDownloadFile,
  onDownloadZip,
  onDeleteFile
}) => {
  return (
    <div className="hidden sm:flex flex-1 h-full overflow-hidden">
      <MainLayout 
        settings={settings}
        showTerminal={showTerminal}
        onSendMessage={onSendMessage}
        onDownloadFile={onDownloadFile}
        onDownloadZip={onDownloadZip}
        onDeleteFile={onDeleteFile}
      />
    </div>
  );
};
