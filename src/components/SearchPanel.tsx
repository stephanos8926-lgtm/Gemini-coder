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
    <div className="flex flex-col h-full bg-surface-card border-r border-border-subtle">
      <div className="p-4 border-b border-border-subtle">
        <h2 className="text-xs font-bold text-text-subtle uppercase tracking-widest mb-4">Search</h2>
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in workspace..."
            className="w-full bg-surface-base border border-border-subtle rounded px-3 py-2 pl-9 text-sm text-text-primary focus:outline-none focus:border-accent-intel transition-all"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-accent-intel" />
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
              aria-label={`Open matches in ${path}`}
              className="flex items-center gap-2 w-full text-left px-2 py-1 hover:bg-surface-accent rounded transition-colors group focus-visible:ring-1 focus-visible:ring-accent-intel outline-none"
            >
              <ChevronRight className="w-3.5 h-3.5 text-text-subtle group-hover:text-text-primary" />
              <FileText className="w-4 h-4 text-accent-intel" />
              <span className="text-sm font-medium text-text-primary truncate">{path}</span>
              <span className="ml-auto text-[10px] bg-surface-accent text-text-subtle px-1.5 py-0.5 rounded">
                {fileResults.length}
              </span>
            </button>
            <div className="ml-6 space-y-0.5">
              {fileResults.map((res: SearchResult, i: number) => (
                <button
                  key={`${path}-${res.line}-${i}`}
                  onClick={() => onSelectFile(path, res.line)}
                  aria-label={`Go to line ${res.line}`}
                  className="w-full text-left px-2 py-1 hover:bg-surface-accent rounded transition-colors text-xs text-text-subtle hover:text-text-primary flex gap-3 focus-visible:ring-1 focus-visible:ring-accent-intel outline-none"
                >
                  <span className="text-accent-intel font-mono w-6 text-right">{res.line}</span>
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
