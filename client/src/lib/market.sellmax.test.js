// IDEIA-012: o app passa a guardar sell_price_max do AODP (antes descartado). Nenhum número existente muda.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchPrices } from './market';
import { mkPrices } from '../test/helpers';

afterEach(() => vi.unstubAllGlobals());

const row = (over = {}) => ({
  item_id: 'T1_FACTION_MOUNTAIN_TOKEN_1', city: 'Lymhurst', quality: 1,
  sell_price_min: 35890, sell_price_min_date: '2026-11-19T10:00:00', sell_price_max: 35890, sell_price_max_date: '2026-11-19T10:00:00',
  buy_price_min: 0, buy_price_min_date: '0001-01-01T00:00:00', buy_price_max: 0, buy_price_max_date: '0001-01-01T00:00:00', ...over,
});
const stub = (rows) => vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => rows, text: async () => JSON.stringify(rows) })));

describe('fetchPrices: sell_price_max (012)', () => {
  it('guarda sM junto de s e b', async () => {
    stub([row()]);
    const r = await fetchPrices(['T1_FACTION_MOUNTAIN_TOKEN_1'], { force: true, server: 'west' });
    expect(r.T1_FACTION_MOUNTAIN_TOKEN_1.Lymhurst[1]).toMatchObject({ s: 35890, sM: 35890, b: 0 });
  });
  it('linha sem sell_price_max: sM 0', async () => {
    stub([row({ sell_price_max: undefined, item_id: 'T1_FACTION_MOUNTAIN_TOKEN_2' })]);
    const r = await fetchPrices(['T1_FACTION_MOUNTAIN_TOKEN_2'], { force: true, server: 'west' });
    expect(r.T1_FACTION_MOUNTAIN_TOKEN_2.Lymhurst[1].sM).toBe(0);
  });
  it('sM não vem de sell_price_min', async () => {
    stub([row({ sell_price_min: 100, sell_price_max: 300, item_id: 'T1_FACTION_MOUNTAIN_TOKEN_3' })]);
    const r = await fetchPrices(['T1_FACTION_MOUNTAIN_TOKEN_3'], { force: true, server: 'west' });
    expect(r.T1_FACTION_MOUNTAIN_TOKEN_3.Lymhurst[1]).toMatchObject({ s: 100, sM: 300 });
  });
});

describe('mkPrices (helper): sM opcional', () => {
  it('sem sM a célula é a de sempre; com sM entra', () => {
    expect(mkPrices({ X: { A: { s: 10 } } }).X.A[1]).toEqual({ s: 10, sd: null, b: 0, bd: null });
    expect(mkPrices({ X: { A: { s: 10, sM: 30000 } } }).X.A[1]).toEqual({ s: 10, sd: null, b: 0, bd: null, sM: 30000 });
  });
});
