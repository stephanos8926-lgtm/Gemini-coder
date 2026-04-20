import { Message } from './gemini';
import { LogTool, ForgeGuard } from '../utils/ForgeWrappers';

export class ConversationManager {
  private static readonly MAX_HISTORY_TOKENS = 30000;
  private static readonly RECENT_MESSAGES_COUNT = 10;
  private static readonly CHARS_PER_TOKEN = 4;
  
  private logger = new LogTool('ConversationManager');
  private guard = ForgeGuard.init('ConversationManager');
  
  private messages: Message[] = [];
  private systemInstruction: string = '';

  constructor(systemInstruction: string = '') {
    this.systemInstruction = systemInstruction;
  }

  public addMessage(message: Message) {
    this.messages.push(message);
  }

  public getMessages(): Message[] {
    return this.messages;
  }

  public getTruncatedHistory(): Message[] {
    return this.guard.protect(() => {
      this.logger.info('Truncating history');
      return ConversationManager.truncateHistory(this.messages, this.systemInstruction);
    }, { path: 'ConversationManager.getTruncatedHistory' });
  }

  private static estimateTokens(text: string): number {
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }

  private static summarizeCodeBlocks(content: string): string {
    if (content.length < 2000) return content;

    return content.replace(/```(?:typescript|javascript|ts|js)\n([\s\S]*?)```/g, (match, code) => {
      if (code.length < 1000) return match;

      const signatures: string[] = [];
      const lines = code.split('\n');
      let inFunction = false;
      let braceDepth = 0;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('import ') || trimmed.startsWith('export interface ') || trimmed.startsWith('export type ')) {
          signatures.push(line);
        } else if (trimmed.match(/^(?:export )?(?:async )?(?:function|class) /) || trimmed.match(/^(?:export )?(?:const|let|var) .*=.*(?:=>|function)/)) {
          signatures.push(line);
          inFunction = true;
        }

        if (inFunction) {
          braceDepth += (line.match(/\{/g) || []).length;
          braceDepth -= (line.match(/\}/g) || []).length;
          if (braceDepth <= 0) {
            inFunction = false;
            signatures.push('  // ... implementation elided by AST summarizer ...');
            signatures.push('}');
          }
        }
      }

      return `\`\`\`typescript\n// [AST Summarized Code Block]\n${signatures.join('\n')}\n\`\`\``;
    });
  }

  public static truncateHistory(messages: Message[], systemInstruction: string = ''): Message[] {
    if (messages.length <= 2) return messages;

    const firstMessage = messages[0];
    let recentMessages = messages.slice(-this.RECENT_MESSAGES_COUNT);
    let intermediateMessages = messages.slice(1, -this.RECENT_MESSAGES_COUNT);

    intermediateMessages = intermediateMessages.map(msg => ({
      ...msg,
      content: this.summarizeCodeBlocks(msg.content)
    }));

    const systemTokens = this.estimateTokens(systemInstruction);
    let totalTokens = this.estimateTokens(firstMessage.content) + systemTokens;
    const finalMessages: Message[] = [];

    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const msg = recentMessages[i];
      const tokens = this.estimateTokens(msg.content);
      if (totalTokens + tokens > this.MAX_HISTORY_TOKENS && finalMessages.length > 0) {
        const allowedChars = (this.MAX_HISTORY_TOKENS - totalTokens) * this.CHARS_PER_TOKEN;
        if (allowedChars > 100) {
           finalMessages.unshift({
             ...msg,
             content: msg.content.substring(0, allowedChars) + '\n...[TRUNCATED DUE TO TOKEN LIMIT]...'
           });
           totalTokens += this.estimateTokens(finalMessages[0].content);
        }
        break;
      }
      finalMessages.unshift(msg);
      totalTokens += tokens;
    }

    for (let i = intermediateMessages.length - 1; i >= 0; i--) {
      if (totalTokens >= this.MAX_HISTORY_TOKENS) break;
      const msg = intermediateMessages[i];
      const tokens = this.estimateTokens(msg.content);
      
      if (totalTokens + tokens <= this.MAX_HISTORY_TOKENS) {
        finalMessages.unshift(msg);
        totalTokens += tokens;
      } else {
        finalMessages.unshift({
          role: msg.role,
          content: `[Message compressed. Original length: ${msg.content.length} chars]`
        });
        totalTokens += 20;
      }
    }

    return [firstMessage, ...finalMessages];
  }
}
