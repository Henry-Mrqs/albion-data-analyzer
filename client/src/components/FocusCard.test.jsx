// IDEIA-072: o cartão Foco explica a economia 0 quando há RRR manual (ele vale no lugar do automático).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { mkPrices } from '../test/helpers';
import { resetApp, seed, craftCfg, pricesHook } from '../test/ui';

const { priceHook, histHook } = vi.hoisted(() => ({ priceHook: vi.fn(), histHook: vi.fn() }));
vi.mock('../lib/market', async (orig) => ({ ...(await orig()), usePrices: priceHook }));
vi.mock('../lib/history', async (orig) => ({ ...(await orig()), useHistory: histHook }));

import Crafting from './Crafting';

const NOTA = 'RRR manual digitado: ele vale no lugar do automático, por isso o foco não muda o custo aqui. Apague o RRR manual para ver a economia do foco.';

beforeEach(() => {
  resetApp();
  histHook.mockReturnValue({ history: null, loading: false, error: null });
  priceHook.mockReturnValue(pricesHook(mkPrices({ T6_METALBAR: 200, T6_LEATHER: 150, T6_MAIN_SWORD: 9000 })));
});

const card = (customRRR) => {
  seed('craft:item', { id: 'T6_MAIN_SWORD', ench: 0 });
  seed('craft:cfg', craftCfg({ specialty: true, refine: { METALBAR: 'buy', LEATHER: 'buy' }, customRRR }));
  render(<Crafting />);
  return screen.getByTestId('focus-card').textContent;
};

describe('FocusCard: nota de RRR manual', () => {
  it('com RRR manual (30) a economia do foco é 0 e a nota aparece', () => {
    const t = card('30');
    expect(t).toContain(NOTA);
    expect(t).toMatch(/Economia de material com foco/);
  });
  it('sem RRR manual a nota não aparece', () => {
    expect(card('')).not.toContain('RRR manual digitado');
  });
  it('RRR manual inválido ("abc", corrigido pela 060) não mostra a nota', () => {
    expect(card('abc')).not.toContain('RRR manual digitado');
  });
});
