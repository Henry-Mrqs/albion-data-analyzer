// IDEIA-089: o cartão Giro avisa quando a série cobre menos dias que a janela pedida.
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { resetApp } from '../test/ui';
import { GiroCard } from './Giro';
import { windowStats } from '../lib/liquidity';

beforeEach(resetApp);
const DAY = 86400000;
const now = Date.parse('2026-11-19T12:00:00Z');
const serie = (nDias) => Array.from({ length: nDias }, (_, i) => ({ t: Date.UTC(2026, 10, 19) - (nDias - i) * DAY, n: 100, p: 100 }));
const mount = (nDias) => render(<GiroCard rows={[{ city: 'Caerleon', stats: windowStats(serie(nDias), { now, days: 7 }) }]} units={10} sharePct={10} best={null} loading={false} />);

describe('GiroCard: dica de histórico curto (089)', () => {
  it('série cobre 3 dias de 7: mostra o texto da janela e a dica', () => {
    mount(3);
    expect(document.body.textContent).toContain('Vendas registradas por dia nos últimos 7 dias completos');
    expect(document.body.textContent).toContain('a série cobre só 3 dias (item novo ou histórico curto da API)');
  });
  it('série cobre a janela inteira: sem dica', () => {
    mount(10);
    expect(document.body.textContent).not.toContain('a série cobre só');
  });
});
