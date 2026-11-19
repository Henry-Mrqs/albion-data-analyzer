// IDEIA-005 Task 3: auditor do Refino. Cenário A (tábua T4, custo 61,4734, venda Martlock 135 em ordem de venda).
import { beforeEach, describe, expect, it } from 'vitest';
import { loadFixtureCatalog, mkPrices, planksSpec } from '../../test/helpers';
import { assembleRefine, H, NOW } from '../../test/auditKit';
import { auditRefine } from './refine';

beforeEach(loadFixtureCatalog);

// padrão dos testes: venda em Martlock (ordem de venda a 135), como no cenário A do plano
const audit = (opts = {}) => {
  const a = assembleRefine({ ...opts, over: { sellCity: 'Martlock', ...opts.over } });
  return { a, out: auditRefine(a.input) };
};
const get = (out, id) => out.rows.find((r) => r.id === id);
const ids = (out) => out.rows.map((r) => r.id);
const pbSum = (out) => ['rrr-base', 'specialty', 'focus', 'daily'].reduce((s, id) => s + get(out, id).value, 0);

describe('cenário A', () => {
  it('custo 61,4734; o alvo herda o custo por unidade (com despesas); a venda sai de Martlock a 135 em ordem', () => {
    const { a, out } = audit();
    expect(a.cur.unit.cost).toBeCloseTo(61.4734, 4);
    expect(get(out, 'target-inherits').value).toBeCloseTo(61.4734, 4);
    expect(get(out, 'exit')).toMatchObject({ value: 135, origin: 'api', status: 'applied' });
    expect(get(out, 'exit').label).toContain('Martlock');
    expect(get(out, 'net-factor').value).toBeCloseTo(0.935, 6);
  });
  it('despesas de 10 por unidade entram no custo herdado pelo alvo (71,4734) e na linha de despesas', () => {
    const { out } = audit({ over: { extras: [{ name: '', value: '10', scope: 'craft' }] } });
    expect(get(out, 'target-inherits').value).toBeCloseTo(71.4734, 4);
    expect(get(out, 'extras').value).toBeCloseTo(10, 9);
  });
});

describe('cidade de refino: a regra que valeu', () => {
  it('refinando na cidade de bônus (Fort Sterling): "especialização +40 aplicada: refina na cidade de bônus"; RRR 36,7089% (PB 58)', () => {
    const { out } = audit();
    const s = get(out, 'specialty');
    expect(s.value).toBeCloseTo(40, 6);
    expect(s.note).toContain('especialização +40 aplicada: refina na cidade de bônus');
    expect(get(out, 'rrr-final').value).toBeCloseTo(36.7089, 3);
    expect(pbSum(out)).toBeCloseTo(58, 6);
  });
  it('refinando em outra cidade (Martlock): "sem especialização"; RRR 15,2542% (18/118)', () => {
    const { out } = audit({ over: { refineCity: 'Martlock' } });
    const s = get(out, 'specialty');
    expect(s.value).toBeCloseTo(0, 9);
    expect(s.note).toContain('sem especialização');
    expect(s.note).toContain('Fort Sterling');
    expect(get(out, 'rrr-final').value).toBeCloseTo(15.2542, 3);
  });
  it('com foco: 53,9171% (PB 117 = 18 + 40 + 59); componentes somam 117; foco com a fonte "fora do dump"', () => {
    const { a, out } = audit({ over: { focus: true } });
    expect(get(out, 'rrr-final').value).toBeCloseTo(53.9171, 3);
    expect(get(out, 'rrr-final').value).toBe(a.input.rrrValue * 100);
    expect(pbSum(out)).toBeCloseTo(117, 6);
    expect(get(out, 'focus').source).toContain('não está no dump');
  });
  it('a especialização vem do `specialty` da tela, não de refineCity bruto: valor salvo inválido não inventa +40', () => {
    // refineCity inválida (nenhuma cidade): a tela calcula sem especialização; a linha tem que concordar com o RRR usado
    const { out } = audit({ over: { refineCity: 'Atlantis' } });
    expect(get(out, 'specialty').value).toBeCloseTo(0, 9);
    expect(get(out, 'rrr-final').value).toBeCloseTo(15.2542, 3);
  });
  it('RRR manual 30: substitui o automático; a nota diz o automático', () => {
    const { out } = audit({ over: { customRRR: '30' } });
    expect(get(out, 'custom-rrr')).toMatchObject({ origin: 'user' });
    expect(get(out, 'rrr-final').value).toBeCloseTo(30, 6);
    expect(get(out, 'custom-rrr').note).toContain('Substitui');
  });
});

