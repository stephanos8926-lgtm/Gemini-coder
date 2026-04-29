import { scanFile } from '../src/security/scanner';
import fs from 'fs/promises';
import path from 'path';

async function walkDir(dir: string): Promise<string[]> {
    const files = await fs.readdir(dir, { withFileTypes: true });
    const paths = await Promise.all(files.map(async file => {
        const res = path.resolve(dir, file.name);
        return file.isDirectory() ? walkDir(res) : res;
    }));
    return paths.reduce((a: string[], b: string | string[]) => a.concat(b), []);
}

async function audit() {
    console.log('Starting codebase audit...');
    const srcFiles = await walkDir('./src');
    const tsFiles = srcFiles.filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
    
    let allIssues = [];
    for (const file of tsFiles) {
        console.log(`[PROGRESS] Scanning: ${file} ...`);
        try {
            const issues = scanFile(file, true);
            allIssues.push(...issues);
        } catch (e) {
            console.error(`[ERROR] Failed to scan ${file}:`, e);
        }
    }

    console.log('\n--- AUDIT RESULTS ---\n');
    if (allIssues.length === 0) {
        console.log('No issues found!');
    } else {
        allIssues.forEach(issue => {
            console.log(`[${issue.severity.toUpperCase()}] ${issue.file}:${issue.line}`);
            console.log(`  Message: ${issue.message}`);
            console.log(`  Type: ${issue.type}`);
            console.log(`  Snippet: ${issue.snippet.substring(0, 50).replace(/\n/g, ' ')}...`);
            console.log('---');
        });
    }
}

audit().catch(console.error);
