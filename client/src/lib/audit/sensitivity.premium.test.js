// IDEIA-086: sensibilidade da tela Premium. Toda variável "aplicada" com campo tem que MUDAR o saldo; "informativa" não pode mudar.
import { describe, expect, it } from 'vitest';
import { cleanPremiumInputs, premiumBalance } from '../premium';
import { premiumVars } from './premium';

const BASE = { gold: '9414', goldCost: '', volume: '20000000', silverPerFocus: '43', focusPerDay: '' };
const balanceOf = (cfg) => premiumBalance(cleanPremiumInputs(cfg).values).balance;

/** Devolve a lista de falhas ("não mudou"/"não deveria mudar") de uma variável com probe. */
export const check = (v) => {
  if (!v.probe) return [];
  const before = balanceOf(BASE);
  const after = balanceOf({ ...BASE, ...v.probe.cfg });
  const changed = before !== after;
  if (v.kind === 'applied' && !changed) return [`${v.id}: aplicada, mas o probe não mudou o saldo`];
  if (v.kind === 'info-only' && changed) return [`${v.id}: informativa, mas o probe mudou o saldo (não deveria mudar)`];
  return [];
};

describe('sensibilidade da tela Premium', () => {
  const withProbe = premiumVars.filter((v) => v.probe);
  it('há probe para os 5 campos salvos', () => {
    expect(withProbe.map((v) => v.id).sort()).toEqual(['focus-day', 'gold', 'gold-cost', 'silver-per-focus', 'volume']);
  });
  for (const v of withProbe) {
    it(`${v.id}: o probe muda o saldo`, () => {
      expect(check(v)).toEqual([]);
    });
  }
  it('mutação: marcar "volume" como informativa reprova ("não deveria mudar")', () => {
    const vol = premiumVars.find((v) => v.id === 'volume');
    expect(check({ ...vol, kind: 'info-only' })[0]).toMatch(/não deveria mudar/);
  });
  it('mutação: um probe que não altera nada numa variável aplicada reprova', () => {
    const vol = premiumVars.find((v) => v.id === 'volume');
    expect(check({ ...vol, probe: { cfg: { volume: '20000000' } } })[0]).toMatch(/não mudou o saldo/);
  });
});
