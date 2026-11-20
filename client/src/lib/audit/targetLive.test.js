// IDEIA-083: o auditor mostra meta, modo e relistagens vivos do Preço-alvo; "sem imposto" vira "aplicada" só quando vale.
import { beforeEach, describe, it, expect } from 'vitest';
import { loadFixtureCatalog } from '../../test/helpers';
import { assembleCraft } from '../../test/auditKit';
import { auditCraft } from './craft';

beforeEach(loadFixtureCatalog);
const get = (out, id) => out.rows.find((r) => r.id === id);
const LIVE = { ok: true, goal: 'profit', profit: 1000, margin: 20, mode: 'order', relists: 2, off: false, city: null, target: 5113 };
const run = (targetLive, over = {}) => {
  const a = assembleCraft({ over });
  return auditCraft({ ...a.input, targetLive });
};

describe('auditor: Preço-alvo vivo (083)', () => {
  it('meta, modo, relistagens e alvo vivos; sem marca: informativa', () => {
    const out = run(LIVE);
    expect(get(out, 'target-goal').value).toBe('lucro de 1.000 por unidade');
    expect(get(out, 'target-mode').value).toBe('ordem de venda');
    expect(get(out, 'target-relists').value).toBe(2);
    expect(get(out, 'target-relists').note).toContain('cada atualização soma 2,5%');
    expect(get(out, 'target-price')).toMatchObject({ status: 'info-only', origin: 'derived' });
    expect(get(out, 'target-price').value).toBe('5.113 (a ser listado)');
    const nt = get(out, 'target-notax');
    expect(nt.status).toBe('info-only');
    expect(nt.note).toContain('nenhuma saída do modo ordem de venda está marcada');
  });
  it('saída do modo marcada: "aplicada" com a cidade; relistagens não contam', () => {
    const out = run({ ...LIVE, off: true, city: 'Caerleon', target: 4525 }, { noTax: { 'Caerleon|order': true } });
    const nt = get(out, 'target-notax');
    expect(nt.status).toBe('applied');
    expect(nt.value).toContain('aplicada: ordem de venda (Caerleon) sem imposto e sem taxa de criação');
    expect(get(out, 'target-relists').note).toContain('relistagens não contam com Sem imposto');
  });
  it('modo instant com a marca só em ordem de venda: informativa, relistagens 0 e aviso do outro modo', () => {
    const out = run({ ...LIVE, mode: 'instant', relists: 0, target: 4713 }, { noTax: { 'Caerleon|order': true } });
    expect(get(out, 'target-mode').value).toBe('ordem de compra (na hora)');
    expect(get(out, 'target-relists').value).toBe(0);
    expect(get(out, 'target-relists').note).toContain('só conta no modo ordem de venda');
    const nt = get(out, 'target-notax');
    expect(nt.status).toBe('info-only');
    expect(nt.note).toContain('marcada só em ordem de venda; o modo escolhido no cartão (ordem de compra) conta imposto');
  });
  it('meta equilíbrio e margem', () => {
    expect(get(run({ ...LIVE, goal: 'even' }), 'target-goal').value).toBe('equilíbrio (lucro 0)');
    expect(get(run({ ...LIVE, goal: 'margin', margin: 20 }), 'target-goal').value).toBe('margem de 20% sobre o custo');
  });
  it('cartão ainda não montou (null) ou sem custo: informativa, sem quebrar', () => {
    for (const live of [null, undefined, { ...LIVE, ok: false, target: null }]) {
      const out = run(live);
      expect(get(out, 'target-card')).toBeTruthy();
      expect(get(out, 'target-notax').status).toBe('info-only');
      expect(get(out, 'target-price')).toBeUndefined();
    }
    expect(get(run({ ...LIVE, ok: false, target: null }), 'target-card').value).toBe('cartão sem custo ou sem preço de material');
  });
});
