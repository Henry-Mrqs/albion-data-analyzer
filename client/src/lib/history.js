// Histórico de vendas (API `stats/history` do AODP, IDEIA-010). Parte pura primeiro: parsing e URL, testáveis sem rede.

const normCity = (c) => (c === 'BlackMarket' ? 'Black Market' : c);
const parseTs = (s) => (typeof s === 'string' && s ? Date.parse(s.endsWith('Z') ? s : `${s}Z`) : NaN);

/**
 * Linhas da API -> { [mid]: { [cidade]: [{ t, n, p }] } }.
 * Só qualidade 1; t em ms UTC (timestamp sem 'Z' = UTC), ordenado; 'BlackMarket' -> 'Black Market';
 * linha com data:[] vira [] (pedido sem registros); linha ou ponto ruim é pulado, sem exceção.
 */
export function parseHistory(rows) {
  const out = {};
  if (!Array.isArray(rows)) return out;
  for (const r of rows) {
    if (!r || typeof r.item_id !== 'string' || typeof r.location !== 'string' || !Array.isArray(r.data)) continue;
    if ((r.quality || 1) !== 1) continue;
    const list = ((out[r.item_id] ??= {})[normCity(r.location)] ??= []);
    for (const d of r.data) {
      const t = parseTs(d?.timestamp);
      const n = d?.item_count;
      const p = d?.avg_price;
      if (!Number.isFinite(t) || !Number.isFinite(n) || n < 0 || !Number.isFinite(p) || p < 0) continue;
      list.push({ t, n, p });
    }
  }
  for (const byCity of Object.values(out)) for (const c of Object.keys(byCity)) byCity[c].sort((a, b) => a.t - b.t);
  return out;
}

export function historyUrl({ server, ids, cities, scale = 24, qualities = '1' }) {
  return `https://${server}.albion-online-data.com/api/v2/stats/history/${ids.map(encodeURIComponent).join(',')}?locations=${encodeURIComponent(cities.join(','))}&time-scale=${scale}&qualities=${encodeURIComponent(qualities)}`;
}
