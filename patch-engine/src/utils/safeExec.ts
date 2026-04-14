import { execSync } from 'child_process'

export function safeExec(cmd: string) {
  try {
    const output = execSync(cmd, { stdio: 'pipe', shell: '/bin/bash' })
    return { success: true, output: output.toString() }
  } catch (err: any) {
    return {
      success: false,
      error: err.stderr?.toString() || err.message
    }
  }
}
