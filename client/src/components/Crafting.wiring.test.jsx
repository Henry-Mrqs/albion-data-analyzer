// IDEIA-074: testes de LIGAÇÃO do Crafting (docs/qa/IDEIA-069.md, IDEIA-031 D2). O código já está certo; o buraco era de teste.
// Prova = mutação (tabela no commit). Arquivo separado de Crafting.test.jsx para não passar do limite de renderizações.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { nameOf } from '../lib/catalog';
import { mkPrices } from '../test/helpers';
import { resetApp, seed, craftCfg, freezeNow, pricesHook } from '../test/ui';

const { priceHook, histHook } = vi.hoisted(() => ({ priceHook: vi.fn(), histHook: vi.fn() }));
vi.mock('../lib/market', async (orig) => ({ ...(await orig()), usePrices: priceHook }));
vi.mock('../lib/history', async (orig) => ({ ...(await orig()), useHistory: histHook }));

import Crafting from './Crafting';

const NOW_ISO = '2026-11-17T12:00:00Z';
const STAFF = { id: 'T4_2H_ARCANESTAFF_HELL', ench: 0 };
const ART = 'T4_ARTEFACT_2H_ARCANESTAFF_HELL';
const FICHA = 'T4_ARTEFACT_TOKEN_FAVOR_2';
const staffPrices = (artefato, ficha) => mkPrices({ T4_PLANKS: 100, T4_METALBAR: 200, [ART]: artefato, [FICHA]: ficha });
const saved = (key = 'craft:cfg') => JSON.parse(localStorage.getItem(`albion:${key}`));
const materiais = () => screen.getByText(/^Materiais \(/).closest('.card-head').nextElementSibling.textContent;
const seg = () => screen.getByTestId('recipe-picker').querySelector('.seg');
const segOn = () => seg().querySelector('button.on').textContent;

let restore;
beforeEach(() => {
  resetApp();
  restore = freezeNow(NOW_ISO);
  histHook.mockReturnValue({ history: null, loading: false, error: null });
});
afterEach(() => restore());

function mount({ item, cfg = {}, prices }) {
  seed('craft:item', item);
  seed('craft:cfg', craftCfg({ specialty: true, refine: { METALBAR: 'buy', LEATHER: 'buy' }, ...cfg }));
  priceHook.mockReturnValue(pricesHook(prices));
  return render(<Crafting />);
}

describe('Crafting: ligação do seletor de receita (M19, M54, M55) e valor fora de faixa (M16)', () => {
  it('ficha mais barata: segmento "Automático" ativo; clicar "Ficha de favor" grava recipeVariant 1, ativa o botão e usa a ficha (receita escolhida, não a primeira)', () => {
    mount({ item: STAFF, prices: staffPrices(1840, 1000) });
    expect(segOn()).toBe('Automático'); // M19: modo automático fixo ou ausente
    expect(materiais()).toContain(nameOf(FICHA));
    fireEvent.click(screen.getByRole('button', { name: 'Artefato' }));
    expect(String(saved().recipeVariant)).toBe('0'); // M54: onChange gravando sempre 'auto'
    expect(segOn()).toBe('Artefato');
    expect(materiais()).toContain(nameOf(ART));
    expect(materiais()).not.toContain(nameOf(FICHA));
    fireEvent.click(screen.getByRole('button', { name: 'Ficha de favor' }));
    expect(String(saved().recipeVariant)).toBe('1');
    expect(segOn()).toBe('Ficha de favor');
    expect(materiais()).toContain(nameOf(FICHA));
    expect(materiais()).not.toContain(nameOf(ART)); // M55: rec = variants[0] mostraria o artefato
  });

  it('recipeVariant "9" (fora de faixa) com a ficha mais barata cai na variante 0 (artefato), NÃO na automática (ficha)', () => {
    mount({ item: STAFF, prices: staffPrices(1840, 1000), cfg: { recipeVariant: '9' } });
    expect(materiais()).toContain(nameOf(ART));
    expect(materiais()).not.toContain(nameOf(FICHA));
  });
});

describe('Crafting: a receita escolhida alimenta os cartões derivados (M55)', () => {
  it('"Comparar cidades" usa o custo da receita escolhida: o custo total de Lymhurst é o da linha "Ficha de favor" do seletor, não o do artefato', () => {
    mount({ item: STAFF, prices: staffPrices(1840, 1000), cfg: { recipeVariant: '1' } });
    const pickerTotal = (label) => {
      const tr = [...screen.getByTestId('recipe-picker').querySelectorAll('tbody tr')].find((r) => r.firstChild.textContent.startsWith(label));
      return tr.children[3].textContent;
    };
    const cmp = screen.getByText('Comparar cidades de craft').closest('.card');
    const lym = [...cmp.querySelectorAll('tbody tr')].find((r) => r.firstChild.textContent.startsWith('Lymhurst'));
    const cells = [...lym.children].map((c) => c.textContent);
    expect(cells).toContain(pickerTotal('Ficha de favor'));
    expect(pickerTotal('Ficha de favor')).not.toBe(pickerTotal('Artefato'));
  });
});

describe('Crafting: trocar o item zera a receita escolhida (M41)', () => {
  it('com recipeVariant salvo, trocar o tier grava "auto"', () => {
    mount({ item: { id: 'T6_MAIN_SWORD', ench: 0 }, cfg: { recipeVariant: '1' }, prices: mkPrices({ T6_METALBAR: 200, T6_LEATHER: 150 }) });
    expect(String(saved().recipeVariant)).toBe('1');
    const tier = screen.getAllByRole('combobox').find((s) => [...s.options].some((o) => o.textContent.includes('T4') || o.value === '4'));
    fireEvent.change(tier, { target: { value: '4' } });
    expect(saved('craft:item').id).toBe('T4_MAIN_SWORD');
    expect(saved().recipeVariant).toBe('auto');
  });
});

describe('Crafting: bônus diário grava valor e hora; setValue aceita atualizador (M47, M48)', () => {
  const daily = () => screen.getAllByRole('combobox').find((s) => [...s.options].some((o) => o.textContent === '+20%'));
  it('escolher +20% grava craftDaily 20 e craftDailyAt = agora congelado; "Nenhum" zera; duas mudanças seguidas no mesmo tick não perdem a primeira', () => {
    mount({ item: { id: 'T6_MAIN_SWORD', ench: 0 }, prices: mkPrices({ T6_METALBAR: 200, T6_LEATHER: 150 }) });
    fireEvent.change(daily(), { target: { value: '20' } });
    expect(saved().craftDaily).toBe(20);
    expect(saved().craftDailyAt).toBe(Date.parse(NOW_ISO)); // M47: craftDailyAt 0
    fireEvent.change(daily(), { target: { value: '0' } });
    expect(saved().craftDaily).toBe(0);
    act(() => {
      fireEvent.change(daily(), { target: { value: '10' } });
      fireEvent.change(screen.getAllByRole('combobox').find((s) => [...s.options].some((o) => o.value === 'Bridgewatch')), { target: { value: 'Bridgewatch' } });
    });
    expect(saved().craftDaily).toBe(10); // M48: sem updater, a segunda mudança apagaria a primeira
    expect(saved().craftCity).toBe('Bridgewatch');
  });
});

describe('Crafting: o estresse recebe a MELHOR saída (M42-M50)', () => {
  const SWORD = { id: 'T6_MAIN_SWORD', ench: 0 };
  const prices = (bm) => mkPrices({ T6_METALBAR: 200, T6_LEATHER: 150, T6_MAIN_SWORD: { Caerleon: { s: 4500 }, 'Black Market': { b: bm } } });
  const stress = () => screen.getByTestId('stress-card').textContent;

  it('com Caerleon (ordem de venda 4.500) e Mercado Negro (ordem de compra 4.000), o estresse varia a de maior líquido; "Sem imposto" na outra (que continua pior) não muda o estresse', () => {
    const { unmount } = mount({ item: SWORD, prices: prices(4000) });
    expect(stress()).toContain('Saída de venda variada: Caerleon, Ordem de venda');
    expect(stress()).toContain('todos os materiais, inclusive artefatos');
    const antes = stress();
    unmount();
    mount({ item: SWORD, prices: prices(4000), cfg: { noTax: { 'Black Market|instant': true } } });
    expect(stress()).toBe(antes);
  });

  it('quando a outra saída vira a melhor (Mercado Negro 4.600), o estresse passa a variar o Mercado Negro', () => {
    mount({ item: SWORD, prices: prices(4600) });
    expect(stress()).toContain('Saída de venda variada: Mercado Negro, Ordem de compra');
  });
});
