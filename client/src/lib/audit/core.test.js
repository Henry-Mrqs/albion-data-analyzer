// IDEIA-005 Task 1: construtor de linha (V2) e apiRow.
import { describe, expect, it } from 'vitest';
import { apiRow, countRows, row, ORIGINS, STATUSES } from './core';

const NOW = Date.parse('2026-11-19T12:00:00Z');
const H = 3600000;
const ok = { id: 'x', label: 'Algo', value: 1, unit: 'prata', origin: 'user', status: 'applied' };

describe('row (V2)', () => {
  it('sem origem, origem fora da lista, sem estado, estado fora da lista ou sem label LANÇA; com tudo, devolve o objeto', () => {
    expect(() => row({ ...ok, origin: undefined })).toThrow(/origem/);
    expect(() => row({ ...ok, origin: 'inventada' })).toThrow(/origem/);
    expect(() => row({ ...ok, status: undefined })).toThrow(/estado/);
    expect(() => row({ ...ok, status: 'quase' })).toThrow(/estado/);
    expect(() => row({ ...ok, label: '' })).toThrow(/label/);
    expect(() => row({ ...ok, label: undefined })).toThrow(/label/);
    expect(() => row({ ...ok, id: '' })).toThrow(/id/);
    expect(row(ok)).toMatchObject(ok);
    for (const o of ORIGINS) expect(row({ ...ok, origin: o }).origin).toBe(o);
    for (const s of STATUSES) expect(row({ ...ok, status: s }).status).toBe(s);
  });
});

describe('apiRow', () => {
  const base = { id: 'p', label: 'Preço', price: 4500, now: NOW, maxAgeH: 24 };
  it('4.500 com data de 2 h atrás: origin "api", status "applied"', () => {
    const r = apiRow({ ...base, date: NOW - 2 * H });
    expect(r).toMatchObject({ origin: 'api', status: 'applied', value: 4500 });
  });
  it('25 h: "stale"; limite exato de 24 h ainda vale', () => {
    expect(apiRow({ ...base, date: NOW - 25 * H }).status).toBe('stale');
    expect(apiRow({ ...base, date: NOW - 24 * H }).status).toBe('applied');
  });
  it('sem data: "stale" com nota "sem data"', () => {
    const r = apiRow({ ...base, date: null });
    expect(r.status).toBe('stale');
    expect(r.note).toContain('sem data');
  });
  it('preço 0 ou NaN: "not-considered" com nota "sem preço"', () => {
    for (const price of [0, NaN, undefined, null]) {
      const r = apiRow({ ...base, price, date: NOW });
      expect(r.status).toBe('not-considered');
      expect(r.note).toContain('sem preço');
    }
  });
  it('maxAgeH 0 desliga o limite de idade (mas sem data continua velho)', () => {
    expect(apiRow({ ...base, maxAgeH: 0, date: NOW - 900 * H }).status).toBe('applied');
    expect(apiRow({ ...base, maxAgeH: 0, date: null }).status).toBe('stale');
  });
  it('guarda a data e a nota recebida', () => {
    const r = apiRow({ ...base, date: NOW - H, note: 'Lymhurst' });
    expect(r.date).toBe(NOW - H);
    expect(r.note).toContain('Lymhurst');
  });
});

describe('countRows', () => {
  it('conta cada estado separado (velha não soma em aplicada)', () => {
    const mk = (status) => row({ ...ok, status });
    const c = countRows([mk('applied'), mk('applied'), mk('unconfirmed'), mk('stale'), mk('not-considered'), mk('not-considered'), mk('not-considered'), mk('info-only')]);
    expect(c).toEqual({ applied: 2, unconfirmed: 1, stale: 1, notConsidered: 3, infoOnly: 1 });
  });
});
