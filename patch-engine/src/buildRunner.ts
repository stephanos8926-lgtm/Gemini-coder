import { safeExec } from './utils/safeExec.js'

export function runBuild(stack: any) {
  if (stack.hasNode) return safeExec('npm run build')
  if (stack.hasPython) return safeExec('pytest')
  if (stack.hasGo) return safeExec('go build ./...')
  if (stack.hasRust) return safeExec('cargo build')
  if (stack.hasMake) return safeExec('make')

  return { success: true }
}
