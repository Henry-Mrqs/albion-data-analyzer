// IDEIA-005 Task 1: registro de telas e montagem do quadro.
import { describe, expect, it } from 'vitest';
import { auditScreen, registerScreen, uncoveredFields } from './registry';
import { row } from './core';

let n = 0;
const uid = () => `tela-${++n}`;
const okVar = (over = {}) => ({
  id: 'v', label: 'V', fields: [], kind: 'info-only', affects: 'none',
  build: () => row({ id: 'v', label: 'V', value: 1, unit: '', origin: 'user', status: 'info-only' }),
  ...over,
});
const def = (vars) => ({ cfgKeys: [], ignoredFields: {}, vars });

describe('registerScreen: validação', () => {
  it('tela duplicada LANÇA', () => {
    const id = uid();
    registerScreen(id, def([okVar()]));
    expect(() => registerScreen(id, def([okVar()]))).toThrow(/duplicad/);
  });
  it('var sem fields (array), kind inválido, affects inválido, sem build ou "applied" com campo e sem probe LANÇA', () => {
    expect(() => registerScreen(uid(), def([okVar({ fields: undefined })]))).toThrow(/fields/);
    expect(() => registerScreen(uid(), def([okVar({ fields: 'x' })]))).toThrow(/fields/);
    expect(() => registerScreen(uid(), def([okVar({ kind: 'talvez' })]))).toThrow(/kind/);
    expect(() => registerScreen(uid(), def([okVar({ kind: 'applied', affects: 'cost', fields: ['a'] })]))).toThrow(/probe/);
    expect(() => registerScreen(uid(), def([okVar({ affects: 'nada' })]))).toThrow(/affects/);
    expect(() => registerScreen(uid(), def([okVar({ build: undefined })]))).toThrow(/build/);
  });
  it('"applied" sem campo (preço da API, saída, servidor) não exige probe; com probe vale', () => {
    expect(() => registerScreen(uid(), def([okVar({ kind: 'applied', affects: 'cost', fields: [] })]))).not.toThrow();
    expect(() => registerScreen(uid(), def([okVar({ kind: 'applied', affects: 'cost', fields: ['a'], probe: { cfg: { a: 1 } } })]))).not.toThrow();
  });
  it('ids de var repetidos na mesma tela LANÇAM', () => {
    expect(() => registerScreen(uid(), def([okVar(), okVar()]))).toThrow(/id/);
  });
  it('ignoredFields exige motivo não vazio', () => {
    expect(() => registerScreen(uid(), { cfgKeys: [], ignoredFields: { campo: '' }, vars: [okVar()] })).toThrow(/motivo/);
  });
});

describe('auditScreen', () => {
  it('devolve as linhas na ordem declarada e counts exatos', () => {
    const id = uid();
    const mk = (vid, status) => okVar({ id: vid, build: () => row({ id: vid, label: vid, value: 1, unit: '', origin: 'user', status }) });
    registerScreen(id, def([mk('a', 'applied'), mk('b', 'stale'), mk('c', 'not-considered'), mk('d', 'unconfirmed'), mk('e', 'applied'), mk('f', 'info-only')]));
    const out = auditScreen(id, {});
    expect(out.rows.map((r) => r.id)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(out.counts).toEqual({ applied: 2, unconfirmed: 1, stale: 1, notConsidered: 1, infoOnly: 1 });
  });
  it('build pode devolver várias linhas, nenhuma (null/[]) e a seção da var vai para a linha', () => {
    const id = uid();
    const r = (x) => row({ id: x, label: x, value: 1, unit: '', origin: 'user', status: 'applied' });
    registerScreen(id, def([
      okVar({ id: 'm', section: 'Sec', build: () => [r('m1'), r('m2')] }),
      okVar({ id: 'n', build: () => null }),
      okVar({ id: 'o', build: () => [] }),
    ]));
    const out = auditScreen(id, {});
    expect(out.rows.map((x) => x.id)).toEqual(['m1', 'm2']);
    expect(out.rows[0].section).toBe('Sec');
  });
  it('build que lança vira linha "não foi possível ler" e NUNCA propaga; as outras linhas continuam', () => {
    const id = uid();
    registerScreen(id, def([
      okVar({ id: 'a', label: 'Boa' }),
      okVar({ id: 'b', label: 'Quebrada', build: () => { throw new Error('boom'); } }),
      okVar({ id: 'c', label: 'Boa 2', build: () => row({ id: 'c', label: 'Boa 2', value: 2, unit: '', origin: 'user', status: 'applied' }) }),
    ]));
    let out;
    expect(() => { out = auditScreen(id, {}); }).not.toThrow();
    expect(out.rows).toHaveLength(3);
    expect(out.rows[1]).toMatchObject({ id: 'b', label: 'Quebrada' });
    expect(out.rows[1].value).toMatch(/não foi possível ler/);
    expect(JSON.stringify(out.rows[1])).not.toContain('boom'); // sem eco do erro cru
  });
  it('build que devolve linha inválida (sem origem) também vira "não foi possível ler"', () => {
    const id = uid();
    registerScreen(id, def([okVar({ id: 'x', build: () => ({ id: 'x', label: 'X', value: 1, status: 'applied' }) })]));
    expect(auditScreen(id, {}).rows[0].value).toMatch(/não foi possível ler/);
  });
  it('ctx nulo/indefinido também não derruba o quadro', () => {
    const id = uid();
    registerScreen(id, def([okVar({ build: (ctx) => row({ id: 'v', label: 'V', value: ctx.cfg.x, unit: '', origin: 'user', status: 'applied' }) })]));
    expect(() => auditScreen(id, undefined)).not.toThrow();
    expect(auditScreen(id, null).rows[0].value).toMatch(/não foi possível ler/);
  });
  it('tela não registrada LANÇA (erro de programação, não de dado)', () => {
    expect(() => auditScreen('nao-existe', {})).toThrow(/não registrada/);
  });
});

describe('affects "balance" (IDEIA-086)', () => {
  it("'balance' é aceito e 'saldo' continua inválido", () => {
    expect(() => registerScreen(uid(), def([okVar({ affects: 'balance' })]))).not.toThrow();
    expect(() => registerScreen(uid(), def([okVar({ affects: 'saldo' })]))).toThrow(/affects/);
  });
});

describe('uncoveredFields', () => {
  it('lista campo sem var e sem ignoredFields, nomeando tela, chave e campo', () => {
    const d = { cfgKeys: ['k:cfg'], ignoredFields: { velho: 'legado' }, vars: [okVar({ fields: ['a', 'b'] })] };
    const out = uncoveredFields('minha', d, { 'k:cfg': ['a', 'b', 'c', 'velho'] });
    expect(out).toEqual([{ screen: 'minha', cfgKey: 'k:cfg', field: 'c' }]);
  });
});
