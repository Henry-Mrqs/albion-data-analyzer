import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { nameOf } from '../lib/catalog';
import { DAILY_NOTE } from '../lib/dailyBonus';
import { mkPrices } from '../test/helpers';
import { resetApp, seed, craftCfg, freezeNow, pricesHook } from '../test/ui';

const { priceHook, histHook } = vi.hoisted(() => ({ priceHook: vi.fn(), histHook: vi.fn() }));
vi.mock('../lib/market', async (orig) => ({ ...(await orig()), usePrices: priceHook }));
vi.mock('../lib/history', async (orig) => ({ ...(await orig()), useHistory: histHook }));

import Crafting from './Crafting';

const NOW = Date.parse('2026-11-17T12:00:00Z'); // servidor west: reset às 10:00 UTC
const HOUR = 3600000;
const REFINE_BUY = { METALBAR: 'buy', LEATHER: 'buy' };
let restore;

beforeEach(() => {
  resetApp();
  restore = freezeNow('2026-11-17T12:00:00Z');
  histHook.mockReturnValue({ history: null, loading: false, error: null });
});
afterEach(() => restore());

// espada T6: bruto 16 x 200 + 8 x 150 = 4.400 (dossiê 041 §4)
const swordPrices = () => mkPrices({ T6_METALBAR: 200, T6_LEATHER: 150 });

function mount({ item = { id: 'T6_MAIN_SWORD', ench: 0 }, cfg = {}, prices = swordPrices() } = {}) {
  seed('craft:item', item);
  seed('craft:cfg', craftCfg({ specialty: true, refine: REFINE_BUY, ...cfg }));
  priceHook.mockReturnValue(pricesHook(prices));
  return render(<Crafting />);
}

