import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationManager } from '../lib/ConversationManager';

describe('ConversationManager', () => {
  let manager: ConversationManager;

  beforeEach(() => {
    manager = new ConversationManager();
  });

  it('should initialize with an empty history', () => {
    expect(manager.getMessages()).toEqual([]);
  });

  it('should add messages to the history', () => {
    manager.addMessage({ role: 'user', content: 'Hello' });
    const history = manager.getMessages();
    expect(history).toHaveLength(1);
    expect(history[0]).toEqual({ role: 'user', content: 'Hello' });
  });

  it('should truncate history correctly', () => {
    // Add a first message
    manager.addMessage({ role: 'user', content: 'First message' });
    
    // Add many intermediate messages
    for (let i = 0; i < 15; i++) {
      manager.addMessage({ role: 'model', content: `Intermediate message ${i}` });
    }
    
    const truncated = manager.getTruncatedHistory();
    expect(truncated.length).toBeGreaterThan(0);
    expect(truncated[0].content).toBe('First message');
  });
});
