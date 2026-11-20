// IDEIA-012 na tela de Craft: coluna "Confiança" em "Onde vender" (espada T4, Caerleon 12.000, histórico do caso 1).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { mkPrices } from '../test/helpers';
import { resetApp, seed, craftCfg, freezeNow, pricesHook } from '../test/ui';

const { priceHook, histHook } = vi.hoisted(() => ({ priceHook: vi.fn(), histHook: vi.fn() }));
vi.mock('../lib/market', async (orig) => ({ ...(await orig()), usePrices: priceHook }));
vi.mock('../lib/history', async (orig) => ({ ...(await orig()), useHistory: histHook }));

import Crafting from './Crafting';

const BUY = { METALBAR: 'buy', LEATHER: 'buy' };
const NOW = Date.UTC(2026, 9, 26, 12);
const H = 3600000;
const D = 86400000;
const day = Date.UTC(2026, 9, 26);
const CASO1 = [8431, 5381, 2009, 5498, 8316, 10999, 6309].map((p, i) => ({ t: day - (7 - i) * D, n: 10, p }));
let restore;

beforeEach(() => {
  resetApp();
  restore = freezeNow('2026-10-26T12:00:00Z');
  histHook.mockReturnValue({ history: { T4_MAIN_SWORD: { Caerleon: CASO1, Martlock: [] } }, loading: false, error: null });
});
afterEach(() => restore());

function mount(sword, cfg = {}) {
  seed('craft:item', { id: 'T4_MAIN_SWORD', ench: 0 });
  seed('craft:cfg', craftCfg({ specialty: true, feePer100: 500, refine: BUY, ...cfg }));
  priceHook.mockReturnValue(pricesHook(mkPrices({ T4_METALBAR: 200, T4_LEATHER: 150, T4_MAIN_SWORD: sword })));
  return render(<Crafting />);
}
const ISOLADA = { Caerleon: { s: 12000, sM: 12000, sd: NOW - H } };
const rowOf = (city) => [...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent.startsWith(city));
const bestBox = () => document.querySelector('.result').textContent;
const text = () => document.body.textContent;

describe('Crafting: confiança do preço (012)', () => {
  it('Caerleon isolada: "desconfie" com nível único sem comprador, 90% acima da mediana e histórico instável', () => {
    mount(ISOLADA);
    const t = rowOf('Caerleon').textContent;
    expect(t).toContain('desconfie');
    expect(t).toContain('nível de preço único (menor = maior) e sem comprador visível');
    expect(t).toContain('90% acima da mediana de 7 dias');
    expect(t).toContain('histórico instável (desvio 32% da mediana)');
  });
  it('Martlock com histórico [] e comprador: "confira" com "sem histórico registrado"', () => {
    mount({ Caerleon: { s: 12000, sM: 12000, sd: NOW - H }, Martlock: { s: 8500, sM: 9000, sd: NOW - H, b: 8000, bd: NOW - H } });
    const t = rowOf('Martlock').textContent;
    expect(t).toContain('confira');
    expect(t).toContain('sem histórico registrado');
  });
  it('histórico null (carregando/erro): nenhum selo negativo inventado', () => {
    histHook.mockReturnValue({ history: null, loading: true, error: null });
    mount({ Caerleon: { s: 4500, sM: 5000, sd: NOW - H, b: 4000, bd: NOW - H } });
    expect(rowOf('Caerleon').querySelector('[data-testid="confidence-seal"]')).toBeNull();
    expect(text()).toContain('Histórico não carregado');
  });
  it('o selo não muda nenhum número: o quadro Melhor destino mostra o lucro da 065 e não cita o selo', () => {
    mount(ISOLADA);
    expect(bestBox()).toContain('+3.849');
    expect(bestBox()).not.toContain('desconfie');
  });
  it('com a 065: o selo avalia o preço LISTADO (12.000 = 90% acima), não o ancorado (25%)', () => {
    mount(ISOLADA);
    expect(rowOf('Caerleon').textContent).toContain('90% acima');
    expect(rowOf('Caerleon').textContent).not.toContain('25% acima');
  });
  it('célula com preço lixo (negativo, NaN): sem exceção e sem NaN na tela', () => {
    const { container } = mount({ Caerleon: { s: -5, sM: NaN, sd: NOW - H }, Martlock: { s: 4500, sd: NOW - H, b: 4000, bd: NOW - H } });
    expect(container.textContent).not.toContain('NaN');
  });
  it('o alerta "acima da mediana" do Giro continua com +20% e o mesmo texto', () => {
    mount(ISOLADA);
    expect(text()).toContain('90% acima da mediana de 7 dias');
  });
});
