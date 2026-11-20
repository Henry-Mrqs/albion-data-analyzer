import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SHARE_PCT, HISTORY_DAYS, LOW_TURNOVER_PER_DAY, MIN_POINTS_IN_WINDOW, NO_TURNOVER_PER_DAY, PRICE_ABOVE_MEDIAN_WARN,
  coverageLabel, giroText, loadedStats, daysToSell, priceVsMedian, verdictLabel, windowOf, windowStats,
} from './liquidity';

// Dados REAIS do dossiê IDEIA-010 §4 (API West, 19 a 25/10/2026), usados como constantes.
const D = (day) => Date.parse(`2026-10-${day}T00:00:00Z`);
const series = (counts, prices, start = 19) => counts.map((n, i) => ({ t: D(start + i), n, p: prices[i] }));
const BAG = series([82, 61, 100, 141, 131, 116, 59], [4403, 4779, 4445, 4733, 5751, 12621, 10594]);
const SWORD = series([7, 8, 21, 4, 6, 7, 23], [8431, 5381, 2009, 5498, 8316, 10999, 6309]);
const now = Date.parse('2026-10-26T03:00:00Z');
// `points` dias seguidos somando `total` unidades (o 1º dia leva o resto)
const flat = (total, points = 7, start = 19) => {
  const base = Math.floor(total / points);
  return series(Array.from({ length: points }, (_, i) => (i === 0 ? total - base * (points - 1) : base)), Array(points).fill(100), start);
};

describe('constantes de produto (decisão D-034, sem fonte de jogo)', () => {
  it('valores aprovados', () => {
    expect(HISTORY_DAYS).toBe(7);
    expect(NO_TURNOVER_PER_DAY).toBe(5);
    expect(LOW_TURNOVER_PER_DAY).toBe(15);
    expect(MIN_POINTS_IN_WINDOW).toBe(3);
    expect(DEFAULT_SHARE_PCT).toBe(10);
    expect(PRICE_ABOVE_MEDIAN_WARN).toBe(0.2);
  });
});

describe('windowOf', () => {
  it('7 dias UTC completos que terminam na véspera: [19/10 00:00, 26/10 00:00)', () => {
    expect(windowOf(now)).toEqual({ fromMs: D(19), toMs: D(26) });
  });
  it('aceita outro tamanho de janela', () => expect(windowOf(now, 3)).toEqual({ fromMs: D(23), toMs: D(26) }));
});

describe('dossiê §4 (dados reais)', () => {
  it('T4_BAG: 690 / 7 = 98,57 un./dia; mediana 4.779; 7 de 7 dias; giro ok', () => {
    const s = windowStats(BAG, { now });
    expect(s.volumePerDay).toBeCloseTo(98.5714, 4);
    expect(s.medianPrice).toBe(4779);
    expect(s.points).toBe(7);
    expect(s.windowDays).toBe(7);
    expect(s.state).toBe('ok');
  });
  it('T4_MAIN_SWORD: 76 / 7 = 10,86; mediana 6.309; passa o limiar 5 e cai em "pouco giro" (< 15)', () => {
    const s = windowStats(SWORD, { now });
    expect(s.volumePerDay).toBeCloseTo(10.8571, 4);
    expect(s.medianPrice).toBe(6309);
    expect(s.state).toBe('low');
  });
  it('dias para vender 300 bolsas: 30,4 dias a 10% e 12,2 a 25%', () => {
    expect(daysToSell(300, 690 / 7, 10)).toBeCloseTo(30.4348, 4);
    expect(daysToSell(300, 690 / 7, 25)).toBeCloseTo(12.1739, 4);
  });
  it('preço planejado 6.000 contra a mediana 4.779 = +25,5%', () => expect(priceVsMedian(6000, 4779)).toBeCloseTo(0.2555, 4));
  it('mediana com quantidade par é a média dos dois centrais', () => {
    expect(windowStats(series([1, 1, 1, 1], [10, 40, 20, 30]), { now: D(23) + 3600e3 }).medianPrice).toBe(25);
  });
  it('média simples (6.760,86) e ponderada (6.676,64) NÃO são a mediana (dossiê L5)', () => {
    const m = windowStats(BAG, { now }).medianPrice;
    expect(m).not.toBeCloseTo(6760.86, 1);
    expect(m).not.toBeCloseTo(6676.64, 1);
  });
});

