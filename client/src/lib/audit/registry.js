// IDEIA-005: registro de telas do auditor. Cada tela declara suas variáveis; o contrato (contract.test.js) reprova
// campo salvo sem linha. REGRA para toda ideia nova: campo novo em craft:cfg/refine:cfg/rrr:cfg/target:cfg (esquema, padrão
// ou set({...}) da tela) exige, no mesmo commit, um Var com o campo em `fields` (ou uma entrada em `ignoredFields` com motivo).
// Variável do jogo que o app NÃO modela entra como kind 'not-considered', sem campo.
import { countRows, row } from './core';

const KINDS = ['applied', 'info-only', 'not-considered'];
// 'rrr' = a Calculadora de RRR não tem custo nem lucro: o teste de sensibilidade mede o RRR e o retorno da receita
const AFFECTS = ['cost', 'profit', 'rrr', 'none'];
const SCREENS = new Map();

/**
 * registerScreen(id, { cfgKeys, ignoredFields, vars })
 * Var = { id, label, section?, fields: string[], kind, affects, probe?, build(ctx) -> Row | Row[] | null }
 *   kind 'applied' = o cálculo USA; 'info-only' = só mostra; 'not-considered' = o app não modela.
 *   probe = { cfg: {campo: valor}, base?: {...}, settings?: {...}, scenario?: string }: alteração usada pelo teste de sensibilidade.
 *   Obrigatório para 'applied' com campo; variável sem campo (preço da API, saída, servidor) não tem o que alterar.
 */
export function registerScreen(id, def) {
  if (SCREENS.has(id)) throw new Error(`tela do auditor duplicada: ${id}`);
  const { cfgKeys = [], ignoredFields = {}, vars } = def ?? {};
  if (!Array.isArray(vars)) throw new TypeError(`tela ${id}: vars deve ser uma lista`);
  for (const [field, motivo] of Object.entries(ignoredFields)) {
    if (typeof motivo !== 'string' || !motivo.trim()) throw new TypeError(`tela ${id}: ignoredFields.${field} sem motivo`);
  }
  const seen = new Set();
  for (const v of vars) {
    const at = `tela ${id}, var "${v?.id}"`;
    if (!v || typeof v.id !== 'string' || !v.id || seen.has(v.id)) throw new TypeError(`${at}: id ausente ou repetido`);
    seen.add(v.id);
    if (typeof v.label !== 'string' || !v.label) throw new TypeError(`${at}: sem label`);
    if (!Array.isArray(v.fields)) throw new TypeError(`${at}: fields deve ser uma lista (use [] para linha sem campo)`);
    if (!KINDS.includes(v.kind)) throw new TypeError(`${at}: kind inválido (${KINDS.join(', ')})`);
    if (!AFFECTS.includes(v.affects)) throw new TypeError(`${at}: affects inválido (${AFFECTS.join(', ')})`);
    if (typeof v.build !== 'function') throw new TypeError(`${at}: sem build`);
    if (v.kind === 'applied' && v.fields.length > 0 && !v.probe) throw new TypeError(`${at}: "applied" com campo exige probe (teste de sensibilidade)`);
  }
  SCREENS.set(id, { id, cfgKeys, ignoredFields, vars });
}

export const getScreen = (id) => SCREENS.get(id);
export const screenIds = () => [...SCREENS.keys()];

const FAIL_NOTE = 'Esta variável não pôde ser lida (dado salvo inválido ou incompleto). O cálculo da tela não foi afetado.';

/**
 * auditScreen(id, ctx) -> { screen, rows, counts }. Linhas na ordem declarada. Um build que lança (ou devolve linha
 * inválida) vira a linha "não foi possível ler"; o erro NUNCA propaga e não é repetido na tela.
 */
export function auditScreen(id, ctx) {
  const def = SCREENS.get(id);
  if (!def) throw new Error(`tela do auditor não registrada: ${id}`);
  const rows = [];
  for (const v of def.vars) {
    let made;
    try {
      const out = v.build(ctx);
      made = (Array.isArray(out) ? out : out ? [out] : []).map((r) => {
        const valid = row(r);
        return { ...valid, varId: v.id, ...(v.section && !valid.section ? { section: v.section } : {}) };
      });
    } catch {
      made = [row({ id: v.id, label: v.label, value: 'não foi possível ler', unit: '', origin: 'derived', status: 'unconfirmed', statusText: 'não lida', note: FAIL_NOTE, section: v.section, varId: v.id })];
    }
    rows.push(...made);
  }
  return { screen: id, rows, counts: countRows(rows) };
}

/** Campos salvos sem linha: [{ screen, cfgKey, field }]. fieldsByKey = { [cfgKey]: string[] } (esquema ∪ padrões ∪ set({...})). */
export function uncoveredFields(screenId, def, fieldsByKey) {
  const covered = new Set([...Object.keys(def.ignoredFields ?? {}), ...def.vars.flatMap((v) => v.fields)]);
  const out = [];
  for (const cfgKey of def.cfgKeys) for (const field of fieldsByKey[cfgKey] ?? []) if (!covered.has(field)) out.push({ screen: screenId, cfgKey, field });
  return out;
}
