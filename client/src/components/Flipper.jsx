import { useMemo, useRef, useState } from 'react';
import { Play, Square } from 'lucide-react';
import { allItems, marketId, nameOf, categoryLabel } from '../lib/catalog';
import { CITIES, SELL_CITIES, cityLabel, fetchPrices, ageLabel, ageClass } from '../lib/market';
import { SETUP_FEE, netSale, fmt } from '../lib/econ';
import { useSettings, usePersisted } from '../lib/settings';
import { Banner, Field, NumberInput, Segmented } from './ui';

const GROUPS = {
  weapons: { label: 'Armas', test: (c) => c.startsWith('weapons/') },
  armors: { label: 'Armaduras', test: (c) => c.startsWith('armors/') },
  head: { label: 'Elmos', test: (c) => c.startsWith('head/') },
  shoes: { label: 'Botas', test: (c) => c.startsWith('shoes/') },
  offhands: { label: 'Secundárias', test: (c) => c.startsWith('offhands/') },
  capes: { label: 'Capas e bolsas', test: (c) => c.startsWith('capes/') || c.startsWith('bags/') },
  artefacts: { label: 'Artefatos', test: (c) => c.startsWith('artefacts/') },
  consumables: { label: 'Poções e comida', test: (c) => c.startsWith('consumables/') },
  resources: { label: 'Recursos', test: (c) => c.startsWith('crafting/') },
};
const MAX_IDS = 3000;

