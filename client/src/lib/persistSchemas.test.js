import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PERSISTED, getPersistedSpec } from './persistSchemas';
import { CRAFT_CITIES, REFINING, craftCategories } from './catalog';
import { CITIES, SELL_CITIES } from './market';
import { DEFAULT_MAX_AGE_H } from './exits';
import { SERVERS } from './settings';
import { CURRENT_DEFAULTS } from '../test/savedStates';
import { setFields } from '../test/setFields';

const COMP = join(import.meta.dirname, '..', 'components');
const read = (f) => readFileSync(join(COMP, f), 'utf8');
const enumOf = (key, field) => getPersistedSpec(key).schema[field]?.enum;

describe('contrato: listas permitidas do esquema = as do app', () => {
  it('cidades, tipos de refino, servidores e categorias de craft', () => {
    expect(enumOf('craft:cfg', 'craftCity')).toEqual(CRAFT_CITIES);
    expect(enumOf('rrr:cfg', 'city')).toEqual(CRAFT_CITIES);
    expect(enumOf('craft:cfg', 'matCity')).toEqual(['best', ...CITIES]);
    expect(enumOf('craft:cfg', 'refineCity')).toEqual(['auto', ...CITIES]);
    expect(enumOf('refine:cfg', 'buyCity')).toEqual(['best', ...CITIES]);
    expect(enumOf('refine:cfg', 'refineCity')).toEqual(CITIES);
    expect(enumOf('refine:cfg', 'sellCity')).toEqual(['best', ...SELL_CITIES]);
    expect(getPersistedSpec('flip:cfg').schema.buyCities.allowed).toEqual(CITIES);
    expect(getPersistedSpec('flip:cfg').schema.sellCities.allowed).toEqual(SELL_CITIES);
    expect(enumOf('refine:cfg', 'type')).toEqual(Object.keys(REFINING));
    expect(enumOf('rrr:cfg', 'resource')).toEqual(Object.keys(REFINING));
    expect(enumOf('settings', 'server')).toEqual(Object.keys(SERVERS));
    expect(enumOf('rrr:cfg', 'category')).toEqual(['', ...craftCategories()]);
  });

  it('grupos do Flipper (lidos do texto do arquivo) = os do esquema', () => {
    const src = read('Flipper.jsx');
    const block = src.slice(src.indexOf('const GROUPS = {'), src.indexOf('};', src.indexOf('const GROUPS = {')));
    const groups = [...block.matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1]);
    expect(groups.length).toBeGreaterThan(5);
    expect(getPersistedSpec('flip:cfg').schema.groups.allowed).toEqual(groups);
  });
});

/** Objeto literal do 2º argumento de usePersisted('chave', ...), como valor. */
function literalOf(src, key) {
  const at = src.indexOf(`usePersisted('${key}',`);
  if (at < 0) return undefined;
  let i = src.indexOf(',', at) + 1;
  while (/\s/.test(src[i])) i++;
  const start = i;
  let depth = 0;
  for (; i < src.length; i++) {
    if ('{[('.includes(src[i])) depth++;
    else if ('}])'.includes(src[i])) {
      depth--;
      if (depth < 0) break;
    } else if (src[i] === ')' && depth === 0) break;
    if (depth === 0 && src[i] === ')') break;
  }
  return src.slice(start, i).trim();
}

describe('contrato: todo campo gravado por set({...}) existe no esquema ou nos padrões da chave', () => {
  const FILES = { 'Crafting.jsx': 'craft:cfg', 'Refining.jsx': 'refine:cfg', 'Flipper.jsx': 'flip:cfg', 'RrrCalculator.jsx': 'rrr:cfg', 'TargetPrice.jsx': 'target:cfg', 'Premium.jsx': 'premium:cfg' };
  // componentes que recebem o `set` da tela por props e gravam no cfg dela
  for (const [file, key] of Object.entries(FILES)) {
    it(`${file} → ${key}`, () => {
      const fields = [...setFields(read(file))];
      expect(fields.length).toBeGreaterThan(3);
      const known = new Set([...Object.keys(CURRENT_DEFAULTS[key]), ...Object.keys(getPersistedSpec(key).schema)]);
      const missing = fields.filter((f) => !known.has(f));
      expect(missing, `campos de ${file} sem esquema em persistSchemas.js: ${missing.join(', ')}`).toEqual([]);
    });
  }

  it('o extrator enxerga campos conhecidos (guarda contra regex que não acha nada)', () => {
    const f = setFields(read('Crafting.jsx'));
    for (const x of ['craftCity', 'feeSet', 'refineFeeSet', 'craftDaily', 'craftDailyAt', 'waitCost', 'refineDaily']) expect(f.has(x), x).toBe(true);
  });
});

describe('contrato: toda chave usePersisted do código tem entrada em PERSISTED e padrão igual ao do componente', () => {
  const files = readdirSync(COMP).filter((f) => f.endsWith('.jsx'));
  const used = new Map();
  for (const f of files) for (const m of read(f).matchAll(/usePersisted\('([^']+)'/g)) used.set(m[1], f);

  it('as 9 chaves do plano estão em uso, e PERSISTED também cobre settings', () => {
    expect([...used.keys()].sort()).toEqual(['craft:cfg', 'craft:item', 'flip:cfg', 'market:item', 'market:quality', 'premium:cfg', 'refine:cfg', 'rrr:cfg', 'target:cfg']);
    expect(Object.keys(PERSISTED).sort()).toEqual([...used.keys(), 'settings'].sort());
  });

  it.each([...used.entries()])('%s (%s): padrão em savedStates.js idêntico ao literal do componente', (key, file) => {
    const lit = literalOf(read(file), key);
    const value = new Function('CITIES', 'DEFAULT_MAX_AGE_H', `return (${lit});`)(CITIES, DEFAULT_MAX_AGE_H);
    expect(value).toEqual(CURRENT_DEFAULTS[key]);
  });
});

describe('PERSISTED', () => {
  it('versão 1 em todas as chaves; getPersistedSpec de chave desconhecida não lança (sem esquema)', () => {
    for (const k of Object.keys(PERSISTED)) expect(PERSISTED[k].version).toBe(1);
    expect(getPersistedSpec('nao:existe')).toMatchObject({ version: 1, schema: {} });
  });
});
