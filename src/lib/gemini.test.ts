import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { streamGemini, callGemini } from './gemini';

// Mock SYSTEM_CONSTANTS for testing
vi.mock('../constants/systemConstants', () => ({
  SYSTEM_CONSTANTS: {
    RW_API_BASE: 'http://test-api',
    RW_DEFAULT_TEMPERATURE: 0.7,
    RW_MAX_CHAT_CACHE_SIZE: 2,
    RW_MAX_RESPONSE_CHUNK_LENGTH: 1000
  }
}));

describe('gemini', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('TextDecoder', vi.fn().mockImplementation(() => ({
      decode: (val: any) => val.toString()
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('callGemini should return text from API', async () => {
    const mockResponse = {
      candidates: [{ content: { parts: [{ text: 'hello' }] } }]
    };
    (fetch as any).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockResponse)
    });

    const result = await callGemini([], 'model', 'key', 'system instruction');
    expect(result).toBe('hello');
    expect(fetch).toHaveBeenCalledWith('http://test-api/api/chat', expect.any(Object));
  });

  it('callGemini should throw on error', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue('API Error')
    });

    await expect(callGemini([], 'model', 'key', 'system instruction')).rejects.toThrow('HTTP 500: API Error');
  });
});
