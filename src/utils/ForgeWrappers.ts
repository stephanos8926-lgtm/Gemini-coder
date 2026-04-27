// src/utils/ForgeWrappers.ts
import * as ClientWrappers from './ClientForgeWrappers';

/**
 * environment detection
 */
const isBrowser = typeof window !== 'undefined';

// Vite-friendly SSR detection. 
const getIsSSR = () => {
  if (typeof window === 'undefined') return true; // Standard Node.js detection
  try {
    // @ts-ignore
    return import.meta.env.SSR;
  } catch (e) {
    return false;
  }
};

let LogToolValue: any = ClientWrappers.LogTool;
let ForgeGuardValue: any = ClientWrappers.ForgeGuard;

// If we are strictly not in the browser, we try to load the heavy server-side versions.
if (getIsSSR()) {
  try {
    // Using eval('require') to completely bypass Vite's static analysis
    const req = eval('require');
    const logPath = './LogTool';
    const guardPath = '../../packages/nexus/guard/ForgeGuard';
    
    const serverLogTool = req(logPath).LogTool;
    const serverForgeGuard = req(guardPath).ForgeGuard;
    
    if (serverLogTool) LogToolValue = serverLogTool;
    if (serverForgeGuard) ForgeGuardValue = serverForgeGuard;
  } catch (e) {
    // Fallback handled by initial values
  }
}

export const LogTool = LogToolValue;
export const ForgeGuard = ForgeGuardValue;
