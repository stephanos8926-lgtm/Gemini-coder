import { syncRepo } from './index';
import path from 'path';

const token = process.env.GITHUB_TOKEN;
if (!token) {
    console.error('GITHUB_TOKEN environment variable required.');
    process.exit(1);
}

const dir = process.cwd();
const url = 'https://github.com/stephanos8926-lgtm/Gemini-coder';

console.log('Syncing...');
syncRepo(dir, url, token).then(() => console.log('Done.')).catch(console.error);
