import React, { useState } from 'react';
import { Search, Loader2, FileText, ChevronRight } from 'lucide-react';
import { filesystemService } from '../lib/filesystemService';

interface SearchResult {
  path: string;
  line: number;
  content: string;
}

interface SearchPanelProps {
  onSelectFile: (path: string, line?: number) => void;
}

export function SearchPanel({ onSelectFile }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const data = await filesystemService.search(query);
      setResults(data);
    } catch (e) {
      console.error('Search failed', e);
    } finally {
      setLoading(false);
    }
  };

  // Group results by file
  const groupedResults = results.reduce((acc, res) => {
    if (!acc[res.path]) acc[res.path] = [];
    acc[res.path].push(res);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <div className="flex flex-col h-full bg-[#252526] border-r border-[#3c3c3c]">
      <div className="p-4 border-b border-[#3c3c3c]">
        <h2 className="text-xs font-bold text-[#858585] uppercase tracking-widest mb-4">Search</h2>
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in workspace..."
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 pl-9 text-sm text-[#d4d4d4] focus:outline-none focus:border-[#007acc] transition-all"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#858585]" />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#007acc]" />
          )}
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {Object.entries(groupedResults).length === 0 && !loading && query && (
          <div className="text-center py-8 text-[#858585] text-sm italic">
            No results found for "{query}"
          </div>
        )}

        {Object.entries(groupedResults).map(([path, fileResults]: [string, SearchResult[]]) => (
          <div key={path} className="space-y-1">
            <button 
              onClick={() => onSelectFile(path)}
              className="flex items-center gap-2 w-full text-left px-2 py-1 hover:bg-[#2d2d2d] rounded transition-colors group"
            >
              <ChevronRight className="w-3.5 h-3.5 text-[#858585] group-hover:text-[#cccccc]" />
              <FileText className="w-4 h-4 text-[#007acc]" />
              <span className="text-sm font-medium text-[#cccccc] truncate">{path}</span>
              <span className="ml-auto text-[10px] bg-[#3c3c3c] text-[#858585] px-1.5 py-0.5 rounded">
                {fileResults.length}
              </span>
            </button>
            <div className="ml-6 space-y-0.5">
              {fileResults.map((res: SearchResult, i: number) => (
                <button
                  key={i}
                  onClick={() => onSelectFile(path, res.line)}
                  className="w-full text-left px-2 py-1 hover:bg-[#2d2d2d] rounded transition-colors text-xs text-[#858585] hover:text-[#cccccc] flex gap-3"
                >
                  <span className="text-[#007acc] font-mono w-6 text-right">{res.line}</span>
                  <span className="truncate flex-1">{res.content}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
