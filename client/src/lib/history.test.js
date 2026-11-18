import { describe, expect, it } from 'vitest';
import { historyUrl, parseHistory } from './history';

// Formato real da API (dossiê L2): linhas { location, item_id, quality, data:[{item_count, avg_price, timestamp}] }.
const rows = [
  { location: 'Caerleon', item_id: 'T4_BAG', quality: 1, data: [{ item_count: 61, avg_price: 4779, timestamp: '2026-10-20T00:00:00' }, { item_count: 82, avg_price: 4403, timestamp: '2026-10-19T00:00:00' }] },
  { location: 'Black Market', item_id: 'T4_BAG', quality: 1, data: [] },
  { location: 'BlackMarket', item_id: 'T4_MAIN_SWORD', quality: 1, data: [{ item_count: 2, avg_price: 9000, timestamp: '2026-10-19T00:00:00' }] },
  { location: 'Caerleon', item_id: 'T4_BAG', quality: 2, data: [{ item_count: 9, avg_price: 1, timestamp: '2026-10-19T00:00:00' }] },
];

describe('parseHistory', () => {
  it('agrupa por item e cidade, ordena por data e lê o timestamp sem Z como UTC', () => {
    const h = parseHistory(rows);
    expect(h.T4_BAG.Caerleon).toEqual([
      { t: Date.parse('2026-10-19T00:00:00Z'), n: 82, p: 4403 },
      { t: Date.parse('2026-10-20T00:00:00Z'), n: 61, p: 4779 },
    ]);
  });
  it('"BlackMarket" e "Black Market" viram "Black Market"; data:[] vira [] (pedido sem registros)', () => {
    const h = parseHistory(rows);
    expect(h.T4_MAIN_SWORD['Black Market']).toHaveLength(1);
    expect(h.T4_BAG['Black Market']).toEqual([]);
  });
  it('qualidade diferente de 1 é ignorada (não soma nem sobrescreve a série)', () => {
    expect(parseHistory(rows).T4_BAG.Caerleon).toHaveLength(2);
  });
  it('timestamp com Z também é UTC', () => {
    const h = parseHistory([{ location: 'Caerleon', item_id: 'T4_X', quality: 1, data: [{ item_count: 1, avg_price: 1, timestamp: '2026-10-19T00:00:00Z' }] }]);
    expect(h.T4_X.Caerleon[0].t).toBe(Date.parse('2026-10-19T00:00:00Z'));
  });
  it('entrada que não é array vira {}', () => {
    for (const x of [null, undefined, {}, 'x', 5]) expect(parseHistory(x)).toEqual({});
  });
  it('ponto ruim (item_count não numérico, timestamp inválido, preço negativo) é pulado, sem exceção', () => {
    const bad = [{ location: 'X', item_id: 'T4_X', quality: 1, data: [{ item_count: 'a', avg_price: 1, timestamp: 'zzz' }, { item_count: 5, avg_price: 1, timestamp: 'zzz' }, { item_count: -3, avg_price: 1, timestamp: '2026-10-19T00:00:00' }, null] }];
    expect(parseHistory(bad).T4_X.X).toEqual([]);
  });
  it('linha ruim (sem item_id, sem location, data não array) é pulada', () => {
    const h = parseHistory([null, { location: 'Caerleon', quality: 1, data: [] }, { item_id: 'T4_X', quality: 1, data: [] }, { location: 'Caerleon', item_id: 'T4_Y', quality: 1, data: 'x' }]);
    expect(h).toEqual({});
  });
  it('linhas repetidas da mesma cidade/item juntam os pontos', () => {
    const r = (d) => ({ location: 'Caerleon', item_id: 'T4_X', quality: 1, data: [{ item_count: 1, avg_price: 1, timestamp: `2026-10-${d}T00:00:00` }] });
    expect(parseHistory([r(20), r(19)]).T4_X.Caerleon.map((x) => x.t)).toEqual([Date.parse('2026-10-19T00:00:00Z'), Date.parse('2026-10-20T00:00:00Z')]);
  });
  it('sem quality na linha conta como qualidade 1 (mesma regra do market.js)', () => {
    const h = parseHistory([{ location: 'Caerleon', item_id: 'T4_X', data: [{ item_count: 1, avg_price: 1, timestamp: '2026-10-19T00:00:00' }] }]);
    expect(h.T4_X.Caerleon).toHaveLength(1);
  });
});

describe('historyUrl', () => {
  it('servidor, ids e cidades codificados, time-scale=24, qualities=1', () => {
    expect(historyUrl({ server: 'west', ids: ['T4_BAG', 'T4_PLANKS_LEVEL1@1'], cities: ['Caerleon', 'Black Market'] })).toBe(
      'https://west.albion-online-data.com/api/v2/stats/history/T4_BAG,T4_PLANKS_LEVEL1%401?locations=Caerleon%2CBlack%20Market&time-scale=24&qualities=1',
    );
  });
  it('respeita servidor, escala e qualidades informados', () => {
    expect(historyUrl({ server: 'europe', ids: ['T4_BAG'], cities: ['Caerleon'], scale: 6, qualities: '1,2' })).toBe(
      'https://europe.albion-online-data.com/api/v2/stats/history/T4_BAG?locations=Caerleon&time-scale=6&qualities=1%2C2',
    );
  });
});
