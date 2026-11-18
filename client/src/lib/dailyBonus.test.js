import { describe, expect, it } from 'vitest';
import { effectiveDaily, lastReset } from './dailyBonus';

const T = (s) => Date.parse(s);

describe('lastReset (D5: 10:00 UTC Américas/Europa, 23:00 UTC Ásia)', () => {
  it('west: depois das 10:00Z o reset é o de hoje; antes, o de ontem', () => {
    expect(lastReset(T('2026-11-17T12:00:00Z'), 'west')).toBe(T('2026-11-17T10:00:00Z'));
    expect(lastReset(T('2026-11-17T09:59:00Z'), 'west')).toBe(T('2026-11-16T10:00:00Z'));
  });
  it('east: reset às 23:00Z', () => {
    expect(lastReset(T('2026-11-17T22:00:00Z'), 'east')).toBe(T('2026-11-16T23:00:00Z'));
    expect(lastReset(T('2026-11-17T23:30:00Z'), 'east')).toBe(T('2026-11-17T23:00:00Z'));
  });
  it('europe = west', () => expect(lastReset(T('2026-11-17T12:00:00Z'), 'europe')).toBe(lastReset(T('2026-11-17T12:00:00Z'), 'west')));
  it('no instante exato do reset, vale o próprio reset', () => expect(lastReset(T('2026-11-17T10:00:00Z'), 'west')).toBe(T('2026-11-17T10:00:00Z')));
  it('servidor desconhecido lança', () => expect(() => lastReset(1e12, 'mars')).toThrow());
});

describe('effectiveDaily', () => {
  it('bônus informado antes do reset fica velho e vale 0', () => {
    expect(effectiveDaily({ value: 20, setAt: T('2026-11-17T09:00:00Z'), now: T('2026-11-17T12:00:00Z'), server: 'west' })).toEqual({ value: 0, stale: true });
    expect(effectiveDaily({ value: 20, setAt: T('2026-11-17T10:30:00Z'), now: T('2026-11-17T12:00:00Z'), server: 'west' })).toEqual({ value: 20, stale: false });
  });
  it('valor 0 não avisa; sem data é não confiável', () => {
    expect(effectiveDaily({ value: 0, setAt: 0, now: 1e12, server: 'west' })).toEqual({ value: 0, stale: false });
    expect(effectiveDaily({ value: 10, setAt: undefined, now: 1e12, server: 'west' }).stale).toBe(true);
  });
  it('servidor desconhecido não quebra a tela: sem aviso, valor mantido', () => {
    expect(effectiveDaily({ value: 10, setAt: 1, now: 1e12, server: 'mars' })).toEqual({ value: 10, stale: false });
  });
  it('valor inválido e recente passa adiante (a validação da 060 é quem avisa)', () => {
    expect(effectiveDaily({ value: 15, setAt: T('2026-11-17T10:30:00Z'), now: T('2026-11-17T12:00:00Z'), server: 'west' })).toEqual({ value: 15, stale: false });
  });
});
