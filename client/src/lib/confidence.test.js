import { describe, it, expect } from 'vitest';
import { priceConfidence, seriesStats, sealLabel, sealVisible, STALE_H, ABOVE_MEDIAN } from './confidence';
import { DEFAULT_MAX_AGE_H } from './exits';
import { PRICE_ABOVE_MEDIAN_WARN } from './liquidity';

const D = 86400000;
const H = 3600000;
const serie = (ps, d0) => ps.map((p, i) => ({ t: d0 + i * D, n: 10, p }));
const now1 = Date.UTC(2026, 9, 26, 12);
const fresh = (now) => now - H;
const C1 = serie([8431, 5381, 2009, 5498, 8316, 10999, 6309], Date.UTC(2026, 9, 19));
const codes = (c) => c.reasons.map((r) => r.code);
const conf = (over, series, o = {}) => {
  const now = o.now ?? now1;
  return priceConfidence({ date: fresh(now), buyer: true, ...over }, seriesStats(series, { now, days: o.days ?? 7 }), { now, ...o.opts });
};

describe('seriesStats', () => {
  it('caso 1: mediana 6.309, MAD 2.007, 7 pontos', () => {
    const s = seriesStats(C1, { now: now1 });
    expect(s).toMatchObject({ state: 'low', median: 6309, mad: 2007, points: 7 });
  });
  it('série ausente = unloaded; [] = nodata; só fora da janela = idle', () => {
    expect(seriesStats(undefined, { now: now1 }).state).toBe('unloaded');
    expect(seriesStats([], { now: now1 }).state).toBe('nodata');
    expect(seriesStats(serie([5, 5, 5], Date.UTC(2026, 8, 1)), { now: now1 }).state).toBe('idle');
  });
  it('embaralhada e com pontos fora da janela / hoje: mesmo resultado', () => {
    const lixo = [...C1, { t: Date.UTC(2026, 9, 26), n: 1, p: 999999 }, { t: Date.UTC(2026, 8, 1), n: 1, p: 1 }].reverse();
    const { lastRecord, ...a } = seriesStats(lixo, { now: now1 }); // eslint-disable-line no-unused-vars
    const { lastRecord: l2, ...b } = seriesStats(C1, { now: now1 }); // eslint-disable-line no-unused-vars
    expect(a).toEqual(b);
  });
});

