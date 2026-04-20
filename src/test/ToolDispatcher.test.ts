import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolDispatcher } from '../lib/ToolDispatcher';
import { toolRegistry } from '../lib/ToolRegistry';

// Mock the toolRegistry
vi.mock('../lib/ToolRegistry', () => ({
  toolRegistry: {
    getTool: vi.fn(),
  },
}));

describe('ToolDispatcher', () => {
  let dispatcher: ToolDispatcher;

  beforeEach(() => {
    dispatcher = new ToolDispatcher();
    vi.clearAllMocks();
  });

  it('should throw an error if tool is not found', async () => {
    (toolRegistry.getTool as any).mockReturnValue(undefined);

    await expect(dispatcher.dispatch('nonExistentTool', {}, {})).rejects.toThrow('Tool nonExistentTool not found');
  });

  it('should execute the tool and return the result', async () => {
    const mockTool = {
      execute: vi.fn().mockResolvedValue('success result'),
    };
    (toolRegistry.getTool as any).mockReturnValue(mockTool);

    const result = await dispatcher.dispatch('existentTool', { param: 'value' }, { user: 'test' });

    expect(toolRegistry.getTool).toHaveBeenCalledWith('existentTool');
    expect(mockTool.execute).toHaveBeenCalledWith({ param: 'value' }, { user: 'test' });
    expect(result).toBe('success result');
  });

  it('should handle tool execution errors', async () => {
    const mockTool = {
      execute: vi.fn().mockRejectedValue(new Error('Tool execution failed')),
    };
    (toolRegistry.getTool as any).mockReturnValue(mockTool);

    const result = await dispatcher.dispatch('failingTool', {}, {});
    expect(result).toEqual({
      error: 'Tool failingTool failed',
      details: 'Tool execution failed'
    });
  });
});
