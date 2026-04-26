import { AIFilter, AIContext, AIRuntimeState, AIFilterResponse, AIResponseFilterResult } from '../types';
import { Message } from '../../../lib/gemini';

/**
 * PIIFilter
 * Protects user privacy by redacting common PII patterns (emails, phone numbers, SSNs)
 * before sending to the LLM, and ensuring no PII leaks in responses if accidentally echoed.
 */
export class PIIFilter implements AIFilter {
  name = 'PIIFilter';
  priority = 10;

  // Patterns for redaction
  private patterns = {
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[.\s-]?\d{4}/g,
    creditCard: /\b(?:\d[ -]*?){13,16}\b/g,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    zipcode: /\b\d{5}(?:-\d{4})?\b/g,
  };

  private scrub(text: string): string {
    let scrubbed = text;
    scrubbed = scrubbed.replace(this.patterns.email, '[EMAIL_REDACTED]');
    scrubbed = scrubbed.replace(this.patterns.phone, '[PHONE_REDACTED]');
    scrubbed = scrubbed.replace(this.patterns.creditCard, '[CARD_REDACTED]');
    scrubbed = scrubbed.replace(this.patterns.ssn, '[SSN_REDACTED]');
    scrubbed = scrubbed.replace(this.patterns.zipcode, '[ZIP_REDACTED]');
    return scrubbed;
  }

  async onRequest(messages: Message[], context: AIContext, state: AIRuntimeState): Promise<AIFilterResponse> {
    const scrubbedMessages = messages.map(msg => ({
      ...msg,
      content: this.scrub(msg.content)
    }));

    return { messages: scrubbedMessages, context, state };
  }

  async onResponse(content: string, context: AIContext, state: AIRuntimeState, final: boolean): Promise<AIResponseFilterResult> {
    // We only scrub the response if it's the final complete chunk to avoid breaking mid-word streams
    // or we can scrub every chunk if regex allows. 
    // For now, scrub everything to be safe.
    return { content: this.scrub(content), state, final };
  }
}
