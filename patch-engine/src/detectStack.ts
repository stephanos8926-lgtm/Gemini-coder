import fs from 'fs'

export function detectStack() {
  const files = fs.readdirSync('.')

  const has = (name: string) => files.includes(name)

  return {
    hasNode: has('package.json'),
    hasTS: has('tsconfig.json'),
    hasPython: files.some(f => f.endsWith('.py')),
    hasGo: has('go.mod'),
    hasRust: has('Cargo.toml'),
    hasC: files.some(f => f.endsWith('.c')),
    hasCpp: files.some(f => f.endsWith('.cpp')),
    hasShell: files.some(f => f.endsWith('.sh')),
    hasMake: has('Makefile'),
    hasCMake: has('CMakeLists.txt')
  }
}
