// IDEIA-005 (Auditor de variáveis): linhas do quadro "Variáveis deste cálculo". Puro: sem React, fetch ou localStorage.
// O auditor SÓ LÊ o que o cálculo usou (V1): nenhuma fórmula é copiada para cá.
import { DEFAULT_MAX_AGE_H } from '../exits';
import { STEPS, THIN_MARGIN } from '../stress';

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

// valor digitado "como veio", sem eco de objeto: texto e número aparecem; o resto vira "(valor inválido)"
const shown = (v) => {
  if (typeof v === 'string') return v.trim() === '' ? '(vazio)' : v.length > 24 ? `${v.slice(0, 24)}…` : v;
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '(valor inválido)';
  return v === null || v === undefined ? '(vazio)' : '(valor inválido)';
};

/** Texto de um valor digitado para exibir: texto/número como vieram; vazio = "não informado"; objeto/lista = "(valor inválido)" (nunca "[object Object]"). */
export const plain = (v) => (v === undefined || v === null || v === '' ? 'não informado' : typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v)) ? String(v) : '(valor inválido)');

/** Junta frases de uma nota: sem ponto final duplicado, separadas por ". " e com ponto no fim. */
export const joinNote = (...parts) => {
  const p = parts.filter(Boolean).map((s) => String(s).trim().replace(/\.+$/, ''));
  return p.length ? `${p.join('. ')}.` : undefined;
};

/** Nota "corrigido de X para Y" a partir das `issues` da IDEIA-060 para um campo (undefined se não houve correção). */
export function correctionNote(issues, field) {
  const list = Array.isArray(issues) ? issues.filter((i) => i && i.field === field) : [];
  if (!list.length) return undefined;
  return list.map((i) => `corrigido de ${shown(i.raw)} para ${i.used == null ? 'automático' : shown(i.used)}`).join('; ');
}

// Variáveis do jogo que o app NÃO modela (V3): sempre listadas, mesmo sem aviso.
const NOT_CONSIDERED = {
  relists: ['Relistagens da ordem de venda', 'Cada atualização da ordem cobra 2,5% de novo; o cálculo principal não cobra. Só o cartão Preço-alvo tem uma estimativa digitada.'],
  transport: ['Transporte entre cidades', 'Custo e risco de levar material ou produto entre cidades só entram se você os digitar como despesa extra.'],
  quality: ['Qualidade do item e do material', 'Os preços usados são sempre de qualidade 1.'],
  journal: ['Diário de ofício (journal)', 'Não é o "bônus diário" (+10/+20) da tela: o ganho do diário de ofício não é modelado.'],
  focusSilver: ['Custo do foco em prata', 'O foco entra só como interruptor de RRR; o valor do ponto em prata é uma referência digitada no cartão de foco.'],
  stock: ['Estoque que você já tem', 'O custo de oportunidade de usar material guardado não é considerado: todo material é tratado como comprado.'],
  drift: ['Mudança de preço durante a produção', 'Os preços são os da consulta de agora.'],
  faction: ['Moeda e ficha de facção', 'Receitas que usam coração ou moeda de facção (IDEIA-068) não são modeladas.'],
  factionRecipe: ['Receita alternativa com coração de facção', 'A receita alternativa de refino com coração de facção (IDEIA-068) não é modelada.'],
  transportBuy: ['Transporte da cidade de compra até a de refino', 'O custo de levar o material até a cidade de refino não está incluído.'],
  stoneBatch: ['Receitas em lote do bloco de pedra com rocha encantada', 'Não modeladas (IDEIA-068).'],
};

/** Linhas "NÃO considerada" para os ids pedidos (valor "não modelada"; origem "padrão do app": é uma escolha do app). */
export function notConsideredRows(ids) {
  return ids.map((id) => {
    const [label, note] = NOT_CONSIDERED[id];
    return row({ id: `nc-${id}`, label, value: 'não modelada', unit: '', origin: 'app-default', status: 'not-considered', note });
  });
}

/**
 * Seção "Preço-alvo" (Craft e Refino). costOf(ctx) devolve o custo por unidade que a tela passou ao cartão; ctx.noTaxOn diz se há venda sem imposto marcada.
 * Os campos do cartão (target:cfg) são do cartão Preço-alvo, que guarda o próprio estado: aqui só se diz ONDE estão (o valor vivo está no cartão).
 */
export const targetVars = (costOf) => [
  {
    id: 'target-card', label: 'Preço-alvo: objetivo, modo e relistagens', section: 'Preço-alvo', fields: ['goal', 'profit', 'margin', 'mode', 'relists'], kind: 'info-only', affects: 'none',
    build: (ctx) => [
      row({ id: 'target-card', label: 'Meta, modo de venda e relistagens do alvo', value: 'definidos no cartão Preço-alvo', unit: '', origin: 'user', status: 'info-only', note: 'Só mudam o preço-alvo, não o lucro desta tela. Cada relistagem soma 2,5% (estimativa digitada no cartão).' }),
      row({ id: 'target-inherits', label: 'Custo que o alvo herda', value: costOf(ctx), unit: 'prata por unidade', origin: 'derived', status: 'info-only', note: 'O alvo herda o custo por unidade calculado nesta tela (com RRR, taxa de bancada e despesas); não tem variáveis próprias para isso.' }),
    ],
  },
  {
    id: 'target-notax', label: 'Preço-alvo: venda sem imposto', section: 'Preço-alvo', fields: [], kind: 'not-considered', affects: 'none',
    build: (ctx) => row({
      id: 'target-notax', label: 'Venda sem imposto neste alvo', value: 'NÃO considerada', unit: '', origin: 'app-default', status: 'not-considered',
      note: ctx.noTaxOn
        ? 'Você marcou venda sem imposto, mas o alvo continua contando imposto e taxa de criação: pode ficar de 4% a 10,5% acima do necessário. (Muda quando a IDEIA-075 entrar.)'
        : 'O alvo sempre conta imposto e taxa de criação; numa venda sem imposto ele fica acima do necessário. (Muda quando a IDEIA-075 entrar.)',
    }),
  },
];

/** Seção "Estresse": passos e limiar são do app; RRR, taxa, despesas e cidade de saída não variam. */
export const stressVars = () => [
  {
    id: 'stress-params', label: 'Estresse: passos e margem fina', section: 'Estresse', fields: [], kind: 'info-only', affects: 'none',
    build: () => {
      const top = Math.max(...STEPS.map(Math.abs)) * 100;
      const low = Math.min(...STEPS.filter((s) => s !== 0).map(Math.abs)) * 100;
      return [
        row({ id: 'stress-steps', label: 'Passos de preço e custo do estresse', value: `±${Math.round(low)}% a ±${Math.round(top)}%`, unit: '', origin: 'app-default', status: 'info-only', source: 'decisão de produto' }),
        row({ id: 'stress-thin', label: 'Limiar de margem fina', value: THIN_MARGIN * 100, unit: '%', origin: 'app-default', status: 'info-only', source: 'decisão de produto, sem fonte do jogo' }),
      ];
    },
  },
  {
    id: 'stress-fixed', label: 'Estresse: o que não varia', section: 'Estresse', fields: [], kind: 'not-considered', affects: 'none',
    build: () => row({ id: 'stress-fixed', label: 'RRR, taxa de bancada, despesas e cidade de saída no estresse', value: 'não variam', unit: '', origin: 'app-default', status: 'not-considered', note: 'O teste varia só o preço de venda e o custo do material; os outros ficam fixos (usa a melhor saída).' }),
  },
];

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
