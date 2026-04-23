import fs from 'fs/promises';
import path from 'path';

const SRC_DIR = './src';
const OLD_IMPORT = '../utils/ForgeGuard';
const NEW_IMPORT = '../../packages/nexus/guard/ForgeGuard';

async function migrateImports(dir: string) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    if (file.isDirectory()) {
      await migrateImports(filePath);
    } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
      let content = await fs.readFile(filePath, 'utf-8');
      if (content.includes(OLD_IMPORT)) {
        console.log(`Migrating ${filePath}`);
        content = content.replace(new RegExp(OLD_IMPORT.replace(/\//g, '\\/'), 'g'), NEW_IMPORT);
        await fs.writeFile(filePath, content);
      }
    }
  }
}

migrateImports(SRC_DIR).catch(console.error);
