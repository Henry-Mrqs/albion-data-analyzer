import { describe, expect, it } from 'vitest';
import { dismissNotice, migrationNotes, pendingNotices, noticeApplies, craftUsesRefine } from './migrationNotes';
import { rrr } from './econ';
import { loadFixtureCatalog } from '../test/helpers';
import { resetCatalog } from './catalog';
import { SAVED_STATES } from '../test/savedStates';

const store = (initial = {}) => {
  const s = { ...initial };
  return { s, getItem: (k) => (k in s ? s[k] : null), setItem: (k, v) => { s[k] = String(v); } };
};
const craftRaw = (o) => ({ 'albion:craft:cfg': typeof o === 'string' ? o : JSON.stringify(o) });
const state = (commit, noteHas) => SAVED_STATES.find((x) => x.key === 'craft:cfg' && x.commit.startsWith(commit) && (!noteHas || x.note.includes(noteHas))).saved;
const ids = (st) => migrationNotes((k) => st.getItem(`albion:${k}`)).map((n) => n.id);

describe('migrationNotes: o que avisar sobre o estado salvo antigo (D-042)', () => {
  it('craft:cfg de 8bf3014 e de 9e1e4a2 (sem refineCity): aviso do refino com a cidade especializada', () => {
    for (const saved of [state('8bf3014', 'deep:true'), state('9e1e4a2')]) {
      const notes = migrationNotes((k) => (k === 'craft:cfg' ? JSON.stringify(saved) : null));
      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe('craft-refine-city');
      expect(notes[0].message).toMatch(/configuração antiga foi atualizada/i);
      expect(notes[0].message).toMatch(/cidade especializada de cada recurso/);
      expect(notes[0].message).toMatch(/\(\+40\)/);
    }
  });

  it('estados que já têm refineCity (7fe574e, 019, 041) não avisam', () => {
    for (const c of ['7fe574e', 'ae61c3e', 'f4915f5']) expect(migrationNotes((k) => (k === 'craft:cfg' ? JSON.stringify(state(c)) : null))).toEqual([]);
  });

  it('nada salvo, {}, JSON quebrado, não-objeto e estado já gravado com _v não avisam (e nunca lançam)', () => {
    for (const raw of [null, '{}', '{quebrado', '[]', '"x"', '42', JSON.stringify({ ...state('9e1e4a2'), refineCity: 'auto', _v: 1 }), JSON.stringify({ ...state('9e1e4a2'), _v: 1 })]) {
      expect(migrationNotes((k) => (k === 'craft:cfg' ? raw : null))).toEqual([]);
    }
    expect(() => migrationNotes(() => { throw new Error('bloqueado'); })).not.toThrow();
    expect(migrationNotes(() => { throw new Error('bloqueado'); })).toEqual([]);
  });

  it('outras chaves antigas (refine, rrr, settings…) não geram aviso', () => {
    const others = SAVED_STATES.filter((x) => x.key !== 'craft:cfg');
    for (const x of others) expect(migrationNotes((k) => (k === x.key ? JSON.stringify(x.saved) : null))).toEqual([]);
  });
});

describe('pendingNotices / dismissNotice: aviso único e lembrado', () => {
  it('mostra enquanto não dispensado; depois de dispensar não volta (nem com o estado antigo ainda lá)', () => {
    const st = store(craftRaw(state('9e1e4a2')));
    expect(ids(st)).toEqual(['craft-refine-city']);
    const first = pendingNotices(st);
    expect(first.map((n) => n.id)).toEqual(['craft-refine-city']);
    dismissNotice(st, 'craft-refine-city');
    expect(st.s['albion:notice:craft-refine-city']).toBe('1');
    expect(pendingNotices(st)).toEqual([]);
  });

  it('sem armazenamento (lança) ou sem aviso: lista vazia e dispensar não lança', () => {
    const broken = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('y'); } };
    expect(pendingNotices(broken)).toEqual([]);
    expect(() => dismissNotice(broken, 'craft-refine-city')).not.toThrow();
    expect(pendingNotices(store())).toEqual([]);
  });
});

describe('texto do aviso de migração (IDEIA-071, O2)', () => {
  const msg = () => migrationNotes((k) => (k === 'craft:cfg' ? JSON.stringify(state('9e1e4a2')) : null))[0].message;

  it('fala em bônus de produção +40 e em RRR de 15% para 37% (derivados de rrr()), e NÃO tem "RRR +40"', () => {
    const m = msg();
    const antes = Math.round(rrr({ kind: 'refine', specialty: false, focus: false }) * 100);
    const depois = Math.round(rrr({ kind: 'refine', specialty: true, focus: false }) * 100);
    expect(m).toMatch(/bônus de produção/);
    expect(m).toMatch(/\(\+40\)/);
    expect(m).toContain(`${antes}%`);
    expect(m).toContain(`${depois}%`);
    expect(m).not.toMatch(/RRR \+40/);
    expect([antes, depois]).toEqual([15, 37]);
  });

  it('diz que o número de antes estava sem o bônus (O2)', () => {
    expect(msg()).toMatch(/sem o bônus/);
  });

  it('a nota é marcada como dependente do item (when craft-uses-refine)', () => {
    expect(migrationNotes((k) => (k === 'craft:cfg' ? JSON.stringify(state('9e1e4a2')) : null))[0].when).toBe('craft-uses-refine');
  });
});

describe('noticeApplies / craftUsesRefine (IDEIA-071, O3)', () => {
  it('noticeApplies: sem when sempre true; when craft-uses-refine só com ctx.craftUsesRefine', () => {
    expect(noticeApplies({ id: 'x' }, {})).toBe(true);
    expect(noticeApplies({ id: 'x', when: 'craft-uses-refine' }, { craftUsesRefine: true })).toBe(true);
    expect(noticeApplies({ id: 'x', when: 'craft-uses-refine' }, { craftUsesRefine: false })).toBe(false);
    expect(noticeApplies({ id: 'x', when: 'craft-uses-refine' }, {})).toBe(false);
  });

  it('craftUsesRefine: espada T6 true; poção T4 e artefato só com fragmentos false; item inexistente/null/id número false', () => {
    loadFixtureCatalog();
    expect(craftUsesRefine({ id: 'T6_MAIN_SWORD', ench: 0 })).toBe(true);
    expect(craftUsesRefine({ id: 'T4_POTION_HEAL', ench: 0 })).toBe(false);
    expect(craftUsesRefine({ id: 'T6_ARTEFACT_MAIN_SWORD_CRYSTAL', ench: 0 })).toBe(false);
    expect(craftUsesRefine({ id: 'T9_NAO_EXISTE', ench: 0 })).toBe(false);
    for (const v of [null, undefined, 5, 'x', {}, { id: 5 }, { id: null }]) expect(craftUsesRefine(v)).toBe(false);
  });

  it('craftUsesRefine: sem catálogo carregado false', () => {
    resetCatalog();
    expect(craftUsesRefine({ id: 'T6_MAIN_SWORD', ench: 0 })).toBe(false);
  });
});
