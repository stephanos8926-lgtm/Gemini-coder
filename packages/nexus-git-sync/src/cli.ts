import { syncRepo, restoreFile } from './index';
import path from 'path';

const token = process.env.GITHUB_TOKEN;
if (!token) {
    console.error('GITHUB_TOKEN environment variable required.');
    process.exit(1);
}

const dir = process.cwd();
const url = 'https://github.com/stephanos8926-lgtm/Gemini-coder';

const [,, command, arg] = process.argv;

if (command === 'restore') {
    if (!arg) {
        console.error('File path required for restore.');
        process.exit(1);
    }
    console.log(`Restoring ${arg}...`);
    restoreFile(dir, url, token, arg).then(() => console.log('Done.')).catch(console.error);
} else {
    console.log('Syncing...');
    syncRepo(dir, url, token).then(() => console.log('Done.')).catch(console.error);
}
