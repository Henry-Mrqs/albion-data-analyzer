import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RecipePicker from './RecipePicker';
import { recipeVariants } from '../lib/catalog';
import { computeCraft } from '../lib/craftPlan';
import { pickCheapest } from '../lib/recipeAlt';
import { fmt } from '../lib/econ';
import { mkPrices } from '../test/helpers';
import { resetApp, craftCfg } from '../test/ui';

beforeEach(resetApp);

const BUY = { PLANKS: 'buy', METALBAR: 'buy' };
const STAFF = 'T4_2H_ARCANESTAFF_HELL';

// preços do dossiê 049 §4: tábua 100 e barra 200 (hipotéticos); artefato e ficha reais ou variados por teste
const staffPrices = (artefato, ficha) =>
  mkPrices({ T4_PLANKS: 100, T4_METALBAR: 200, T4_ARTEFACT_2H_ARCANESTAFF_HELL: artefato, T4_ARTEFACT_TOKEN_FAVOR_2: ficha });

function setup(id, prices, { mode, onChange = () => {} } = {}) {
  const variants = recipeVariants(id);
  const results = variants.map((v) =>
    computeCraft({ rec: v.rec, targetMid: id, prices, cfg: craftCfg({ specialty: true, refine: BUY }), premium: true, bonusCity: null }),
  );
  const auto = pickCheapest(results);
  const view = render(<RecipePicker variants={variants} results={results} auto={auto} mode={mode} onChange={onChange} />);
  return { ...view, results, auto };
}

const dataRows = () => screen.getAllByRole('row').slice(1);
const rowOf = (label) => dataRows().find((r) => r.cells[0].textContent.startsWith(label));

describe('RecipePicker: itens', () => {
  it('2 variantes: segmentos Automático, Artefato e Ficha de favor e tabela com 2 linhas', () => {
    setup(STAFF, staffPrices(1840, 18498));
    const botoes = screen.getAllByRole('button').map((b) => b.textContent);
    expect(botoes).toEqual(['Automático', 'Artefato', 'Ficha de favor']);
    expect(dataRows()).toHaveLength(2);
  });
  it('Royal: segmentos Base 1, Base 2 e Base 3', () => {
    setup('T4_ARMOR_PLATE_ROYAL', mkPrices({ T4_ARMOR_PLATE_SET1: 3000, T4_ARMOR_PLATE_SET2: 2500, T4_ARMOR_PLATE_SET3: 3200, QUESTITEM_TOKEN_ROYAL_T4: 500 }));
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Automático', 'Base 1', 'Base 2', 'Base 3']);
    expect(dataRows()).toHaveLength(3);
  });
  it('1 variante: não renderiza nada', () => {
    setup('T4_MAIN_SWORD', mkPrices({ T4_METALBAR: 200 }));
    expect(screen.queryByTestId('recipe-picker')).toBeNull();
  });
});

describe('RecipePicker: "mais barata agora"', () => {
  it('artefato 1.840 e ficha 18.498: o selo só na linha do artefato', () => {
    setup(STAFF, staffPrices(1840, 18498));
    expect(rowOf('Artefato').textContent).toContain('mais barata agora');
    expect(rowOf('Ficha de favor').textContent).not.toContain('mais barata agora');
    expect(screen.getAllByText('mais barata agora')).toHaveLength(1);
  });
  it('artefato 1.840 e ficha 1.000: o selo só na linha da ficha', () => {
    setup(STAFF, staffPrices(1840, 1000));
    expect(rowOf('Ficha de favor').textContent).toContain('mais barata agora');
    expect(rowOf('Artefato').textContent).not.toContain('mais barata agora');
    expect(rowOf('Ficha de favor').className).toBe('best');
    expect(rowOf('Artefato').className).toBe('');
  });
  it('ficha sem preço: selo no artefato e a ficha mostra "sem preço"', () => {
    setup(STAFF, staffPrices(1840, null));
    expect(rowOf('Artefato').textContent).toContain('mais barata agora');
    expect(rowOf('Ficha de favor').textContent).toContain('sem preço');
    expect(rowOf('Ficha de favor').textContent).not.toContain('mais barata agora');
  });
  it('nenhuma receita completa: selo em lugar nenhum', () => {
    setup(STAFF, staffPrices(null, null));
    expect(screen.queryByText('mais barata agora')).toBeNull();
    expect(screen.getAllByText('sem preço').length).toBeGreaterThanOrEqual(4);
  });
});

