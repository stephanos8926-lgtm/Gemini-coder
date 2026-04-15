import { filesystemService } from './filesystemService';

export const buildService = {
  startProcess: async (command: string, id: string) => {
    return await fetch('/api/build/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, id }),
    }).then(res => res.json());
  },
  stopProcess: async (id: string) => {
    return await fetch('/api/build/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).then(res => res.json());
  },
};
