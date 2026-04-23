import { safeExec } from './safeExec';
import { StackConfig } from './stackDetector';

export function runAutoFix(stack: StackConfig) {
  if (stack.hasNode) {
    safeExec('npx eslint . --fix');
    safeExec('npx prettier --write .');
  }
  if (stack.hasPython) safeExec('black .');
  if (stack.hasGo) safeExec('gofmt -w .');
  if (stack.hasRust) safeExec('cargo fmt');
}
