import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Carga inicial do módulo contra um localStorage falso (Node, sem jsdom).
const fake = (initial = {}, { throwOnGet = false, throwOnSet = false } = {}) => {
  const store = { ...initial };
  return {
    store,
    getItem: (k) => {
      if (throwOnGet) throw new Error('bloqueado');
      return k in store ? store[k] : null;
    },
    setItem: (k, v) => {
      if (throwOnSet) throw new Error('cheio');
      store[k] = String(v);
    },
  };
};
const boot = async (ls) => {
  vi.stubGlobal('localStorage', ls);
  vi.resetModules();
  return import('./settings');
};

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe('settings (carga inicial)', () => {
  it('nada salvo = padrões; salvo antigo {server,premium} ganha feeCeiling 1000', async () => {
    expect((await boot(fake())).getSettings()).toEqual({ server: 'west', premium: true, feeCeiling: 1000 });
    const m = await boot(fake({ 'albion:settings': JSON.stringify({ server: 'europe', premium: false }) }));
    expect(m.getSettings()).toEqual({ server: 'europe', premium: false, feeCeiling: 1000 });
  });

  it.each([['marte', 'west'], [5, 'west'], [null, 'west']])('settings.server inválido %j cai em west', async (bad, want) => {
    const m = await boot(fake({ 'albion:settings': JSON.stringify({ server: bad, premium: false }) }));
    expect(m.getSettings().server).toBe(want);
    expect(m.getSettings().premium).toBe(false); // o resto fica
  });

  it.each(['{quebrado', '"texto"', '[]', 'null', '42'])('salvo %s não derruba o módulo; valem os padrões', async (raw) => {
    const m = await boot(fake({ 'albion:settings': raw }));
    expect(m.getSettings()).toEqual({ server: 'west', premium: true, feeCeiling: 1000 });
  });

  it.each([null, 0, -5, 'abc'])('feeCeiling inválido %j chega intacto a getSettings() (o CeilingNotice da 060 continua avisando)', async (v) => {
    const m = await boot(fake({ 'albion:settings': JSON.stringify({ feeCeiling: v }) }));
    expect(m.getSettings().feeCeiling).toBe(v);
  });

  it('setSettings grava com _v e preserva o resto; getSettings() nunca expõe _v', async () => {
    const ls = fake({ 'albion:settings': JSON.stringify({ server: 'east', premium: true, feeCeiling: 500, extra: 'fica' }) });
    const m = await boot(ls);
    expect(m.getSettings()).not.toHaveProperty('_v');
    m.setSettings({ premium: false });
    expect(JSON.parse(ls.store['albion:settings'])).toEqual({ server: 'east', premium: false, feeCeiling: 500, extra: 'fica', _v: 1 });
    expect(m.getSettings()).toEqual({ server: 'east', premium: false, feeCeiling: 500, extra: 'fica' });
  });

  it('estado atual completo: mesmos valores de antes', async () => {
    const m = await boot(fake({ 'albion:settings': JSON.stringify({ server: 'europe', premium: false, feeCeiling: 250 }) }));
    expect(m.getSettings()).toEqual({ server: 'europe', premium: false, feeCeiling: 250 });
  });

  it('localStorage que lança (modo privado) em leitura e em gravação: sem exceção', async () => {
    const m = await boot(fake({}, { throwOnGet: true, throwOnSet: true }));
    expect(m.getSettings()).toEqual({ server: 'west', premium: true, feeCeiling: 1000 });
    expect(() => m.setSettings({ premium: false })).not.toThrow();
    expect(m.getSettings().premium).toBe(false);
  });

  it('sem localStorage nenhum (ReferenceError): padrões', async () => {
    vi.stubGlobal('localStorage', undefined);
    vi.resetModules();
    const m = await import('./settings');
    expect(m.getSettings()).toEqual({ server: 'west', premium: true, feeCeiling: 1000 });
  });
});
