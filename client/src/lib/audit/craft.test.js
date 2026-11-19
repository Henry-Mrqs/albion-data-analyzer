// IDEIA-005 Task 2: auditor do Craft. Números do dossiê §5 (RRR 24,8120/47,9167/52,8302%, taxa 172,8, k 0,935/0,895/0,96/1,0).
import { beforeEach, describe, expect, it } from 'vitest';
import { loadFixtureCatalog, mkPrices } from '../../test/helpers';
import { assembleCraft, H, NOW } from '../../test/auditKit';
import { stationFee } from '../econ';
import { auditCraft } from './craft';

beforeEach(loadFixtureCatalog);

const audit = (opts) => {
  const a = assembleCraft(opts);
  return { a, out: auditCraft(a.input) };
};
const get = (out, id) => out.rows.find((r) => r.id === id);
const ids = (out) => out.rows.map((r) => r.id);
const pbSum = (out) => ['rrr-base', 'specialty', 'focus', 'daily'].reduce((s, id) => s + get(out, id).value, 0);
const swordPrices = (sword, extra = {}) =>
  mkPrices({
    T4_METALBAR: { 'Fort Sterling': { s: 200, b: 180, sd: NOW - 3 * H, bd: NOW - 3 * H } },
    T4_LEATHER: { 'Fort Sterling': { s: 150, b: 130, sd: NOW - 3 * H, bd: NOW - 3 * H } },
    T4_MAIN_SWORD: sword,
    ...extra,
  });

describe('RRR (AUDITORIA-001 §1)', () => {
  it('bônus de cidade, sem foco: 24,8120%; a linha "RRR final" é o valor de c.rates.craftRRR e os componentes somam PB 33', () => {
    const { a, out } = audit();
    const f = get(out, 'rrr-final');
    expect(f.value).toBeCloseTo(24.812, 3);
    expect(f.value).toBe(a.c.rates.craftRRR * 100);
    expect(pbSum(out)).toBeCloseTo(33, 6);
    expect(get(out, 'rrr-base').value).toBeCloseTo(18, 6);
    expect(get(out, 'specialty').value).toBeCloseTo(15, 6);
  });
  it('com foco: 47,9167% (PB 92)', () => {
    const { out } = audit({ over: { focus: true } });
    expect(get(out, 'rrr-final').value).toBeCloseTo(47.9167, 3);
    expect(pbSum(out)).toBeCloseTo(92, 6);
    expect(get(out, 'focus').value).toBeCloseTo(59, 6);
    expect(get(out, 'focus').source).toContain('não está no dump');
  });
  it('com foco e diário 20 informado depois do reset: 52,8302% (PB 112); as linhas de componentes somam 112', () => {
    const { a, out } = audit({ over: { focus: true, craftDaily: 20, craftDailyAt: NOW - H } });
    expect(get(out, 'rrr-final').value).toBeCloseTo(52.8302, 3);
    expect(get(out, 'rrr-final').value).toBe(a.c.rates.craftRRR * 100);
    expect(pbSum(out)).toBeCloseTo(112, 6);
    expect(get(out, 'daily')).toMatchObject({ status: 'applied', origin: 'user' });
    expect(get(out, 'daily').value).toBeCloseTo(20, 6);
  });
  it('RRR manual: a linha mostra o valor digitado e a nota diz que substitui o automático', () => {
    const { a, out } = audit({ over: { customRRR: '30' } });
    expect(get(out, 'custom-rrr')).toMatchObject({ origin: 'user', status: 'applied' });
    expect(get(out, 'rrr-final').value).toBeCloseTo(30, 6);
    expect(get(out, 'rrr-final').value).toBe(a.c.rates.craftRRR * 100);
    expect(get(out, 'custom-rrr').note).toContain('Substitui');
  });
  it('sem cidade de bônus (especialização desmarcada): componente de especialização 0 e RRR 18/118', () => {
    const { out } = audit({ over: { specialty: false } });
    expect(get(out, 'specialty').value).toBeCloseTo(0, 9);
    expect(get(out, 'specialty').note).toContain('Desmarcada por você');
    expect(get(out, 'rrr-final').value).toBeCloseTo((18 / 118) * 100, 3);
  });
});

