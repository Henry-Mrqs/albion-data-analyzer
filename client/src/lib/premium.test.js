import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NOT_COUNTED, PREMIUM, TAX_SAVING, cleanPremiumInputs, premiumBalance } from './premium';

// Oráculo: dossiê IDEIA-054 §4 (exemplo da AO Refinery), recalculado à mão com node.
const V = (o = {}) => ({ gold: 9414, goldCost: 3750, volume: 20000000, silverPerFocus: 43, focusPerDay: 10000, ...o });
const DEFAULTS = { gold: null, goldCost: 3750, volume: 0, silverPerFocus: 0, focusPerDay: 10000 };

describe('constantes', () => {
  it('TAX_SAVING = 0,04 (derivado de salesTax) e PREMIUM.goldCost 3750, days 30, asOf "2026-11-18"', () => {
    expect(TAX_SAVING).toBeCloseTo(0.04, 12);
    expect(PREMIUM.goldCost).toBe(3750);
    expect(PREMIUM.days).toBe(30);
    expect(PREMIUM.asOf).toBe('2026-11-18');
    expect(PREMIUM.source).toMatch(/AO Refinery/);
    expect(NOT_COUNTED.length).toBeGreaterThanOrEqual(5);
  });
});

describe('premiumBalance', () => {
  it('o código não escreve 0,04 à mão (divide por TAX_SAVING, derivado de salesTax)', () => {
    const src = readFileSync(new URL('./premium.js', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');
    expect(src).not.toMatch(/0[.,]04/);
  });


  it('G 9.414, V 20.000.000, s 43, foco 10.000: cost 35.302.500, taxSaving 800.000, focusValue 12.900.000, balance −21.602.500', () => {
    const r = premiumBalance(V());
    expect(r.state).toBe('ok');
    expect(r.cost).toBe(35302500);
    expect(r.taxSaving).toBeCloseTo(800000, 6);
    expect(r.focusValue).toBe(12900000);
    expect(r.balance).toBeCloseTo(-21602500, 6);
    expect(r.paysAlone).toBe(false);
  });

  it('breakEven (s 43) = 560.062.500; com s 6,78: focusValue 2.034.000 e breakEven 831.712.500', () => {
    expect(premiumBalance(V()).breakEven).toBeCloseTo(560062500, 3);
    const r = premiumBalance(V({ silverPerFocus: 6.78 }));
    expect(r.focusValue).toBeCloseTo(2034000, 6);
    expect(r.breakEven).toBeCloseTo(831712500, 3);
  });

  it('G 9.411: cost 35.291.250; G 10.000: breakEven (s 43) = 615.000.000', () => {
    expect(premiumBalance(V({ gold: 9411 })).cost).toBe(35291250);
    expect(premiumBalance(V({ gold: 10000 })).breakEven).toBeCloseTo(615000000, 3);
  });

  it('foco usado 5.000/dia, s 43: focusValue 6.450.000 e breakEven 721.312.500', () => {
    const r = premiumBalance(V({ focusPerDay: 5000 }));
    expect(r.focusValue).toBe(6450000);
    expect(r.breakEven).toBeCloseTo(721312500, 3);
  });

  it('paysAlone: s 120 -> focusValue 36.000.000 > cost: breakEven 0, paysAlone true, balance com V 0 = +697.500', () => {
    const r = premiumBalance(V({ silverPerFocus: 120, volume: 0 }));
    expect(r.focusValue).toBe(36000000);
    expect(r.paysAlone).toBe(true);
    expect(r.breakEven).toBe(0);
    expect(r.balance).toBeCloseTo(697500, 6);
  });

  it('paysAlone: empate exato (cost = foco) conta como paga; um pouco abaixo, não', () => {
    // G 8.000 -> cost 30.000.000; s 100 -> foco 30.000.000
    const r = premiumBalance(V({ gold: 8000, silverPerFocus: 100, volume: 0 }));
    expect(r.paysAlone).toBe(true);
    expect(r.breakEven).toBe(0);
    expect(premiumBalance(V({ gold: 8000.001, silverPerFocus: 100, volume: 0 })).paysAlone).toBe(false);
  });

  it('V vazio (0), s 43: balance −22.402.500; V 5e8: −2.402.500', () => {
    expect(premiumBalance(V({ volume: 0 })).balance).toBeCloseTo(-22402500, 6);
    expect(premiumBalance(V({ volume: 5e8 })).balance).toBeCloseTo(-2402500, 4);
  });

  it('sem ouro (null/0/negativo/NaN): state "nogold", sem NaN nem ∞ em nenhum campo', () => {
    for (const gold of [null, 0, -5, NaN, undefined, Infinity]) {
      const r = premiumBalance(V({ gold }));
      expect(r.state, String(gold)).toBe('nogold');
      for (const [k, v] of Object.entries(r)) if (typeof v === 'number') expect(Number.isFinite(v), `${gold} ${k}`).toBe(true);
    }
  });

  it('goldCost editado (3.000, G 9.414): cost 28.242.000; goldCost 0 é aceito (cost 0, paysAlone true)', () => {
    expect(premiumBalance(V({ goldCost: 3000 })).cost).toBe(28242000);
    const z = premiumBalance(V({ goldCost: 0 }));
    expect(z.cost).toBe(0);
    expect(z.paysAlone).toBe(true);
  });

  it('valores no teto (volume 1e15, demais 1e9) não geram Infinity em nenhum campo', () => {
    const r = premiumBalance(V({ volume: 1e15, gold: 1e9, goldCost: 1e9, silverPerFocus: 1e9, focusPerDay: 1e9 }));
    for (const v of Object.values(r)) if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true);
  });
});

describe('cleanPremiumInputs', () => {
  const E = { gold: '', goldCost: '', volume: '', silverPerFocus: '', focusPerDay: '' };

  it('tudo vazio/undefined -> padrões sem aviso (estado antigo)', () => {
    for (const cfg of [E, {}, undefined]) {
      const { values, issues } = cleanPremiumInputs(cfg);
      expect(values).toEqual(DEFAULTS);
      expect(issues).toEqual([]);
    }
  });

  it('texto e número válidos entram; "9414" e 9414 valem igual', () => {
    const a = cleanPremiumInputs({ gold: '9414', goldCost: '3000', volume: 2e7, silverPerFocus: '6.78', focusPerDay: '5000' });
    expect(a.values).toEqual({ gold: 9414, goldCost: 3000, volume: 2e7, silverPerFocus: 6.78, focusPerDay: 5000 });
    expect(a.issues).toEqual([]);
  });

  it('"abc", -5, NaN: aviso e padrão', () => {
    for (const bad of ['abc', -5, '-5', NaN]) {
      const { values, issues } = cleanPremiumInputs({ gold: bad, goldCost: bad, volume: bad, silverPerFocus: bad, focusPerDay: bad });
      expect(values).toEqual(DEFAULTS);
      expect(issues.map((i) => i.field).sort()).toEqual(['focusPerDay', 'gold', 'goldCost', 'silverPerFocus', 'volume']);
      for (const i of issues) expect(i.msg).toBeTruthy();
    }
  });

  it('ouro 0 é inválido (aviso, ausente); goldCost 0 é válido', () => {
    const a = cleanPremiumInputs({ gold: '0', goldCost: '0' });
    expect(a.values.gold).toBeNull();
    expect(a.values.goldCost).toBe(0);
    expect(a.issues.map((i) => i.field)).toEqual(['gold']);
  });

  it('"1e300" no volume -> teto 1e15 com aviso; nos demais -> teto 1e9', () => {
    const { values, issues } = cleanPremiumInputs({ ...E, volume: '1e300', gold: '1e300', silverPerFocus: 1e300 });
    expect(values.volume).toBe(1e15);
    expect(values.gold).toBe(1e9);
    expect(values.silverPerFocus).toBe(1e9);
    expect(issues.map((i) => i.field).sort()).toEqual(['gold', 'silverPerFocus', 'volume']);
  });

  it('{ }, [1], null, true, função não aparecem ecoados e não lançam', () => {
    const { values, issues } = cleanPremiumInputs({ gold: {}, goldCost: [1], volume: null, silverPerFocus: true, focusPerDay: () => 1 });
    expect(values).toEqual(DEFAULTS);
    expect(issues.map((i) => i.field).sort()).toEqual(['focusPerDay', 'gold', 'goldCost', 'silverPerFocus']);
    for (const i of issues) expect(i.msg).not.toMatch(/object|\[|true|=>/i);
  });

  it('cfg null/array/texto -> padrões sem lançar', () => {
    for (const cfg of [null, [], 'x', 5]) {
      expect(cleanPremiumInputs(cfg).values).toEqual(DEFAULTS);
      expect(cleanPremiumInputs(cfg).issues).toEqual([]);
    }
  });
});
