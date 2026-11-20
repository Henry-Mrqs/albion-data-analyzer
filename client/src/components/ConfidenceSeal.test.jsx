// IDEIA-012: selo de confiança (apresentação).
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { resetApp } from '../test/ui';
import ConfidenceSeal from './ConfidenceSeal';

beforeEach(resetApp);
const c = (level, reasons = []) => ({ level, reasons: reasons.map((code) => ({ code, text: `razão ${code}` })), z: null, vsMedian: null });

describe('ConfidenceSeal (012)', () => {
  it('3 níveis: rótulo e cor; "nenhuma" não mostra selo', () => {
    const casos = [['alta', 'preço confiável', 'good'], ['media', 'confira', 'warn'], ['baixa', 'desconfie', 'bad']];
    for (const [level, label, cls] of casos) {
      const { unmount } = render(<ConfidenceSeal conf={c(level, level === 'alta' ? [] : ['stale'])} />);
      const el = screen.getByTestId('confidence-seal');
      expect(el.textContent).toBe(label);
      expect(el.querySelector('small').className).toBe(cls);
      unmount();
    }
    render(<ConfidenceSeal conf={c('nenhuma')} />);
    expect(screen.queryByTestId('confidence-seal')).toBeNull();
  });
  it('tooltip lista as razões e o rodapé "Regra do app, não dado do jogo"; withReasons mostra em texto', () => {
    render(<ConfidenceSeal conf={c('baixa', ['above', 'unstable'])} withReasons />);
    const el = screen.getByTestId('confidence-seal');
    expect(el.title).toContain('razão above');
    expect(el.title).toContain('razão unstable');
    expect(el.title).toContain('Regra do app, não dado do jogo');
    expect(el.textContent).toContain('razão above');
  });
  it('só "histórico não carregado" não mostra selo; conf null não lança', () => {
    render(<ConfidenceSeal conf={c('media', ['unloaded'])} />);
    expect(screen.queryByTestId('confidence-seal')).toBeNull();
    render(<ConfidenceSeal conf={null} />);
    expect(screen.queryByTestId('confidence-seal')).toBeNull();
  });
});
