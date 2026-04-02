import { z } from 'zod';

export const FileSaveSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  workspace: z.string().optional().default(''),
});

export const FileCreateSchema = z.object({
  path: z.string().min(1),
  isDir: z.boolean().optional().default(false),
  workspace: z.string().optional().default(''),
});
