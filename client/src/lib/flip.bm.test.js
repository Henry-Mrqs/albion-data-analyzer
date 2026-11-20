// IDEIA-088: linha do Flipper com destino Mercado Negro ganha a 2ª leitura (sell_price_min) em campos alt*, sem mudar o resto.
import { describe, expect, it } from 'vitest';
import { flipRows } from './flip';
import { netSale } from './econ';
import { mkPrices } from '../test/helpers';

const now = 1_700_000_000_000;
const H = 3600000;
const mk = (bm) => mkPrices({
  T6_MAIN_SWORD: { Martlock: { s: 1000, sd: now - H, b: 900, bd: now - H }, Caerleon: { s: 1600, sd: now - 2 * H, b: 1500, bd: now - H }, 'Black Market': bm },
});
const cfg = { buyCities: ['Martlock'], sellCities: ['Caerleon', 'Black Market'], buyMode: 'instant', sellMode: 'any', minProfit: 0, minMargin: 0, maxAge: 24, budget: '' };

describe('flipRows: 2ª leitura do Mercado Negro', () => {
  it('destino Mercado Negro com lista: altPrice, altProfit (netSale instantâneo - custo) e altStale; o resto da linha não muda', () => {
    const [r] = flipRows(mk({ b: 1700, bd: now - H, s: 9000, sd: now - H }), cfg, true, now);
    const [ref] = flipRows(mk({ b: 1700, bd: now - H }), cfg, true, now);
    expect(r.sell).toBe('Black Market');
    expect(r.altPrice).toBe(9000);
    expect(r.altProfit).toBeCloseTo(netSale(9000, 'instant', true) - 1000, 6);
    expect(r.altStale).toBe(false);
    const { altPrice, altProfit, altStale, ...rest } = r; // eslint-disable-line no-unused-vars
    expect(rest).toEqual(ref);
  });
  it('lista velha: altStale true; sem lista ou destino outra cidade: sem campos alt', () => {
    const [old] = flipRows(mk({ b: 1700, bd: now - H, s: 9000, sd: now - 30 * H }), cfg, true, now);
    expect(old.altStale).toBe(true);
    const [nolist] = flipRows(mk({ b: 1700, bd: now - H }), cfg, true, now);
    expect(nolist.altPrice).toBeUndefined();
    const [other] = flipRows(mk({ b: 100, bd: now - H, s: 9000, sd: now - H }), cfg, true, now);
    expect(other.sell).toBe('Caerleon');
    expect(other.altPrice).toBeUndefined();
  });
});