describe('taxa de bancada', () => {
  it('400 sem feeSet: origem "padrão do app" e estado "unconfirmed"', () => {
    const { out } = audit({ over: { feePer100: 400 } });
    expect(get(out, 'bench-fee')).toMatchObject({ origin: 'app-default', status: 'unconfirmed', value: 400 });
    expect(get(out, 'bench-fee').note).toContain('NÃO confirmado');
  });
  it('400 com feeSet: "digitado"/"applied"; 500 sem feeSet também', () => {
    expect(get(audit({ over: { feePer100: 400, feeSet: true } }).out, 'bench-fee')).toMatchObject({ origin: 'user', status: 'applied' });
    expect(get(audit({ over: { feePer100: 500 } }).out, 'bench-fee')).toMatchObject({ origin: 'user', status: 'applied', value: 500 });
  });
  it('item de valor 384 com taxa 400: 172,8, que o lote arredonda para 173 (a linha lê o valor cobrado)', () => {
    expect(stationFee(384, 400)).toBeCloseTo(172.8, 9);
    const { a, out } = audit({ over: { feePer100: 400 } });
    expect(a.c.fee).toBe(173);
    expect(get(out, 'bench-fee-paid').value).toBe(a.c.fee);
    expect(get(out, 'bench-fee-paid').note).toContain('NÃO VERIFICADO');
  });
  it('taxa da bancada do refino aparece com a taxa 400 não confirmada e só entra no custo quando o material é produzido', () => {
    const buy = get(audit({ scenario: 'staff' }).out, 'refine-fee');
    expect(buy.status).toBe('info-only');
    const made = get(audit({ scenario: 'staff', over: { refine: { PLANKS: 'all', METALBAR: 'buy' } } }).out, 'refine-fee');
    expect(made).toMatchObject({ status: 'unconfirmed', origin: 'app-default' });
  });
});

describe('bônus diário (servidor west, reset 10:00 UTC)', () => {
  const daily = (craftDailyAt, over = {}) => get(audit({ over: { craftDaily: 20, craftDailyAt, ...over } }).out, 'daily');
  it('20 informado às 09:00 de 19/11 com now 12:00: usado 0, "stale", nota "digitado 20"', () => {
    const r = daily(Date.parse('2026-11-19T09:00:00Z'));
    expect(r.value).toBe(0);
    expect(r.status).toBe('stale');
    expect(r.note).toContain('digitado 20');
    expect(r.note).toContain('reset');
  });
  it('informado às 10:30: vale 20, "applied"', () => {
    const r = daily(Date.parse('2026-11-19T10:30:00Z'));
    expect(r.value).toBeCloseTo(20, 6);
    expect(r.status).toBe('applied');
  });
  it('data a mais de 5 min no futuro: usado 0, "stale" e nota de data no futuro', () => {
    const r = daily(NOW + 10 * 60000);
    expect(r.value).toBe(0);
    expect(r.status).toBe('stale');
    expect(r.note).toContain('no futuro');
  });
  it('"bônus diário" é o +10/+20, não o diário de ofício; a nota de categoria (DAILY_NOTE) acompanha o bônus ativo', () => {
    const r = daily(NOW - H);
    expect(r.note).toContain('+10/+20');
    expect(r.note).toContain('journal');
    expect(r.note).toContain('ainda não foi confirmada em fonte oficial');
  });
  it('sem bônus informado: 0, "applied"', () => {
    const r = get(audit().out, 'daily');
    expect(r.value).toBeCloseTo(0, 9);
    expect(r.status).toBe('applied');
  });
});