describe('priceConfidence: casos do dossiê', () => {
  it('caso 1: 12.000 -> +90%, z 1,91 (não outlier), instável -> [above, unstable] baixa', () => {
    const c = conf({ price: 12000 }, C1);
    expect(codes(c)).toEqual(['above', 'unstable']);
    expect(c.level).toBe('baixa');
    expect(c.z).toBeCloseTo(1.91, 2);
    expect(c.vsMedian).toBeCloseTo(0.902, 3);
    expect(c.reasons[0].text).toBe('90% acima da mediana de 7 dias');
    expect(c.reasons[1].text).toBe('histórico instável (desvio 32% da mediana)');
  });
  it('caso 1 com 7.000 e com 6.309: só unstable -> media', () => {
    expect(codes(conf({ price: 7000 }, C1))).toEqual(['unstable']);
    expect(conf({ price: 7000 }, C1).level).toBe('media');
    expect(conf({ price: 6309 }, C1).level).toBe('media');
  });
  it('caso 2: mediana 603, MAD 0 (piso 30,15); 1.840 -> z 27,67, [above-high, outlier] baixa', () => {
    const s2 = serie([602, 603, 603, 603, 603, 1508, 603], Date.UTC(2026, 9, 19));
    const c = conf({ price: 1840 }, s2);
    expect(codes(c)).toEqual(['above-high', 'outlier']);
    expect(c.level).toBe('baixa');
    expect(c.z).toBeCloseTo(27.67, 1);
    expect(c.vsMedian * 100).toBeCloseTo(205.1, 1);
  });
  it('caso 2 real: série velha, nenhum ponto na janela -> idle, hist-old (15 dias), baixa, sem z nem vsMedian', () => {
    const velha = serie([602, 603, 603, 603, 603, 1508, 603], Date.UTC(2026, 9, 29));
    const now = Date.UTC(2026, 10, 19, 12);
    const c = conf({ price: 1840 }, velha, { now });
    expect(codes(c)).toEqual(['hist-old']);
    expect(c.reasons[0].text).toBe('último registro do histórico há 15 dias');
    expect(c.level).toBe('baixa');
    expect(c.z).toBeNull();
    expect(c.vsMedian).toBeNull();
  });
  it('caso 3: 14 dias, mediana 8.740, MAD 1.427; 1.500 -> z −3,42 (não outlier com 3,5), below baixa; zCut 3 acrescenta outlier; 3.014 -> z −2,71', () => {
    const s3 = serie([8752, 10144, 9811, 8728, 10562, 9022, 10190, 6636, 7862, 9601, 3014, 6263, 1500, 6262], Date.UTC(2026, 9, 31));
    const o = { now: Date.UTC(2026, 10, 14, 12), days: 14 };
    expect(seriesStats(s3, { now: o.now, days: 14 })).toMatchObject({ median: 8740, mad: 1427 });
    const c = conf({ price: 1500 }, s3, o);
    expect(c.z).toBeCloseTo(-3.42, 2);
    expect(codes(c)).toEqual(['below']);
    expect(c.level).toBe('baixa');
    expect(codes(conf({ price: 1500 }, s3, { ...o, opts: { zCut: 3 } }))).toEqual(['below', 'outlier']);
    expect(conf({ price: 3014 }, s3, o).z).toBeCloseTo(-2.71, 2);
  });
  it('caso 4: sem comprador, nível único e sem histórico -> baixa; com comprador e sellMax maior -> só unloaded, media', () => {
    const a = conf({ price: 35890, sellMax: 35890, buyer: false }, undefined);
    expect(codes(a)).toEqual(['nobuyer', 'single-level', 'unloaded']);
    expect(a.level).toBe('baixa');
    expect(a.reasons[1].text).toBe('nível de preço único (menor = maior) e sem comprador visível');
    const b = conf({ price: 28000, sellMax: 30000, buyer: true }, undefined);
    expect(codes(b)).toEqual(['unloaded']);
    expect(b.level).toBe('media');
    expect(sealVisible(b)).toBe(false);
  });
  it('caso 5: preço 1 com mediana 4.000 -> below baixa (também side cost)', () => {
    const s5 = serie([4000, 4000, 4000, 4000, 4000, 4000, 4000], Date.UTC(2026, 9, 19));
    expect(conf({ price: 1 }, s5).level).toBe('baixa');
    expect(codes(conf({ price: 1, side: 'cost' }, s5))).toContain('below');
  });
  it('caso 6: unloaded e nodata -> media; 2 dias -> sparse "2 de 7"; constante 1.000 e preço 1.050 -> alta sem razões', () => {
    expect(conf({ price: 100 }, undefined).level).toBe('media');
    const nd = conf({ price: 100 }, []);
    expect(codes(nd)).toEqual(['nohistory']);
    expect(nd.level).toBe('media');
    const sp = conf({ price: 100 }, serie([100, 100], Date.UTC(2026, 9, 24)));
    expect(sp.reasons[0].text).toBe('histórico com poucos dias (2 de 7)');
    expect(sp.level).toBe('media');
    const ok = conf({ price: 1050 }, serie(Array(7).fill(1000), Date.UTC(2026, 9, 19)));
    expect(ok).toMatchObject({ level: 'alta', reasons: [] });
    expect(ok.z).toBeCloseTo(0.6745, 3);
  });
});

