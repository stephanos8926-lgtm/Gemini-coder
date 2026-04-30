import { callGemini, Message } from './gemini';
import { settingsStore } from './settingsStore';
import { useFileStore } from '../store/useFileStore';

/**
 * @service suggestionService
 * @description Generates contextual AI suggestions for the Quick Action overlay.
 */
export const suggestionService = {
  /**
   * Generates 5 contextual suggestions based on conversation history and current project state.
   */
  async generateSuggestions(messages: Message[], currentFile: string | null): Promise<string[]> {
    const settings = settingsStore.get();
    const { RW_fileStore } = useFileStore.getState();
    
    // Create a context summary
    const contextSummary = currentFile ? `Active File: ${currentFile}\nContent Summary: ${RW_fileStore[currentFile]?.content?.substring(0, 500)}...` : 'No file selected.';
    
    const prompt = `You are a helpful coding assistant. Based on the recent conversation history and the current project context, suggest exactly 5 short (max 10 words each) actionable next steps or questions the user might have. Return them as a simple bulleted list.

CONTEXT:
${contextSummary}

${messages.length > 0 ? "RECENT CONVERSATION:\n" + messages.slice(-3).map(m => `${m.role.toUpperCase()}: ${m.content.substring(0, 100)}`).join('\n') : "This is a new conversation."}

SUGGESTIONS:`;

    try {
      const response = await callGemini(
        [{ role: 'user', content: prompt }],
        settings.defaultModel,
        process.env.GEMINI_API_KEY || '',
        'Suggest 5 actionable next steps.',
        0.7
      );

      if (!response) return this.getDefaultSuggestions();

      const suggestions = response
        .split('\n')
        .map(s => s.replace(/^\s*[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim())
        .filter(s => s.length > 0)
        .slice(0, 5);

      return suggestions.length >= 3 ? suggestions : this.getDefaultSuggestions();
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      return this.getDefaultSuggestions();
    }
  },

  getDefaultSuggestions(): string[] {
    return [
      "Explain this file",
      "Are there any bugs here?",
      "Refactor for better performance",
      "Add unit tests",
      "What should I do next?"
    ];
  }
};