describe('imposto e taxa de criação (k = líquido por prata vendida)', () => {
  it('Premium + ordem de venda: 0,935 (4% + 2,5%); o imposto mostra 4% e a taxa de criação 2,5%', () => {
    const { out } = audit();
    expect(get(out, 'net-factor').value).toBeCloseTo(0.935, 6);
    expect(get(out, 'sales-tax').value).toBeCloseTo(4, 9);
    expect(get(out, 'setup-fee').value).toBeCloseTo(2.5, 9);
  });
  it('sem Premium: 0,895 (8% + 2,5%)', () => {
    const { out } = audit({ premium: false });
    expect(get(out, 'net-factor').value).toBeCloseTo(0.895, 6);
    expect(get(out, 'sales-tax').value).toBeCloseTo(8, 9);
    expect(get(out, 'premium').value).toBe('desligado');
  });
  it('venda instantânea com Premium: 0,96 e taxa de criação não cobrada', () => {
    const { out } = audit({ prices: swordPrices({ Caerleon: { b: 4300, bd: NOW - 2 * H } }) });
    expect(get(out, 'net-factor').value).toBeCloseTo(0.96, 6);
    expect(get(out, 'setup-fee').value).toBe(0);
    expect(get(out, 'setup-fee').note).toContain('venda instantânea');
  });
  it('noTax: 1,0 e a taxa de criação vira "não cobrada (venda sem imposto)"; imposto 0', () => {
    const { out } = audit({ over: { noTax: { 'Caerleon|order': true } } });
    expect(get(out, 'net-factor').value).toBeCloseTo(1, 9);
    expect(get(out, 'setup-fee').value).toBe(0);
    expect(get(out, 'setup-fee').note).toContain('não cobrada (venda sem imposto)');
    expect(get(out, 'sales-tax').value).toBe(0);
    expect(get(out, 'no-tax').value).toContain('sim');
  });
});

describe('preços da API e saída', () => {
  it('material com data de 30 h (maxAgeH 24): "stale"; com 3 h: "applied", origem "api"', () => {
    const old = mkPrices({
      T4_METALBAR: { 'Fort Sterling': { s: 200, b: 180, sd: NOW - 30 * H, bd: NOW - 30 * H } },
      T4_LEATHER: { 'Fort Sterling': { s: 150, b: 130, sd: NOW - 3 * H, bd: NOW - 3 * H } },
      T4_MAIN_SWORD: { Caerleon: { s: 4500, b: 4300, sd: NOW - 2 * H, bd: NOW - 2 * H } },
    });
    const { out } = audit({ prices: old });
    expect(get(out, 'price-T4_METALBAR')).toMatchObject({ status: 'stale', origin: 'api' });
    expect(get(out, 'price-T4_LEATHER')).toMatchObject({ status: 'applied', origin: 'api', value: 150 });
  });
  it('"ilusória" e "velha" vêm de annotateOptions (o mesmo objeto da tela)', () => {
    const illusory = audit({ prices: swordPrices({ Caerleon: { s: 4500, sd: NOW - 2 * H } }) });
    expect(illusory.a.input.opts[0].illusory).toBe(true);
    expect(get(illusory.out, 'exit')).toMatchObject({ status: 'unconfirmed', statusText: 'ilusória' });
    const stale = audit({ prices: swordPrices({ Caerleon: { s: 4500, b: 4300, sd: NOW - 30 * H, bd: NOW - 30 * H } }) });
    expect(stale.a.input.opts[0].stale).toBe(true);
    expect(get(stale.out, 'exit').status).toBe('stale');
    const ok = audit();
    expect(ok.a.input.opts[0].stale).toBe(false);
    expect(get(ok.out, 'exit')).toMatchObject({ status: 'applied', value: 4500, origin: 'api' });
  });
  it('sem preço de venda: a saída é "NÃO considerada"; material sem preço também', () => {
    const { out } = audit({ prices: swordPrices(undefined, {}) });
    expect(get(out, 'exit').status).toBe('not-considered');
  });
  it('material produzido (refino): linha de custo de produção e preços da cadeia com idade', () => {
    const { out } = audit({ scenario: 'staff', over: { refine: { PLANKS: 'all', METALBAR: 'buy' } } });
    expect(get(out, 'made-T4_PLANKS')).toMatchObject({ origin: 'derived', status: 'applied' });
    expect(ids(out).some((i) => i.startsWith('price-T4_PLANKS-'))).toBe(true);
  });
});

