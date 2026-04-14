import { safeExec } from './utils/safeExec.js';
import { detectStack } from './detectStack.js';
import { runAutoFix } from './autoFix.js';
import { runBuild } from './buildRunner.js';
import fs from 'fs';

export function attemptSelfHeal(errorLogPath: string) {
  console.log(`[PatchEngine] Attempting self-heal for error log: ${errorLogPath}`);
  
  if (!fs.existsSync(errorLogPath)) {
    console.error('[PatchEngine] Error log not found.');
    return false;
  }

  const errorData = JSON.parse(fs.readFileSync(errorLogPath, 'utf-8'));
  console.log(`[PatchEngine] Analyzing error from ${errorData.source || 'unknown source'}...`);

  const stack = detectStack();

  // Step 1: Run AutoFix (Linters/Formatters)
  console.log('[PatchEngine] Running AutoFix...');
  runAutoFix(stack);

  // Step 2: Verify Build
  console.log('[PatchEngine] Verifying build...');
  const buildResult = runBuild(stack);

  if (buildResult.success) {
    console.log('[PatchEngine] Self-heal successful! Build passes.');
    return true;
  } else {
    console.error('[PatchEngine] Self-heal failed. Build still broken.');
    return false;
  }
}

// Allow running directly via CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const logPath = process.argv[2];
  if (logPath) {
    attemptSelfHeal(logPath);
  } else {
    console.error('Usage: node heal.js <path-to-error-log.json>');
  }
}
