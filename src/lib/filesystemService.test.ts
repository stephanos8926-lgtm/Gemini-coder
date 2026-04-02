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
});