describe('receita, refino e ingredientes', () => {
  it('cajado com 2 variantes: automático = "Artefato (a mais barata de 2)", derivado; escolhida por você = "Ficha de favor", digitado', () => {
    const auto = get(audit({ scenario: 'staff' }).out, 'recipe');
    expect(auto.value).toContain('Artefato');
    expect(auto).toMatchObject({ origin: 'derived' });
    const user = get(audit({ scenario: 'staff', over: { recipeVariant: 1 } }).out, 'recipe');
    expect(user.value).toContain('Ficha de favor');
    expect(user.origin).toBe('user');
  });
  it('espada (1 receita): "única do catálogo"', () => {
    expect(get(audit().out, 'recipe').value).toContain('única');
  });
  it('o artefato não retorna: linha "não retorna" (jogo); a espada não tem linha desse tipo', () => {
    expect(ids(audit().out).some((i) => i.startsWith('no-return-'))).toBe(false);
    const out = audit({ scenario: 'staff' }).out;
    const r = out.rows.find((x) => x.id.startsWith('no-return-'));
    expect(r.origin).toBe('game');
  });
  it('RRR do refino: produzindo na cidade de bônus "+40 aplicada" (36,7089%); refinando em outra cidade, sem especialização (15,2542%)', () => {
    const made = { refine: { PLANKS: 'all', METALBAR: 'buy' } };
    const on = get(audit({ scenario: 'staff', over: made }).out, 'refine-rrr-PLANKS');
    expect(on.value).toBeCloseTo(36.7089, 3);
    expect(on.status).toBe('applied');
    expect(on.note).toContain('especialização +40 aplicada');
    const off = get(audit({ scenario: 'staff', over: { ...made, refineCity: 'Martlock' } }).out, 'refine-rrr-PLANKS');
    expect(off.value).toBeCloseTo(15.2542, 3);
    expect(off.note).toContain('sem especialização');
  });
  it('comprando o material pronto, o RRR do refino fica "informativa" e diz que não entra no custo', () => {
    const r = get(audit({ scenario: 'staff' }).out, 'refine-rrr-PLANKS');
    expect(r.status).toBe('info-only');
    expect(r.note).toContain('não entra no custo');
  });
  it('foco no refino e bônus diário do recurso entram na nota e no valor (PB 117 → 53,9171%; com diário 20: 137)', () => {
    const r = get(audit({ scenario: 'staff', over: { refine: { PLANKS: 'all', METALBAR: 'buy' }, refineFocus: true } }).out, 'refine-rrr-PLANKS');
    expect(r.value).toBeCloseTo(53.9171, 3);
    expect(r.note).toContain('com foco');
    const d = get(audit({ scenario: 'staff', over: { refine: { PLANKS: 'all', METALBAR: 'buy' }, refineFocus: true, refineDaily: { PLANKS: 20 } } }).out, 'refine-rrr-PLANKS');
    expect(d.value).toBeCloseTo((137 / 237) * 100, 3);
    expect(d.note).toContain('bônus diário +20');
  });
  it('rota por material: "produzir tudo" digitado × "melhor" padrão do app', () => {
    const r = get(audit({ scenario: 'staff', over: { refine: { PLANKS: 'all', METALBAR: 'buy' } } }).out, 'route-T4_PLANKS');
    expect(r).toMatchObject({ value: 'produzir tudo', origin: 'user' });
    const d = get(audit({ scenario: 'staff', over: { refine: {} } }).out, 'route-T4_PLANKS');
    expect(d.origin).toBe('app-default');
    expect(d.value).toContain('melhor');
  });
});

describe('despesas, compra e sem imposto', () => {
  it('despesas extras: 230 por craft = 230 na linha; sem despesas = 0', () => {
    expect(get(audit({ over: { extras: [{ name: 'Transporte', value: '230', scope: 'craft' }] } }).out, 'extras').value).toBe(230);
    expect(get(audit().out, 'extras').value).toBe(0);
  });
  it('ordens de compra: a linha diz 2,5%; cidade "mais barata" é padrão do app', () => {
    const { out } = audit({ over: { useOrders: true } });
    expect(get(out, 'use-orders').value).toBe('sim');
    expect(get(out, 'use-orders').note).toContain('2,5%');
    expect(get(out, 'mat-city').origin).toBe('app-default');
    expect(get(audit({ over: { matCity: 'Martlock' } }).out, 'mat-city')).toMatchObject({ origin: 'user', value: 'Martlock' });
  });
  it('nº de crafts lido do resultado', () => {
    expect(get(audit({ over: { crafts: '5' } }).out, 'crafts').value).toBe(5);
  });
});

