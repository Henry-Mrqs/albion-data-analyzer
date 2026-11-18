import { lazy, Suspense, useEffect, useState } from 'react';
import { BarChart3, Download, Flame, Hammer, Percent, Truck } from 'lucide-react';
import { useCatalog } from './lib/catalog';
import { SERVERS, setSettings, useSettings } from './lib/settings';
import { Banner, Loading } from './components/ui';
import Market from './components/Market';

const Refining = lazy(() => import('./components/Refining'));
const Crafting = lazy(() => import('./components/Crafting'));
const Flipper = lazy(() => import('./components/Flipper'));
const RrrCalculator = lazy(() => import('./components/RrrCalculator'));

const TABS = [
  { id: 'market', label: 'Mercado', icon: BarChart3, View: Market },
  { id: 'refining', label: 'Refino', icon: Flame, View: Refining },
  { id: 'crafting', label: 'Craft', icon: Hammer, View: Crafting },
  { id: 'flipper', label: 'Flipper', icon: Truck, View: Flipper },
  { id: 'rrr', label: 'RRR', icon: Percent, View: RrrCalculator },
];

const fromHash = () => (TABS.find((t) => t.id === location.hash.slice(1)) ?? TABS[0]).id;

export default function App() {
  const [tab, setTab] = useState(fromHash);
  const { server, premium } = useSettings();
  const { ready, error } = useCatalog();

  useEffect(() => {
    const on = () => setTab(fromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const go = (id) => {
    window.history.pushState(null, "", `#${id}`);
    setTab(id);
  };
  const View = TABS.find((t) => t.id === tab).View;

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          ALBION <b>DATA</b>
        </div>
        <nav className="tabs">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => go(id)}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>
        <div className="header-tools">
          <select className="input input-sm" style={{ width: 'auto' }} value={server} onChange={(e) => setSettings({ server: e.target.value })} title="Servidor do jogo (de onde vêm os preços)">
            {Object.entries(SERVERS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <label className="chip" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }} title="Impostos de mercado: 4% com premium, 8% sem">
            <input type="checkbox" checked={premium} onChange={(e) => setSettings({ premium: e.target.checked })} /> Premium
          </label>
        </div>
      </header>

      {error ? (
        <Banner kind="err" title="Falha ao carregar o catálogo de itens">
          {error}
        </Banner>
      ) : !ready ? (
        <Loading text="Carregando catálogo de itens…" />
      ) : (
        <Suspense fallback={<Loading />}>
          <View />
        </Suspense>
      )}

      <footer className="footer">
        Preços do <a href="https://www.albion-online-data.com" target="_blank" rel="noreferrer">Albion Online Data Project</a>, alimentados por jogadores. Para atualizar os dados de um item, abra o mercado dele no jogo com o{' '}
        <a href="https://github.com/ao-data/albion-data-client/releases" target="_blank" rel="noreferrer">
          <Download size={11} /> Albion Data Client
        </a>{' '}
        ligado no mesmo servidor ({SERVERS[server]}).
      </footer>
    </div>
  );
}
