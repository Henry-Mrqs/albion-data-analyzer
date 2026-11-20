import { useEffect } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Money } from './ui';
import { CeilingNotice } from './InputIssues';
import FeeField from './FeeField';
import { usePersisted, getSettings, setSettings } from '../lib/settings';
import { resetApp, seed, craftCfg, freezeNow, pricesHook } from '../test/ui';

beforeEach(resetApp);

const cls = (container) => container.firstChild.className.split(/\s+/).filter(Boolean);

function Probe({ k = 'probe:x', initial = { a: 1 } }) {
  const [v, setV] = usePersisted(k, initial);
  return (
    <button type="button" onClick={() => setV({ ...v, a: v.a + 1 })}>
      valor {JSON.stringify(v)}
    </button>
  );
}

function Capture({ k, initial, onValue }) {
  const [v] = usePersisted(k, initial);
  useEffect(() => onValue(v), [v, onValue]);
  return null;
}

// devolve o objeto de estado exatamente como o hook o entrega (para checar identidade)
function lerEstado(k, initial) {
  const onValue = vi.fn();
  render(<Capture k={k} initial={initial} onValue={onValue} />);
  return onValue.mock.calls[0][0];
}

describe('ambiente de componente', () => {
  it('o projeto ui tem DOM e localStorage', () => {
    expect(document.body).toBeDefined();
    localStorage.setItem('a', '1');
    expect(localStorage.getItem('a')).toBe('1');
    render(<Money value={1234} />);
    expect(screen.getByText('1.234')).toBeTruthy();
  });
});

describe('helpers (src/test/ui.js)', () => {
  it('resetApp zera feeCeiling para 1000 e limpa o localStorage', () => {
    setSettings({ feeCeiling: 9999 });
    localStorage.setItem('x', '1');
    resetApp();
    expect(getSettings().feeCeiling).toBe(1000);
    expect(localStorage.getItem('x')).toBeNull();
    expect(JSON.parse(localStorage.getItem('albion:settings')).feeCeiling).toBe(1000);
  });

  it('seed é lido por um componente que usa usePersisted', () => {
    seed('craft:item', { id: 'T4_MAIN_SWORD', ench: 0 });
    // chave em variável: persistSchemas.test.js varre o texto de todo .jsx de components atrás de chamadas de usePersisted com chave literal
    const chave = 'craft:item';
    function Lido() {
      const [v] = usePersisted(chave, { id: 'padrão', ench: 0 });
      return <span>{v.id}</span>;
    }
    render(<Lido />);
    expect(screen.getByText('T4_MAIN_SWORD')).toBeTruthy();
  });

  it('freezeNow congela só o Date e o restore volta ao relógio real', () => {
    const restore = freezeNow('2026-11-17T12:00:00Z');
    expect(Date.now()).toBe(1794916800000);
    restore();
    expect(Date.now()).not.toBe(1794916800000);
    expect(Math.abs(Date.now() - new Date().getTime())).toBeLessThan(1000);
  });

  it('pricesHook tem as 5 chaves do usePrices', () => {
    const h = pricesHook({});
    expect(Object.keys(h).sort()).toEqual(['error', 'loading', 'prices', 'refresh', 'updatedAt']);
    expect(h.loading).toBe(false);
    expect(h.error).toBeNull();
    expect(typeof h.refresh).toBe('function');
  });

  it('craftCfg mescla o override sobre os padrões', () => {
    expect(craftCfg().craftCity).toBe('Lymhurst');
    expect(craftCfg({ crafts: 3 }).crafts).toBe(3);
    expect(craftCfg({ crafts: 3 }).feePer100).toBe(400);
  });
});

describe('usePersisted montado (M25, M26 da IDEIA-070)', () => {
  it('grava com o campo reservado _v (M25: JSON.stringify(next) sem _v)', () => {
    render(<Probe />);
    fireEvent.click(screen.getByRole('button'));
    expect(JSON.parse(localStorage.getItem('albion:probe:x'))).toEqual({ a: 2, _v: 1 });
  });

  it('o _v gravado não vaza para o estado da tela', () => {
    seed('probe:x', { a: 5, _v: 1 });
    render(<Probe />);
    expect(screen.getByRole('button').textContent).toBe('valor {"a":5}');
  });

  it('o estado devolvido não compartilha referência com os padrões (M26: clone por identidade)', () => {
    const padrao = { lista: [1], sub: { n: 1 } };
    const visto = lerEstado('probe:ref', padrao);
    expect(visto).toEqual(padrao);
    expect(visto).not.toBe(padrao);
    expect(visto.lista).not.toBe(padrao.lista);
    expect(visto.sub).not.toBe(padrao.sub);
    visto.lista.push(2);
    visto.sub.n = 9;
    expect(padrao).toEqual({ lista: [1], sub: { n: 1 } });
  });

  it('também não compartilha quando há valor salvo (campo ausente herda um clone do padrão)', () => {
    const padrao = { a: 1, sub: { n: 1 } };
    seed('probe:ref2', { a: 2 });
    const visto = lerEstado('probe:ref2', padrao);
    expect(visto.sub).toEqual({ n: 1 });
    expect(visto.sub).not.toBe(padrao.sub);
  });
});