describe('NÃO consideradas aparecem SEMPRE', () => {
  const NC = ['relists', 'transport', 'quality', 'journal', 'focusSilver', 'stock', 'drift', 'faction'].map((x) => `nc-${x}`);
  it.each([
    ['cfg padrão', {}],
    ['sem preços', { prices: null }],
    ['com tudo digitado', { over: { focus: true, customRRR: '30', extras: [{ name: 'a', value: '1', scope: 'craft' }] } }],
  ])('%s: relistagens, transporte, qualidade, diário de ofício (journal), foco em prata, estoque, mudança de preço e ficha de facção', (_n, opts) => {
    const { out } = audit(opts);
    for (const id of NC) expect(get(out, id), id).toMatchObject({ status: 'not-considered' });
    expect(get(out, 'nc-journal').label).toContain('journal');
    expect(get(out, 'nc-journal').note).toContain('+10/+20');
    expect(out.counts.notConsidered).toBeGreaterThanOrEqual(NC.length);
  });
});

describe('issues da 060: valor exibido = valor usado', () => {
  it('feePer100 "abc" corrigido para 400: nota "corrigido de abc para 400", sem eco de objeto', () => {
    const { out } = audit({ over: { feePer100: 'abc' } });
    const r = get(out, 'bench-fee');
    expect(r.value).toBe(400);
    expect(r.note).toContain('corrigido de abc para 400');
    expect(JSON.stringify(out.rows)).not.toContain('[object');
  });
  it('taxa acima do teto: mostra o teto usado, não o digitado', () => {
    const { out } = audit({ over: { feePer100: 5000, feeSet: true } });
    expect(get(out, 'bench-fee').value).toBe(1000);
    expect(get(out, 'bench-fee').note).toContain('corrigido de 5000 para 1000');
  });
  it('crafts 0 corrigido para 1 e RRR manual impossível ignorado, com nota', () => {
    const { out } = audit({ over: { crafts: 0, customRRR: '150' } });
    expect(get(out, 'crafts').value).toBe(1);
    expect(get(out, 'crafts').note).toContain('corrigido de 0 para 1');
    expect(get(out, 'custom-rrr').note).toContain('corrigido de 150 para automático');
  });
  it('objeto no lugar de número nunca vira "[object Object]"', () => {
    const { out } = audit({ over: { feePer100: { x: 1 }, crafts: [] } });
    expect(JSON.stringify(out.rows)).not.toContain('[object');
    expect(get(out, 'bench-fee').note).toContain('(valor inválido)');
  });
});

describe('estado antigo e corrompido', () => {
  it('estado antigo (cfg de 9e1e4a2, sem campos novos): monta sem lançar e mostra o valor usado', () => {
    const cfg = {
      craftCity: 'Martlock', specialty: true, focus: true, feePer100: '250', customRRR: '', matCity: 'Thetford', useOrders: true, crafts: '5',
      refine: { METALBAR: 'buy', LEATHER: 'buy' }, refineFocus: true, refineFee: '300',
    };
    const { a, out } = audit({ cfg });
    expect(out.rows.length).toBeGreaterThan(10);
    expect(out.rows.filter((r) => r.value === 'não foi possível ler')).toEqual([]);
    expect(get(out, 'bench-fee').value).toBe(250);
    expect(get(out, 'crafts').value).toBe(5);
    expect(get(out, 'rrr-final').value).toBe(a.c.rates.craftRRR * 100);
  });
  it('corrompido (lixo direto na lib): não lança e a linha mostra o valor realmente usado', () => {
    const junk = { feePer100: {}, crafts: null, customRRR: { x: 1 }, craftDaily: 'x', extras: 'lixo', noTax: 5, share: {}, waitCost: [], feeByCity: 'x', cityScenario: 7, refineDaily: 'zzz' };
    const { a, out } = audit({ over: junk });
    expect(get(out, 'bench-fee').value).toBe(400);
    expect(get(out, 'crafts').value).toBe(1);
    expect(get(out, 'rrr-final').value).toBe(a.c.rates.craftRRR * 100);
    expect(JSON.stringify(out.rows)).not.toContain('[object');
  });
  it('entrada ilegível (nada, vazio, resultado ausente): nunca lança; as linhas viram "não foi possível ler"', () => {
    for (const input of [undefined, null, {}, { cfg: 5, result: 'x' }]) {
      let out;
      expect(() => { out = auditCraft(input); }).not.toThrow();
      expect(out.rows.length).toBeGreaterThan(0);
      expect(out.rows.some((r) => r.value === 'não foi possível ler')).toBe(true);
    }
  });
});