describe('bônus diário do Refino', () => {
  it('diário 20: valor 20 PB, categoria não confirmada (DAILY_NOTE), e a nota diz que o Refino não confere a data', () => {
    const { out } = audit({ over: { daily: 20 } });
    const d = get(out, 'daily');
    expect(d.value).toBeCloseTo(20, 6);
    expect(d.note).toContain('ainda não foi confirmada em fonte oficial');
    expect(d.note).toContain('não confere a data');
    expect(d.note).toContain('+10/+20');
    expect(d.note).toContain('journal');
  });
  it('diário inválido (15): usado 0 com nota "corrigido de 15 para 0"', () => {
    const { out } = audit({ over: { daily: 15 } });
    expect(get(out, 'daily').value).toBeCloseTo(0, 9);
    expect(get(out, 'daily').note).toContain('corrigido de 15 para 0');
  });
});

describe('taxa, rota, compra, saída', () => {
  it('taxa 400 sem feeSet: "padrão do app" e "unconfirmed"; com feeSet ou 500: "digitado"', () => {
    expect(get(audit().out, 'bench-fee')).toMatchObject({ origin: 'app-default', status: 'unconfirmed', value: 400 });
    expect(get(audit({ over: { feeSet: true } }).out, 'bench-fee')).toMatchObject({ origin: 'user', status: 'applied' });
    expect(get(audit({ over: { feePer100: 500 } }).out, 'bench-fee')).toMatchObject({ origin: 'user', value: 500 });
  });
  it('rota: "melhor" padrão do app quando salva; "produzir tudo" digitado', () => {
    expect(get(audit({ over: { route: 'all' } }).out, 'route').value).toContain('produzir tudo');
    const r = get(audit({ over: { route: 'best' } }).out, 'route');
    expect(r.value).toContain('melhor');
    expect(r.origin).toBe('user');
  });
  it('compra: cidade "mais barata" é padrão do app; ordens de compra somam 2,5%', () => {
    expect(get(audit().out, 'buy-city')).toMatchObject({ origin: 'app-default' });
    expect(get(audit({ over: { useOrders: true } }).out, 'use-orders').note).toContain('2,5%');
  });
  it('venda instantânea (ordem de compra): 0,96 e taxa de criação não cobrada; Mercado Negro vende na hora', () => {
    const { out } = audit({ over: { sellMode: 'instant', sellCity: 'best' } });
    expect(get(out, 'net-factor').value).toBeCloseTo(0.96, 6);
    expect(get(out, 'setup-fee').note).toContain('não cobrada (venda instantânea');
    expect(get(out, 'exit').label).toContain('Mercado Negro');
  });
  it('sem imposto: líquido 1,0, imposto 0 e taxa de criação "não cobrada (venda sem imposto)"', () => {
    const { out } = audit({ over: { noTax: { 'Refino|order': true } } });
    expect(get(out, 'net-factor').value).toBeCloseTo(1, 9);
    expect(get(out, 'sales-tax').value).toBe(0);
    expect(get(out, 'setup-fee').note).toContain('não cobrada (venda sem imposto)');
    expect(get(out, 'no-tax').value).toContain('sim');
  });
  it('sem Premium: imposto 8% e 0,895', () => {
    const { out } = audit({ premium: false });
    expect(get(out, 'sales-tax').value).toBeCloseTo(8, 9);
    expect(get(out, 'net-factor').value).toBeCloseTo(0.895, 6);
  });
  it('quantidade do lote e item', () => {
    const { out } = audit({ over: { qty: 250 } });
    expect(get(out, 'qty').value).toBe(250);
    expect(get(out, 'item').value).toContain('T4');
  });
  it('preço de material velho (30 h): "stale"; saída com 30 h: "stale"', () => {
    const old = mkPrices(planksSpec({
      T4_WOOD: { 'Fort Sterling': { s: 30, sd: NOW - 30 * H } },
      T4_PLANKS: { Martlock: { s: 135, sd: NOW - 30 * H }, 'Fort Sterling': { s: 120, sd: NOW - 30 * H } },
    }));
    const { out } = audit({ prices: old });
    expect(get(out, 'exit').status).toBe('stale');
    expect(out.rows.some((r) => r.id.startsWith('price-') && r.status === 'stale')).toBe(true);
  });
  it('sem preço de venda: a saída é "NÃO considerada"', () => {
    const { out } = audit({ prices: mkPrices(planksSpec({ T4_PLANKS: null })) });
    expect(get(out, 'exit').status).toBe('not-considered');
  });
});