describe('estados: sem histórico × dados insuficientes × sem giro', () => {
  it('série ausente, [] ou undefined = nodata ("sem histórico"; não é sem giro)', () => {
    for (const s of [undefined, null, []]) {
      const r = windowStats(s, { now });
      expect(r.state).toBe('nodata');
      expect(r.points).toBe(0);
      expect(r.volumePerDay).toBe(0);
      expect(r.medianPrice).toBeNull();
    }
  });
  it('série com dados antigos e nenhum ponto na janela = idle, com o último registro', () => {
    const old = [{ t: Date.parse('2026-10-10T00:00:00Z'), n: 50, p: 100 }];
    const s = windowStats(old, { now });
    expect(s.state).toBe('idle');
    expect(s.lastRecord).toBe(old[0].t);
    expect(s.volumePerDay).toBe(0);
    expect(s.points).toBe(0);
  });
  it('caso real de hoje: Lymhurst/T4_MAIN_SWORD, último ponto 10/11, janela 11 a 17/11 => idle', () => {
    expect(windowStats([{ t: Date.parse('2026-11-10T00:00:00Z'), n: 3, p: 5000 }], { now: Date.parse('2026-11-18T11:00:00Z') }).state).toBe('idle');
  });
  it('1 a 2 dias com dado = sparse ("dados insuficientes"), mesmo com volume baixíssimo (nunca "sem giro")', () => {
    for (const k of [1, 2]) {
      const s = windowStats(series(Array(k).fill(1), Array(k).fill(10)), { now });
      expect(s.state).toBe('sparse');
      expect(s.points).toBe(k);
      expect(s.volumePerDay).toBeCloseTo(k / 7, 6);
    }
  });
  it('MIN_POINTS_IN_WINDOW: MIN-1 pontos = sparse, MIN pontos = classifica', () => {
    expect(windowStats(flat(1, MIN_POINTS_IN_WINDOW - 1), { now }).state).toBe('sparse');
    expect(windowStats(flat(MIN_POINTS_IN_WINDOW, MIN_POINTS_IN_WINDOW), { now }).state).toBe('none');
  });
  it('um dia atípico enorme com poucos dias de dado continua "dados insuficientes" (não vira "giro ok")', () => {
    expect(windowStats(series([5000], [100]), { now }).state).toBe('sparse');
  });
});

describe('contador de dias com dado (0 a 7)', () => {
  it.each([0, 1, 2, 3, 4, 5, 6, 7])('%i pontos na janela => points=%i', (k) => {
    const s = windowStats(k ? series(Array(k).fill(10), Array(k).fill(100)) : [{ t: D(1), n: 1, p: 1 }], { now });
    expect(s.points).toBe(k);
    expect(s.windowDays).toBe(7);
  });
  it('dia ausente conta 0 na soma: 4 dias de 10 = 40 / 7 = 5,71 (a média NÃO divide por 4)', () => {
    const s = windowStats(series([10, 10, 10, 10], [1, 2, 3, 4]), { now });
    expect(s.volumePerDay).toBeCloseTo(40 / 7, 6);
    expect(s.points).toBe(4);
  });
  it('dia ausente no meio da série (buraco) é só um dia a menos no contador', () => {
    const s = windowStats([{ t: D(19), n: 70, p: 1 }, { t: D(21), n: 70, p: 1 }, { t: D(25), n: 70, p: 1 }], { now });
    expect(s.points).toBe(3);
    expect(s.volumePerDay).toBeCloseTo(30, 6);
  });
});

