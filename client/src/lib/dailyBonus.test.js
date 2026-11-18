import { describe, expect, it } from 'vitest';
import { effectiveDaily, lastReset, FUTURE_TOLERANCE_MS, RESET_UTC_HOUR, DAILY_NOTE, showDailyNote } from './dailyBonus';

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
    expect(effectiveDaily({ value: 20, setAt: T('2026-11-17T09:00:00Z'), now: T('2026-11-17T12:00:00Z'), server: 'west' })).toEqual({ value: 0, stale: true, future: false });
    expect(effectiveDaily({ value: 20, setAt: T('2026-11-17T10:30:00Z'), now: T('2026-11-17T12:00:00Z'), server: 'west' })).toEqual({ value: 20, stale: false, future: false });
  });
  it('valor 0 não avisa; sem data é não confiável', () => {
    expect(effectiveDaily({ value: 0, setAt: 0, now: 1e12, server: 'west' })).toEqual({ value: 0, stale: false, future: false });
    expect(effectiveDaily({ value: 10, setAt: undefined, now: 1e12, server: 'west' }).stale).toBe(true);
  });
  it('servidor desconhecido não quebra a tela: sem aviso, valor mantido', () => {
    expect(effectiveDaily({ value: 10, setAt: 1, now: 1e12, server: 'mars' })).toEqual({ value: 10, stale: false, future: false });
  });
  it('valor inválido e recente passa adiante (a validação da 060 é quem avisa)', () => {
    expect(effectiveDaily({ value: 15, setAt: T('2026-11-17T10:30:00Z'), now: T('2026-11-17T12:00:00Z'), server: 'west' })).toEqual({ value: 15, stale: false, future: false });
  });
});

describe('borda exata do reset (os 3 servidores)', () => {
  const day = (server) => (server === 'east' ? '2026-11-17T23:00:00.000Z' : '2026-11-17T10:00:00.000Z');
  it.each(['west', 'europe', 'east'])('%s: setAt no instante do reset vale; 1 ms antes é velho; 1 ms depois vale', (server) => {
    const reset = T(day(server));
    const now = reset + 3600000;
    const at = (setAt) => effectiveDaily({ value: 20, setAt, now, server });
    expect(RESET_UTC_HOUR[server]).toBe(new Date(reset).getUTCHours());
    expect(at(reset)).toEqual({ value: 20, stale: false, future: false });
    expect(at(reset - 1)).toEqual({ value: 0, stale: true, future: false });
    expect(at(reset + 1)).toEqual({ value: 20, stale: false, future: false });
  });
});

describe('data do bônus no futuro (IDEIA-041, retrabalho 1)', () => {
  const now = T('2026-11-17T12:00:00Z');
  const run = (setAt) => effectiveDaily({ value: 20, setAt, now, server: 'west' });
  it('tolerância nomeada de 5 minutos', () => expect(FUTURE_TOLERANCE_MS).toBe(5 * 60 * 1000));
  it('futuro além da tolerância: vale 0 e sinaliza', () => {
    expect(run(now + FUTURE_TOLERANCE_MS + 1)).toEqual({ value: 0, stale: false, future: true });
    expect(run(now + 10 * 86400000)).toEqual({ value: 0, stale: false, future: true });
  });
  it('dentro da tolerância (relógio levemente adiantado): vale', () => {
    expect(run(now + FUTURE_TOLERANCE_MS)).toEqual({ value: 20, stale: false, future: false });
    expect(run(now + 1000)).toEqual({ value: 20, stale: false, future: false });
  });
  it('passado recente vale; ausente e inválida são velhas, não futuras', () => {
    expect(run(now - 60000)).toEqual({ value: 20, stale: false, future: false });
    expect(run(undefined)).toEqual({ value: 0, stale: true, future: false });
    expect(run('abc')).toEqual({ value: 0, stale: true, future: false });
    expect(run(NaN)).toEqual({ value: 0, stale: true, future: false });
  });
  it('valor 0 nunca avisa, mesmo com data no futuro', () => {
    expect(effectiveDaily({ value: 0, setAt: now + 1e10, now, server: 'west' })).toEqual({ value: 0, stale: false, future: false });
  });
});

describe('nota de confiança (D8)', () => {
  it('texto fixo diz que a lista de categorias não foi confirmada', () => {
    expect(DAILY_NOTE).toContain('categoria que o jogo mostra na janela de produção');
    expect(DAILY_NOTE).toContain('não foi confirmada em fonte oficial');
  });
  it('mostra quando há bônus informado (qualquer valor não vazio) ou o cartão aparece', () => {
    expect(showDailyNote({ craftDaily: 10, hasCard: false })).toBe(true);
    expect(showDailyNote({ craftDaily: '20', hasCard: false })).toBe(true);
    expect(showDailyNote({ craftDaily: 0, hasCard: true })).toBe(true);
    expect(showDailyNote({ craftDaily: 15, hasCard: false })).toBe(true);
  });
  it('não mostra sem bônus e sem cartão', () => {
    expect(showDailyNote({ craftDaily: 0, hasCard: false })).toBe(false);
    expect(showDailyNote({ craftDaily: undefined, hasCard: false })).toBe(false);
    expect(showDailyNote({ craftDaily: '', hasCard: false })).toBe(false);
    expect(showDailyNote({ craftDaily: null })).toBe(false);
  });
});
