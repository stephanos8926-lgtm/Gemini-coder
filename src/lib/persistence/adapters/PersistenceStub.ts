export class FilePersistenceAdapter {
  constructor() {}
  async get() { return null; }
  async set() {}
  async delete() {}
  async clear() {}
}

export const Parser = {
  init: async () => {},
  parse: () => ({})
};
export const Language = {
  load: async () => ({})
};
export const vol = {
  fromJSON: () => ({}),
  readdirSync: () => [],
  readFileSync: () => '',
  writeFileSync: () => {}
};

export default { Parser, Language, vol };

export class WasmTerminalEngine {
  async run() { return null; }
}