describe('bordas dos limiares (matam < × <=)', () => {
  it('volume exatamente 5 é "low" (não "none"); 4,857 é "none"', () => {
    expect(windowStats(flat(35), { now }).state).toBe('low');
    expect(windowStats(flat(34), { now }).state).toBe('none');
  });
  it('volume exatamente 15 é "ok" (não "low"); 14,857 é "low"', () => {
    expect(windowStats(flat(105), { now }).state).toBe('ok');
    expect(windowStats(flat(104), { now }).state).toBe('low');
  });
  it('as bordas usam as constantes (35 = 5 x 7; 105 = 15 x 7)', () => {
    expect(NO_TURNOVER_PER_DAY * HISTORY_DAYS).toBe(35);
    expect(LOW_TURNOVER_PER_DAY * HISTORY_DAYS).toBe(105);
  });
  it('volume 4, 5, 14 e 15 por dia (valores redondos)', () => {
    expect(windowStats(flat(28), { now }).state).toBe('none'); // 4
    expect(windowStats(flat(35), { now }).state).toBe('low'); // 5
    expect(windowStats(flat(98), { now }).state).toBe('low'); // 14
    expect(windowStats(flat(105), { now }).state).toBe('ok'); // 15
  });
});

describe('janela de dias completos', () => {
  const pt = (t) => [{ t, n: 70, p: 1 }];
  it('o dia de hoje (parcial) fica fora', () => {
    const s = windowStats([...flat(21, 3, 23), { t: D(26), n: 9999, p: 1 }], { now });
    expect(s.points).toBe(3);
    // IDEIA-089/D-072: a série (23 a 25/10) cobre 3 dias da janela: 21 / 3 = 7 (antes 21 / 7 = 3)
    expect(s.volumePerDay).toBeCloseTo(7, 6);
  });
  it('o primeiro dia (há 7 dias) entra; o de há 8 dias não', () => {
    expect(windowStats(pt(D(19)), { now }).points).toBe(1);
    expect(windowStats(pt(D(18)), { now }).points).toBe(0);
  });
  it('o último instante de ontem (23:59:59.999Z) entra; 00:00 de hoje não', () => {
    expect(windowStats(pt(D(26) - 1), { now }).points).toBe(1);
    expect(windowStats(pt(D(26)), { now }).points).toBe(0);
  });
  it('o resultado não muda ao longo do dia (a janela é por dia UTC, não deslizante)', () => {
    const a = windowStats(BAG, { now: D(26) + 1 });
    const b = windowStats(BAG, { now: D(26) + 86400e3 - 1 });
    expect(a).toEqual(b);
  });
  it('série desordenada dá o mesmo resultado', () => {
    const shuffled = [BAG[3], BAG[0], BAG[6], BAG[2], BAG[5], BAG[1], BAG[4]];
    expect(windowStats(shuffled, { now })).toEqual(windowStats(BAG, { now }));
  });
  it('lastRecord é o ponto mais recente da série inteira, também fora da janela', () => {
    expect(windowStats([...BAG, { t: D(26), n: 1, p: 1 }], { now }).lastRecord).toBe(D(26));
  });
});

describe('daysToSell e priceVsMedian: entradas ruins nunca dão NaN/∞/negativo', () => {
  it('volume 0, share 0, quantidade 0 ou lixo => null', () => {
    expect(daysToSell(300, 0, 10)).toBeNull();
    expect(daysToSell(300, 10, 0)).toBeNull();
    expect(daysToSell(0, 10, 10)).toBeNull();
    expect(daysToSell(300, NaN, 10)).toBeNull();
    expect(daysToSell(-5, 10, 10)).toBeNull();
    expect(daysToSell(300, 10, Infinity)).toBeNull();
  });
  it('priceVsMedian com mediana ausente ou 0 => null', () => {
    expect(priceVsMedian(6000, 0)).toBeNull();
    expect(priceVsMedian(6000, null)).toBeNull();
    expect(priceVsMedian(NaN, 100)).toBeNull();
  });
  it('preço abaixo da mediana dá fração negativa', () => expect(priceVsMedian(50, 100)).toBeCloseTo(-0.5, 6));
});

