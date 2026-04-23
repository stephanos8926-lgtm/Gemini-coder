import React from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { useScratchpadStore } from '../store/useScratchpadStore';

export const DiffStagingPanel: React.FC = () => {
  const { pendingEdits, acceptEdit, rejectEdit } = useScratchpadStore();
  const filePaths = Object.keys(pendingEdits);

  if (filePaths.length === 0) return null;

  const currentPath = filePaths[0];
  const edit = pendingEdits[currentPath];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-white font-semibold">Review Changes: {currentPath}</h2>
          <div className="space-x-2">
            <button 
              onClick={() => rejectEdit(currentPath)}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reject
            </button>
            <button 
              onClick={() => acceptEdit(currentPath)}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Accept
            </button>
          </div>
        </div>
        <div className="flex-grow">
          <DiffEditor
            language="typescript"
            original={edit.original}
            modified={edit.proposed}
            theme="vs-dark"
            options={{
              readOnly: true,
              renderSideBySide: true,
            } as any}
          />
        </div>
      </div>
    </div>
  );
};
