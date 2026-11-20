import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { catalogUrl, validateCatalog, fetchCatalog } from './catalogLoad';
import { loadCatalog, resetCatalog } from './catalog';

const ok = (d) => ({ ok: true, status: 200, json: async () => d });
const GOOD = JSON.parse(readFileSync(new URL('../../public/data/catalog.json', import.meta.url)));
const semCityOf = () => {
  const { cityOf, ...old } = GOOD; // eslint-disable-line no-unused-vars
  return old;
};

describe('catalogUrl', () => {
  it('com id', () => expect(catalogUrl('/', 'a1b2c3d4e5')).toBe('/data/catalog.json?v=a1b2c3d4e5'));
  it('sem id (Vitest/Node, sem define): sem query', () => {
    expect(catalogUrl('/', undefined)).toBe('/data/catalog.json');
    expect(catalogUrl('/', '')).toBe('/data/catalog.json');
  });
  it('base com subcaminho', () => expect(catalogUrl('/app/', 'x')).toBe('/app/data/catalog.json?v=x'));
  it('cache-bust: & se há id, ? se não há', () => {
    expect(catalogUrl('/', 'x', 123)).toBe('/data/catalog.json?v=x&r=123');
    expect(catalogUrl('/', undefined, 123)).toBe('/data/catalog.json?r=123');
  });
  it('codifica caracteres especiais', () => expect(catalogUrl('/', 'a b&c')).toBe('/data/catalog.json?v=a%20b%26c'));
});

describe('validateCatalog', () => {
  it('o catálogo real passa', () => expect(validateCatalog(GOOD)).toEqual({ ok: true, problems: [] }));
  it('catálogo antigo (sem cityOf) é inválido e diz o motivo', () => {
    const r = validateCatalog(semCityOf());
    expect(r.ok).toBe(false);
    expect(r.problems.join(' ')).toMatch(/cityOf/);
  });
  it('cityOf vazio, items vazio ou ausente, extra/vals/encNames ausentes', () => {
    for (const d of [{ ...GOOD, cityOf: {} }, { ...GOOD, items: [] }, { ...GOOD, items: undefined }, { ...GOOD, vals: undefined }, { ...GOOD, extra: null }, { ...GOOD, encNames: [] }])
      expect(validateCatalog(d).ok).toBe(false);
  });
  it('entradas absurdas: null, string, array', () => {
    for (const d of [null, undefined, 'x', [], 42]) expect(validateCatalog(d).ok).toBe(false);
  });
  it('schema: ausente vale 1; maior que o mínimo passa; menor falha', () => {
    expect(validateCatalog({ ...GOOD, schema: 1 }).ok).toBe(true);
    expect(validateCatalog({ ...GOOD, schema: 7 }).ok).toBe(true);
    expect(validateCatalog({ ...GOOD, schema: 0 }).ok).toBe(false);
    expect(validateCatalog({ ...GOOD, schema: 'x' }).ok).toBe(false);
  });
});

describe('validateCatalog: itens e alt (DT-007, IDEIA-049)', () => {
  const comItens = (items) => ({ ...GOOD, items });
  const base = GOOD.items.slice(0, 3);
  const arc = GOOD.items.find((i) => i.i === 'T4_2H_ARCANESTAFF_HELL');
  it('item null, sem i ou com i não string: inválido, apontando o índice', () => {
    for (const bad of [null, {}, { i: 5 }, 'x']) {
      const r = validateCatalog(comItens([...base, bad]));
      expect(r.ok).toBe(false);
      expect(r.problems.join(' ')).toMatch(/items\[3\]/);
    }
  });
  it('alt malformado: at não inteiro, v não lista, v[0] sem id', () => {
    for (const alt of [{ at: 'x', v: [['A', 1, 1]] }, { at: 1.5, v: [['A', 1, 1]] }, { at: 2, v: 'x' }, { at: 2, v: [[]] }, { at: 2, v: [[7, 1]] }, { at: 2, v: [] }, 5, { at: -1, v: [['A', 1]] }]) {
      const r = validateCatalog(comItens([...base, { ...arc, alt }]));
      expect(r.ok).toBe(false);
      expect(r.problems.join(' ')).toMatch(/alt/);
    }
  });
  it('alt.at fora da receita (>= r.length) é inválido, com mensagem clara apontando o item', () => {
    const n = arc.r.length;
    for (const at of [n, n + 1, 99]) {
      const r = validateCatalog(comItens([...base, { ...arc, alt: { at, v: arc.alt.v } }]));
      expect(r.ok).toBe(false);
      expect(r.problems.join(' ')).toMatch(/alt\.at fora da receita.*items\[3\]/);
    }
    expect(validateCatalog(comItens([...base, { ...arc, alt: { at: n - 1, v: arc.alt.v } }])).ok).toBe(true);
  });
  it('alt ausente é válido (catálogo antigo e novo); alt bom é válido', () => {
    const { alt, ...semAlt } = arc; // eslint-disable-line no-unused-vars
    expect(validateCatalog(comItens([...base, semAlt])).ok).toBe(true);
    expect(validateCatalog(comItens([...base, arc])).ok).toBe(true);
  });
});

