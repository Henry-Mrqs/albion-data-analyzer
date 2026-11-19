import { describe, expect, it } from 'vitest';
import { albionKeys, clearAlbionKeys, APP_PREFIX } from './resetState';

const fake = (init, hooks = {}) => {
  const m = new Map(Object.entries(init));
  return {
    get length() { if (hooks.length) throw new Error('bloqueado'); return m.size; },
    key: (i) => { if (hooks.key) throw new Error('bloqueado'); return [...m.keys()][i] ?? null; },
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => { if (hooks.failOn?.includes(k)) throw new Error('falhou'); m.delete(k); },
    _m: m,
  };
};

describe('resetState (IDEIA-071)', () => {
  it('prefixo do app', () => expect(APP_PREFIX).toBe('albion:'));

  it('albionKeys: só o prefixo exato "albion:" (sensível a maiúsculas)', () =>
    expect(albionKeys(fake({ 'albion:craft:cfg': '1', 'albion:settings': '2', 'ALBION:x': '3', 'albionx:y': '4', albion: '5', outra: '6', 'vercel-toolbar': '7' })).sort()).toEqual(['albion:craft:cfg', 'albion:settings']));

  it('clearAlbionKeys remove TODAS as chaves do app mesmo adjacentes (índices deslocam ao remover) e nada mais', () => {
    const s = fake({ a: '1', 'albion:1': 'x', 'albion:2': 'x', 'albion:3': 'x', b: '2', 'albion:notice:craft-refine-city': '1' });
    const r = clearAlbionKeys(s);
    expect(r.removed.sort()).toEqual(['albion:1', 'albion:2', 'albion:3', 'albion:notice:craft-refine-city']);
    expect([...s._m.keys()]).toEqual(['a', 'b']);
    expect(r.failed).toEqual([]);
  });

  it('storage vazio: removed [] e nenhuma exceção', () => expect(clearAlbionKeys(fake({}))).toEqual({ removed: [], failed: [] }));

  it('removeItem que lança numa chave: as outras são removidas e a falha é listada', () => {
    const s = fake({ 'albion:1': 'x', 'albion:2': 'x', 'albion:3': 'x' }, { failOn: ['albion:2'] });
    const r = clearAlbionKeys(s);
    expect(r.removed.sort()).toEqual(['albion:1', 'albion:3']);
    expect(r.failed).toEqual(['albion:2']);
    expect([...s._m.keys()]).toEqual(['albion:2']);
  });

  it('storage que lança em length/key (modo privado): { removed: [], failed: [] } sem propagar; storage null/undefined idem', () => {
    expect(clearAlbionKeys(fake({ 'albion:1': 'x' }, { length: true }))).toEqual({ removed: [], failed: [] });
    expect(clearAlbionKeys(fake({ 'albion:1': 'x' }, { key: true }))).toEqual({ removed: [], failed: [] });
    expect(albionKeys(fake({ 'albion:1': 'x' }, { length: true }))).toEqual([]);
    expect(clearAlbionKeys(null)).toEqual({ removed: [], failed: [] });
    expect(clearAlbionKeys(undefined)).toEqual({ removed: [], failed: [] });
    expect(albionKeys(null)).toEqual([]);
  });

  it('não toca em chave de outro app: "albion:" só como prefixo', () => {
    const s = fake({ 'x:albion:y': '1', 'albion:ok': '2', 'meu-albion:': '3' });
    clearAlbionKeys(s);
    expect([...s._m.keys()].sort()).toEqual(['meu-albion:', 'x:albion:y']);
  });
});
