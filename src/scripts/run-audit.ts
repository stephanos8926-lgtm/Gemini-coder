
import { scanFile } from '../security/scanner';
import path from 'path';

const filesToAudit = [
  'src/App.tsx',
  'src/hooks/useAppChat.ts'
];

async function runAudit() {
  console.log('Running audit...');
  let allIssues = [];
  
  for (const file of filesToAudit) {
    const filePath = path.resolve(process.cwd(), file);
    const issues = scanFile(filePath, true);
    allIssues.push(...issues);
  }
  
  console.log(JSON.stringify(allIssues, null, 2));
}

runAudit();
