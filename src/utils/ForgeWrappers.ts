const isBrowser = typeof window !== 'undefined';

// We can't use require() easily in Vite/Vitest ESM environments.
// Instead, we'll use a simple proxy or just import both and conditionally use them.
// But importing server modules in browser crashes.
// Let's use Vite's import.meta.env.SSR if available, or fallback to isBrowser.

import { LogTool as ClientLogTool, ForgeGuard as ClientForgeGuard } from './ClientForgeWrappers';

let LogTool: any;
let ForgeGuard: any;

if (isBrowser) {
  LogTool = ClientLogTool;
  ForgeGuard = ClientForgeGuard;
} else {
  // For Node.js environment, we can use dynamic import or require.
  // In Vitest (jsdom), isBrowser is true, so it uses Client wrappers.
  // In actual Node.js server, isBrowser is false.
  try {
    // @ts-ignore
    const serverWrappers = require('../utils/LogTool');
    // @ts-ignore
    const serverGuard = require('../../packages/nexus/guard/ForgeGuard');
    LogTool = serverWrappers.LogTool;
    ForgeGuard = serverGuard.ForgeGuard;
  } catch (e) {
    // Fallback if require fails
    LogTool = ClientLogTool;
    ForgeGuard = ClientForgeGuard;
  }
}

export { LogTool, ForgeGuard };
