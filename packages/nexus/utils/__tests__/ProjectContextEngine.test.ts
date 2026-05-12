import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectContextEngine } from '../ProjectContextEngine';
import * as fs from 'fs/promises';
import path from 'path';

vi.mock('fs/promises');
vi.mock('web-tree-sitter');

describe('ProjectContextEngine', () => {
  let engine: ProjectContextEngine;

  beforeEach(() => {
    engine = new ProjectContextEngine();
    vi.clearAllMocks();
  });

  it('should list TS files recursively', async () => {
    (fs.readdir as any).mockResolvedValueOnce([
      { name: 'file1.ts', isDirectory: () => false },
      { name: 'subdir', isDirectory: () => true }
    ]);
    (fs.readdir as any).mockResolvedValueOnce([
      { name: 'file2.tsx', isDirectory: () => false }
    ]);

    const files = await (engine as any).listTSFiles('/root');
    expect(files).toContain(path.join('/root', 'file1.ts'));
    expect(files).toContain(path.join('/root', 'subdir', 'file2.tsx'));
  });

  it('should infer intent correctly', () => {
    expect((engine as any).inferIntent('src/services/UserService.ts', 'UserService.ts')).toBe('Business logic service');
    expect((engine as any).inferIntent('src/controllers/AppController.ts', 'AppController.ts')).toBe('API endpoint handler');
  });
});
