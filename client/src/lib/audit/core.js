// IDEIA-005 (Auditor de variáveis): linhas do quadro "Variáveis deste cálculo". Puro: sem React, fetch ou localStorage.
// O auditor SÓ LÊ o que o cálculo usou (V1): nenhuma fórmula é copiada para cá.
import { DEFAULT_MAX_AGE_H } from '../exits';

export const ORIGINS = ['game', 'app-default', 'user', 'api', 'derived'];
export const STATUSES = ['applied', 'unconfirmed', 'stale', 'not-considered', 'info-only'];

// textos finais, em português (plano IDEIA-005, "Mensagens")
export const ORIGIN_LABEL = { game: 'jogo', 'app-default': 'padrão do app', user: 'digitado', api: 'API', derived: 'derivado' };
export const STATUS_LABEL = {
  applied: 'aplicada',
  unconfirmed: 'padrão não confirmado',
  stale: 'velha/expirada',
  'not-considered': 'NÃO considerada',
  'info-only': 'informativa (não muda o lucro)',
};

/**
 * Linha do quadro. V2: id, label, origem e estado são obrigatórios e vêm das listas acima (senão LANÇA).
 * { id, label, value, unit, origin, status, source?, date?, note?, statusText?, section? }
 * statusText (opcional) troca o texto do estado quando o rótulo padrão não descreve o caso (ex.: "ilusória").
 */
export function row(r) {
  if (!r || typeof r.id !== 'string' || !r.id) throw new TypeError('linha do auditor sem id');
  if (typeof r.label !== 'string' || !r.label) throw new TypeError(`linha "${r.id}" sem label`);
  if (!ORIGINS.includes(r.origin)) throw new TypeError(`linha "${r.id}" sem origem válida (${ORIGINS.join(', ')})`);
  if (!STATUSES.includes(r.status)) throw new TypeError(`linha "${r.id}" sem estado válido (${STATUSES.join(', ')})`);
  return { ...r };
}

const hasPrice = (p) => typeof p === 'number' && Number.isFinite(p) && p > 0;
const H = 3600000;

/**
 * Linha de um preço da API com a idade do dado. Mesma regra de idade do exits.js: sem data = velho;
 * maxAgeH 0 desliga o limite. Preço 0/NaN/ausente: "NÃO considerada" (sem preço).
 */
export function apiRow({ id, label, price, date, now = Date.now(), maxAgeH = DEFAULT_MAX_AGE_H, unit = 'prata', source, note }) {
  const join = (...parts) => parts.filter(Boolean).join('; ') || undefined;
  if (!hasPrice(price)) return row({ id, label, value: null, unit, origin: 'api', status: 'not-considered', source, note: join(note, 'sem preço') });
  if (!date) return row({ id, label, value: price, unit, origin: 'api', status: 'stale', source, note: join(note, 'sem data') });
  const stale = !!maxAgeH && now - date > maxAgeH * H;
  return row({
    id, label, value: price, unit, origin: 'api', status: stale ? 'stale' : 'applied', source, date,
    note: join(note, stale ? `dado com mais de ${maxAgeH} h` : undefined),
  });
}

/** Contagem por estado, para o cabeçalho do cartão. */
export function countRows(rows) {
  const c = { applied: 0, unconfirmed: 0, stale: 0, notConsidered: 0, infoOnly: 0 };
  for (const r of rows) {
    if (r.status === 'applied') c.applied++;
    else if (r.status === 'unconfirmed') c.unconfirmed++;
    else if (r.status === 'stale') c.stale++;
    else if (r.status === 'not-considered') c.notConsidered++;
    else if (r.status === 'info-only') c.infoOnly++;
  }
  return c;
}