describe('NÃO consideradas do Refino', () => {
  const NC = ['factionRecipe', 'transportBuy', 'relists', 'quality', 'journal', 'stock', 'drift', 'stoneBatch'].map((x) => `nc-${x}`);
  it.each([['cfg padrão', {}], ['sem preços', { prices: null }], ['tudo digitado', { over: { focus: true, daily: 10, customRRR: '30', buyCity: 'Martlock' } }]])('%s', (_n, opts) => {
    const { out } = audit(opts);
    for (const id of NC) expect(get(out, id), id).toMatchObject({ status: 'not-considered' });
    expect(get(out, 'nc-factionRecipe').note).toContain('IDEIA-068');
  });
});

describe('seções Preço-alvo e Estresse', () => {
  it('venda sem imposto no alvo é "NÃO considerada"; com a marca ligada a nota diz "Você marcou"', () => {
    expect(get(audit().out, 'target-notax')).toMatchObject({ status: 'not-considered', section: 'Preço-alvo' });
    expect(get(audit({ over: { noTax: { 'Refino|order': true } } }).out, 'target-notax').note).toContain('Você marcou');
  });
  it('estresse: passos e margem fina do app; RRR/taxa/despesas/cidade fixos', () => {
    const { out } = audit();
    expect(get(out, 'stress-steps').value).toBe('±5% a ±20%');
    expect(get(out, 'stress-fixed').status).toBe('not-considered');
  });
});

describe('estado antigo e corrompido', () => {
  it('estado antigo (sem feeSet, sem extras/noTax, com `deep`): monta sem lançar', () => {
    const cfg = { type: 'PLANKS', tier: 4, ench: 0, buyCity: 'best', refineCity: 'Fort Sterling', sellCity: 'best', focus: false, daily: 0, feePer100: 400, customRRR: '', useOrders: false, deep: true, sellMode: 'order', qty: 100 };
    const { out } = audit({ cfg });
    expect(out.rows.filter((r) => r.value === 'não foi possível ler')).toEqual([]);
    expect(get(out, 'route').value).toContain('produzir tudo');
  });
  it('corrompido (lixo): não lança e a linha mostra o valor realmente usado', () => {
    const { a, out } = audit({ over: { feePer100: {}, qty: null, daily: 'x', extras: 'lixo', noTax: 5, customRRR: { x: 1 }, focusEff: {}, focusBudget: [] } });
    expect(get(out, 'bench-fee').value).toBe(400);
    expect(get(out, 'qty').value).toBe(1);
    expect(get(out, 'rrr-final').value).toBe(a.input.rrrValue * 100);
    expect(JSON.stringify(out.rows)).not.toContain('[object');
  });
  it('entrada ilegível: nunca lança', () => {
    for (const input of [undefined, null, {}, { cfg: 1, cur: 'x' }]) {
      let out;
      expect(() => { out = auditRefine(input); }).not.toThrow();
      expect(out.rows.some((r) => r.value === 'não foi possível ler')).toBe(true);
    }
  });
  it('toda linha tem origem e estado; ids únicos', () => {
    const { out } = audit({ over: { focus: true, daily: 10, extras: [{ name: 'a', value: '5', scope: 'lote' }] } });
    for (const r of out.rows) expect(r.origin && r.status, r.id).toBeTruthy();
    expect(new Set(ids(out)).size).toBe(ids(out).length);
  });
});
