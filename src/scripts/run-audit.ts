
import { scanFile } from '../security/scanner';
import path from 'path';

async function runAudit() {
  const filePath = process.argv[2];
  if (!filePath) return;

  const absolutePath = path.resolve(process.cwd(), filePath);
  
  // Quick check for supported files
  if (!absolutePath.endsWith('.ts') && !absolutePath.endsWith('.tsx')) return;

  const issues = scanFile(absolutePath, true);
  
  if (issues.length > 0 && process.send) {
    process.send(issues);
  }
}

runAudit();
