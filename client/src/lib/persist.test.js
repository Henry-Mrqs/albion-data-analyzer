import { describe, expect, it } from 'vitest';
import { loadPersisted, mergeSaved, serializePersisted } from './persist';

const D = { a: 1, b: 'x', flag: false, sub: { id: 'T6_MAIN_SWORD', ench: 0 }, map: {}, list: ['w'] };
const SCHEMA = {
  a: 'numText',
  b: 'str',
  flag: 'bool',
  map: { map: { enum: ['buy', 'all', 'best'] } },
  list: { list: 'str', allowed: ['w', 'a'] },
  sub: { fields: { id: 'str', ench: 'num' } },
};

const deepFreeze = (o) => {
  if (o && typeof o === 'object') {
    Object.freeze(o);
    Object.values(o).forEach(deepFreeze);
  }
  return o;
};

describe('mergeSaved', () => {
  it('campo ausente ganha o padrão; presente e válido mantém o salvo SEM coerção', () => {
    expect(mergeSaved({ a: '500' }, D).value).toMatchObject({ a: '500', b: 'x', flag: false });
    expect(mergeSaved({}, D).value).toEqual(D);
  });

  it('estado completo e atual passa idêntico (bit a bit)', () => {
    const s = { ...D, a: 7, b: 'y', flag: true, sub: { id: 'T4_BAG', ench: 2 }, map: { K: 'buy' }, list: [] };
    expect(mergeSaved(s, D, SCHEMA).value).toEqual(s);
    expect(loadPersisted(serializePersisted(s, 1), { defaults: D, schema: SCHEMA }).value).toEqual(s);
  });

  it('tipo errado volta ao padrão SÓ daquele campo', () => {
    expect(mergeSaved({ a: null, b: 5, flag: 'false', list: 'w', map: [], sub: 3 }, D, SCHEMA).value).toEqual(D);
    const r = mergeSaved({ a: null, b: 'ok' }, D, SCHEMA);
    expect(r.value.b).toBe('ok');
    expect(r.value.a).toBe(1);
    expect(r.issues.some((i) => i.field === 'a' && i.code === 'bad-type')).toBe(true);
  });

  it('mescla profunda só onde o padrão tem chaves: { id } vira { id, ench: 0 }; mapa aberto vale inteiro', () => {
    expect(mergeSaved({ sub: { id: 'T4_BAG' } }, D).value.sub).toEqual({ id: 'T4_BAG', ench: 0 });
    expect(mergeSaved({ map: { M: 'all' } }, D).value.map).toEqual({ M: 'all' });
  });

  it('mapa com esquema: entrada inválida some, o mapa continua', () => {
    expect(mergeSaved({ map: { A: 'buy', B: 'zz', C: 3, D: 'all' } }, D, SCHEMA).value.map).toEqual({ A: 'buy', D: 'all' });
  });

  it('extras desconhecidos preservados, menos __proto__/constructor/prototype', () => {
    const r = mergeSaved(JSON.parse('{"feeSet":true,"craftDailyAt":1,"__proto__":{"x":1},"constructor":{"y":1},"prototype":2}'), D);
    expect(r.value.feeSet).toBe(true);
    expect(r.value.craftDailyAt).toBe(1);
    expect(Object.prototype.hasOwnProperty.call(r.value, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(r.value, 'constructor')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(r.value, 'prototype')).toBe(false);
    expect({}.x).toBeUndefined();
    expect(r.issues.filter((i) => i.code === 'dropped-unknown-proto')).toHaveLength(3);
  });

  it('campo conhecido pelo esquema mas sem padrão: inválido é removido, válido fica', () => {
    const sch = { ...SCHEMA, at: 'num', variant: 'recipeVariant' };
    expect(mergeSaved({ at: 'abc', variant: '1.5' }, D, sch).value).not.toHaveProperty('at');
    expect(mergeSaved({ at: 5, variant: '2' }, D, sch).value).toMatchObject({ at: 5, variant: '2' });
    expect(mergeSaved({ variant: 'auto' }, D, sch).value.variant).toBe('auto');
    for (const bad of ['1.5', -1, 'x', true, null]) expect(mergeSaved({ variant: bad }, D, sch).value).not.toHaveProperty('variant');
    for (const ok of ['auto', '0', 1, '2']) expect(mergeSaved({ variant: ok }, D, sch).value.variant).toBe(ok);
  });

  it('lista salva vazia continua vazia; elemento de tipo errado ou fora do conjunto sai', () => {
    expect(mergeSaved({ list: [] }, D).value.list).toEqual([]);
    expect(mergeSaved({ list: ['w', 3, 'zz'] }, D, { list: { list: 'str', allowed: ['w', 'a'] } }).value.list).toEqual(['w']);
  });

  it('numText aceita número e texto, rejeita null, booleano, lista e objeto; num é estrito', () => {
    for (const ok of [5, '500', '', 'abc']) expect(mergeSaved({ a: ok }, D, SCHEMA).value.a).toBe(ok);
    for (const bad of [null, true, [], {}]) expect(mergeSaved({ a: bad }, D, SCHEMA).value.a).toBe(1);
    expect(mergeSaved({ sub: { id: 'X', ench: '2' } }, D, SCHEMA).value.sub.ench).toBe(0);
  });

  it('enum numérico e boolOrNull e passthrough', () => {
    const sch = { n: { enum: [4, 5] }, sp: 'boolOrNull', ceil: 'passthrough' };
    const d = { n: 4, sp: null, ceil: 1000 };
    expect(mergeSaved({ n: 99, sp: 'x', ceil: 'abc' }, d, sch).value).toEqual({ n: 4, sp: null, ceil: 'abc' });
    expect(mergeSaved({ n: 5, sp: true, ceil: null }, d, sch).value).toEqual({ n: 5, sp: true, ceil: null });
  });

  it('não muta as entradas (congeladas) e é idempotente', () => {
    const saved = deepFreeze({ a: '5', sub: { id: 'T4_BAG' }, map: { K: 'buy', Z: 'no' }, list: ['w', 9], extra: { q: 1 } });
    const defs = deepFreeze(JSON.parse(JSON.stringify(D)));
    const once = mergeSaved(saved, defs, SCHEMA).value;
    expect(mergeSaved(once, defs, SCHEMA).value).toEqual(once);
    // o resultado não compartilha objetos com os padrões
    once.sub.id = 'mudou';
    once.list.push('a');
    expect(defs.sub.id).toBe('T6_MAIN_SWORD');
    expect(defs.list).toEqual(['w']);
  });

  it('saved que não é objeto: padrão inteiro e issue not-object', () => {
    for (const s of [null, [], 'x', 3]) {
      const r = mergeSaved(s, D);
      expect(r.value).toEqual(D);
      expect(r.issues[0].code).toBe('not-object');
    }
  });
});

describe('loadPersisted', () => {
  it.each([null, '', 'null', 'abc{', '"texto"', '42', '[]', 'true'])('raw %j com padrão objeto: padrão inteiro, sem exceção', (raw) => {
    expect(loadPersisted(raw, { defaults: D }).value).toEqual(D);
  });

  it('JSON inválido gera issue invalid-json; valor não-objeto gera not-object; ausente não gera issue', () => {
    expect(loadPersisted('abc{', { defaults: D }).issues[0].code).toBe('invalid-json');
    expect(loadPersisted('42', { defaults: D }).issues[0].code).toBe('not-object');
    expect(loadPersisted(null, { defaults: D }).issues).toEqual([]);
  });

  const mig = { 1: (o) => { const { old, ...rest } = o; return old === undefined ? rest : { ...rest, a: old }; } };

  it('sem _v = versão 0: migrações em ordem, depois a mescla; devolve o valor SEM _v', () => {
    const r = loadPersisted('{"old":5,"b":"z"}', { defaults: D, version: 1, migrations: mig });
    expect(r.fromVersion).toBe(0);
    expect(r.value).toEqual({ ...D, a: 5, b: 'z' });
    expect(r.value).not.toHaveProperty('_v');
    expect(r.value).not.toHaveProperty('old');
  });

  it('migrações encadeiam em ordem (0→1→2)', () => {
    const order = [];
    const m = { 1: (o) => { order.push(1); return { ...o, a: 10 }; }, 2: (o) => { order.push(2); return { ...o, a: o.a + 1 }; } };
    const r = loadPersisted('{}', { defaults: D, version: 2, migrations: m });
    expect(order).toEqual([1, 2]);
    expect(r.value.a).toBe(11);
    order.length = 0;
    expect(loadPersisted('{"_v":1,"a":5}', { defaults: D, version: 2, migrations: m }).value.a).toBe(6);
    expect(order).toEqual([2]); // só as migrações acima da versão salva
  });

  it('com _v atual não migra e remove _v', () => {
    const r = loadPersisted('{"old":5,"_v":1}', { defaults: D, version: 1, migrations: mig });
    expect(r.fromVersion).toBe(1);
    expect(r.value.a).toBe(1);
    expect(r.value.old).toBe(5);
    expect(r.value).not.toHaveProperty('_v');
  });

  it('_v inválido = 0; _v maior que o atual não migra e preserva os campos', () => {
    for (const v of ['"x"', '-1', '1.5', 'null']) expect(loadPersisted(`{"old":5,"_v":${v}}`, { defaults: D, migrations: mig }).fromVersion).toBe(0);
    const r = loadPersisted('{"old":5,"_v":7,"novo":true}', { defaults: D, migrations: mig });
    expect(r.fromVersion).toBe(7);
    expect(r.value).toMatchObject({ old: 5, novo: true, a: 1 });
    expect(r.value).not.toHaveProperty('_v');
  });

  it('migração que lança: padrão da chave + issue migration-failed, sem propagar', () => {
    const r = loadPersisted('{"a":3}', { defaults: D, migrations: { 1: () => { throw new Error('boom'); } } });
    expect(r.value).toEqual(D);
    expect(r.issues.map((i) => i.code)).toContain('migration-failed');
  });

  it('migração retornando algo que não é objeto também cai no padrão', () => {
    const r = loadPersisted('{"a":3}', { defaults: D, migrations: { 1: () => 7 } });
    expect(r.value).toEqual(D);
    expect(r.issues.map((i) => i.code)).toContain('migration-failed');
  });

  it('primitivo (market:quality): 2 → 2; "x" → padrão 1; null → padrão', () => {
    const o = { defaults: 1 };
    expect(loadPersisted('2', o).value).toBe(2);
    expect(loadPersisted('"x"', o).value).toBe(1);
    expect(loadPersisted('null', o).value).toBe(1);
    expect(loadPersisted(null, o).value).toBe(1);
    expect(loadPersisted('{', o).value).toBe(1);
    expect(loadPersisted('{"a":1}', o).value).toBe(1);
    const q = { defaults: 1, schema: { $self: { enum: [1, 2, 3, 4, 5] } } };
    expect(loadPersisted('9', q).value).toBe(1);
    expect(loadPersisted('5', q).value).toBe(5);
  });

  it('notes: a função do spec recebe o objeto salvo ANTES de migrar e a versão', () => {
    const notes = (o, v) => (o.old !== undefined && v === 0 ? [{ id: 'x', message: 'm' }] : []);
    expect(loadPersisted('{"old":1}', { defaults: D, migrations: mig, notes }).notes).toEqual([{ id: 'x', message: 'm' }]);
    expect(loadPersisted('{"a":1}', { defaults: D, notes }).notes).toEqual([]);
    expect(loadPersisted('abc', { defaults: D, notes }).notes).toEqual([]);
  });
});

describe('serializePersisted', () => {
  it('objeto ganha _v; primitivo sai puro', () => {
    expect(JSON.parse(serializePersisted({ a: 1 }, 1))).toEqual({ a: 1, _v: 1 });
    expect(serializePersisted(2, 1)).toBe('2');
  });
  it('não muta o objeto recebido', () => {
    const o = Object.freeze({ a: 1 });
    expect(() => serializePersisted(o, 1)).not.toThrow();
  });
});

describe('propriedade: estados que a UI atual produz carregam como identidade', () => {
  // PRNG determinístico (mulberry32)
  const rng = (seed) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  it('500 estados sorteados (padrão + remendos válidos)', () => {
    const r = rng(42);
    const pick = (xs) => xs[Math.floor(r() * xs.length)];
    for (let i = 0; i < 500; i++) {
      const s = { ...D };
      if (r() < 0.5) s.a = pick([0, 5, 250, '500', '', '12']);
      if (r() < 0.5) s.b = pick(['y', '', 'texto']);
      if (r() < 0.5) s.flag = r() < 0.5;
      if (r() < 0.5) s.sub = { id: pick(['T4_BAG', 'T8_MAIN_SWORD']), ench: pick([0, 1, 2, 3, 4]) };
      if (r() < 0.5) s.map = { PLANKS: pick(['buy', 'all', 'best']), LEATHER: pick(['buy', 'all', 'best']) };
      if (r() < 0.5) s.list = pick([[], ['w'], ['a'], ['w', 'a']]);
      if (r() < 0.3) s.feeSet = true;
      expect(loadPersisted(serializePersisted(s, 1), { defaults: D, schema: SCHEMA }).value).toEqual(s);
    }
  });
});
