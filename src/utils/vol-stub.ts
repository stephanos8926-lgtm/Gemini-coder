export class VolStub {
  private files: Record<string, string> = {};

  fromJSON(data: Record<string, string>) {
    Object.assign(this.files, data);
  }

  readdirSync(dir: string): string[] {
    const res = new Set<string>();
    const prefix = dir.endsWith('/') ? dir : dir + '/';
    for (const p of Object.keys(this.files)) {
      if (p.startsWith(prefix) && p !== prefix) {
        const rest = p.substring(prefix.length);
        const nextSlash = rest.indexOf('/');
        if (nextSlash === -1) {
          res.add(rest);
        } else {
          res.add(rest.substring(0, nextSlash));
        }
      }
    }
    return Array.from(res);
  }

  readFileSync(path: string, encoding?: string): string {
    if (!(path in this.files)) throw new Error(`ENOENT: ${path}`);
    return this.files[path];
  }

  writeFileSync(path: string, content: string) {
    this.files[path] = content;
  }
}

export const vol = new VolStub();
