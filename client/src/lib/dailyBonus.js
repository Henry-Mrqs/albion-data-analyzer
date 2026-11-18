// Bônus diário informado pelo usuário: detecta quando ele ficou velho (passou do reset do servidor). Pura.
// Horários (dossiê IDEIA-041 D5, confiança MÉDIA): 10:00 UTC Américas/Europa, 23:00 UTC Ásia. Chaves = servidores de settings.js.
export const RESET_UTC_HOUR = { west: 10, europe: 10, east: 23 };
const DAY = 86400000;

/** ms do reset mais recente <= now. Lança se o servidor for desconhecido. */
export function lastReset(now, server) {
  const h = RESET_UTC_HOUR[server];
  if (h == null) throw new Error(`Servidor desconhecido: ${server}`);
  const d = new Date(now);
  const today = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h);
  return today <= now ? today : today - DAY;
}

// Data do bônus no futuro além desta folga (relógio levemente adiantado) é inválida: sem isso o bônus nunca expiraria.
export const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Valor efetivo do bônus. Vale 0 quando: informado antes do último reset ou sem data/data inválida (stale),
 * ou com data no futuro além de FUTURE_TOLERANCE_MS (future). Valor 0 nunca avisa. Servidor desconhecido: mantém o valor.
 */
export function effectiveDaily({ value, setAt, now, server }) {
  if (!+value) return { value, stale: false, future: false };
  if (RESET_UTC_HOUR[server] == null) return { value, stale: false, future: false };
  if (+setAt > now + FUTURE_TOLERANCE_MS) return { value: 0, stale: false, future: true };
  const stale = !(+setAt >= lastReset(now, server));
  return stale ? { value: 0, stale: true, future: false } : { value, stale: false, future: false };
}

// D8 do dossiê (confiança MÉDIA): a lista de categorias que recebem o bônus não foi confirmada em fonte oficial.
export const DAILY_NOTE =
  'O bônus diário vale só para a categoria que o jogo mostra na janela de produção. A lista de categorias ainda não foi confirmada em fonte oficial: confira no jogo antes de contar com ele.';

/** A nota aparece sempre que há bônus diário informado (qualquer valor não vazio e diferente de 0) ou o cartão "vale esperar" está na tela. */
export function showDailyNote({ craftDaily, hasCard }) {
  const informed = craftDaily != null && String(craftDaily).trim() !== '' && +craftDaily !== 0;
  return !!hasCard || informed;
}
