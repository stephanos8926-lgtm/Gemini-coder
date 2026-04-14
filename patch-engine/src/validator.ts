import { safeExec } from './utils/safeExec.js'

export function runValidation(stack: any) {
  if (stack.hasTS) return safeExec('npx tsc --noEmit')
  if (stack.hasPython) return safeExec('python -m py_compile $(git ls-files "*.py")')
  if (stack.hasGo) return safeExec('go build ./...')
  if (stack.hasRust) return safeExec('cargo check')
  if (stack.hasC || stack.hasCpp) return safeExec('make')

  return { success: true }
}
