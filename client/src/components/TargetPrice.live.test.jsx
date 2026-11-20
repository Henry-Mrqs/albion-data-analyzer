// IDEIA-083: o cartão Preço-alvo publica ao pai o que está usando (onLive), sem loop de renderização.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { mkPrices } from '../test/helpers';
import { resetApp, seed } from '../test/ui';
import TargetPrice from './TargetPrice';

const prices = mkPrices({ T4_MAIN_SWORD: { Caerleon: { s: 4500 } } });
const CFG = { goal: 'profit', profit: 1000, margin: 20, mode: 'order', relists: 0 };
const NONE = { order: null, instant: null };
const ON = { order: { on: true, city: 'Caerleon' }, instant: null };
beforeEach(resetApp);

function mount(cfg = {}, props = {}) {
  seed('target:cfg', { ...CFG, ...cfg });
  const onLive = vi.fn();
  const view = render(<TargetPrice cost={3524.27} prices={prices} mid="T4_MAIN_SWORD" missing={false} noTax={NONE} onLive={onLive} {...props} />);
  return { onLive, ...view };
}
const last = (fn) => fn.mock.calls.at(-1)[0];

describe('TargetPrice: onLive (083)', () => {
  it('(a) lucro 1000, ordem de venda, 2 relistagens: alvo 5.113', () => {
    const { onLive } = mount({ relists: 2 });
    expect(last(onLive)).toEqual({ ok: true, goal: 'profit', profit: 1000, margin: 20, mode: 'order', relists: 2, off: false, city: null, target: 5113 });
  });
  it('(b) saída marcada: off, cidade e alvo 4.525', () => {
    const { onLive } = mount({ relists: 2 }, { noTax: ON });
    expect(last(onLive)).toMatchObject({ off: true, city: 'Caerleon', target: 4525, relists: 2 });
  });
  it('(c) modo instant: relistagens 0 e alvo 4.713; marca só em ordem de venda: off false', () => {
    const { onLive } = mount({ mode: 'instant', relists: 2 }, { noTax: ON });
    expect(last(onLive)).toMatchObject({ mode: 'instant', relists: 0, target: 4713, off: false });
  });
  it('(d) sem relistagens: 4.839', () => {
    expect(last(mount().onLive).target).toBe(4839);
  });
  it('(e) sem custo ou com material faltando: ok false, alvo null', () => {
    expect(last(mount({}, { cost: 0 }).onLive)).toMatchObject({ ok: false, target: null });
    expect(last(mount({}, { missing: true }).onLive)).toMatchObject({ ok: false, target: null });
  });
  it('(f) modo salvo inválido: publica o corrigido (order)', () => {
    expect(last(mount({ mode: 'FOO' }).onLive).mode).toBe('order');
  });
  it('(g) re-renderizar com as mesmas props não chama de novo; digitar na meta chama com o valor novo', () => {
    const { onLive, rerender } = mount();
    const n = onLive.mock.calls.length;
    for (let i = 0; i < 5; i++) rerender(<TargetPrice cost={3524.27} prices={prices} mid="T4_MAIN_SWORD" missing={false} noTax={{ ...NONE }} onLive={onLive} />);
    expect(onLive.mock.calls.length).toBe(n);
    fireEvent.change(document.querySelector('input'), { target: { value: '2000' } });
    expect(last(onLive)).toMatchObject({ profit: 2000, target: 5909 });
  });
  it('(h) sem onLive nada quebra', () => {
    seed('target:cfg', CFG);
    render(<TargetPrice cost={3524.27} prices={prices} mid="T4_MAIN_SWORD" missing={false} />);
    expect(screen.getByText('Liste a')).toBeTruthy();
  });
});
