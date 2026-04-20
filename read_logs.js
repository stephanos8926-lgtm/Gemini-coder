import fs from 'fs';
import path from 'path';

const logDir = path.join(process.cwd(), 'logs', 'system');
const errorLog = path.join(logDir, 'error.log');

if (!fs.existsSync(errorLog)) {
  console.log('[LogReader] No error logs found.');
} else {
  const data = fs.readFileSync(errorLog, 'utf8');
  const lines = data.split('\n');
  const errorMap = new Map();

  lines.forEach(line => {
    if (line.includes('"level":"error"')) {
      const match = line.match(/"message":"([^"]+)"/);
      if (match) {
        const msg = match[1];
        errorMap.set(msg, (errorMap.get(msg) || 0) + 1);
      }
    }
  });

  console.log('[LogReader] Detected Recurring Error Frequencies:');
  for (const [msg, count] of errorMap.entries()) {
    if (count > 1) console.log(`${count}x: ${msg}`);
  }
}
