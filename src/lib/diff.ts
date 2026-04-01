export function applyDiff(original: string, diff: string): string {
  const lines = original ? original.split('\n') : [];
  const diffLines = diff.split('\n');
  const out: string[] = [];
  let i = 0;
  let d = 0;

  // Find the first @@ line
  while (d < diffLines.length && !diffLines[d].startsWith('@@')) {
    d++;
  }

  while (d < diffLines.length) {
    const dl = diffLines[d++];
    if (dl.startsWith('@@')) {
      const m = dl.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (m) {
        const origStart = parseInt(m[1], 10) - 1;
        while (i < origStart && i < lines.length) {
          out.push(lines[i++]);
        }
      }
    } else if (dl.startsWith('-')) {
      i++;
    } else if (dl.startsWith('+')) {
      out.push(dl.substring(1));
    } else if (dl.startsWith(' ')) {
      out.push(dl.substring(1));
      i++;
    } else if (dl === '') {
      out.push('');
      i++;
    }
    // Ignore any other lines (like context or comments within the diff block)
  }
  while (i < lines.length) {
    out.push(lines[i++]);
  }
  return out.join('\n');
}