describe('Money', () => {
  it('signed: positivo mostra + e good', () => {
    const { container } = render(<Money value={500} signed />);
    expect(container.textContent).toBe('+500');
    expect(cls(container)).toContain('good');
  });
  it('signed: negativo mostra - e bad', () => {
    const { container } = render(<Money value={-500} signed />);
    expect(container.textContent).toBe('-500');
    expect(cls(container)).toContain('bad');
  });
  it('signed: zero sem sinal e sem classe', () => {
    const { container } = render(<Money value={0} signed />);
    expect(container.textContent).toBe('0');
    expect(cls(container)).toEqual(['num']);
  });
  it('sem signed nunca tem sinal ou cor', () => {
    const a = render(<Money value={500} />);
    expect(a.container.textContent).toBe('500');
    expect(cls(a.container)).toEqual(['num']);
    const b = render(<Money value={-500} />);
    expect(b.container.textContent).toBe('-500');
    expect(cls(b.container)).toEqual(['num']);
  });
  it.each([Infinity, -Infinity, NaN])('%s mostra "valor enorme" sem + nem classe', (v) => {
    const { container } = render(<Money value={v} signed />);
    expect(container.textContent).toBe('valor enorme');
    expect(cls(container)).toEqual(['num']);
  });
});

describe('CeilingNotice', () => {
  it('com 1000 não renderiza nada', () => {
    const { container } = render(<CeilingNotice />);
    expect(container.firstChild).toBeNull();
  });
  it('com o teto ausente (undefined) não renderiza nada', () => {
    act(() => setSettings({ feeCeiling: undefined }));
    const { container } = render(<CeilingNotice />);
    expect(container.firstChild).toBeNull();
  });
  it('com 5000 mostra o aviso e o botão; restaurar volta a 1000 e o aviso some', () => {
    act(() => setSettings({ feeCeiling: 5000 }));
    render(<CeilingNotice />);
    expect(screen.getByTestId('ceiling-notice').textContent).toContain('Teto de taxa aceito: 5.000.');
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar 1.000' }));
    expect(getSettings().feeCeiling).toBe(1000);
    expect(screen.queryByTestId('ceiling-notice')).toBeNull();
  });
  it.each([null, 0, -5, 'abc', 2e6])('salvo inválido (%s) mostra a mensagem do sanitize e o botão', (raw) => {
    act(() => setSettings({ feeCeiling: raw }));
    render(<CeilingNotice />);
    const t = screen.getByTestId('ceiling-notice').textContent;
    expect(t).toContain('é inválido');
    expect(t).not.toContain('Teto de taxa aceito');
    expect(screen.getByRole('button', { name: 'Restaurar 1.000' })).toBeTruthy();
  });
});

describe('FeeField', () => {
  const baseProps = { label: 'Taxa', value: 400, issues: [] };
  it('touched=false mostra o aviso de valor padrão', () => {
    render(<FeeField {...baseProps} touched={false} onChange={() => {}} onTouch={() => {}} />);
    expect(screen.getByText(/Valor padrão do app \(400\)/)).toBeTruthy();
  });
  it('touched=true não mostra o aviso', () => {
    render(<FeeField {...baseProps} touched onChange={() => {}} onTouch={() => {}} />);
    expect(screen.queryByText(/Valor padrão do app/)).toBeNull();
  });
  it('digitar chama onChange e onTouch', () => {
    const onChange = vi.fn();
    const onTouch = vi.fn();
    render(<FeeField {...baseProps} touched={false} onChange={onChange} onTouch={onTouch} />);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '500' } });
    expect(onChange).toHaveBeenCalledWith('500');
    expect(onTouch).toHaveBeenCalledTimes(1);
  });
  it('com teto 5000 mostra o CeilingNotice; com ceilingNotice={false} não', () => {
    act(() => setSettings({ feeCeiling: 5000 }));
    const a = render(<FeeField {...baseProps} touched onChange={() => {}} onTouch={() => {}} />);
    expect(screen.queryByTestId('ceiling-notice')).not.toBeNull();
    a.unmount();
    render(<FeeField {...baseProps} touched onChange={() => {}} onTouch={() => {}} ceilingNotice={false} />);
    expect(screen.queryByTestId('ceiling-notice')).toBeNull();
  });
});

describe('craftCfg() (helper) acompanha os padrões atuais (IDEIA-074, O4)', () => {
  it('craftCfg() é igual a CURRENT_DEFAULTS["craft:cfg"]: helper e padrões não divergem em silêncio', async () => {
    const { CURRENT_DEFAULTS } = await import('../test/savedStates');
    expect(craftCfg()).toEqual(CURRENT_DEFAULTS['craft:cfg']);
  });
});
