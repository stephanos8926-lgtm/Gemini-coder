import { commitAndPush } from './packages/nexus-git-sync/src/index.js';
import process from 'process';
import path from 'path';

async function run() {
    const dir = process.cwd();
    const url = 'https://github.com/stephanos8926-lgtm/Gemini-coder';
    const token = process.env.GITHUB_TOKEN;
    console.log('TOKEN exists:', !!token);
    if (!token) {
        console.error('GITHUB_TOKEN not found');
        process.exit(1);
    }
    await commitAndPush(dir, url, token, 'Automated commit by Forge AI agent');
    console.log('Push complete');
}

run().catch(console.error);
