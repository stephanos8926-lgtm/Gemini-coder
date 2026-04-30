import { z } from 'zod';

export enum EHPMessageType {
  COMMAND = 'COMMAND',
  EVENT = 'EVENT',
  TELEMETRY = 'TELEMETRY',
  HEARTBEAT = 'HEARTBEAT',
  ALERT = 'ALERT'
}

export enum PrincipalType {
  USER = 'USER',
  AGENT = 'AGENT',
  SYSTEM = 'SYSTEM',
  ADMIN = 'ADMIN'
}

export const EHPSourceSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(PrincipalType),
  version: z.string().optional()
});

export const EHPContextSchema = z.object({
  requestId: z.string(),
  workspaceId: z.string(),
  sessionId: z.string().optional(),
  operationalContext: z.string().optional()
});

export const EHPAuthSchema = z.object({
  uid: z.string(),
  role: z.string(),
  permissions: z.array(z.string()),
  emailVerified: z.boolean().optional()
});

export const EHPEnvelopeSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(EHPMessageType),
  timestamp: z.number(), // Unix epoch
  priority: z.number().min(0).max(255).default(128),
  source: EHPSourceSchema,
  destination: z.string(),
  topic: z.string(),
  payload: z.any(),
  context: EHPContextSchema,
  auth: EHPAuthSchema,
  signature: z.string().optional()
});

export type EHPEnvelope = z.infer<typeof EHPEnvelopeSchema>;

export interface EHPService {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'degraded' | 'stopped' | 'failed';
  capabilities: string[];
  lastHeartbeat: number;
}
