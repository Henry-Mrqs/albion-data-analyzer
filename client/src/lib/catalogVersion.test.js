import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogVersion } from './catalogVersion';

const dir = mkdtempSync(join(tmpdir(), 'catver-'));
const mk = (name, content) => {
  const p = join(dir, name);
  writeFileSync(p, content);
  return p;
};
const CAMINHO = fileURLToPath(new URL('../../public/data/catalog.json', import.meta.url));

describe('catalogVersion', () => {
  it('mesmo conteúdo, mesmo id; 10 hex', () => {
    const a = catalogVersion(mk('a.json', '{"x":1}'));
    const b = catalogVersion(mk('b.json', '{"x":1}'));
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{10}$/);
  });
  it('1 byte diferente, id diferente', () => {
    expect(catalogVersion(mk('c.json', '{"x":1}'))).not.toBe(catalogVersion(mk('d.json', '{"x":2}')));
  });
  it('arquivo ausente: "dev"', () => expect(catalogVersion('/nao/existe.json')).toBe('dev'));
  it('o catálogo real do repositório tem id estável entre duas leituras', () => {
    expect(catalogVersion(CAMINHO)).toBe(catalogVersion(CAMINHO));
    expect(catalogVersion(CAMINHO)).toMatch(/^[0-9a-f]{10}$/);
  });
});
