// IDEIA-005, dossiê §4.2: teste de SENSIBILIDADE. Para cada Var com `probe`, aplica a alteração na cfg e mede o cálculo real:
//  - kind "applied": o que ela declara (affects "cost" -> custo total; "profit" -> lucro) tem que MUDAR;
//  - kind "info-only" / "not-considered": custo E lucro têm que ficar IGUAIS (toEqual).
// Pega o auditor listando como "aplicada" uma variável que o cálculo ignora (o oposto do problema que ele resolve).
import { beforeEach, describe, expect, it } from 'vitest';
import { loadFixtureCatalog } from '../../test/helpers';
import { assembleCraft, assembleRefine, assembleRrr, craftMeasure, NOW, refineMeasure, rrrMeasure } from '../../test/auditKit';
import { craftVars } from './craft';
import { refineVars } from './refine';
import { rrrVars } from './rrr';

beforeEach(loadFixtureCatalog);

/** '@now' dentro do probe vira o "agora" fixo do teste. */
const withNow = (x) => (x === '@now' ? NOW : Array.isArray(x) ? x.map(withNow) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, withNow(v)])) : x);

/** Veredito puro: null = coerente; texto = o que está errado. Reusado pelos testes de mutação. */
export function verdict(v, before, after) {
  const same = JSON.stringify(before) === JSON.stringify(after);
  if (v.kind === 'applied') {
    if (v.affects === 'cost' && before.totalCost === after.totalCost) return `"${v.id}" é "applied" (custo), mas o custo total não mudou com o probe`;
    if (v.affects === 'profit' && before.profit === after.profit) return `"${v.id}" é "applied" (lucro), mas o lucro não mudou com o probe`;
    if (v.affects === 'rrr' && same) return `"${v.id}" é "applied" (RRR), mas o RRR e o retorno não mudaram com o probe`;
    return null;
  }
  return same ? null : `"${v.id}" é "${v.kind}" (não deveria mudar o cálculo), mas custo ou lucro mudaram com o probe`;
}

function craftRun(v) {
  const p = v.probe;
  const base = p.base ?? {};
  const scenario = p.scenario ?? 'sword';
  const before = craftMeasure(assembleCraft({ scenario, over: base }));
  const after = craftMeasure(assembleCraft({ scenario, over: { ...base, ...withNow(p.cfg ?? {}) }, premium: p.settings?.premium ?? true }));
  return { before, after };
}

describe('sensibilidade do Craft: cada probe muda (ou não muda) o cálculo como a linha declara', () => {
  const probed = craftVars.filter((v) => v.probe);

  it('há probes para todas as linhas "applied" com campo e para as informativas', () => {
    for (const v of craftVars.filter((x) => x.kind === 'applied' && x.fields.length)) expect(v.probe, v.id).toBeTruthy();
    expect(probed.length).toBeGreaterThanOrEqual(18);
  });

  it.each(probed.map((v) => [v.id, v.kind, v.affects, v]))('%s (%s, %s)', (_id, _k, _a, v) => {
    const { before, after } = craftRun(v);
    expect(verdict(v, before, after)).toBeNull();
    if (v.kind !== 'applied') {
      expect(after).toEqual(before);
    }
  });

  it('o ponto de partida tem custo e lucro (o teste não compara nulos)', () => {
    const m = craftRun(craftVars.find((v) => v.id === 'crafts')).before;
    expect(m.totalCost).toBeCloseTo(3524.27, 2);
    expect(m.profit).toBeCloseTo(683.23, 2);
  });

  it('mutação: linha informativa marcada como "applied" (foco em pontos, giro, esperar) REPROVA', () => {
    for (const id of ['focus-points', 'share', 'wait-cost', 'compare-info']) {
      const v = craftVars.find((x) => x.id === id);
      const { before, after } = craftRun(v);
      expect(verdict({ ...v, kind: 'applied', affects: 'cost' }, before, after), id).toMatch(/applied/);
    }
  });

  it('mutação: linha "applied" sem efeito reprova; "applied" que muda mas foi marcada "info-only" também', () => {
    const noEffect = { id: 'fantasma', kind: 'applied', affects: 'cost', fields: ['focusEff'], probe: { cfg: { focusEff: '10000' } } };
    const { before, after } = craftRun(noEffect);
    expect(verdict(noEffect, before, after)).toMatch(/custo total não mudou/);
    const focus = craftVars.find((x) => x.id === 'focus');
    const r = craftRun(focus);
    expect(verdict({ ...focus, kind: 'info-only', affects: 'none' }, r.before, r.after)).toMatch(/não deveria mudar/);
  });

  it('o probe de foco reduz o custo (RRR 24,8% -> 47,9%)', () => {
    const { before, after } = craftRun(craftVars.find((x) => x.id === 'focus'));
    expect(after.totalCost).toBeLessThan(before.totalCost);
  });
});

