import { describe, expect, it } from 'vitest';
import { annotateOptions, bestBuyer, cityBuyer, DEFAULT_MAX_AGE_H, exitsFor, illusoryHint, pickExit } from './exits';
import { marketGap } from './targetPrice';
import { netSale } from './econ';
import { mkPrices } from '../test/helpers';

const now = 1e12;
const H = 3.6e6;
const prices = mkPrices({
  T4_MAIN_SWORD: {
    Caerleon: { s: 12000, sd: now - 14.5 * H },
    Lymhurst: { s: 5525, sd: now - 10 * H },
    'Black Market': { b: 1185, bd: now - 2 * H },
  },
});
const C = 3524.2707; // custo do dossiê 030 (espada T4, Lymhurst)

describe('exits (saída com comprador real)', () => {
  it('limite padrão de idade é 24 h', () => expect(DEFAULT_MAX_AGE_H).toBe(24));

  it('exitsFor lista exatamente 3 saídas, na ordem das cidades', () => {
    expect(exitsFor(prices, 'T4_MAIN_SWORD', { now }).map((e) => [e.city, e.mode, e.price, e.buyer, e.illusory])).toEqual([
      ['Lymhurst', 'order', 5525, false, true],
      ['Caerleon', 'order', 12000, false, true],
      ['Black Market', 'instant', 1185, true, false],
    ]);
  });

  it('as outras cidades não têm saída', () => expect(exitsFor(prices, 'T4_MAIN_SWORD', { now })).toHaveLength(3));

  it('lucros do dossiê', () => {
    expect(netSale(1185, 'instant', true)).toBeCloseTo(1137.6, 2);
    expect(netSale(1185, 'instant', true) - C).toBeCloseTo(-2386.67, 2);
    expect(netSale(12000, 'order', true)).toBeCloseTo(11220, 2);
    expect(netSale(12000, 'order', true) - C).toBeCloseTo(7695.73, 2);
    expect(netSale(5525, 'order', true) - C).toBeCloseTo(1641.61, 1);
  });

  it('pickExit: melhor no papel é ilusória; a com comprador é o Black Market com prejuízo', () => {
    const opts = [
      { city: 'Caerleon', mode: 'order', price: 12000, date: now - 14.5 * H },
      { city: 'Lymhurst', mode: 'order', price: 5525, date: now - 10 * H },
      { city: 'Black Market', mode: 'instant', price: 1185, date: now - 2 * H },
    ]
      .map((o) => ({ ...o, profit: netSale(o.price, o.mode, true) - C }))
      .sort((a, b) => b.profit - a.profit);
    const { best, bestReal } = pickExit(annotateOptions(opts, prices, 'T4_MAIN_SWORD', { now }));
    expect(best).toMatchObject({ city: 'Caerleon', illusory: true });
    expect(bestReal).toMatchObject({ city: 'Black Market', illusory: false });
    expect(bestReal.profit).toBeCloseTo(-2386.67, 2);
  });

  it('annotateOptions não muta a entrada e mantém a ordem', () => {
    const opts = [{ city: 'Lymhurst', mode: 'order', price: 5525, date: now - H }];
    const out = annotateOptions(opts, prices, 'T4_MAIN_SWORD', { now });
    expect(opts[0]).not.toHaveProperty('illusory');
    expect(out[0]).toMatchObject({ city: 'Lymhurst', buyer: false, illusory: true, stale: false });
  });

  it('Black Market nunca gera ordem de venda, mesmo com sell_price_min', () => {
    const p = mkPrices({ T4_X: { 'Black Market': { s: 5000, sd: now, b: 1000, bd: now } } });
    expect(exitsFor(p, 'T4_X', { now }).map((e) => e.mode)).toEqual(['instant']);
  });

  it('ordem com comprador na mesma cidade não é ilusória', () => {
    const p = mkPrices({ T4_X: { Caerleon: { s: 12000, sd: now, b: 900, bd: now } } });
    expect(exitsFor(p, 'T4_X', { now }).map((e) => [e.mode, e.illusory])).toEqual([['instant', false], ['order', false]]);
  });

  it('comprador velho: a ordem fica ilusória e a saída instantânea marca stale', () => {
    const p = mkPrices({ T4_X: { Caerleon: { s: 12000, sd: now, b: 900, bd: now - 30 * H } } });
    const ex = exitsFor(p, 'T4_X', { now });
    expect(ex.find((e) => e.mode === 'order')).toMatchObject({ buyer: false, illusory: true });
    expect(ex.find((e) => e.mode === 'instant')).toMatchObject({ stale: true });
  });

  it('borda da idade: 24 h exatas = fresco; +1 ms = velho; maxAgeH 0 desliga; data nula = velho', () => {
    const at = (age) => mkPrices({ T4_X: { Caerleon: { b: 100, bd: now - age } } });
    expect(cityBuyer(at(24 * H), 'T4_X', 'Caerleon', { now, maxAgeH: 24 }).stale).toBe(false);
    expect(cityBuyer(at(24 * H + 1), 'T4_X', 'Caerleon', { now, maxAgeH: 24 }).stale).toBe(true);
    expect(cityBuyer(at(1000 * H), 'T4_X', 'Caerleon', { now, maxAgeH: 0 }).stale).toBe(false);
    expect(cityBuyer(mkPrices({ T4_X: { Caerleon: { b: 100 } } }), 'T4_X', 'Caerleon', { now }).stale).toBe(true);
  });

  it('bestBuyer: maior ordem de compra fresca, inclui Black Market; velha ou zero não conta', () => {
    const p = mkPrices({
      T4_X: { Martlock: { b: 3796, bd: now - H }, Caerleon: { s: 1275, sd: now - H }, 'Black Market': { b: 2000, bd: now - 30 * H } },
    });
    expect(bestBuyer(p, 'T4_X', { now })).toMatchObject({ price: 3796, city: 'Martlock' });
    expect(bestBuyer(mkPrices({ T4_X: { Caerleon: { s: 1275, sd: now } } }), 'T4_X', { now })).toBeNull();
  });

  it('bestBuyer escolhe o Black Market quando ele paga mais e está fresco', () => {
    const p = mkPrices({ T4_X: { Martlock: { b: 3000, bd: now }, 'Black Market': { b: 4000, bd: now } } });
    expect(bestBuyer(p, 'T4_X', { now })).toMatchObject({ price: 4000, city: 'Black Market' });
  });

  it('prices null ou item ausente: listas vazias e null', () => {
    expect(exitsFor(null, 'T4_X', { now })).toEqual([]);
    expect(bestBuyer(null, 'T4_X', { now })).toBeNull();
    expect(bestBuyer(mkPrices({}), 'T4_X', { now })).toBeNull();
    expect(exitsFor(mkPrices({}), 'T4_X', { now })).toEqual([]);
  });

  it('030: poção T4, alvo 2.924, menor listado 1.275 em Caerleon mas Martlock tem comprador a 3.796', () => {
    const p = mkPrices({ T4_POTION_HEAL: { Caerleon: { s: 1275, sd: now - H }, Martlock: { b: 3796, bd: now - H } } });
    const ref = bestBuyer(p, 'T4_POTION_HEAL', { now });
    expect(ref).toMatchObject({ price: 3796, city: 'Martlock' });
    expect(marketGap(2924, ref.price)).toBeCloseTo(-0.2297, 3); // 2924/3796 - 1
    expect(marketGap(2924, 1275)).toBeCloseTo(1.2933, 3); // lógica antiga (menor listado): alarme sem sentido
  });
});

