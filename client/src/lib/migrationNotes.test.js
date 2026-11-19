import { describe, expect, it } from 'vitest';
import { dismissNotice, migrationNotes, pendingNotices } from './migrationNotes';
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
      expect(notes[0].message).toMatch(/RRR \+40/);
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