describe('RecipePicker: escolha', () => {
  it('Automático está ativo por padrão (mode indefinido)', () => {
    setup(STAFF, staffPrices(1840, 18498));
    expect(screen.getByRole('button', { name: 'Automático' }).className).toContain('on');
    expect(screen.getByRole('button', { name: 'Ficha de favor' }).className).not.toContain('on');
  });
  it('mode="1" ativa a Ficha de favor', () => {
    setup(STAFF, staffPrices(1840, 18498), { mode: '1' });
    expect(screen.getByRole('button', { name: 'Ficha de favor' }).className).toContain('on');
    expect(screen.getByRole('button', { name: 'Automático' }).className).not.toContain('on');
  });
  it('mode numérico (1) também ativa a Ficha de favor', () => {
    setup(STAFF, staffPrices(1840, 18498), { mode: 1 });
    expect(screen.getByRole('button', { name: 'Ficha de favor' }).className).toContain('on');
  });
  it('clicar chama onChange("1") na ficha e onChange("auto") no Automático', () => {
    const onChange = vi.fn();
    setup(STAFF, staffPrices(1840, 18498), { mode: '1', onChange });
    fireEvent.click(screen.getByRole('button', { name: 'Ficha de favor' }));
    expect(onChange).toHaveBeenLastCalledWith('1');
    fireEvent.click(screen.getByRole('button', { name: 'Automático' }));
    expect(onChange).toHaveBeenLastCalledWith('auto');
    fireEvent.click(screen.getByRole('button', { name: 'Artefato' }));
    expect(onChange).toHaveBeenLastCalledWith('0');
  });
});

describe('RecipePicker: custo total', () => {
  it('mostra material, taxa (403 e 634) e custo total de cada receita; diferença 16.889', () => {
    const { results } = setup(STAFF, staffPrices(1840, 18498));
    const [a, b] = results;
    const ca = rowOf('Artefato').cells;
    const cb = rowOf('Ficha de favor').cells;
    expect(ca[1].textContent).toBe(fmt(a.matCost));
    expect(cb[1].textContent).toBe(fmt(b.matCost));
    expect(ca[2].textContent).toBe('403');
    expect(cb[2].textContent).toBe('634');
    expect(ca[3].textContent).toBe(fmt(a.totalCost));
    expect(cb[3].textContent).toBe(fmt(b.totalCost));
    expect(Math.round(b.totalCost - a.totalCost)).toBe(16889);
    expect(ca[3].textContent).not.toBe(ca[1].textContent);
  });
});

describe('RecipePicker: aviso de dependência da taxa (D-034)', () => {
  it('artefato 1.840 e ficha 1.700: a vencedora muda sem a taxa e o aviso aparece, com inicial maiúscula', () => {
    const { results } = setup(STAFF, staffPrices(1840, 1700));
    expect(pickCheapest(results)).toBe(0); // com taxa: artefato
    expect(results[1].matCost).toBeLessThan(results[0].matCost); // sem taxa: ficha
    expect(screen.getByText(/^A escolha depende da taxa de bancada/)).toBeTruthy();
  });
  it('artefato 1.840 e ficha 18.498: sem aviso', () => {
    setup(STAFF, staffPrices(1840, 18498));
    expect(screen.queryByText(/escolha depende da taxa/i)).toBeNull();
  });
});
