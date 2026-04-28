import { Message } from '../lib/gemini';

export interface ContextBlock {
  id: string;
  content: string;
  priority: number; // 0 (lowest) to 100 (highest)
  type: 'system' | 'file' | 'message' | 'instruction' | 'metadata';
}

export interface PruningStats {
  originalTokens: number;
  prunedTokens: number;
  efficiency: number;
  warnings: string[];
}

/**
 * ContextPruner
 * Intelligent utility to optimize the context window by prioritizing content
 * based on relevance, distance, and critical system importance.
 * 
 * Follows the RW_ Enterprise naming convention for global pruning strategy.
 */
export class ContextPruner {
  private static readonly RW_PR_CHARS_PER_TOKEN = 4; // Conservative estimate

  /**
   * estimateTokens
   * Uses a fast character-based estimation. 
   * In a production environment, this would use tiktoken or a similar library.
   */
  public static estimateTokens(text: string): number {
    return Math.ceil(text.length / this.RW_PR_CHARS_PER_TOKEN);
  }

  /**
   * prune
   * Orchestrates the pruning process given a set of blocks and a hard token limit.
   */
  public static prune(
    blocks: ContextBlock[],
    maxTokens: number
  ): { content: string; stats: PruningStats } {
    let currentTokens = 0;
    const warnings: string[] = [];
    
    // 1. Separate mandatory from optional
    // Priority >= 90 is considered mandatory (System instructions, latest user query)
    const sortedBlocks = [...blocks].sort((a, b) => b.priority - a.priority);
    
    const acceptedBlocks: ContextBlock[] = [];
    
    for (const block of sortedBlocks) {
      const blockTokens = this.estimateTokens(block.content);
      
      if (currentTokens + blockTokens <= maxTokens) {
        acceptedBlocks.push(block);
        currentTokens += blockTokens;
      } else if (block.priority >= 95) {
        // Force inclusion of critical blocks but truncate if necessary
        const remainingSpace = maxTokens - currentTokens;
        if (remainingSpace > 500) { // Only worth it if there's reasonable space
          const truncatedContent = block.content.substring(0, remainingSpace * this.RW_PR_CHARS_PER_TOKEN);
          acceptedBlocks.push({ ...block, content: truncatedContent + '\n[...TRUNCATED DUE TO CONTEXT LIMIT...]' });
          currentTokens += remainingSpace;
          warnings.push(`Block ${block.id} was truncated to fit mandatory space.`);
        } else {
          warnings.push(`Block ${block.id} (Mandatory) could not be included.`);
        }
      } else {
        // Skip optional blocks that don't fit
      }
    }

    // Re-sort accepted blocks for logical prompt flow (System -> Context -> Messages)
    const typeOrder = { system: 0, metadata: 1, instruction: 2, file: 3, message: 4 };
    acceptedBlocks.sort((a, b) => (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99));

    const finalContent = acceptedBlocks.map(b => b.content).join('\n\n');
    const originalTokens = blocks.reduce((acc, b) => acc + this.estimateTokens(b.content), 0);

    return {
      content: finalContent,
      stats: {
        originalTokens,
        prunedTokens: currentTokens,
        efficiency: originalTokens > 0 ? (originalTokens - currentTokens) / originalTokens : 0,
        warnings
      }
    };
  }

  /**
   * prioritizeMessages
   * Groups chat history into blocks with fading priority.
   */
  public static createMessageBlocks(messages: Message[]): ContextBlock[] {
    return messages.map((m, idx) => {
      // Recent messages get higher priority
      // The very last message (user query) gets highest priority
      const distance = messages.length - 1 - idx;
      let priority = 80 - (distance * 5); // Decay priority by distance
      if (idx === messages.length - 1) priority = 100; // Current query is mandatory
      
      return {
        id: `msg-${idx}`,
        content: `[${m.role.toUpperCase()}]: ${m.content}`,
        priority: Math.max(priority, 10),
        type: 'message' as const
      };
    });
  }
}
