import { useState } from 'react';
import { Route } from 'lucide-react';
import { CRAFT_CITIES, REFINING, getItem, recipeVariants, marketId, nameOf, refinedTypeOf, craftBonusCity, categoryLabel } from '../lib/catalog';
import { CITIES, cityLabel, usePrices } from '../lib/market';
import { fmt, pct, feeIsUnconfirmedDefault } from '../lib/econ';
import { computeCraft, craftChainIds, keyOf, waitSavings } from '../lib/craftPlan';
import { effectiveDaily, showDailyNote, DAILY_NOTE } from '../lib/dailyBonus';
import { annotateOptions, pickExit } from '../lib/exits';
import { pickCheapest, resolveVariant, returnBadge } from '../lib/recipeAlt';
import RecipePicker from './RecipePicker';
import { useSettings, usePersisted } from '../lib/settings';
import ItemSelector from './ItemSelector';
import FeeField from './FeeField';
import DailyWait from './DailyWait';
import InputIssues, { CorrectedBadge } from './InputIssues';
import PriceMatrix from './PriceMatrix';
import TargetPrice from './TargetPrice';
import { Age, Banner, Field, Money, NumberInput, PriceStatus, Segmented, Switch } from './ui';

export default function Crafting() {
  const { premium, feeCeiling, server } = useSettings();
  const [now] = useState(Date.now);
  const [sel, setSel] = usePersisted('craft:item', { id: 'T6_MAIN_SWORD', ench: 0 });
  const [cfg, setCfg] = usePersisted('craft:cfg', {
    craftCity: 'Lymhurst', specialty: null, focus: false, feePer100: 400, customRRR: '',
    matCity: 'best', useOrders: false, crafts: 1,
    refine: {}, refineFocus: false, refineFee: 400, refineCity: 'auto', refineDaily: {},
  });
  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));

  const item = getItem(sel.id);
  const variants = item ? recipeVariants(sel.id, sel.ench) : [];
  const targetMid = marketId(sel.id, sel.ench);
  const bonusCity = item ? craftBonusCity(item) : null;
  // os preços de todas as receitas alternativas vão numa só consulta
  const ids = [...new Set(variants.flatMap((v) => craftChainIds(v.rec, targetMid)))];
  const { prices, loading, error, updatedAt, refresh } = usePrices(ids);

  // bônus diário do item: o informado antes do último reset do servidor vale 0 (com aviso); a validação 0/10/20 é a da 060 (computeCraft)
  const daily = effectiveDaily({ value: cfg.craftDaily ?? 0, setAt: cfg.craftDailyAt, now, server });
  const cfgEff = { ...cfg, craftDaily: daily.value };
  const results = variants.map((v) => computeCraft({ rec: v.rec, targetMid, prices, cfg: cfgEff, premium, bonusCity, feeCeiling }));
  const auto = pickCheapest(results);
  const idx = resolveVariant(cfg.recipeVariant, variants.length, auto);
  const pickerMode = cfg.recipeVariant === undefined || cfg.recipeVariant === 'auto' ? 'auto' : idx;
  const rec = variants[idx]?.rec ?? null;
  const c = results[idx] ?? computeCraft({ rec: null, targetMid, prices, cfg: cfgEff, premium, bonusCity, feeCeiling });
  const savings = waitSavings({ rec, targetMid, prices, cfg: cfgEff, premium, bonusCity, feeCeiling });
  const note = showDailyNote({ craftDaily: cfg.craftDaily, hasCard: !!savings });
  const { specialty, autoRRR, craftRRR } = c.rates;
  const { issues, lines, fee, totalCost, units, unitCost, missing, options, best, ready, plan, used, refinable, allBest } = c;

  const opts = annotateOptions(options, prices, targetMid);
  const { best: shown, bestReal } = pickExit(opts);

  const tierOfMid = (mid) => +(mid.match(/^T(\d)/)?.[1] ?? 0);
  const setAllBest = () => set({ refine: Object.fromEntries(refinable.map((l) => [keyOf(l.uniq), 'best'])) });

  return (
    <div className="grid-2">
      <div className="card stack">
        <h2>Craft</h2>
        <ItemSelector value={sel} onChange={(v) => { setSel(v); if (cfg.specialty !== null) set({ specialty: null }); if (v.id !== sel.id && cfg.recipeVariant !== undefined && cfg.recipeVariant !== 'auto') set({ recipeVariant: 'auto' }); }} onlyCraftable />
        {item && <div className="hint">{categoryLabel(item.c)} · <code>{targetMid}</code></div>}
        <RecipePicker variants={variants} results={results} auto={auto} mode={pickerMode}onChange={(v) => set({ recipeVariant: v })} />

        <hr className="sep" style={{ margin: 0 }} />
        <h3>Produção</h3>
        <Field label="Craftar em" hint={bonusCity ? `Cidade com bônus para este item: ${bonusCity}.` : 'Sem cidade de bônus conhecida para este item.'}>
          <select className="input" value={cfg.craftCity} onChange={(e) => set({ craftCity: e.target.value, specialty: null })}>
            {CRAFT_CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
                {c === bonusCity ? ' (bônus)' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Switch label="Bônus de especialização ativo" hint="Ajuste se o bônus da cidade for diferente" checked={specialty} onChange={(v) => set({ specialty: v })} />
        <Switch label="Usar foco" hint="+59% de bônus de produção" checked={cfg.focus} onChange={(v) => set({ focus: v })} />
        <Field label="Bônus diário do item" hint={`RRR atual: ${(craftRRR * 100).toFixed(1)}%. Informe o bônus do dia da categoria deste item.`}>
          <select className="input" value={[10, 20].includes(+cfg.craftDaily) ? +cfg.craftDaily : 0} onChange={(e) => set({ craftDaily: +e.target.value, craftDailyAt: Date.now() })}>
            <option value={0}>Nenhum</option>
            <option value={10}>+10%</option>
            <option value={20}>+20%</option>
          </select>
          {daily.stale && <div className="hint warn">Bônus de ontem? Passou o reset diário do servidor: usando 0. Escolha o bônus de hoje de novo para confirmar.</div>}
          {daily.future && <div className="hint warn">Data do bônus no futuro (relógio alterado ou data errada): usando 0. Escolha o bônus de hoje de novo para confirmar.</div>}
          <InputIssues issues={issues} field="craftDaily" />
          {note && <div className="hint" data-testid="daily-note">{DAILY_NOTE}</div>}
        </Field>
        <div className="cols-2">
          <Field label="Nº de crafts">
            <NumberInput min={1} value={cfg.crafts} onChange={(v) => set({ crafts: v })} />
            <InputIssues issues={issues} field="crafts" />
          </Field>
          <Field label="RRR manual (%)" hint="Opcional">
            <NumberInput step="0.1" value={cfg.customRRR} onChange={(v) => set({ customRRR: v })} placeholder={(autoRRR * 100).toFixed(1)} />
            <InputIssues issues={issues} field="customRRR" />
          </Field>
        </div>
        <FeeField issues={issues.filter((i) => i.field === 'feePer100')} label="Taxa da bancada (prata por 100 de nutrição)" value={cfg.feePer100} onChange={(v) => set({ feePer100: v })} touched={!feeIsUnconfirmedDefault(cfg.feePer100, cfg.feeSet)} onTouch={() => set({ feeSet: true })} />

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
            <h3>Refino dos materiais</h3>
            <Field label="Refinar em" hint="“Cada recurso na sua cidade” = bônus de especialização em todos (Thetford p/ minério, Martlock p/ couro, Fort Sterling p/ madeira, Lymhurst p/ fibra, Bridgewatch p/ pedra).">
              <select className="input" value={cfg.refineCity} onChange={(e) => set({ refineCity: e.target.value })}>
                <option value="auto">Cada recurso na sua cidade de bônus</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Switch label="Usar foco no refino" hint="+59% de bônus de produção" checked={cfg.refineFocus} onChange={(v) => set({ refineFocus: v })} />
            {[...new Map(lines.filter((l) => l.canRefine).map((l) => [refinedTypeOf(l.uniq), l])).entries()].map(([type, l]) => (
              <Field key={type} label={`Bônus diário · ${REFINING[type].label} (${REFINING[type].city})`} hint={`RRR atual: ${(l.rr * 100).toFixed(1)}%`}>
                <select className="input" value={+(cfg.refineDaily?.[type] ?? 0)} onChange={(e) => set({ refineDaily: { ...cfg.refineDaily, [type]: +e.target.value } })}>
                  <option value={0}>Nenhum</option>
                  <option value={10}>+10%</option>
                  <option value={20}>+20%</option>
                </select>
                <InputIssues issues={issues} field={`refineDaily.${type}`} />
              </Field>
            ))}
            <FeeField ceilingNotice={false} issues={issues.filter((i) => i.field === 'refineFee')} label="Taxa da bancada de refino (por 100 nutrição)" value={cfg.refineFee} onChange={(v) => set({ refineFee: v })} touched={!feeIsUnconfirmedDefault(cfg.refineFee, cfg.refineFeeSet)} onTouch={() => set({ refineFeeSet: true })} />
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
              <CorrectedBadge issues={issues} />{' '}
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
              <div className="card-head">
                <h3>Materiais ({units} {units === 1 ? 'unidade' : 'unidades'} de produto)</h3>
                {refinable.length > 0 && (
                  <button className="btn sm" disabled={allBest} onClick={setAllBest}>
                    <Route size={14} /> {allBest ? 'Melhor rota marcada' : 'Marcar melhor rota'}
                  </button>
                )}
              </div>
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
                                value={l.mode}
                                onChange={(v) => set({ refine: { ...cfg.refine, [keyOf(l.uniq)]: v } })}
                                options={[{ value: 'buy', label: 'Comprar pronto' }, { value: 'all', label: 'Produzir tudo' }, { value: 'best', label: 'Melhor' }]}
                              />
                            </div>
                          )}
                          {(() => { const b = returnBadge(l); return b && <small title={b.title}>{b.text}</small>; })()}
                        </td>
                        <td className="num">{l.qty.toFixed(l.qty % 1 ? 1 : 0)}</td>
                        <td>
                          {l.unit ? <Money value={l.unit} /> : <span className="warn">sem preço</span>}
                          {l.useRefine ? <small>custo de produção</small> : <>{l.city && <small>{cityLabel(l.city)}</small>}<Age ts={l.date} /></>}
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
                <>
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
                {shown.illusory && (
                  <Banner kind="warn">
                    A melhor saída no papel ({cityLabel(shown.city)}, {fmt(shown.price)}) não tem ordem de compra visível.{' '}
                    {bestReal ? (
                      <>
                        Saída com comprador: {cityLabel(bestReal.city)}, {bestReal.mode === 'instant' ? 'instantânea' : 'ordem de venda'}, lucro{' '}
                        <Money value={bestReal.profit} signed />.
                      </>
                    ) : (
                      'Nenhuma saída com comprador visível.'
                    )}
                  </Banner>
                )}
                </>
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
                    <th>Comprador</th>
                  </tr>
                </thead>
                <tbody>
                  {opts.slice(0, 8).map((o, i) => (
                    <tr key={o.city + o.mode} className={i === 0 ? 'best' : ''} style={o.illusory ? { opacity: 0.6 } : undefined}>
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
                      <td>
                        {o.mode === 'instant' ? `sim (ordem de compra ${fmt(o.price)})` : o.buyer ? 'sim' : 'nenhum visível'}
                        {o.illusory && <small className="bad">ilusória</small>}
                        {o.stale && <small className="muted">dado velho</small>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="hint" style={{ marginTop: 10 }}>
              Ordem de venda: você lista o item (imposto {premium ? '4%' : '8%'} + 2,5% de taxa). Ordem de compra: vende na hora a um comprador (imposto {premium ? '4%' : '8%'}).
              Ilusória: ordem de venda sem ordem de compra visível na cidade (dado com menos de 24 h). Giro (vendas/dia): sem dado.
            </p>
          </div>
        )}

        {rec && <TargetPrice cost={unitCost} prices={prices} mid={targetMid} missing={missing.length > 0} />}

        {rec && prices && plan.length > 0 && (
          <div className="card stack">
            <h2>Plano de compra e produção</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Etapa</th>
                    <th>Quantidade</th>
                    <th>Onde / preço un.</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.map((p, i) => (
                    <tr key={`${p.kind}-${p.mid}-${i}`} className={p.kind === 'make' ? 'best' : ''}>
                      <td>
                        {p.kind === 'make' ? 'Refinar' : 'Comprar'} {nameOf(p.mid)} <small>T{tierOfMid(p.mid)}{p.kind === 'buy' && p.refined ? ' · já refinado' : ''}</small>
                      </td>
                      <td className="num">{fmt(Math.ceil(p.qty - 1e-9))}</td>
                      <td>
                        {p.kind === 'buy' ? (
                          <>
                            {p.unit ? <Money value={p.unit} /> : <span className="warn">sem preço</span>}
                            {p.city && <small>{cityLabel(p.city)}</small>}
                            <Age ts={p.date} />
                          </>
                        ) : (
                          <small>taxa da bancada</small>
                        )}
                      </td>
                      <td><Money value={p.total} /></td>
                    </tr>
                  ))}
                  <tr>
                    <td>Taxa da bancada (craft)</td>
                    <td></td>
                    <td></td>
                    <td><Money value={fee} /></td>
                  </tr>
                  <tr>
                    <td><strong>Total</strong></td>
                    <td></td>
                    <td></td>
                    <td><strong><Money value={plan.reduce((a, p) => a + p.total, 0) + fee} /></strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="hint">Quantidades já com o retorno de recursos do craft e do refino. Linhas verdes são refinos; cada refino consome o tier anterior mais o recurso bruto do próprio tier. Arredondado para cima.</p>
          </div>
        )}

        {refinable.length > 0 && (
          <div className="card stack">
            <h2>Comparar rotas dos materiais refinados</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Comprar pronto</th>
                    <th>Produzir tudo</th>
                    <th>Melhor</th>
                    <th>Economia</th>
                    <th title="Custo da melhor rota se o recurso estiver com bônus diário de refino">Melhor c/ +10%</th>
                    <th>Melhor c/ +20%</th>
                  </tr>
                </thead>
                <tbody>
                  {refinable.map((l) => {
                    const c = l.cmp;
                    const worst = Math.max(c.buy, c.all);
                    return (
                      <tr key={l.uniq}>
                        <td>{l.name} <small>{fmt(l.qty)} un.</small></td>
                        <td>{c.buy ? <Money value={c.buy * l.qty} /> : <span className="muted">sem dados</span>}</td>
                        <td>{c.all ? <Money value={c.all * l.qty} /> : <span className="muted">sem dados</span>}</td>
                        <td className="good">{c.best ? <Money value={c.best * l.qty} /> : '—'}<small>{c.bestIsMake ? 'produzir' : 'comprar pronto'}</small></td>
                        <td>{c.best && worst ? <Money value={(worst - c.best) * l.qty} /> : '—'}</td>
                        <td>{c.d10 ? <><Money value={c.d10 * l.qty} />{c.best - c.d10 > 0.5 ? <small className="good">−{fmt((c.best - c.d10) * l.qty)}</small> : <small className="muted">sem ganho</small>}</> : '—'}</td>
                        <td>{c.d20 ? <><Money value={c.d20 * l.qty} />{c.best - c.d20 > 0.5 ? <small className="good">−{fmt((c.best - c.d20) * l.qty)}</small> : <small className="muted">sem ganho</small>}</> : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="hint">Custo total do material para a quantidade acima. As duas últimas colunas mostram quanto você economizaria esperando o dia de bônus de refino daquele recurso (+10% ou +20%). “Melhor” decide em cada tier se compensa comprar o refinado pronto ou refiná-lo (inclusive só de uma parte da cadeia).</p>
          </div>
        )}

        {rec && <DailyWait savings={savings} crafts={c.rates.crafts} waitCost={cfg.waitCost} onWaitCost={(v) => set({ waitCost: v })} />}

        {rec && prices && (
          <PriceMatrix title="Preços por cidade · itens desta cadeia" prices={prices} mids={ids} used={used} useOrders={cfg.useOrders} targetMid={targetMid} />
        )}
      </div>
    </div>
  );
}
