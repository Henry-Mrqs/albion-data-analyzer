// IDEIA-005 Task 3: auditor da aba RRR.
import { beforeEach, describe, expect, it } from 'vitest';
import { loadFixtureCatalog } from '../../test/helpers';
import { assembleRrr } from '../../test/auditKit';
import { auditRrr } from './rrr';

beforeEach(loadFixtureCatalog);

const audit = (opts) => {
  const a = assembleRrr(opts);
  return { a, out: auditRrr(a.input) };
};
const get = (out, id) => out.rows.find((r) => r.id === id);
const pbSum = (out) => ['rrr-base', 'specialty', 'focus', 'daily'].reduce((s, id) => s + get(out, id).value, 0);

describe('linhas da aba RRR', () => {
  it('craft em Lymhurst, espada: especialização +15 (24,8120%, PB 33); o RRR final é o res.rrr da tela', () => {
    const { a, out } = audit();
    expect(get(out, 'rrr-final').value).toBeCloseTo(24.812, 3);
    expect(get(out, 'rrr-final').value).toBe(a.res.rrr * 100);
    expect(pbSum(out)).toBeCloseTo(33, 6);
    expect(get(out, 'kind').value).toContain('Craft');
    expect(get(out, 'city').value).toBe('Lymhurst');
  });
  it('foco + diário 20: 52,8302% (PB 112); o diário traz a DAILY_NOTE e o termo +10/+20', () => {
    const { out } = audit({ over: { focus: true, daily: 20 } });
    expect(get(out, 'rrr-final').value).toBeCloseTo(52.8302, 3);
    expect(pbSum(out)).toBeCloseTo(112, 6);
    expect(get(out, 'daily').note).toContain('ainda não foi confirmada em fonte oficial');
    expect(get(out, 'daily').note).toContain('+10/+20');
    expect(get(out, 'focus').source).toContain('não está no dump');
  });
  it('refino em Fort Sterling com tábua: +40 (36,7089%); em outra cidade: sem especialização (15,2542%)', () => {
    const on = audit({ over: { kind: 'refine', city: 'Fort Sterling', resource: 'PLANKS' } }).out;
    expect(get(on, 'rrr-final').value).toBeCloseTo(36.7089, 3);
    expect(get(on, 'specialty').value).toBeCloseTo(40, 6);
    expect(get(on, 'resource').value).toContain('Tábua');
    const off = audit({ over: { kind: 'refine', city: 'Martlock', resource: 'PLANKS' } }).out;
    expect(get(off, 'rrr-final').value).toBeCloseTo(15.2542, 3);
    expect(get(off, 'specialty').value).toBeCloseTo(0, 9);
  });
  it('a categoria do item vem do dump (origem "jogo") quando bate com o item; diferente do item: "digitado" com aviso', () => {
    const same = get(audit().out, 'category');
    expect(same.origin).toBe('game');
    expect(same.source).toContain('item.cc');
    const diff = get(audit({ over: { category: 'axe' } }).out, 'category');
    expect(diff.origin).toBe('user');
    expect(diff.note).toContain('diferente');
  });
  it('nº de crafts e item', () => {
    const { out } = audit({ over: { crafts: 50 } });
    expect(get(out, 'crafts').value).toBe(50);
    expect(get(out, 'item').value).toBeTruthy();
  });
  it('a aba não considera taxa, preços nem imposto (informativa)', () => {
    const r = get(audit().out, 'out-of-scope');
    expect(r.status).toBe('info-only');
    expect(r.note).toMatch(/taxa.*preços.*imposto/);
  });
  it('diário inválido salvo (15): usado 0, com nota de correção', () => {
    const { out } = audit({ over: { daily: 15 } });
    expect(get(out, 'daily').value).toBeCloseTo(0, 9);
    expect(get(out, 'daily').note).toContain('corrigido de 15 para 0');
  });
});

describe('estado antigo e corrompido', () => {
  it('categoria de loja salva por versão antiga (weapons/sword): cai em espada, como a tela', () => {
    const { a, out } = audit({ over: { category: 'weapons/sword' } });
    expect(a.input.category).toBe('sword');
    expect(get(out, 'category').value).toBeTruthy();
  });
  it('corrompido: crafts lixo, diário lixo, item lixo: não lança', () => {
    const { out } = audit({ over: { crafts: {}, daily: [], item: { id: 'NAO_EXISTE', ench: 0 } } });
    expect(out.rows.length).toBeGreaterThan(5);
    expect(JSON.stringify(out.rows)).not.toContain('[object');
  });
  it('entrada ilegível: nunca lança', () => {
    for (const input of [undefined, null, {}, { cfg: 5, res: 'x' }]) {
      let out;
      expect(() => { out = auditRrr(input); }).not.toThrow();
      expect(out.rows.some((r) => r.value === 'não foi possível ler')).toBe(true);
    }
  });
});