describe('texto da tela (giroText, coverageLabel)', () => {
  it('coverageLabel: "X de 7 dias com dados" (singular em 1)', () => {
    expect(coverageLabel(windowStats(series([10, 10, 10, 10], [1, 2, 3, 4]), { now }))).toBe('4 de 7 dias com dados');
    expect(coverageLabel(windowStats(BAG, { now }))).toBe('7 de 7 dias com dados');
    expect(coverageLabel(windowStats(series([10], [1]), { now }))).toBe('1 de 7 dias com dados');
    expect(coverageLabel(windowStats([{ t: D(1), n: 1, p: 1 }], { now }))).toBe('0 de 7 dias com dados');
  });
  it('coverageLabel de série ausente: "sem histórico" (não "0 de 7")', () => expect(coverageLabel(windowStats(undefined, { now }))).toBe('sem histórico'));
  it('giroText ok/low/none: vendas por dia com 1 casa e vírgula', () => {
    expect(giroText(windowStats(BAG, { now }))).toMatchObject({ text: '98,6/dia', tone: 'good' });
    expect(giroText(windowStats(SWORD, { now }))).toMatchObject({ text: '10,9/dia', tone: 'warn' });
    expect(giroText(windowStats(flat(28), { now }))).toMatchObject({ text: '4,0/dia', tone: 'bad' });
  });
  it('giroText sparse mostra "dados insuficientes", nunca "sem giro" nem um número de giro', () => {
    const g = giroText(windowStats(series([1, 1], [1, 1]), { now }));
    expect(g.text).toBe('dados insuficientes');
    expect(g.text).not.toMatch(/sem giro|\/dia/);
  });
  it('giroText nodata e idle (com data do último registro, dd/mm em UTC)', () => {
    expect(giroText(windowStats(null, { now })).text).toBe('sem histórico');
    expect(giroText(windowStats([{ t: Date.parse('2026-10-10T00:00:00Z'), n: 5, p: 1 }], { now })).text).toBe('sem venda registrada (último 10/10)');
  });
  it('giroText de ok/low/none inclui a mediana no title; estados sem mediana não', () => {
    expect(giroText(windowStats(BAG, { now })).title).toContain('4.779');
    expect(giroText(windowStats(undefined, { now })).title).not.toMatch(/mediana/);
  });
});

describe('loadedStats: histórico NÃO pedido é "não carregado", nunca "sem histórico" (D-034, retrabalho 1)', () => {
  const data = { X: { Caerleon: BAG, Lymhurst: [] } };
  it('cidade pedida com série = estatística normal; pedida e vazia = sem histórico', () => {
    expect(loadedStats(data, 'X', 'Caerleon', { now }).state).toBe('ok');
    expect(loadedStats(data, 'X', 'Lymhurst', { now }).state).toBe('nodata');
  });
  it('cidade nunca consultada (mid conhecido, cidade ausente) = unloaded, distinto de nodata', () => {
    const s = loadedStats(data, 'X', 'Thetford', { now });
    expect(s.state).toBe('unloaded');
    expect(s.state).not.toBe('nodata');
  });
  it('mid nunca consultado, ou nenhum dado ainda = unloaded', () => {
    expect(loadedStats(data, 'Y', 'Caerleon', { now }).state).toBe('unloaded');
    expect(loadedStats(null, 'X', 'Caerleon', { now }).state).toBe('unloaded');
    expect(loadedStats(undefined, 'X', 'Caerleon', { now }).state).toBe('unloaded');
  });
  it('unloaded: texto "—", dica para carregar, sem cobertura e sem "sem histórico"/"sem giro"', () => {
    const s = loadedStats(data, 'X', 'Thetford', { now });
    const g = giroText(s);
    expect(g.text).toBe('—');
    expect(g.title).toMatch(/Carregar giro/);
    expect(coverageLabel(s)).toBe('');
    expect(verdictLabel('unloaded')).toBe('giro não carregado');
    expect(`${g.text} ${g.title}`).not.toMatch(/sem histórico|sem giro/);
  });
});

