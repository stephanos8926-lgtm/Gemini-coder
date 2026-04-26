import { describe, it, expect, vi, beforeEach } from 'vitest';
import { filesystemService } from './filesystemService';
import ky from 'ky';

vi.mock('ky', () => {
  const mockKy = {
    create: vi.fn().mockReturnValue({
      get: vi.fn().mockReturnValue({ json: vi.fn().mockResolvedValue({}) }),
      post: vi.fn().mockReturnValue({ json: vi.fn().mockResolvedValue({}) }),
    }),
  };
  return { default: mockKy };
});

vi.mock('../utils/FileCacheManager', () => ({
    fileCache: {
        getFile: vi.fn(),
        updateFile: vi.fn(),
        invalidate: vi.fn()
    }
}));

vi.mock('idb-keyval', () => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn()
}));

describe('filesystemService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listWorkspaces calls the correct endpoint', async () => {
    const mockClient = filesystemService.client;
    await filesystemService.listWorkspaces();
    expect(mockClient.get).toHaveBeenCalledWith('/api/workspaces');
  });

  it('listFiles calls the correct endpoint with search params', async () => {
    const mockClient = filesystemService.client;
    filesystemService.setWorkspace('test-workspace');
    await filesystemService.listFiles('path/to/files', true);
    expect(mockClient.get).toHaveBeenCalledWith(expect.stringContaining('/api/files?workspace=test-workspace&path=path%2Fto%2Ffiles&recursive=true'));
  });

  it('getFileContent returns cached content', async () => {
    const { fileCache } = await import('../utils/FileCacheManager');
    vi.mocked(fileCache.getFile).mockResolvedValue('cached content');
    
    const content = await filesystemService.getFileContent('test.ts');
    expect(content).toBe('cached content');
    expect(fileCache.getFile).toHaveBeenCalled();
  });

  it('saveFile invalidates cache', async () => {
    const mockClient = filesystemService.client;
    const { fileCache } = await import('../utils/FileCacheManager');
    vi.mocked(mockClient.post).mockReturnValue({ json: vi.fn().mockResolvedValue({}) } as any);
    
    await filesystemService.saveFile('test.ts', 'new content');
    expect(mockClient.post).toHaveBeenCalledWith('/api/files/save', expect.any(Object));
    expect(fileCache.invalidate).toHaveBeenCalled();
  });
});
