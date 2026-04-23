import React from 'react';
import { Drawer } from 'vaul';
import { X, GripHorizontal } from 'lucide-react';

interface AdaptiveBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

/**
 * @component AdaptiveBottomSheet
 * @description A high-performance, accessible bottom sheet for mobile ergonomics.
 * Utilizes 'vaul' for native-feel gestures and smooth animations.
 */
export const AdaptiveBottomSheet: React.FC<AdaptiveBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children
}) => {
  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
        <Drawer.Content className="bg-[#1e1e1e] flex flex-col rounded-t-[20px] h-[85vh] mt-24 fixed bottom-0 left-0 right-0 z-[60] border-t border-[#3c3c3c] shadow-2xl overflow-hidden active:cursor-grabbing">
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-[#3c3c3c] mt-4 mb-2 pointer-events-none" />
          
          <div className="flex items-center justify-between px-6 py-3 border-b border-[#3c3c3c] bg-[#252526]">
            <Drawer.Title className="text-sm font-bold text-[#e5e5e5] uppercase tracking-widest flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#007acc] animate-pulse" />
              {title}
            </Drawer.Title>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-[#3c3c3c] rounded-full transition-colors text-[#858585] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-[#1e1e1e] custom-scrollbar">
            {children}
          </div>
          
          <div className="h-safe-area-inset-bottom" />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
