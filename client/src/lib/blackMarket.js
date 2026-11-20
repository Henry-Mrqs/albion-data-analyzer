// IDEIA-088: o Mercado Negro tem DUAS leituras de preço na API e o app NÃO sabe qual delas o jogador recebe.
// Puro: sem rede, sem React. Nenhuma leitura é escolhida em silêncio: as duas aparecem rotuladas "NÃO VERIFICADO em jogo".
import { DEFAULT_MAX_AGE_H, isFresh } from './exits';
import { quote } from './market';

export const BM_CITY = 'Black Market';

/**
 * Interruptor de produto: null | 'buy' | 'list'. NÃO VERIFICADO em jogo (D-068): só o Gerente muda, depois da conferência do usuário
 * ("preço pago pelo Mercado Negro por T4 qualidade 1 e se aceita qualidade igual ou superior"). Enquanto null, o cálculo principal
 * usa a leitura MENOR (lado seguro) e a outra aparece ao lado, fora do "melhor destino".
 */
export const BM_READING_VERIFIED = null;

/** Regra do app (sem fonte de jogo): preço de lista >= 1,5x a ordem de compra = "as duas leituras divergem". */
export const BM_DIVERGENCE_RATIO = 1.5;

/** buy = buy_price_max (ordem de compra); list = sell_price_min (preço de lista). Cada uma { price, date, stale } | null. */
export function bmReadings(prices, mid, { quality = 1, now = Date.now(), maxAgeH = DEFAULT_MAX_AGE_H } = {}) {
  const read = (mode) => {
    const { price, date } = quote(prices, mid, BM_CITY, mode, quality);
    return price > 0 ? { price, date, stale: !isFresh(date, now, maxAgeH) } : null;
  };
  const buy = read('buy');
  const list = read('sell');
  const ratio = buy && list ? list.price / buy.price : null;
  return { buy, list, ratio, diverges: ratio != null && ratio >= BM_DIVERGENCE_RATIO };
}

/** Leitura do cabeçalho: a confirmada (se existir); sem confirmação, a MENOR das existentes (lado seguro); nenhuma = null. */
export function bmHeadline(readings, verified = BM_READING_VERIFIED) {
  const { buy, list } = readings ?? {};
  if ((verified === 'buy' || verified === 'list') && readings?.[verified]) return verified;
  if (buy && list) return list.price < buy.price ? 'list' : 'buy';
  if (buy) return 'buy';
  if (list) return 'list';
  return null;
}

const NAME = { buy: 'Mercado Negro: ordem de compra (buy_price_max)', list: 'Mercado Negro: preço de lista (sell_price_min)' };
/** Rótulo da leitura; "NÃO VERIFICADO em jogo" some só na leitura confirmada. */
export const bmLabel = (kind, verified = BM_READING_VERIFIED) => `${NAME[kind]}${verified === kind ? '' : ' · NÃO VERIFICADO em jogo'}`;
