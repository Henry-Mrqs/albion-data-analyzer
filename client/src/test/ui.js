// Helpers dos testes de componente (project `ui`, jsdom). Sem JSX de propósito (react-refresh/only-export-components).
import { vi } from 'vitest';
import { setSettings } from '../lib/settings';
import { loadFixtureCatalog } from './helpers';

/** Zera o armazenamento e o estado global de settings.js; carrega o catálogo da fixture. Chamar em todo beforeEach. */
export function resetApp() {
  localStorage.clear();
  setSettings({ server: 'west', premium: true, feeCeiling: 1000 });
  loadFixtureCatalog();
}

/** Semeia o armazenamento como o usePersisted grava. Chamar ANTES de render() (o hook lê no mount). */
export function seed(key, value) {
  localStorage.setItem(`albion:${key}`, JSON.stringify(value));
}

// Cópia dos padrões de 'craft:cfg' do Crafting.jsx (o teste de contrato em Crafting.test.jsx pega a divergência).
export function craftCfg(over = {}) {
  return {
    craftCity: 'Lymhurst', specialty: null, focus: false, feePer100: 400, customRRR: '',
    matCity: 'best', useOrders: false, crafts: 1,
    refine: {}, refineFocus: false, refineFee: 400, refineCity: 'auto', refineDaily: {},
    ...over,
  };
}

/** Congela só o Date (React e Testing Library seguem com temporizadores reais). Devolve o restore. */
export function freezeNow(iso) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(iso);
  return () => vi.useRealTimers();
}

/** Formato de retorno do usePrices. */
export function pricesHook(prices) {
  return { prices, loading: false, error: null, updatedAt: Date.UTC(2026, 10, 17, 11, 0, 0), refresh() {} };
}
