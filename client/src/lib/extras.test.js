import { describe, expect, it } from 'vitest';
import { MAX_EXTRAS, extrasParts, extrasPerUnit, extrasTotal } from './extras';

const L = [{ name: 'Transporte', value: 150, scope: 'craft' }, { name: 'Comida de buff', value: 80, scope: 'craft' }];

describe('extras (IDEIA-048, dossiê §4)', () => {
  it('limite de linhas é 20', () => expect(MAX_EXTRAS).toBe(20));
  it('transporte 150 + comida 80 = 230 por craft', () => expect(extrasTotal(L, 1)).toBe(230));
  it('por craft multiplica: 10 crafts = 2.300; por lote não: 230 uma vez', () => {
    expect(extrasTotal(L, 10)).toBe(2300);
    expect(extrasTotal([{ value: 230, scope: 'lote' }], 10)).toBe(230);
  });
  it('misto: 150 por craft + 80 por lote com 10 crafts = 1.580', () =>
    expect(extrasTotal([{ value: 150, scope: 'craft' }, { value: 80, scope: 'lote' }], 10)).toBe(1580));
  it('por unidade: lote de 230 em 10 crafts de 1 unidade = 23', () =>
    expect(extrasPerUnit([{ value: 230, scope: 'lote' }], 10, 10)).toBe(23));
  it('item que rende 5 por craft: 3 crafts (15 un.) com 150 por craft = 450 / 15 = 30 por unidade', () =>
    expect(extrasPerUnit([{ value: 150, scope: 'craft' }], 15, 3)).toBe(30));
  it('lote ÷ quantidade: 100 por lote em 50 unidades = 2', () =>
    expect(extrasPerUnit([{ value: 100, scope: 'lote' }], 50, 50)).toBe(2));
  it('lista vazia, indefinida ou unidades 0: 0 e nunca NaN', () => {
    expect(extrasTotal([], 5)).toBe(0);
    expect(extrasTotal(undefined, 5)).toBe(0);
    expect(extrasPerUnit(L, 0, 1)).toBe(0);
    expect(extrasPerUnit(L, -3, 1)).toBe(0);
  });
  it('escopo desconhecido conta como por craft (a validação já corrige antes)', () =>
    expect(extrasTotal([{ value: 10, scope: 'x' }], 3)).toBe(30));
  it('extrasParts: 230 por craft em 10 crafts = 2.300 no lote; misto separa craft e lote; vazio = zeros', () => {
    expect(extrasParts(L, 10)).toEqual({ perCraft: 230, perLote: 0, total: 2300 });
    expect(extrasParts([{ value: 150, scope: 'craft' }, { value: 80, scope: 'lote' }], 10)).toEqual({ perCraft: 150, perLote: 80, total: 1580 });
    expect(extrasParts(undefined, 3)).toEqual({ perCraft: 0, perLote: 0, total: 0 });
  });
});
