import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

console.log('--- Starting Robust Cleanup ---');

try {
  // 1. Run npm clean (removes dist)
  console.log('Running "npm run clean"...');
  execSync('npm run clean', { stdio: 'inherit' });

  // 2. Identify folders to clean
  const dirsToClean = ['.turbo', '.next', 'logs'];
  
  for (const dir of dirsToClean) {
    if (fs.existsSync(dir)) {
      console.log(`Removing directory: ${dir}`);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  // 3. Remove .log files recursively
  function removeLogs(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        if (file !== 'node_modules') {
          removeLogs(fullPath);
        }
      } else if (file.endsWith('.log')) {
        console.log(`Removing log file: ${fullPath}`);
        fs.unlinkSync(fullPath);
      }
    }
  }
  removeLogs('.');

  console.log('Cleanup completed successfully.');
} catch (error) {
  console.error('Error during cleanup:', error);
  process.exit(1);
}
