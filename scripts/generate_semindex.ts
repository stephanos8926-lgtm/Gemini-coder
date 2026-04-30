import fs from 'fs/promises';
import path from 'path';

async function generateSemindex(dir: string, indent: number = 0) {
  const files = await fs.readdir(dir);
  let index = '';
  const padding = ' '.repeat(indent);

  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'local_files') continue;
    const fullPath = path.join(dir, file);
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      index += `${padding}- **${file}/**\n`;
      index += await generateSemindex(fullPath, indent + 2);
    } else if (file.endsWith('.md')) {
      index += `${padding}- [${file}](./${path.relative(process.cwd(), fullPath).replace(/\\/g, '/')})\n`;
    }
  }
  return index;
}

async function run() {
  const index = await generateSemindex(process.cwd());
  const header = '# RapidForge Documentation Index\n\nGenerated automatically via RapidForge CLI.\n\n';
  await fs.writeFile('SEMINDEX.md', header + index);
  console.log('SEMINDEX.md updated.');
}

run();
