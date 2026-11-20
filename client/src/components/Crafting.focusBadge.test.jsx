// IDEIA-072: o selo "N valores corrigidos" conta também os avisos do foco (focusEff fora da faixa).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MAX_FOCUS_EFFICIENCY } from '../lib/focusConsts';
import { mkPrices, planksSpec } from '../test/helpers';
import { resetApp, seed, craftCfg, pricesHook } from '../test/ui';

const { priceHook, histHook } = vi.hoisted(() => ({ priceHook: vi.fn(), histHook: vi.fn() }));
vi.mock('../lib/market', async (orig) => ({ ...(await orig()), usePrices: priceHook }));
vi.mock('../lib/history', async (orig) => ({ ...(await orig()), useHistory: histHook }));

import Crafting from './Crafting';
import Refining from './Refining';

beforeEach(() => {
  resetApp();
  histHook.mockReturnValue({ history: null, loading: false, error: null });
  priceHook.mockReturnValue(pricesHook(mkPrices({ T6_METALBAR: 200, T6_LEATHER: 150, ...planksSpec() })));
});

const BAD = String(MAX_FOCUS_EFFICIENCY + 1);
const badge = (c) => c.querySelector('span.warn.num[title^="Há valores fora"]')?.textContent ?? null;
const craft = (over) => {
  seed('craft:item', { id: 'T6_MAIN_SWORD', ench: 0 });
  seed('craft:cfg', craftCfg({ specialty: true, refine: { METALBAR: 'buy', LEATHER: 'buy' }, ...over }));
  return render(<Crafting />);
};
const refine = (over) => {
  seed('refine:cfg', {
    type: 'PLANKS', tier: 4, ench: 0, buyCity: 'best', refineCity: 'Fort Sterling', sellCity: 'best', focus: false, daily: 0, feePer100: 400, customRRR: '',
    useOrders: false, route: 'best', sellMode: 'order', qty: 100, extras: [], ...over,
  });
  return render(<Refining />);
};

describe('selo de valores corrigidos conta o foco', () => {
  it('Craft: focusEff fora da faixa = "1 valor corrigido"; válido = sem selo; com crafts inválido também = "2 valores corrigidos"', () => {
    const a = craft({ focusEff: BAD });
    expect(badge(a.container)).toBe('1 valor corrigido');
    a.unmount();
    const b = craft({ focusEff: '10000' });
    expect(badge(b.container)).toBeNull();
    b.unmount();
    const c = craft({ focusEff: BAD, crafts: '0' });
    expect(badge(c.container)).toBe('2 valores corrigidos');
  });
  it('Refino: idem', () => {
    const a = refine({ focusEff: BAD });
    expect(badge(a.container)).toBe('1 valor corrigido');
    a.unmount();
    const b = refine({ focusEff: '10000' });
    expect(badge(b.container)).toBeNull();
    b.unmount();
    const c = refine({ focusEff: BAD, qty: '0' });
    expect(badge(c.container)).toBe('2 valores corrigidos');
  });
});
