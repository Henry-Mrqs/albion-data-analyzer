// Saídas por cidade: "esta saída tem comprador real?". Fonte única dessa regra (Craft e Preço-alvo).
// Comprador real = ordem de compra (buy_price_max > 0) visível e recente. Ordem de venda sem
// ordem de compra na cidade é saída "ilusória". O Black Market nunca gera ordem de venda.
import { SELL_CITIES, quote } from './market';

// Decisão de produto (não é dado do jogo): limite padrão de idade do dado. Fonte única: o Flipper importa esta constante (DT-003).
export const DEFAULT_MAX_AGE_H = 24;

const H = 3600000;
// Mesma regra do fresh() do Flipper (flip.js): sem data = velho; maxAgeH 0 desliga o limite.
export const isFresh = (date, now, maxAgeH) => !!date && (!maxAgeH || now - date <= maxAgeH * H);
const params = ({ now = Date.now(), maxAgeH = DEFAULT_MAX_AGE_H } = {}) => ({ now, maxAgeH });

/** Ordem de compra de uma cidade: { buyer, price, date, stale }. buyer = há ordem de compra fresca. */
export function cityBuyer(prices, mid, city, opts) {
  const { now, maxAgeH } = params(opts);
  const { price, date } = quote(prices, mid, city, 'buy');
  const stale = !isFresh(date, now, maxAgeH);
  return { buyer: price > 0 && !stale, price, date, stale };
}

/** Maior ordem de compra fresca entre todas as cidades (inclui Black Market): { price, city, date } | null. */
export function bestBuyer(prices, mid, opts) {
  let best = null;
  for (const city of SELL_CITIES) {
    const { buyer, price, date } = cityBuyer(prices, mid, city, opts);
    if (buyer && (!best || price > best.price)) best = { price, city, date };
  }
  return best;
}

/** Todas as saídas possíveis do item, na ordem das cidades (instantânea antes da ordem). */
export function exitsFor(prices, mid, opts) {
  const o = params(opts);
  const out = [];
  for (const city of SELL_CITIES) {
    const buy = quote(prices, mid, city, 'buy');
    if (buy.price > 0) {
      out.push({ city, mode: 'instant', price: buy.price, date: buy.date, buyer: true, illusory: false, stale: !isFresh(buy.date, o.now, o.maxAgeH) });
    }
    const sell = quote(prices, mid, city, 'sell');
    if (sell.price > 0 && city !== 'Black Market') {
      const buyer = cityBuyer(prices, mid, city, o).buyer;
      out.push({ city, mode: 'order', price: sell.price, date: sell.date, buyer, illusory: !buyer, stale: !isFresh(sell.date, o.now, o.maxAgeH) });
    }
  }
  return out;
}

/** Anota as options do craft ({city, mode, price, date}) com { buyer, illusory, stale }; não muta. */
export function annotateOptions(options, prices, mid, opts) {
  const o = params(opts);
  return options.map((x) => {
    const buyer = x.mode === 'instant' ? true : cityBuyer(prices, mid, x.city, o).buyer;
    return { ...x, buyer, illusory: x.mode === 'order' && !buyer, stale: !isFresh(x.date, o.now, o.maxAgeH) };
  });
}

/** Texto da dica "ilusória" da tabela, com o limite de idade realmente usado (nunca um "24 h" escrito à mão). */
export function illusoryHint(maxAgeH = DEFAULT_MAX_AGE_H) {
  const age = maxAgeH ? `dado com menos de ${maxAgeH} h` : 'sem limite de idade do dado';
  return `Ilusória: ordem de venda sem ordem de compra visível na cidade (${age}).`;
}

/** best = primeira (melhor no papel); bestReal = primeira que não é ilusória nem velha. */
export function pickExit(options) {
  return { best: options[0], bestReal: options.find((x) => !x.illusory && !x.stale) };
}
