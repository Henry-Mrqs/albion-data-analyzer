// IDEIA-073: polimento do cartão Comparar cidades (avisos de taxa, bônus sem preço, item sem cidade de bônus, colunas, "-0").
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CRAFT_CITIES } from '../lib/catalog';
import { resetApp } from '../test/ui';
import CityCompare from './CityCompare';

beforeEach(resetApp);

const row = (city, over = {}) => ({
  city, isBonus: false, specialty: false, rrr: 0.153, matCost: 4511, fee: 216, extras: 0, totalCost: 4727, unitCost: 4727,
  complete: true, missing: [], feeSource: 'general', deltaVsBonus: null, deltaVsBest: 0, ...over,
});
const incomplete = (city, over = {}) => row(city, { matCost: null, totalCost: null, unitCost: null, complete: false, missing: ['T4_LEATHER'], ...over });
const all = (f) => CRAFT_CITIES.map((c, i) => f(c, i));
function mount(rows, over = {}) {
  const result = { rows, best: rows.find((r) => r.complete) ?? null, spread: 0, issues: [] };
  return render(<CityCompare result={result} scenario="own" onScenario={() => {}} feeByCity={{}} onFee={() => {}} general={{ value: 500, touched: true }} units={1} {...over} />);
}
const text = () => document.body.textContent;
const bonusRows = (over = {}) => all((c, i) => row(c, { isBonus: i === 0, totalCost: 4727 + i * 100, deltaVsBonus: i * 100, ...over }));

describe('O1: taxa digitada em uma cidade só', () => {
  it('aviso leve nomeando a cidade e quantas usam a taxa geral; some quando todas têm taxa própria', () => {
    const rows = bonusRows().map((r, i) => (i === 0 ? { ...r, feeSource: 'city' } : r));
    mount(rows);
    const a = screen.getByTestId('city-fee-partial').textContent;
    expect(a).toContain(`Só ${CRAFT_CITIES[0]} tem taxa própria`);
    expect(a).toContain(`as outras ${CRAFT_CITIES.length - 1} usam 500 (da tela ou padrão do app)`);
    expect(screen.queryByTestId('city-fee-default')).toBeNull();
  });
  it('todas com taxa própria: sem aviso parcial; nenhuma e sem toque: o aviso forte continua', () => {
    const a = mount(bonusRows({ feeSource: 'city' }));
    expect(screen.queryByTestId('city-fee-partial')).toBeNull();
    a.unmount();
    mount(bonusRows(), { general: { value: 400, touched: false } });
    expect(screen.getByTestId('city-fee-default').textContent).toContain('Usando 400 do app em todas as cidades');
  });
});

describe('O2: taxa geral vazia', () => {
  it('vazia: avisa o padrão não confirmado e NÃO diz "Mesma taxa"', () => {
    mount(bonusRows(), { general: { value: '', touched: true } });
    expect(text()).toContain('Taxa geral vazia: o cálculo usa o padrão 400 do app (não confirmado) em todas as cidades');
    expect(text()).not.toContain('Mesma taxa em todas as cidades');
  });
  it('digitada e nenhuma por cidade: "Mesma taxa em todas as cidades (a da tela)."', () => {
    mount(bonusRows());
    expect(screen.getByTestId('city-fee-same').textContent).toBe('Mesma taxa em todas as cidades (a da tela).');
  });
});

describe('O3: cidade de bônus sem preço', () => {
  it('a frase diz qual cidade e o "—" da diferença tem title com o motivo', () => {
    const rows = [...CRAFT_CITIES.slice(0, -1).map((c) => row(c, { deltaVsBonus: null })), incomplete('Brecilien', { isBonus: true, deltaVsBonus: null })];
    mount(rows);
    expect(text()).toContain('Brecilien (cidade de bônus) está sem preço: não há coluna de diferença');
    const cell = [...document.querySelectorAll('tbody tr')][0].lastChild.querySelector('span');
    expect(cell.title).toContain('Brecilien');
  });
  it('bônus com preço: a frase não aparece', () => {
    mount(bonusRows());
    expect(text()).not.toContain('está sem preço: não há coluna de diferença');
  });
});

describe('O4: item sem cidade de bônus', () => {
  it('não diz "Melhor:" nem marca linha "best"; explica que as cidades dão o mesmo RRR', () => {
    mount(all((c) => row(c)));
    expect(text()).not.toContain('Melhor:');
    expect(document.querySelectorAll('tr.best')).toHaveLength(0);
    expect(text()).toContain(`Este item não tem cidade de bônus: as ${CRAFT_CITIES.length} cidades dão o mesmo RRR (15,3%) e a diferença vem só da taxa e do material`);
  });
  it('com cidade de bônus e custos diferentes: "Melhor:" continua', () => {
    mount(bonusRows());
    expect(text()).toContain('Melhor:');
    expect(document.querySelectorAll('tr.best')).toHaveLength(1);
  });
});

describe('O5: custo total antes do material e coluna Cidade fixa', () => {
  it('ordem Cidade, RRR, Custo total, Por unidade, Material, Taxa, Dif.; a 1ª coluna tem sticky-col', () => {
    mount(bonusRows());
    const h = [...document.querySelectorAll('thead th')].map((t) => t.textContent);
    expect(h).toEqual(['Cidade', 'RRR', 'Custo total', 'Por unidade', 'Material', 'Taxa (por 100)', 'Dif. p/ cidade de bônus']);
    expect(document.querySelector('thead th').className).toContain('sticky-col');
    expect(document.querySelector('tbody tr td').className).toContain('sticky-col');
    expect(readFileSync(join(import.meta.dirname, '..', 'index.css'), 'utf8')).toMatch(/\.sticky-col\s*\{[^}]*position:\s*sticky/);
  });
  it('com despesas: Despesas fica antes de Dif.', () => {
    mount(bonusRows({ extras: 100 }));
    const h = [...document.querySelectorAll('thead th')].map((t) => t.textContent);
    expect(h.slice(-3)).toEqual(['Taxa (por 100)', 'Despesas', 'Dif. p/ cidade de bônus']);
  });
});

describe('O6: "-0" nunca aparece e zero não é prejuízo', () => {
  it('deltaVsBonus -0,3 mostra 0 sem classe good/bad', () => {
    mount(bonusRows().map((r, i) => (i === 1 ? { ...r, deltaVsBonus: -0.3 } : r)));
    const cell = [...document.querySelectorAll('tbody tr')][1].lastChild.querySelector('span');
    expect(cell.textContent).toBe('0');
    expect(cell.className).not.toMatch(/good|bad/);
  });
});
