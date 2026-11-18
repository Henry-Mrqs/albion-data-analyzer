// Id de versão do catálogo = SHA-1 (10 hex) dos bytes do arquivo. Usado só pelo vite.config.js (não entra no bundle).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export function catalogVersion(path) {
  try {
    return createHash('sha1').update(readFileSync(path)).digest('hex').slice(0, 10);
  } catch {
    return 'dev';
  }
}