const text = (c) => c.textContent;
// a tabela da seção "Materiais (N unidades de produto)" (PriceMatrix e outros listam a cadeia toda)
const materiaisTable = () => screen.getByText(/^Materiais \(/).closest('.card-head').nextElementSibling;

describe('Crafting: bônus diário (IDEIA-041)', () => {
  it('contrato dos defaults e do cartão: craftCfg() sem avisos de configuração; com bônus 0 e preços a nota do campo e a do cartão existem', () => {
    const { container } = mount();
    const t = text(container);
    expect(t).not.toContain('corrigido');
    expect(t).not.toContain('Bônus de ontem');
    expect(t).not.toContain('Data do bônus no futuro');
    expect(t).not.toContain('não retorna'); // espada: metal e couro retornam
    expect(t).toContain('RRR atual: 24.8%');
    // hasCard: o cartão "Vale esperar..." existe e as duas notas aparecem mesmo com bônus 0
    expect(screen.getByText('Vale esperar o bônus do dia?')).toBeTruthy();
    expect(screen.getByTestId('daily-note-card').textContent).toBe(DAILY_NOTE);
    expect(screen.getByTestId('daily-note').textContent).toBe(DAILY_NOTE);
    // texto literal (a constante importada acompanharia uma troca do texto)
    expect(DAILY_NOTE).toContain('só para a categoria que o jogo mostra');
    expect(DAILY_NOTE).toContain('ainda não foi confirmada em fonte oficial');
  });

  it('aviso de data futura: bônus 20 com data daqui a 3 dias vale 0 (RRR 24.8%) e só mostra o aviso de futuro', () => {
    const { container } = mount({ cfg: { craftDaily: 20, craftDailyAt: NOW + 72 * HOUR } });
    const t = text(container);
    expect(t).toContain('Data do bônus no futuro');
    expect(t).not.toContain('Bônus de ontem');
    expect(t).toContain('RRR atual: 24.8%');
  });

  it('bônus 20 informado depois do reset vale: sem avisos e RRR 34.6%', () => {
    const { container } = mount({ cfg: { craftDaily: 20, craftDailyAt: NOW - HOUR } });
    const t = text(container);
    expect(t).not.toContain('Data do bônus no futuro');
    expect(t).not.toContain('Bônus de ontem');
    expect(t).toContain('RRR atual: 34.6%');
  });

  it('aviso de bônus velho: informado às 09:00 UTC (antes do reset das 10:00) vale 0 e avisa', () => {
    const { container } = mount({ cfg: { craftDaily: 20, craftDailyAt: Date.parse('2026-11-17T09:00:00Z') } });
    const t = text(container);
    expect(t).toContain('Bônus de ontem?');
    expect(t).not.toContain('Data do bônus no futuro');
    expect(t).toContain('RRR atual: 24.8%');
  });

  it('nota do campo: bônus 20 sem preços mostra a nota do campo e não mostra o cartão nem a nota dele', () => {
    mount({ cfg: { craftDaily: 20, craftDailyAt: NOW - HOUR }, prices: mkPrices({}) });
    expect(screen.getByTestId('daily-note').textContent).toBe(DAILY_NOTE);
    expect(screen.queryByTestId('daily-note-card')).toBeNull();
    expect(screen.queryByText('Vale esperar o bônus do dia?')).toBeNull();
  });

  it('bônus 0 sem preços: nenhuma das duas notas', () => {
    mount({ cfg: { craftDaily: 0 }, prices: mkPrices({}) });
    expect(screen.queryByTestId('daily-note')).toBeNull();
    expect(screen.queryByTestId('daily-note-card')).toBeNull();
  });
});

describe('Crafting: receita escolhida (IDEIA-049)', () => {
  const STAFF = { id: 'T4_2H_ARCANESTAFF_HELL', ench: 0 };
  const ART = 'T4_ARTEFACT_2H_ARCANESTAFF_HELL';
  const FICHA = 'T4_ARTEFACT_TOKEN_FAVOR_2';
  const staff = (artefato, ficha) => mkPrices({ T4_PLANKS: 100, T4_METALBAR: 200, [ART]: artefato, [FICHA]: ficha });
  const names = () => materiaisTable().textContent;

  it('automático (sem recipeVariant) com artefato 1.840 e ficha 18.498 usa o artefato', () => {
    mount({ item: STAFF, prices: staff(1840, 18498) });
    expect(names()).toContain(nameOf(ART));
    expect(names()).not.toContain(nameOf(FICHA));
  });

  it('recipeVariant "1" usa a ficha de favor', () => {
    mount({ item: STAFF, prices: staff(1840, 18498), cfg: { recipeVariant: '1' } });
    expect(names()).toContain(nameOf(FICHA));
    expect(names()).not.toContain(nameOf(ART));
  });

  it('recipeVariant "auto" com a ficha mais barata (1.000) usa a ficha', () => {
    mount({ item: STAFF, prices: staff(1840, 1000), cfg: { recipeVariant: 'auto' } });
    expect(names()).toContain(nameOf(FICHA));
    expect(names()).not.toContain(nameOf(ART));
  });

  it('recipeVariant inválido ("9") cai na primeira variante, sem erro', () => {
    mount({ item: STAFF, prices: staff(1840, 18498), cfg: { recipeVariant: '9' } });
    expect(names()).toContain(nameOf(ART));
    expect(names()).not.toContain(nameOf(FICHA));
  });
});

describe('Crafting: selo "não retorna" (039/049)', () => {
  const linhas = () => [...materiaisTable().querySelectorAll('tbody tr')];
  const badgeOf = (row) => row.querySelector('small');

  it('fragmento (50 T4_RUNE): "não retorna · não verificado" com title explicativo', () => {
    mount({ item: { id: 'T4_ARTEFACT_2H_COMBATSTAFF_MORGANA', ench: 0 }, prices: mkPrices({ T4_RUNE: 10 }) });
    const rune = linhas().find((r) => r.cells[0].textContent.includes(nameOf('T4_RUNE')));
    const b = badgeOf(rune);
    expect(b.textContent).toBe('não retorna · não verificado');
    expect(b.getAttribute('title')).toMatch(/dump não marca/);
  });

  it('Royal: "não retorna" sem "não verificado" nas duas linhas', () => {
    mount({
      item: { id: 'T4_ARMOR_PLATE_ROYAL', ench: 0 },
      prices: mkPrices({ T4_ARMOR_PLATE_SET1: 3000, QUESTITEM_TOKEN_ROYAL_T4: 500 }),
    });
    const [a, b] = linhas();
    for (const row of [a, b]) {
      expect(badgeOf(row).textContent).toBe('não retorna');
      expect(badgeOf(row).getAttribute('title')).toBeNull();
    }
  });
});
