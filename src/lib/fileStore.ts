import { applyDiff } from './diff';

export type FileStore = {
  [path: string]: {
    content: string;
    isNew: boolean;
    isModified: boolean;
    isDeleted?: boolean;
    size: number;
    isDir?: boolean;
  };
};

const deleteRegex = /```delete(?:[ \t]+([\w./-]+))?\n([\s\S]*?)```/g;
const renameRegex = /```rename(?:[ \t]+([\w./-]+))?\n([\s\S]*?)```/g;
const fullFileRegex = /```(?:[a-zA-Z0-9-]+\s+)?([\w./-]+)\n([\s\S]*?)```/g;
const diffRegex = /```diff(?:[ \t]+([\w./-]+))?\n([\s\S]*?)```/g;

export function extractFiles(content: string, currentStore: FileStore): FileStore {
  const newStore = { ...currentStore };
  
  // Reset new/modified flags
  for (const path in newStore) {
    newStore[path] = { ...newStore[path], isNew: false, isModified: false };
  }

  // Extract deletes first
  for (const match of content.matchAll(deleteRegex)) {
    let path = match[1] ? match[1].trim() : match[2].trim();
    if (path && newStore[path]) {
      newStore[path] = { ...newStore[path], isDeleted: true };
    }
  }

  // Extract renames
  for (const match of content.matchAll(renameRegex)) {
    let oldPath = match[1] ? match[1].trim() : '';
    let newPath = '';
    
    if (!oldPath) {
      const lines = match[2].trim().split('\n');
      if (lines.length >= 2) {
        oldPath = lines[0].trim();
        newPath = lines[1].trim();
      }
    } else {
      newPath = match[2].trim();
    }

    if (oldPath && newPath && newStore[oldPath]) {
      newStore[newPath] = {
        ...newStore[oldPath],
        isNew: true,
        isModified: false,
        isDeleted: false
      };
      newStore[oldPath] = { ...newStore[oldPath], isDeleted: true };
    }
  }

  // Extract full files
  for (const match of content.matchAll(fullFileRegex)) {
    let path = match[1].trim();
    let fileContent = match[2];

    // Check if the first line is a file path comment (ignore shebangs)
    const firstLineMatch = fileContent.match(/^(?:\/\/\s*|#\s*|<!--\s*)(?:file:\s*)?([a-zA-Z0-9_./-]+\.\w+)(?:\s*-->)?\n/i);
    if (firstLineMatch && !fileContent.startsWith('#!')) {
      path = firstLineMatch[1].trim();
      fileContent = fileContent.substring(firstLineMatch[0].length);
    }

    // List of language tags that might be mistaken for filenames if the AI 
    // omits the actual filename in the code block header.
    const ignoreList = ['diff', 'json', 'html', 'javascript', 'js', 'typescript', 'ts', 'tsx', 'jsx', 'css', 'bash', 'sh', 'shell', 'yaml', 'yml', 'markdown', 'md', 'text', 'txt', 'python', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rust', 'rs', 'php', 'rb', 'ruby', 'sql', 'xml', 'swift', 'kt', 'kotlin', 'scala', 'r', 'matlab', 'dockerfile', 'makefile', 'graphql', 'gql', 'vue', 'svelte'];
    const isNew = !currentStore[path];
    const isModified = !isNew && currentStore[path].content !== fileContent;
    // FIXED: Check file extension, not the entire path
    const ext = path.split('.').pop()?.toLowerCase();
    if (!ext || !ignoreList.includes(ext)) {
      newStore[path] = {
        content: fileContent,
        isNew,
        isModified,
        size: fileContent.length
      };
    }
  }

  // Extract diffs
  // FIXED: Allow optional trailing content or empty match gracefully
  const diffRegex = /```diff(?:[ \t]+([\w./-]+))?\n([\s\S]*?)```/g;
  for (const match of content.matchAll(diffRegex)) {
    let path = match[1] ? match[1].trim() : '';
    const diffContent = match[2];

    // If path is missing from the code block header, try to extract it from the diff content
    if (!path) {
      const pathMatch = diffContent.match(/^---\s+.*?\n\+\+\+\s+([\w./-]+)/m);
      if (pathMatch) {
        path = pathMatch[1].trim();
        if (path.startsWith('b/') || path.startsWith('a/')) {
          path = path.substring(2);
        }
      }
    }

    if (path) {
      const originalContent = newStore[path] ? newStore[path].content : '';
      const updatedContent = applyDiff(originalContent, diffContent);
      newStore[path] = {
        ...(newStore[path] || {}),
        content: updatedContent,
        isNew: !newStore[path],
        isModified: !!newStore[path],
        size: updatedContent.length
      };
    }
  }

  return newStore;
}
