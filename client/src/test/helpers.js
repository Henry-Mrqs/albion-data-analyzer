// Utilidades de teste: catálogo da fixture e preços fictícios.
import { setCatalog, resetCatalog } from '../lib/catalog';
import fixture from './catalog.fixture.json';

// setCatalog muta os itens (_s): clonar a cada teste evita dependência de ordem.
export function loadFixtureCatalog() {
  resetCatalog();
  setCatalog(structuredClone(fixture));
}

/**
 * spec[mid] = número (preço de venda `s` em Fort Sterling)
 *           ou { [cidade]: { s = 0, b = 0, sd = null, bd = null } }.
 * Valores null/undefined são ignorados (item sem preço).
 */
export function mkPrices(spec) {
  const prices = {};
  for (const [mid, v] of Object.entries(spec)) {
    if (v == null) continue;
    const cities = typeof v === 'number' ? { 'Fort Sterling': { s: v } } : v;
    prices[mid] = {};
    for (const [city, q] of Object.entries(cities)) {
      const { s = 0, b = 0, sd = null, bd = null, sM } = q;
      prices[mid][city] = { 1: { s, sd, b, bd, ...(sM !== undefined ? { sM } : {}) } };
    }
  }
  return prices;
}

// Cenário A do plano IDEIA-001. over[mid] = número troca o preço; null remove o item.
export function planksSpec(over = {}) {
  return {
    T4_WOOD: 30, T3_WOOD: 15, T2_WOOD: 8,
    T4_PLANKS: 120, T3_PLANKS: 50, T2_PLANKS: 5,
    ...over,
  };
}
