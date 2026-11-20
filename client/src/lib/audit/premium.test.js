// IDEIA-086: tela "premium" do auditor.
import { describe, expect, it } from 'vitest';
import { cleanPremiumInputs, premiumBalance } from '../premium';
import { auditPremium } from './premium';

const NOW = Date.parse('2026-11-20T12:00:00Z');
const BASE = { gold: '9414', goldCost: '', volume: '20000000', silverPerFocus: '43', focusPerDay: '' };
const audit = (cfg = BASE, gold = { price: 9414, t: NOW - 3600000 }) => {
  const { values, issues } = cleanPremiumInputs(cfg);
  return auditPremium({ cfg, values, issues, res: premiumBalance(values), gold, now: NOW });
};
const r = (a, id) => a.rows.find((x) => x.id === id);

describe('auditPremium', () => {
  it('cenário-base: saldo -21.602.500 lido da tela (custo 35.302.500; imposto 800.000; foco 12.900.000)', () => {
    const { values } = cleanPremiumInputs(BASE);
    const res = premiumBalance(values);
    expect(res.cost).toBe(35302500);
    expect(res.taxSaving).toBeCloseTo(800000, 6);
    expect(res.focusValue).toBe(12900000);
    expect(res.balance).toBeCloseTo(-21602500, 4);
    const a = audit();
    expect(r(a, 'balance').value).toBeCloseTo(-21602500, 4);
    expect(r(a, 'balance').origin).toBe('derived');
    expect(r(a, 'gold').status).toBe('applied');
    expect(r(a, 'volume').value).toBe(20000000);
    expect(r(a, 'tax-saving').value).toBeCloseTo(4, 6);
  });
  it('padrões vazios: custo do Premium e foco/dia são "padrão não confirmado"; dias idem', () => {
    const a = audit();
    for (const id of ['gold-cost', 'focus-day', 'days']) {
      expect(r(a, id).status, id).toBe('unconfirmed');
      expect(r(a, id).origin, id).toBe('app-default');
    }
    expect(r(a, 'gold-cost').value).toBe(3750);
    expect(r(a, 'focus-day').value).toBe(10000);
  });
  it('digitado troca para user/applied', () => {
    const a = audit({ ...BASE, goldCost: '3000', focusPerDay: '5000' });
    expect([r(a, 'gold-cost').origin, r(a, 'gold-cost').status]).toEqual(['user', 'applied']);
    expect([r(a, 'focus-day').origin, r(a, 'focus-day').status]).toEqual(['user', 'applied']);
  });
  it('sem ouro: só "gold" como NÃO considerada e nenhuma linha de saldo', () => {
    const a = audit({ ...BASE, gold: '' });
    expect(r(a, 'gold').status).toBe('not-considered');
    expect(r(a, 'gold').note).toMatch(/saldo não é calculado/);
    expect(r(a, 'balance')).toBeUndefined();
  });
  it('lixo digitado vira nota "corrigido" sem eco de objeto', () => {
    const a = audit({ ...BASE, gold: 'abc' });
    expect(r(a, 'gold').note).toMatch(/corrigido de abc/);
    const b = audit({ ...BASE, goldCost: 'xyz' });
    expect(r(b, 'gold-cost').status).toBe('unconfirmed');
    expect(r(b, 'gold-cost').note).toMatch(/corrigido de xyz/);
  });
  it('ouro da API: aplicada recente; com 30 h, velha; ausente, não considerada', () => {
    expect(r(audit(), 'gold-api').status).toBe('applied');
    expect(r(audit(BASE, { price: 9414, t: NOW - 30 * 3600000 }), 'gold-api').status).toBe('stale');
    expect(r(audit(BASE, null), 'gold-api').status).toBe('not-considered');
  });
  it('as 5 coisas não contadas são NÃO consideradas', () => {
    const a = audit();
    const nc = a.rows.filter((x) => x.id.startsWith('nc-premium'));
    expect(nc).toHaveLength(5);
    expect(nc.every((x) => x.status === 'not-considered')).toBe(true);
    expect(a.counts.notConsidered).toBe(5);
  });
  it('cfg corrompido nunca lança', () => {
    for (const cfg of [null, [], { gold: {} }, 'x']) {
      expect(() => auditPremium({ cfg, values: cleanPremiumInputs(cfg).values, issues: cleanPremiumInputs(cfg).issues, res: premiumBalance(cleanPremiumInputs(cfg).values) })).not.toThrow();
    }
    expect(() => auditPremium(undefined)).not.toThrow();
    expect(() => auditPremium({ cfg: { gold: '1' }, res: null, values: null })).not.toThrow();
  });
  it('as contagens fecham com as linhas', () => {
    const a = audit();
    const c = a.counts;
    expect(c.applied + c.unconfirmed + c.stale + c.notConsidered + c.infoOnly).toBe(a.rows.length);
  });
});
