import fs from 'fs';

export interface StackConfig {
  hasNode: boolean;
  hasTS: boolean;
  hasPython: boolean;
  hasGo: boolean;
  hasRust: boolean;
  hasC: boolean;
  hasCpp: boolean;
  hasShell: boolean;
  hasMake: boolean;
  hasCMake: boolean;
}

export function detectStack(): StackConfig {
  const files = fs.readdirSync('.');

  const has = (name: string) => files.includes(name);

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
  };
}
