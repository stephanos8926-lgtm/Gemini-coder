import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Plus, Trash2, Download, Upload, FolderOpen } from 'lucide-react';
import { Project } from '../lib/projectStore';

interface ProjectModalProps {
  projects: Project[];
  currentProjectId: string | null;
  onClose: () => void;
  onSwitchProject: (id: string) => void;
  onCreateProject: (name: string) => void;
  onDeleteProject: (id: string) => void;
  onImportProject: (file: File) => void;
}

export function ProjectModal({
  projects,
  currentProjectId,
  onClose,
  onSwitchProject,
  onCreateProject,
  onDeleteProject,
  onImportProject
}: ProjectModalProps) {
  const [newProjectName, setNewProjectName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      onCreateProject(newProjectName.trim());
      setNewProjectName('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportProject(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#252526] border border-[#3c3c3c] rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]"
      >
        <div className="flex items-center justify-between p-4 border-b border-[#3c3c3c]">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[#007acc]" />
            Projects
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-[#3c3c3c] rounded-md transition-colors text-[#cccccc]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-[#3c3c3c] bg-[#1e1e1e]">
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="New project name..."
              className="flex-1 bg-[#3c3c3c] border border-[#4d4d4d] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#007acc]"
            />
            <button
              type="submit"
              disabled={!newProjectName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-[#007acc] text-white rounded-md hover:bg-[#005f9e] transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Create
            </button>
          </form>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="file"
              accept=".zip"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-[#3c3c3c] text-[#d4d4d4] border border-[#4d4d4d] rounded-md hover:bg-[#4d4d4d] transition-colors text-sm font-medium"
            >
              <Upload className="w-4 h-4" />
              Import ZIP
            </button>
            <span className="text-xs text-[#858585]">Import a previously exported GIDE project</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {projects.length === 0 ? (
            <div className="text-center text-[#858585] py-8 italic">
              No saved projects yet. Create one above!
            </div>
          ) : (
            projects.sort((a, b) => b.updatedAt - a.updatedAt).map(project => (
              <div
                key={project.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  project.id === currentProjectId
                    ? 'bg-[#1e1e1e] border-[#007acc]'
                    : 'bg-[#2d2d2d] border-[#3c3c3c] hover:border-[#4d4d4d]'
                }`}
              >
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => onSwitchProject(project.id)}
                >
                  <div className="font-medium text-[#e5e5e5] flex items-center gap-2">
                    {project.name}
                    {project.id === currentProjectId && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-[#007acc]/20 text-[#007acc] rounded uppercase tracking-wider">Active</span>
                    )}
                  </div>
                  <div className="text-xs text-[#858585] mt-1">
                    {Object.keys(project.files).length} files • Last updated {new Date(project.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => onDeleteProject(project.id)}
                    className="p-2 text-[#858585] hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
