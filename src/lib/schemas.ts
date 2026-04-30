import { z } from 'zod';

export const FileSaveSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  workspace: z.string().default(''),
});

export const FileCreateSchema = z.object({
  path: z.string().min(1),
  isDir: z.boolean().default(false),
  workspace: z.string().default(''),
});

export const FileDeleteSchema = z.object({
  path: z.string().min(1),
  workspace: z.string().default(''),
});

export const FileRenameSchema = z.object({
  oldPath: z.string().min(1),
  newPath: z.string().min(1),
  workspace: z.string().default(''),
});

export const RunToolSchema = z.object({
  command: z.string().min(1),
  workspace: z.string().default(''),
});

export const FindSymbolSchema = z.object({
  symbol: z.string().min(1),
  file_pattern: z.string().optional(),
  workspace: z.string().default(''),
});

export const DiagnosticsSchema = z.object({
  file_path: z.string().min(1),
  workspace: z.string().default(''),
});

export const GitRequestSchema = z.object({
  command: z.enum(['status', 'init', 'add', 'commit', 'push', 'pull', 'remote-set', 'remote-get', 'diff', 'log']),
  dir: z.string().optional(),
  url: z.string().optional(),
  token: z.string().optional(),
  message: z.string().optional(),
  filepath: z.string().optional(),
  ref: z.string().optional(),
  workspace: z.string().default(''),
});

export const ChatRequestSchema = z.object({
  messages: z.array(z.any()),
  model: z.string().min(1),
  apiKey: z.string().min(1),
  systemInstruction: z.string().optional(),
  temperature: z.number().optional(),
  workspace: z.string().default(''),
  skillName: z.string().optional(),
  skillState: z.any().optional(),
});