describe('priceConfidence: idade', () => {
  const stable = serie(Array(7).fill(1000), Date.UTC(2026, 9, 19));
  const at = (h, opts) => priceConfidence({ price: 1000, date: now1 - h * H, buyer: true }, seriesStats(stable, { now: now1 }), { now: now1, ...opts });
  it('23 h 59 e 24 h exatas: sem razão; 24 h 01: stale (media); 72 h exatas: só stale; 72 h 01: verystale (baixa)', () => {
    expect(codes(at(23.99))).toEqual([]);
    expect(codes(at(24))).toEqual([]);
    expect(codes(at(24.02))).toEqual(['stale']);
    expect(at(24.02).level).toBe('media');
    expect(codes(at(72))).toEqual(['stale']);
    expect(codes(at(72.02))).toEqual(['verystale']);
    expect(at(72.02).level).toBe('baixa');
  });
  it('sem data (null ou 0) com preço > 0: nodate, baixa', () => {
    for (const date of [null, 0, undefined]) {
      const c = priceConfidence({ price: 1000, date, buyer: true }, seriesStats(stable, { now: now1 }), { now: now1 });
      expect(codes(c)).toEqual(['nodate']);
      expect(c.level).toBe('baixa');
    }
  });
  it('maxAgeH 0 desliga stale mas não verystale', () => {
    expect(codes(at(30, { maxAgeH: 0 }))).toEqual([]);
    expect(codes(at(80, { maxAgeH: 0 }))).toEqual(['verystale']);
  });
});

describe('priceConfidence: bordas e defesa', () => {
  it('preço 0, negativo, NaN, texto, null: nenhuma, sem lançar; stats ausente = unloaded', () => {
    for (const price of [0, -3, NaN, 'x', null, undefined]) expect(priceConfidence({ price, date: now1 }, null, { now: now1 }).level).toBe('nenhuma');
    expect(codes(priceConfidence({ price: 10, date: now1 - H }, null, { now: now1 }))).toEqual(['unloaded']);
    expect(codes(priceConfidence({ price: 10, date: now1 - H }, undefined, { now: now1 }))).toEqual(['unloaded']);
  });
  it('bordas estritas: MAD/mediana 0,25 não instável e 0,26 instável; +20% exato não above; −50% exato não below; +100% exato above', () => {
    const mk = (med, mad) => ({ state: 'ok', median: med, mad, points: 7, days: 7 });
    const c = (price, st) => priceConfidence({ price, date: now1 - H, buyer: true }, st, { now: now1 });
    expect(codes(c(1000, mk(1000, 250)))).toEqual([]);
    expect(codes(c(1000, mk(1000, 260)))).toEqual(['unstable']);
    expect(codes(c(1200, mk(1000, 100)))).toEqual([]);
    expect(codes(c(500, mk(1000, 100)))).toEqual([]);
    expect(codes(c(2000, mk(1000, 100)))).toContain('above');
    expect(codes(c(2000, mk(1000, 100)))).not.toContain('above-high');
    // |z| exatamente 3,5: z = 0,6745 × (p − med) / max(mad, 0,05 × med); com mad 100, med 1000: p = 1000 + 3,5 × 100 / 0,6745
    const pz = 1000 + (3.5 * 100) / 0.6745;
    expect(codes(c(pz, mk(1000, 100)))).not.toContain('outlier');
    expect(codes(c(pz + 1, mk(1000, 100)))).toContain('outlier');
  });
  it('side cost: nunca nobuyer nem single-level; sealVisible', () => {
    const c = priceConfidence({ price: 100, date: now1 - H, sellMax: 100, buyer: false, side: 'cost' }, undefined, { now: now1 });
    expect(codes(c)).toEqual(['unloaded']);
    expect(sealVisible(c)).toBe(false);
    expect(sealVisible({ level: 'media', reasons: [{ code: 'stale' }] })).toBe(true);
    expect(sealVisible({ level: 'alta', reasons: [] })).toBe(true);
    expect(sealVisible({ level: 'nenhuma', reasons: [] })).toBe(false);
    expect(sealVisible(null)).toBe(false);
  });
  it('constantes: uma fonte; rótulos', () => {
    expect(STALE_H).toBe(DEFAULT_MAX_AGE_H);
    expect(ABOVE_MEDIAN).toBe(PRICE_ABOVE_MEDIAN_WARN);
    expect(['alta', 'media', 'baixa', 'nenhuma'].map(sealLabel)).toEqual(['preço confiável', 'confira', 'desconfie', 'sem preço']);
  });
});
