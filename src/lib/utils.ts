import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeJsonParse(jsonString: string, context?: string): any {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error(`Error parsing JSON${context ? ` in ${context}` : ''}:`, error);
    return null;
  }
}