describe('verdictLabel', () => {
  it('um texto distinto por estado; nodata ("sem histórico") difere de none ("sem giro") e de sparse', () => {
    const t = Object.fromEntries(['nodata', 'idle', 'sparse', 'none', 'low', 'ok'].map((s) => [s, verdictLabel(s)]));
    expect(t.nodata).toBe('sem histórico');
    expect(t.idle).toBe('sem venda registrada');
    expect(t.sparse).toBe('dados insuficientes');
    expect(t.none).toBe('sem giro');
    expect(t.low).toBe('pouco giro');
    expect(t.ok).toBe('giro ok');
    expect(new Set(Object.values(t)).size).toBe(6);
  });
});

// IDEIA-089: divisor = dias da janela que a série cobre (a API history devolve ~29 dias, não 30).
describe('windowStats: divisor pelos dias que a série cobre (IDEIA-089)', () => {
  const DAY = 86400000;
  const t0 = Date.UTC(2026, 9, 21);
  const now89 = Date.parse('2026-11-19T12:00:00Z');
  const s29 = Array.from({ length: 29 }, (_, i) => ({ t: t0 + i * DAY, n: i < 28 ? 310 : 306, p: 8000 }));
  const ate = (nDias, n) => Array.from({ length: nDias }, (_, i) => ({ t: Date.UTC(2026, 10, 19) - (nDias - i) * DAY, n, p: 100 }));

  it('janela de 30 dias sobre série de 29: divide por 29, não por 30', () => {
    const r = windowStats(s29, { now: now89, days: 30 });
    expect(r.volumePerDay).toBeCloseTo(8986 / 29, 6);
    expect(r.volumePerDay).not.toBeCloseTo(8986 / 30, 3);
    expect([r.windowDays, r.requestedDays, r.points]).toEqual([29, 30, 29]);
  });
  it('janela de 7 dias com série longa continua 7', () => {
    const r = windowStats(s29, { now: now89, days: 7 });
    expect(r.volumePerDay).toBeCloseTo(2166 / 7, 4);
    expect([r.windowDays, r.requestedDays]).toEqual([7, 7]);
  });
  it('item novo: 10 pontos, days 30 divide por 10', () => {
    const r = windowStats(ate(10, 309.6), { now: now89, days: 30 });
    expect(r.volumePerDay).toBeCloseTo(309.6, 6);
    expect([r.windowDays, r.points]).toEqual([10, 10]);
  });
  it('3 dias de existência, 100/dia, days 7: 100 por dia', () => {
    const r = windowStats(ate(3, 100), { now: now89, days: 7 });
    expect(r.volumePerDay).toBe(100);
    expect([r.windowDays, r.points]).toEqual([3, 3]);
  });
  it('buraco dentro do que a série cobre continua contando 0', () => {
    const old = { t: Date.UTC(2026, 10, 19) - 20 * DAY, n: 50, p: 100 };
    const rec = [1, 2, 3, 4].map((k) => ({ t: Date.UTC(2026, 10, 19) - k * DAY, n: 100, p: 100 }));
    const r = windowStats([old, ...rec], { now: now89, days: 7 });
    expect(r.volumePerDay).toBeCloseTo(400 / 7, 6);
    expect(r.windowDays).toBe(7);
  });
  it('série vazia: nodata e só dados fora da janela: idle, ambos com windowDays = days', () => {
    expect(windowStats([], { now: now89, days: 30 }).windowDays).toBe(30);
    const r = windowStats([{ t: Date.UTC(2026, 8, 1), n: 5, p: 1 }], { now: now89, days: 7 });
    expect([r.state, r.windowDays]).toEqual(['idle', 7]);
  });
  it('estado segue por points e volume: 2 pontos = sparse; série de 1 ponto não dá NaN', () => {
    expect(windowStats(ate(2, 100), { now: now89, days: 7 }).state).toBe('sparse');
    const r = windowStats(ate(1, 100), { now: now89, days: 7 });
    expect(Number.isFinite(r.volumePerDay)).toBe(true);
    expect(r.windowDays).toBe(1);
  });
  it('coverageLabel usa windowDays', () => {
    expect(coverageLabel(windowStats(s29, { now: now89, days: 30 }))).toBe('29 de 29 dias com dados');
  });
});
