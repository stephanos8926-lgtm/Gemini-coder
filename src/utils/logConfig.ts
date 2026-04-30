import { LogTool } from '../../packages/nexus/telemetry/LogTool';

export const logConfig = {
  logDir: '/data/system', 
  telemetryDb: '/data/db/telemetry.db',
};

export const getLogger = (serviceName: string, userId?: string) => {
  return new LogTool(serviceName, userId);
};
