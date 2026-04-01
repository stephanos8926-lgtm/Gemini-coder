import { diff_match_patch } from 'diff-match-patch';

const dmp = new diff_match_patch();

export function applyDiff(original: string, diff: string): string {
  try {
    // Try to parse the diff as a patch
    const patches = dmp.patch_fromText(diff);
    if (patches.length > 0) {
      const [patchedText, results] = dmp.patch_apply(patches, original);
      // Check if all patches were applied successfully
      if (results.every(r => r === true)) {
        return patchedText;
      }
    }
  } catch (e) {
    console.error('Failed to apply diff with diff-match-patch:', e);
  }

  // Fallback to basic unified diff application if dmp fails or if it's a standard unified diff
  const lines = original ? original.split('\n') : [];
  const diffLines = diff.split('\n');
  const out: string[] = [];
  let i = 0;
  let d = 0;

  // Find the first @@ line
  while (d < diffLines.length && !diffLines[d].startsWith('@@')) {
    d++;
  }

  if (d >= diffLines.length) {
    // If no @@ lines found, it might be a full replacement or invalid diff
    // If it's a full replacement, it wouldn't have been called here usually, 
    // but let's be safe.
    return original;
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
  }
  while (i < lines.length) {
    out.push(lines[i++]);
  }
  return out.join('\n');
}
