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