describe('fetchCatalog', () => {
  it('DT-007: corpo que não é JSON (HTML de erro, resposta cortada) dá a mensagem clara, não o erro cru de JSON.parse', async () => {
    for (const texto of ['<!doctype html><html>', '{"items":[{"i":"T4_']) {
      const f = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => JSON.parse(texto) });
      await expect(fetchCatalog({ fetchFn: f, base: '/' })).rejects.toThrow(/A resposta do catálogo não é um JSON válido.*Recarregue a página \(Ctrl\+F5\)/s);
    }
  });
  it('catálogo bom: 1 requisição, URL versionada', async () => {
    const f = vi.fn().mockResolvedValue(ok(GOOD));
    const d = await fetchCatalog({ fetchFn: f, base: '/', id: 'abc' });
    expect(d).toBe(GOOD);
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][0]).toBe('/data/catalog.json?v=abc');
  });
  it('sem id (teste): URL sem query', async () => {
    const f = vi.fn().mockResolvedValue(ok(GOOD));
    await fetchCatalog({ fetchFn: f, base: '/' });
    expect(f.mock.calls[0][0]).toBe('/data/catalog.json');
  });
  it('primeiro velho, segundo bom: 2 requisições; a 2ª com cache:"reload" e r=', async () => {
    const f = vi.fn().mockResolvedValueOnce(ok(semCityOf())).mockResolvedValueOnce(ok(GOOD));
    expect(await fetchCatalog({ fetchFn: f, base: '/', id: 'abc', now: () => 777 })).toBe(GOOD);
    expect(f).toHaveBeenCalledTimes(2);
    expect(f.mock.calls[1][0]).toBe('/data/catalog.json?v=abc&r=777');
    expect(f.mock.calls[1][1]).toMatchObject({ cache: 'reload' });
  });
  it('os dois velhos: erro claro, no máximo 2 requisições', async () => {
    const f = vi.fn().mockResolvedValue(ok(semCityOf()));
    await expect(fetchCatalog({ fetchFn: f, base: '/', id: 'abc' })).rejects.toThrow(/desatualizado.*cityOf.*Ctrl\+F5/s);
    expect(f).toHaveBeenCalledTimes(2);
  });
  it('HTTP 500: erro de hoje, sem nova tentativa', async () => {
    const f = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(fetchCatalog({ fetchFn: f, base: '/' })).rejects.toThrow('Catálogo indisponível (HTTP 500)');
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('JSON quebrado: erro, não objeto vazio', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => { throw new SyntaxError('x'); } });
    await expect(fetchCatalog({ fetchFn: f, base: '/' })).rejects.toThrow();
  });
});

describe('DT-006: versionamento do catálogo em produção', () => {
  it('vercel.json serve /data/ com revalidação sempre (max-age=0, must-revalidate)', () => {
    const h = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url))).headers.find((x) => x.source.startsWith('/data/'));
    expect(h.headers.find((k) => k.key === 'Cache-Control').value).toBe('public, max-age=0, must-revalidate');
  });
  it('loadCatalog pede a URL com ?v= quando há id de build', async () => {
    vi.stubEnv('VITE_CATALOG_V', 'abc123');
    const f = vi.fn().mockResolvedValue(ok(GOOD));
    vi.stubGlobal('fetch', f);
    resetCatalog();
    await loadCatalog();
    expect(f.mock.calls[0][0]).toMatch(/data\/catalog\.json\?v=abc123$/);
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    resetCatalog();
  });
});

describe('validateCatalog: confere ef (IDEIA-072)', () => {
  const withEf = (ef) => ({ ...GOOD, items: [...GOOD.items, { i: 'T4_TESTE_EF', ef }] });
  it('o ef real de T4_OFF_TOWERSHIELD_UNDEAD é válido; item sem ef continua válido', () => {
    const real = GOOD.items.find((x) => x.i === 'T4_OFF_TOWERSHIELD_UNDEAD');
    expect(real.ef).toEqual({ 1: 750, 2: 1313, 3: 2298, 4: 4021 });
    expect(validateCatalog(GOOD).ok).toBe(true);
    expect(validateCatalog({ ...GOOD, items: [...GOOD.items, { i: 'T4_SEM_EF' }] }).ok).toBe(true);
  });
  it.each([[[750]], [{ 1: -5 }], [{ 1: 'x' }], [{ 9: 100 }], [{ 1: 0 }], [null], [7]])('ef %j vira um problema com o id do item', (ef) => {
    const r = validateCatalog(withEf(ef));
    expect(r.ok).toBe(false);
    expect(r.problems).toHaveLength(1);
    expect(r.problems[0]).toContain('T4_TESTE_EF');
    expect(r.problems[0]).toContain('ef inválido (esperado {1..4: número > 0})');
  });
});
