import { safeExec } from './utils/safeExec.js'

export function runAutoFix(stack: any) {
  if (stack.hasNode) safeExec('npx eslint . --fix')
  if (stack.hasNode) safeExec('npx prettier --write .')
  if (stack.hasPython) safeExec('black .')
  if (stack.hasGo) safeExec('gofmt -w .')
  if (stack.hasRust) safeExec('cargo fmt')
}