function refineRun(v) {
  const p = v.probe;
  // venda em Martlock (ordem de venda 135): o modo "na hora" (125) e o imposto mudam o lucro
  const base = { sellCity: 'Martlock', ...(p.base ?? {}) };
  const before = refineMeasure(assembleRefine({ over: base }));
  const after = refineMeasure(assembleRefine({ over: { ...base, ...withNow(p.cfg ?? {}) }, premium: p.settings?.premium ?? true }));
  return { before, after };
}

describe('sensibilidade do Refino (sobre evaluateTier): igual à do Craft', () => {
  const probed = refineVars.filter((v) => v.probe);
  it('toda linha "applied" com campo tem probe', () => {
    for (const v of refineVars.filter((x) => x.kind === 'applied' && x.fields.length)) expect(v.probe, v.id).toBeTruthy();
    expect(probed.length).toBeGreaterThanOrEqual(14);
  });
  it.each(probed.map((v) => [v.id, v.kind, v.affects, v]))('%s (%s, %s)', (_id, _k, _a, v) => {
    const { before, after } = refineRun(v);
    expect(verdict(v, before, after)).toBeNull();
    if (v.kind !== 'applied') expect(after).toEqual(before);
  });
  it('ponto de partida: custo 61,4734 e lucro 135 × 0,935 − 61,4734', () => {
    const { before } = refineRun(refineVars.find((v) => v.id === 'focus'));
    expect(before.totalCost).toBeCloseTo(61.4734, 4);
    expect(before.profit).toBeCloseTo(135 * 0.935 - 61.4734, 4);
  });
  it('mutação: foco em pontos marcado "applied" reprova; foco do refino marcado "info-only" reprova', () => {
    const fp = refineVars.find((v) => v.id === 'focus-points');
    const a = refineRun(fp);
    expect(verdict({ ...fp, kind: 'applied', affects: 'cost' }, a.before, a.after)).toMatch(/applied/);
    const f = refineVars.find((v) => v.id === 'focus');
    const b = refineRun(f);
    expect(verdict({ ...f, kind: 'info-only', affects: 'none' }, b.before, b.after)).toMatch(/não deveria mudar/);
  });
});

function rrrRun(v) {
  const p = v.probe;
  const before = rrrMeasure(assembleRrr({ over: p.base ?? {} }));
  const after = rrrMeasure(assembleRrr({ over: { ...(p.base ?? {}), ...p.cfg } }));
  return { before, after };
}

describe('sensibilidade da aba RRR (mede o RRR e o retorno da receita)', () => {
  const probed = rrrVars.filter((v) => v.probe);
  it('toda linha "applied" com campo tem probe', () => {
    for (const v of rrrVars.filter((x) => x.kind === 'applied' && x.fields.length)) expect(v.probe, v.id).toBeTruthy();
    expect(probed.length).toBeGreaterThanOrEqual(7);
  });
  it.each(probed.map((v) => [v.id, v]))('%s', (_id, v) => {
    const { before, after } = rrrRun(v);
    expect(verdict(v, before, after)).toBeNull();
  });
  it('mutação: uma linha que o cálculo ignora marcada "applied" (campo de outra tela) reprova', () => {
    const fake = { id: 'fantasma', kind: 'applied', affects: 'rrr', fields: ['x'], probe: { cfg: { qty: 7 } } };
    const { before, after } = rrrRun(fake);
    expect(verdict(fake, before, after)).toMatch(/não mudaram/);
  });
});