describe('seções Preço-alvo, Estresse e Comparar cidades', () => {
  it('Preço-alvo: herda o custo por unidade; a venda sem imposto é "NÃO considerada" (sempre, até a 075)', () => {
    const { a, out } = audit();
    expect(get(out, 'target-inherits').value).toBe(a.c.unitCost);
    expect(get(out, 'target-inherits').note).toContain('RRR, taxa de bancada e despesas');
    expect(get(out, 'target-notax')).toMatchObject({ status: 'not-considered', section: 'Preço-alvo' });
    expect(get(out, 'target-notax').note).not.toContain('Você marcou');
    const marked = audit({ over: { noTax: { 'Caerleon|order': true } } }).out;
    expect(get(marked, 'target-notax').note).toContain('Você marcou');
  });
  it('Estresse: passos de ±5% a ±20% e margem fina 5% são do app; RRR, taxa, despesas e cidade de saída não variam', () => {
    const { out } = audit();
    expect(get(out, 'stress-steps')).toMatchObject({ value: '±5% a ±20%', origin: 'app-default', status: 'info-only' });
    expect(get(out, 'stress-thin').value).toBeCloseTo(5, 9);
    expect(get(out, 'stress-fixed')).toMatchObject({ status: 'not-considered', section: 'Estresse' });
  });
  it('Comparar cidades: RRR manual preenchido é "ignorado" (NÃO considerada); vazio é só informativo', () => {
    const filled = get(audit({ over: { customRRR: '30' } }).out, 'compare-rrr');
    expect(filled).toMatchObject({ status: 'not-considered', section: 'Comparar cidades' });
    expect(filled.label).toContain('ignorado');
    expect(get(audit().out, 'compare-rrr').status).toBe('info-only');
    expect(get(audit().out, 'compare-sale').status).toBe('not-considered');
  });
  it('Comparar cidades: taxa geral 400 não confirmada vale em todas as cidades e a nota avisa; taxa por cidade muda a linha', () => {
    const def = get(audit({ over: { feePer100: 400 } }).out, 'compare-fee');
    expect(def.note).toContain('padrão do app');
    const own = get(audit({ over: { feePer100: 400, feeByCity: { Martlock: '300' }, cityScenario: 'own' } }).out, 'compare-fee');
    expect(own.value).toContain('1 cidade(s) com taxa própria');
    expect(get(audit({ over: { cityScenario: 'own' } }).out, 'compare-scenario').value).toContain('própria cidade');
  });
  it('sem preços não há comparação: as linhas da seção somem, as outras ficam', () => {
    const { out } = audit({ prices: null });
    expect(ids(out)).not.toContain('compare-fee');
    expect(ids(out)).toContain('target-notax');
  });
});

describe('cabeçalho: contagens', () => {
  it('cfg padrão com taxa 400: ao menos 1 não confirmada e as NÃO consideradas contadas', () => {
    const { out } = audit({ over: { feePer100: 400 } });
    expect(out.counts.unconfirmed).toBeGreaterThanOrEqual(1);
    expect(out.counts.notConsidered).toBeGreaterThanOrEqual(8);
    expect(out.counts.applied).toBeGreaterThan(10);
    expect(Object.values(out.counts).reduce((s, n) => s + n, 0)).toBe(out.rows.length);
  });
  it('toda linha tem origem e estado (V2) e id único', () => {
    const { out } = audit({ scenario: 'staff', over: { refine: { PLANKS: 'all', METALBAR: 'buy' }, focus: true, customRRR: '30', extras: [{ name: 'a', value: '5', scope: 'lote' }] } });
    for (const r of out.rows) {
      expect(r.origin, r.id).toBeTruthy();
      expect(r.status, r.id).toBeTruthy();
    }
    expect(new Set(ids(out)).size).toBe(ids(out).length);
  });
});
