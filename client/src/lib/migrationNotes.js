// Avisos sobre migração do estado salvo (IDEIA-070, D-042). PURO: recebe o leitor do armazenamento.
// A decisão do que avisar vem das `notes` de cada chave em persistSchemas.js (olham o objeto salvo
// ANTES da migração/mescla); aqui só se coleta, filtra o que já foi dispensado e lembra a dispensa.
import { loadPersisted } from './persist';
import { PERSISTED, getPersistedSpec } from './persistSchemas';
import { recipeOf } from './catalog';
import { canRefineUniq } from './craftPlan';

const noticeKey = (id) => `albion:notice:${id}`;

/** Notas de migração de todas as chaves. getRaw(chave sem 'albion:') → texto salvo ou null. Nunca lança. */
export function migrationNotes(getRaw) {
  const out = [];
  for (const key of Object.keys(PERSISTED)) {
    const spec = getPersistedSpec(key);
    if (!spec.notes) continue;
    try {
      const { notes } = loadPersisted(getRaw(key), { defaults: {}, ...spec });
      for (const n of notes) out.push({ ...n, key });
    } catch {
      /* armazenamento indisponível: sem aviso */
    }
  }
  return out;
}

/** Avisos ainda não dispensados. storage: { getItem }. */
export function pendingNotices(storage) {
  try {
    return migrationNotes((k) => storage.getItem(`albion:${k}`)).filter((n) => storage.getItem(noticeKey(n.id)) === null);
  } catch {
    return [];
  }
}

/** Lembra que o aviso foi dispensado (não volta). storage: { setItem }. */
export function dismissNotice(storage, id) {
  try {
    storage.setItem(noticeKey(id), '1');
  } catch {
    /* modo privado */
  }
}

/** O aviso vale para este contexto? Sem `when` sempre; 'craft-uses-refine' só se o item do Craft usa refino. */
export function noticeApplies(note, ctx = {}) {
  if (note.when === 'craft-uses-refine') return !!ctx.craftUsesRefine;
  return true;
}

/** O item do Craft (estado salvo { id, ench }) tem algum ingrediente refinável? Nunca lança; sem item/catálogo/receita => false. */
export function craftUsesRefine(itemState) {
  try {
    if (!itemState || typeof itemState.id !== 'string') return false;
    const ench = Number.isInteger(itemState.ench) ? itemState.ench : 0;
    const rec = recipeOf(itemState.id, ench);
    return !!rec && rec.res.some((r) => canRefineUniq(r.uniq));
  } catch {
    return false;
  }
}
