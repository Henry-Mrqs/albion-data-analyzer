import { useMemo } from 'react';
import { getItem, recipeOf, recipeValue, marketId, nameOf, refinedTypeOf, craftBonusCity, categoryLabel } from '../lib/catalog';
import { CITIES, SELL_CITIES, cityLabel, usePrices, quote } from '../lib/market';
import { rrr as calcRRR, refineUnit, refineChainIds, buyQuote, netSale, stationFee, fmt, pct } from '../lib/econ';
import { useSettings, usePersisted } from '../lib/settings';
import ItemSelector from './ItemSelector';
import { Age, Banner, Field, Money, NumberInput, PriceStatus, Segmented, Switch } from './ui';

export default function Crafting() {
  const { premium } = useSettings();
  const [sel, setSel] = usePersisted('craft:item', { id: 'T6_MAIN_SWORD', ench: 0 });
  const [cfg, setCfg] = usePersisted('craft:cfg', {
    craftCity: 'Lymhurst', specialty: null, focus: false, feePer100: 400, customRRR: '',
    matCity: 'best', useOrders: false, crafts: 1,
    refine: {}, refineFocus: false, refineFee: 400, deep: false,
  });
  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));

  const item = getItem(sel.id);
  const rec = item ? recipeOf(sel.id, sel.ench) : null;
  const targetMid = marketId(sel.id, sel.ench);
  const bonusCity = item ? craftBonusCity(item.c) : null;
  const specialty = cfg.specialty ?? (bonusCity === cfg.craftCity);
  const crafts = Math.max(1, +cfg.crafts || 1);

  const autoRRR = calcRRR({ kind: 'craft', specialty, focus: cfg.focus });
  const custom = cfg.customRRR !== '' && !isNaN(+cfg.customRRR);
  const craftRRR = custom ? +cfg.customRRR / 100 : autoRRR;
  const refineRRR = calcRRR({ kind: 'refine', specialty: true, focus: cfg.refineFocus });

  const refining = (uniq) => cfg.refine[uniq.replace(/^T\d_/, '').replace(/_LEVEL\d$/, '')] === 'refine' && !!refinedTypeOf(uniq);

  const ids = useMemo(() => {
    if (!rec) return [];
    const s = new Set([targetMid]);
    for (const r of rec.res) {
      s.add(r.mid);
      if (refining(r.uniq)) refineChainIds(r.uniq, cfg.deep).forEach((i) => s.add(i));
    }
    return [...s];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel.id, sel.ench, cfg.refine, cfg.deep]);
  const { prices, loading, error, updatedAt, refresh } = usePrices(ids);

  const matCtx = { prices, city: cfg.matCity, useOrders: cfg.useOrders };
  const refCtx = { ...matCtx, rrr: refineRRR, feePer100: +cfg.refineFee || 0, deep: cfg.deep };

  const lines = rec
    ? rec.res.map((r) => {
        const useRefine = refining(r.uniq);
        const qty = r.count * crafts * (r.returnable ? 1 - craftRRR : 1);
        let unit;
        let date = null;
        let city = null;
        let sub = null;
        if (useRefine && prices) {
          sub = refineUnit(r.uniq, refCtx);
          unit = sub.cost;
        } else {
          const q = buyQuote(prices, r.mid, matCtx);
          unit = q.price;
          date = q.date;
          city = q.city;
        }
        return { ...r, qty, unit, total: qty * unit, date, city, sub, useRefine, canRefine: !!refinedTypeOf(r.uniq) };
      })
    : [];

  const matCost = lines.reduce((s, l) => s + l.total, 0);
  const fee = rec ? stationFee(recipeValue(rec), +cfg.feePer100 || 0) * crafts : 0;
  const totalCost = matCost + fee;
  const units = rec ? rec.amount * crafts : 0;
  const unitCost = units ? totalCost / units : 0;
  const missing = lines.filter((l) => !l.unit).map((l) => l.name);
  if (sub0(lines)) missing.push(...sub0(lines));

  // opções de venda
  const options = [];
  for (const city of SELL_CITIES) {
    const buy = quote(prices, targetMid, city, 'buy');
    const sell = quote(prices, targetMid, city, 'sell');
    if (buy.price > 0) options.push({ city, mode: 'instant', label: 'Ordem de compra', price: buy.price, date: buy.date });
    if (sell.price > 0 && city !== 'Black Market') options.push({ city, mode: 'order', label: 'Ordem de venda', price: sell.price, date: sell.date });
  }
  options.forEach((o) => {
    o.net = netSale(o.price, o.mode, premium) * units;
    o.profit = o.net - totalCost;
    o.margin = totalCost > 0 ? (o.profit / totalCost) * 100 : 0;
  });
  options.sort((a, b) => b.profit - a.profit);
  const best = options[0];
  const ready = rec && missing.length === 0 && best;

  return (
    <div className="grid-2">
      <div className="card stack">
        <h2>Craft</h2>
        <ItemSelector value={sel} onChange={(v) => { setSel(v); if (cfg.specialty !== null) set({ specialty: null }); }} onlyCraftable />
        {item && <div className="hint">{categoryLabel(item.c)} · <code>{targetMid}</code></div>}

        <hr className="sep" style={{ margin: 0 }} />
        <h3>Produção</h3>
        <Field label="Craftar em" hint={bonusCity ? `Cidade com bônus para este item: ${bonusCity}.` : 'Sem cidade de bônus conhecida para este item.'}>
          <select className="input" value={cfg.craftCity} onChange={(e) => set({ craftCity: e.target.value, specialty: null })}>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
                {c === bonusCity ? ' (bônus)' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Switch label="Bônus de especialização ativo" hint="Ajuste se o bônus da cidade for diferente" checked={specialty} onChange={(v) => set({ specialty: v })} />
        <Switch label="Usar foco" hint="+59% de bônus de produção" checked={cfg.focus} onChange={(v) => set({ focus: v })} />
        <div className="cols-2">
          <Field label="Nº de crafts">
            <NumberInput min={1} value={cfg.crafts} onChange={(v) => set({ crafts: v })} />
          </Field>
          <Field label="RRR manual (%)" hint="Opcional">
            <NumberInput step="0.1" value={cfg.customRRR} onChange={(v) => set({ customRRR: v })} placeholder={(autoRRR * 100).toFixed(1)} />
          </Field>
        </div>
        <Field label="Taxa da bancada (prata por 100 de nutrição)">
          <NumberInput value={cfg.feePer100} onChange={(v) => set({ feePer100: v })} />
        </Field>

        <hr className="sep" style={{ margin: 0 }} />
        <h3>Materiais</h3>
        <Field label="Comprar em">
          <select className="input" value={cfg.matCity} onChange={(e) => set({ matCity: e.target.value })}>
            <option value="best">Mais barata (automático)</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Switch label="Comprar com ordens de compra" hint="Mais barato, mas paga 2,5% de taxa de criação" checked={cfg.useOrders} onChange={(v) => set({ useOrders: v })} />
        {lines.some((l) => l.canRefine) && (
          <>
            <Switch label="Refino na cidade especializada com foco" checked={cfg.refineFocus} onChange={(v) => set({ refineFocus: v })} />
            <Switch label="Refinar também o tier anterior" hint="Cadeia completa até o tier 2" checked={cfg.deep} onChange={(v) => set({ deep: v })} />
            <Field label="Taxa da bancada de refino (por 100 nutrição)">
              <NumberInput value={cfg.refineFee} onChange={(v) => set({ refineFee: v })} />
            </Field>
          </>
        )}
      </div>

      <div className="stack">
        <div className="card stack">
          <div className="card-head">
            <h2>
              {nameOf(targetMid)} <span className="muted">T{item?.t}.{sel.ench}</span>
            </h2>
            <span className="num">
              RRR <b className="good">{(craftRRR * 100).toFixed(1)}%</b>
            </span>
          </div>
          <PriceStatus loading={loading} error={error} updatedAt={updatedAt} onRefresh={refresh} />
          {!rec && <Banner kind="warn">Este item não pode ser fabricado ou não tem receita no catálogo.</Banner>}
          {missing.length > 0 && rec && (
            <Banner kind="warn" title="Faltam preços">
              <ul>
                {[...new Set(missing)].map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              Sem dados recentes para esses materiais. Tente “Mais barata (automático)” ou alimente a base abrindo o mercado no jogo com o Albion Data Client.
            </Banner>
          )}

          {rec && (
            <>
              <h3>Materiais ({units} {units === 1 ? 'unidade' : 'unidades'} de produto)</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th title="Já descontado o retorno de recursos">Qtd. líq.</th>
                      <th>Preço un.</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.uniq}>
                        <td>
                          {l.name}
                          {l.canRefine && (
                            <div style={{ marginTop: 4 }}>
                              <Segmented
                                value={l.useRefine ? 'refine' : 'buy'}
                                onChange={(v) => set({ refine: { ...cfg.refine, [l.uniq.replace(/^T\d_/, '').replace(/_LEVEL\d$/, '')]: v } })}
                                options={[{ value: 'buy', label: 'Comprar' }, { value: 'refine', label: 'Refinar' }]}
                              />
                            </div>
                          )}
                          {!l.returnable && <small>não retorna</small>}
                        </td>
                        <td className="num">{l.qty.toFixed(l.qty % 1 ? 1 : 0)}</td>
                        <td>
                          {l.unit ? <Money value={l.unit} /> : <span className="warn">sem preço</span>}
                          {l.useRefine ? <small>custo de refino</small> : <>{l.city && <small>{cityLabel(l.city)}</small>}<Age ts={l.date} /></>}
                        </td>
                        <td><Money value={l.total} /></td>
                      </tr>
                    ))}
                    <tr>
                      <td>Taxa da bancada</td>
                      <td></td>
                      <td></td>
                      <td><Money value={fee} /></td>
                    </tr>
                    <tr>
                      <td><strong>Custo total</strong></td>
                      <td></td>
                      <td><small>{fmt(unitCost)} por unidade</small></td>
                      <td><strong><Money value={totalCost} /></strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {ready ? (
                <div className={`result ${best.profit > 0 ? 'profit' : 'loss'}`}>
                  <div>
                    <div className="label">Melhor destino</div>
                    <div>
                      <b>{cityLabel(best.city)}</b> · {best.label} ({fmt(best.price)})
                    </div>
                    <div className="hint">
                      Venda líquida {fmt(best.net)} − custo {fmt(totalCost)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="big"><Money value={best.profit} signed /></div>
                    <div className={best.profit > 0 ? 'good' : 'bad'}>{pct(best.margin)}</div>
                  </div>
                </div>
              ) : (
                !loading && (
                  <Banner kind="warn">{options.length ? 'Preencha os preços ausentes para calcular o lucro.' : 'Sem preço de venda deste item em nenhuma cidade.'}</Banner>
                )
              )}
            </>
          )}
        </div>

        {rec && options.length > 0 && (
          <div className="card">
            <h2>Onde vender</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Destino</th>
                    <th>Preço</th>
                    <th>Líquido</th>
                    <th>Lucro</th>
                    <th>Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {options.slice(0, 8).map((o, i) => (
                    <tr key={o.city + o.mode} className={i === 0 ? 'best' : ''}>
                      <td>
                        {cityLabel(o.city)}
                        <small>{o.label}</small>
                      </td>
                      <td>
                        <Money value={o.price} />
                        <Age ts={o.date} />
                      </td>
                      <td><Money value={o.net} /></td>
                      <td><Money value={o.profit} signed /></td>
                      <td className={o.margin > 0 ? 'good' : 'bad'}>{pct(o.margin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="hint" style={{ marginTop: 10 }}>
              Ordem de venda: você lista o item (imposto {premium ? '4%' : '8%'} + 2,5% de taxa). Ordem de compra: vende na hora a um comprador (imposto {premium ? '4%' : '8%'}).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// materiais sem preço dentro de cadeias de refino
function sub0(lines) {
  const out = [];
  for (const l of lines) if (l.sub) l.sub.missing.forEach((m) => out.push(nameOf(m)));
  return out;
}