// DT-004: cada teste abaixo mata um dos 8 mutantes sobreviventes do laudo da 066 (o código já estava certo).
describe('exits: mutantes do laudo da 066 (DT-004)', () => {
  it('M15: comprador VELHO com valor MAIOR que o fresco não vence em bestBuyer', () => {
    const p = mkPrices({ T4_X: { Martlock: { b: 9000, bd: now - 30 * H }, Caerleon: { b: 3000, bd: now - H } } });
    expect(bestBuyer(p, 'T4_X', { now })).toMatchObject({ price: 3000, city: 'Caerleon' });
  });
  it('M2: compra 0 com data fresca não é comprador', () => {
    expect(cityBuyer(mkPrices({ T4_X: { Caerleon: { b: 0, bd: now } } }), 'T4_X', 'Caerleon', { now }).buyer).toBe(false);
  });
  it('M9b: bestReal pula a saída VELHA mesmo sendo a primeira não ilusória', () => {
    const opts = [{ city: 'A', mode: 'instant', illusory: false, stale: true }, { city: 'B', mode: 'instant', illusory: false, stale: false }];
    expect(pickExit(opts).bestReal.city).toBe('B');
  });
  it('M11: saída instantânea anotada sempre tem comprador', () => {
    expect(annotateOptions([{ city: 'Caerleon', mode: 'instant', price: 100, date: now }], mkPrices({}), 'T4_X', { now })[0]).toMatchObject({ buyer: true, illusory: false });
  });
  it('M12: annotateOptions não muta a entrada (buyer e illusory ausentes na original)', () => {
    const o = [{ city: 'Caerleon', mode: 'order', price: 100, date: now }];
    annotateOptions(o, mkPrices({}), 'T4_X', { now });
    expect(o[0]).not.toHaveProperty('buyer');
    expect(o[0]).not.toHaveProperty('illusory');
  });
  it('M16: empate de preço de compra: vence a primeira cidade na ordem de SELL_CITIES', () => {
    const p = mkPrices({ T4_X: { Thetford: { b: 500, bd: now }, Martlock: { b: 500, bd: now } } });
    expect(bestBuyer(p, 'T4_X', { now }).city).toBe('Martlock');
  });
  it('M18: ordem de venda cuja compra da cidade é VELHA fica ilusória', () => {
    const p = mkPrices({ T4_X: { Caerleon: { s: 100, sd: now, b: 90, bd: now - 30 * H } } });
    expect(annotateOptions([{ city: 'Caerleon', mode: 'order', price: 100, date: now }], p, 'T4_X', { now })[0]).toMatchObject({ buyer: false, illusory: true });
  });
  it('M19: stale da ordem usa a data da ordem, não a da compra', () => {
    const p = mkPrices({ T4_X: { Caerleon: { s: 100, sd: now - 30 * H, b: 90, bd: now } } });
    expect(exitsFor(p, 'T4_X', { now }).find((e) => e.mode === 'order').stale).toBe(true);
  });
  it('stale da ordem é falso quando a ordem é fresca e a compra é velha (a data da compra não vaza)', () => {
    const p = mkPrices({ T4_X: { Caerleon: { s: 100, sd: now, b: 90, bd: now - 30 * H } } });
    expect(exitsFor(p, 'T4_X', { now }).find((e) => e.mode === 'order').stale).toBe(false);
  });
});

describe('DT-003: illusoryHint (texto da dica sem "24 h" fixo)', () => {
  it('usa o limite recebido, não 24 fixo', () => {
    expect(illusoryHint(12)).toMatch(/12 h/);
    expect(illusoryHint(12)).not.toMatch(/24 h/);
  });
  it('sem argumento usa DEFAULT_MAX_AGE_H', () => expect(illusoryHint()).toMatch(new RegExp(`${DEFAULT_MAX_AGE_H} h`)));
  it('mantém o texto da dica e não afirma giro (a nota "sem dado" saiu)', () => {
    expect(illusoryHint()).toContain('Ilusória: ordem de venda sem ordem de compra visível na cidade');
    expect(illusoryHint()).not.toMatch(/giro/i);
  });
  it('maxAge 0 (limite desligado) não fala em "0 h"', () => {
    expect(illusoryHint(0)).not.toMatch(/\b0 h/);
  });
});