export default function Flipper() {
  const { premium } = useSettings();
  const [cfg, setCfg] = usePersisted('flip:cfg', {
    groups: ['weapons', 'armors'], tiers: [6, 7, 8], enchs: [0, 1],
    buyCities: [...CITIES], sellCities: ['Black Market', 'Caerleon'],
    buyMode: 'instant', sellMode: 'any', minProfit: 2000, minMargin: 10, maxAge: 24, budget: '',
  });
  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));
  const toggle = (key, v) => set({ [key]: cfg[key].includes(v) ? cfg[key].filter((x) => x !== v) : [...cfg[key], v] });

  const [scan, setScan] = useState({ running: false, done: 0, total: 0, prices: null, error: null, at: null });
  const abort = useRef(null);
  const [sort, setSort] = useState({ key: 'profit', dir: -1 });

  const ids = useMemo(() => {
    const out = [];
    for (const it of allItems()) {
      if (!cfg.tiers.includes(it.t)) continue;
      if (!cfg.groups.some((g) => GROUPS[g].test(it.c))) continue;
      for (const e of cfg.enchs) if (e <= it.x) out.push(marketId(it.i, e));
    }
    return out;
  }, [cfg.groups, cfg.tiers, cfg.enchs]);

  async function run(force) {
    abort.current?.abort();
    const c = new AbortController();
    abort.current = c;
    setScan({ running: true, done: 0, total: 1, prices: null, error: null, at: null });
    try {
      const prices = await fetchPrices(ids, {
        qualities: '1',
        force,
        signal: c.signal,
        onProgress: (done, total, partial) => setScan((s) => ({ ...s, done, total, prices: { ...partial } })),
      });
      setScan((s) => ({ ...s, running: false, prices, at: Date.now() }));
    } catch (e) {
      if (e.name === 'AbortError') return setScan((s) => ({ ...s, running: false }));
      setScan((s) => ({ ...s, running: false, error: e.message }));
    }
  }

  const rows = useMemo(() => {
    if (!scan.prices) return [];
    const maxAgeMs = cfg.maxAge * 3600000;
    const now = Date.now();
    const fresh = (d) => d && (!cfg.maxAge || now - d <= maxAgeMs);
    const budget = +cfg.budget || Infinity;
    const out = [];
    for (const [mid, cities] of Object.entries(scan.prices)) {
      let best = null;
      for (const b of cfg.buyCities) {
        const bq = cities[b]?.[1];
        if (!bq) continue;
        const instantBuy = bq.s > 0 && fresh(bq.sd);
        const orderBuy = bq.b > 0 && fresh(bq.bd);
        const cost = cfg.buyMode === 'instant' ? (instantBuy ? bq.s : 0) : orderBuy ? bq.b * (1 + SETUP_FEE) : 0;
        if (!cost || cost > budget) continue;
        const bdate = cfg.buyMode === 'instant' ? bq.sd : bq.bd;
        for (const s of cfg.sellCities) {
          if (s === b) continue;
          const sq = cities[s]?.[1];
          if (!sq) continue;
          const opts = [];
          if (cfg.sellMode !== 'order' && sq.b > 0 && fresh(sq.bd)) opts.push({ mode: 'instant', price: sq.b, date: sq.bd });
          if (cfg.sellMode !== 'instant' && s !== 'Black Market' && sq.s > 0 && fresh(sq.sd)) opts.push({ mode: 'order', price: sq.s, date: sq.sd });
          for (const o of opts) {
            const profit = netSale(o.price, o.mode, premium) - cost;
            if (!best || profit > best.profit) best = { mid, buy: b, sell: s, mode: o.mode, cost, price: o.price, profit, margin: (profit / cost) * 100, bdate, sdate: o.date };
          }
        }
      }
      if (best && best.profit >= (+cfg.minProfit || 0) && best.margin >= (+cfg.minMargin || 0)) out.push(best);
    }
    out.sort((a, b) => (a[sort.key] - b[sort.key]) * sort.dir);
    return out;
  }, [scan.prices, cfg, premium, sort]);

  const th = (key, label) => (
    <th className="sortable" onClick={() => setSort((s) => ({ key, dir: s.key === key ? -s.dir : -1 }))}>
      {label} {sort.key === key ? (sort.dir < 0 ? '↓' : '↑') : ''}
    </th>
  );
  const chipRow = (key, values, label) => (
    <div className="chips">
      {values.map((v) => (
        <button key={v} type="button" className={`chip ${cfg[key].includes(v) ? 'on' : ''}`} onClick={() => toggle(key, v)}>
          {label(v)}
        </button>
      ))}
    </div>
  );

  const requests = Math.ceil(ids.length / 60);
  const tooMany = ids.length > MAX_IDS;

  return (
    <div className="grid-2">
      <div className="card stack">
        <h2>Flipper</h2>
        <Field label="Categorias">{chipRow('groups', Object.keys(GROUPS), (g) => GROUPS[g].label)}</Field>
        <Field label="Tiers">{chipRow('tiers', [4, 5, 6, 7, 8], (t) => `T${t}`)}</Field>
        <Field label="Encantamentos">{chipRow('enchs', [0, 1, 2, 3, 4], (e) => `.${e}`)}</Field>
        <hr className="sep" style={{ margin: 0 }} />
        <Field label="Comprar em">{chipRow('buyCities', CITIES, (c) => c)}</Field>
        <Field label="Vender em">{chipRow('sellCities', SELL_CITIES, cityLabel)}</Field>
        <div className="field">
          <label>Compra</label>
          <Segmented value={cfg.buyMode} onChange={(v) => set({ buyMode: v })} options={[{ value: 'instant', label: 'Na hora' }, { value: 'order', label: 'Criar ordem' }]} />
        </div>
        <div className="field">
          <label>Venda</label>
          <Segmented value={cfg.sellMode} onChange={(v) => set({ sellMode: v })} options={[{ value: 'any', label: 'Qualquer' }, { value: 'instant', label: 'Na hora' }, { value: 'order', label: 'Listar' }]} />
        </div>
        <div className="cols-2">
          <Field label="Lucro mínimo">
            <NumberInput value={cfg.minProfit} onChange={(v) => set({ minProfit: v })} />
          </Field>
          <Field label="Margem mín. (%)">
            <NumberInput value={cfg.minMargin} onChange={(v) => set({ minMargin: v })} />
          </Field>
          <Field label="Preço máx. de compra">
            <NumberInput value={cfg.budget} onChange={(v) => set({ budget: v })} placeholder="sem limite" />
          </Field>
          <Field label="Dados com até (h)">
            <NumberInput value={cfg.maxAge} onChange={(v) => set({ maxAge: v })} />
          </Field>
        </div>
        <p className="hint">Considera itens de qualidade Normal. Impostos: {premium ? 'premium (4%)' : 'sem premium (8%)'}{cfg.sellMode !== 'instant' ? ' + 2,5% ao listar' : ''}.</p>
      </div>

      <div className="stack">
        <div className="card stack">
          <div className="card-head">
            <h2>Oportunidades</h2>
            {scan.running ? (
              <button className="btn ghost" onClick={() => abort.current?.abort()}>
                <Square size={14} /> Parar
              </button>
            ) : (
              <button className="btn" onClick={() => run(!!scan.prices)} disabled={!ids.length || tooMany}>
                <Play size={14} /> {scan.prices ? 'Atualizar varredura' : 'Varrer mercado'}
              </button>
            )}
          </div>
          <div className="hint">
            {ids.length.toLocaleString('pt-BR')} itens · ~{requests} consultas à API
            {scan.at && ` · varredura às ${new Date(scan.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
          </div>
          {tooMany && <Banner kind="warn">Seleção grande demais ({ids.length}). Reduza categorias, tiers ou encantamentos (máx. {MAX_IDS}).</Banner>}
          {scan.running && (
            <div className="progress">
              <div style={{ width: `${(scan.done / scan.total) * 100}%` }} />
            </div>
          )}
          {scan.error && (
            <Banner kind="err" title="Varredura interrompida">
              {scan.error} Os resultados parciais continuam na tela.
            </Banner>
          )}
          {!scan.prices && !scan.running && <div className="empty">Escolha o que varrer e clique em “Varrer mercado”. Para começar, os padrões já mostram o Mercado Negro.</div>}

          {scan.prices && (
            <>
              <div className="hint">{rows.length} oportunidades{rows.length > 300 ? ' (mostrando 300)' : ''}</div>
              <div className="table-wrap" style={{ maxHeight: '70vh' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Comprar</th>
                      <th>Vender</th>
                      {th('cost', 'Custo')}
                      {th('profit', 'Lucro')}
                      {th('margin', 'Margem')}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 300).map((r) => (
                      <tr key={r.mid}>
                        <td>
                          {nameOf(r.mid)}
                          <small>{r.mid} · {categoryLabel(allItems().find((i) => i.i === r.mid.split('@')[0].replace(/_LEVEL\d$/, ''))?.c ?? '')}</small>
                        </td>
                        <td>
                          {cityLabel(r.buy)}
                          <small className={ageClass(r.bdate)}>{ageLabel(r.bdate)}</small>
                        </td>
                        <td>
                          {cityLabel(r.sell)} · {fmt(r.price)}
                          <small className={ageClass(r.sdate)}>{r.mode === 'instant' ? 'ordem de compra' : 'listar'} · {ageLabel(r.sdate)}</small>
                        </td>
                        <td className="num">{fmt(r.cost)}</td>
                        <td className="num good">+{fmt(r.profit)}</td>
                        <td className="num">{r.margin.toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
