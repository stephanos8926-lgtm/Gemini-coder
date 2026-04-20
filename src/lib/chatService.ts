export interface ChatMessage {
  type: 'message' | 'fix_request' | 'refactor_plan';
  content: string;
  files?: { path: string; content: string }[];
}

type ChatListener = (message: ChatMessage) => void;

class ChatService {
  private listeners: Set<ChatListener> = new Set();

  public subscribe(listener: ChatListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public sendMessage(message: ChatMessage) {
    this.listeners.forEach(listener => listener(message));
  }
}

export const chatService = new ChatService();
