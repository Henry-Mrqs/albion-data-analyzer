import { useMemo } from 'react';
import { Route } from 'lucide-react';
import { REFINING, focusOf, marketId, nameOf } from '../lib/catalog';
import { CITIES, SELL_CITIES, cityLabel, usePrices } from '../lib/market';
import { rrr as calcRRR, resolveRRR, refineChainIds, fmt, pct, feeIsUnconfirmedDefault } from '../lib/econ';
import { compareRoutes, evaluateTier, lotFee, pickBestTier, routePath, usedCells } from '../lib/refinePlan';
import { useSettings, usePersisted } from '../lib/settings';
import { cleanRefineCfg } from '../lib/inputRules';
import { focusValues, refineFocusSummary } from '../lib/focus';
import { extrasPerUnit, REFINE_NO_TAX_KEY } from '../lib/extras';
import ExtrasCard from './ExtrasCard';
import FocusCard, { FocusFields } from './FocusCard';
import FeeField from './FeeField';
import InputIssues, { CorrectedBadge } from './InputIssues';
import PriceMatrix from './PriceMatrix';
import TargetPrice from './TargetPrice';
import { Age, Banner, Field, Money, NumberInput, PriceStatus, Segmented, Switch } from './ui';

const TYPES = Object.keys(REFINING);
const TIERS = [4, 5, 6, 7, 8];
const ROUTES = [
  { value: 'buy', label: 'Comprar refinado pronto', hint: 'Só refina o último nível; compra o tier anterior já refinado.' },
  { value: 'all', label: 'Produzir tudo', hint: 'Compra só o recurso bruto e refina a cadeia inteira até T2.' },
  { value: 'best', label: 'Melhor combinação', hint: 'Em cada nível escolhe o mais barato: comprar pronto ou refinar.' },
];

export default function Refining() {
  const { premium, feeCeiling } = useSettings();
  const [cfg, setCfg] = usePersisted('refine:cfg', {
    type: 'PLANKS', tier: 4, ench: 0,
    buyCity: 'best', refineCity: 'Fort Sterling', sellCity: 'best',
    focus: false, daily: 0, feePer100: 400, customRRR: '',
    useOrders: false, route: 'best', sellMode: 'order', qty: 100,
  });
  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));
  const route = cfg.route ?? (cfg.deep ? 'all' : 'best');
  const info = REFINING[cfg.type];
  const noEnch = cfg.type === 'STONEBLOCK';
  const ench = noEnch ? 0 : cfg.ench;
  const uniqOf = (tier) => `T${tier}_${cfg.type}${ench ? `_LEVEL${ench}` : ''}`;

  const specialty = info.city === cfg.refineCity;
  // IDEIA-060: o cálculo usa os valores corrigidos (vcfg); os campos continuam mostrando o que foi digitado
  const { cfg: vcfg, issues } = cleanRefineCfg(cfg, { premium, feeCeiling });
  const autoRRR = calcRRR({ kind: 'refine', specialty, focus: cfg.focus, daily: vcfg.daily });
  const rrrValue = resolveRRR(autoRRR, vcfg.customRRR);

  // preços de todos os tiers (permite comparar) — uma única consulta
  const ids = useMemo(() => {
    const s = new Set();
    for (const t of TIERS) {
      refineChainIds(`T${t}_${cfg.type}${ench ? `_LEVEL${ench}` : ''}`, true).forEach((i) => s.add(i));
    }
    return [...s];
  }, [cfg.type, ench]);
  const { prices, loading, error, updatedAt, refresh } = usePrices(ids);

  const ctx = { prices, city: cfg.buyCity, useOrders: cfg.useOrders, rrr: rrrValue, feePer100: vcfg.feePer100, route };

  // IDEIA-048: despesas por unidade refinada (lote ÷ quantidade) e interruptor único de venda sem imposto
  const perUnitExtras = extrasPerUnit(vcfg.extras, vcfg.qty, vcfg.qty);
  const noTax = vcfg.noTax[REFINE_NO_TAX_KEY] === true;
  const evaluate = (tier) =>
    evaluateTier({ tier, uniq: uniqOf(tier), prices, ctx, sellCity: cfg.sellCity, sellMode: cfg.sellMode, premium, extrasPerUnit: perUnitExtras, noTax });

  const cur = prices ? evaluate(cfg.tier) : null;
  const rows = prices ? TIERS.map(evaluate) : [];
  const bestTier = pickBestTier(rows);
  const missing = cur ? [...new Set(cur.unit.missing)] : [];
  const ready = cur && missing.length === 0 && cur.sell.price > 0;

  // ----- rotas: comprar refinado pronto x produzir tudo x melhor combinação -----
  const curUniq = uniqOf(cfg.tier);
  // Foco (IDEIA-002): campos validados (060) e cartão; não altera nenhum outro número da tela
  const fv = focusValues(cfg);
  const fbase = focusOf(`T${cfg.tier}_${cfg.type}`, ench);
  const rrrAt = (focus) => calcRRR({ kind: 'refine', specialty, focus, daily: vcfg.daily });
  const fs = prices ? refineFocusSummary({ uniq: curUniq, ctx, rrrOn: rrrAt(true), rrrOff: rrrAt(false), base: fbase, qty: vcfg.qty, ...fv.values }) : null;
  const compared = prices ? compareRoutes(curUniq, ctx) : { routes: [], best: undefined };
  const routes = compared.routes.map((r) => ({ ...ROUTES.find((x) => x.value === r.value), ...r }));
  const bestRoute = routes.find((r) => r.value === compared.best?.value);
  const path = cur ? routePath(cur.unit, cfg.tier) : [];

  // ----- tabela de preços por cidade dos itens usados nesta cadeia -----
  const chainMids = refineChainIds(curUniq, true);
  const usedCellSet = cur ? usedCells(cur.unit) : new Set();

  const renderLines = (lines, level = 0) =>
    lines.map((l) => (
      <div key={`${level}-${l.mid}`} className={level ? 'indent' : ''}>
        <div className="kv">
          <span>
            {l.qty}× {l.name}{' '}
            {l.sub && <small className="muted">(produzido)</small>}
            {l.refined && !l.sub && <small className="muted">(comprado pronto)</small>}
            {!l.sub && <Age ts={l.date} />}
          </span>
          <span className="num">
            {l.unit ? fmt(l.unit * l.qty) : <span className="warn">sem preço</span>}
            {!l.sub && l.unit > 0 && <small className="muted"> · {fmt(l.unit)} un. {l.city ? `(${cityLabel(l.city)})` : ''}</small>}
          </span>
        </div>
        {l.sub && renderLines(l.sub.lines, level + 1)}
      </div>
    ));

  return (
    <div className="grid-2">
      <div className="card stack">
        <h2>Refino</h2>
        <Field label="Recurso">
          <select className="input" value={cfg.type} onChange={(e) => set({ type: e.target.value, refineCity: REFINING[e.target.value].city })}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {REFINING[t].label} ← {REFINING[t].rawLabel}
              </option>
            ))}
          </select>
        </Field>
        <div className="cols-2">
          <Field label="Tier">
            <select className="input" value={cfg.tier} onChange={(e) => set({ tier: +e.target.value })}>
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  T{t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Encantamento">
            <select className="input" value={ench} disabled={noEnch} onChange={(e) => set({ ench: +e.target.value })}>
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  .{n}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <hr className="sep" style={{ margin: 0 }} />
        <h3>Cidades</h3>
        <Field label="Comprar materiais em">
          <select className="input" value={cfg.buyCity} onChange={(e) => set({ buyCity: e.target.value })}>
            <option value="best">Mais barata (automático)</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Refinar em" hint={specialty ? 'Cidade especializada: bônus de retorno máximo.' : `Especialista deste recurso: ${info.city}.`}>
          <select className="input" value={cfg.refineCity} onChange={(e) => set({ refineCity: e.target.value })}>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
                {c === info.city ? ' (bônus)' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Vender em">
          <select className="input" value={cfg.sellCity} onChange={(e) => set({ sellCity: e.target.value })}>
            <option value="best">Mais cara (automático)</option>
            {SELL_CITIES.map((c) => (
              <option key={c} value={c}>
                {cityLabel(c)}
              </option>
            ))}
          </select>
        </Field>

        <hr className="sep" style={{ margin: 0 }} />
        <h3>Bônus e taxas</h3>
        <Switch label="Usar foco" hint="+59% de bônus de produção" checked={cfg.focus} onChange={(v) => set({ focus: v })} />
        <FocusFields cfg={cfg} set={set} issues={fv.issues} overrideHint="Foco da etapa final mostrado na janela de refino do jogo (vence a fórmula)." />
        <div className="cols-2">
          <Field label="Bônus diário">
            <select className="input" value={cfg.daily} onChange={(e) => set({ daily: +e.target.value })}>
              <option value={0}>Nenhum</option>
              <option value={10}>+10%</option>
              <option value={20}>+20%</option>
            </select>
            <InputIssues issues={issues} field="daily" />
          </Field>
          <Field label="RRR manual (%)" hint="Opcional">
            <NumberInput step="0.1" value={cfg.customRRR} onChange={(v) => set({ customRRR: v })} placeholder={(autoRRR * 100).toFixed(1)} />
            <InputIssues issues={issues} field="customRRR" />
          </Field>
        </div>
        <FeeField issues={issues.filter((i) => i.field === 'feePer100')} label="Taxa da bancada (prata por 100 de nutrição)" value={cfg.feePer100} onChange={(v) => set({ feePer100: v })} touched={!feeIsUnconfirmedDefault(cfg.feePer100, cfg.feeSet)} onTouch={() => set({ feeSet: true })} />
        <Switch label="Comprar com ordens de compra" hint="Mais barato, mas paga 2,5% de taxa de criação" checked={cfg.useOrders} onChange={(v) => set({ useOrders: v })} />
        <div className="field">
          <label>Rota de produção</label>
          <Segmented value={route} onChange={(v) => set({ route: v })} options={ROUTES.map((r) => ({ value: r.value, label: r.label }))} />
          <span className="hint">{ROUTES.find((r) => r.value === route)?.hint}</span>
        </div>
        <div className="field">
          <label>Venda do refinado</label>
          <Segmented value={cfg.sellMode} onChange={(v) => set({ sellMode: v })} options={[{ value: 'order', label: 'Ordem de venda' }, { value: 'instant', label: 'Ordem de compra (na hora)' }]} />
        </div>
        <Switch
          label="Venda sem imposto (fora do mercado)"
          hint="Guilda, troca direta ou encomenda: sem imposto e sem taxa de criação. O preço continua sendo a referência do mercado."
          checked={noTax}
          onChange={(v) => set({ noTax: { [REFINE_NO_TAX_KEY]: v } })}
        />
      </div>

      <div className="stack">
        <div className="card stack">
          <div className="card-head">
            <h2>
              {nameOf(marketId(uniqOf(cfg.tier)))} <span className="muted">T{cfg.tier}.{ench}</span>
            </h2>
            <span className="num">
              <CorrectedBadge issues={issues} />{' '}
              RRR <b className="good">{(rrrValue * 100).toFixed(1)}%</b>
            </span>
          </div>
          <PriceStatus loading={loading} error={error} updatedAt={updatedAt} onRefresh={refresh} />

          {cfg.buyCity !== 'best' && cfg.buyCity !== cfg.refineCity && (
            <Banner kind="warn">Você compra em {cfg.buyCity} e refina em {cfg.refineCity}: o custo de transporte não está incluído.</Banner>
          )}
          {missing.length > 0 && (
            <Banner kind="warn" title="Faltam preços">
              <ul>
                {missing.map((m) => (
                  <li key={m}>{nameOf(m)} ({m})</li>
                ))}
              </ul>
              Nenhum jogador enviou esses preços recentemente na cidade escolhida. Tente “Mais barata (automático)” ou abra o mercado no jogo com o Albion Data Client.
            </Banner>
          )}

          {cur && (
            <div className="cols-2" style={{ alignItems: 'start' }}>
              <div>
                <h3 style={{ marginBottom: 6 }}>Custo por unidade</h3>
                {renderLines(cur.unit.lines)}
                <div className="kv">
                  <span>Retorno de recursos ({(rrrValue * 100).toFixed(1)}%)</span>
                  <span className="num good">−{(rrrValue * 100).toFixed(1)}% dos materiais</span>
                </div>
                <div className="kv">
                  <span>Taxa da última etapa (por unidade)</span>
                  <Money value={cur.unit.fee} />
                </div>
                <div className="kv">
                  <span>Taxa do lote (todas as etapas, {fmt(vcfg.qty)} un.)</span>
                  <Money value={lotFee(cur.unit, vcfg.qty, rrrValue)} />
                </div>
                {perUnitExtras > 0 && (
                  <div className="kv">
                    <span>Despesas extras (por unidade)</span>
                    <Money value={perUnitExtras} />
                  </div>
                )}
                <div className="kv">
                  <strong>Custo líquido</strong>
                  <strong><Money value={cur.unit.cost + perUnitExtras} /></strong>
                </div>
              </div>
              <div>
                <h3 style={{ marginBottom: 6 }}>Venda</h3>
                <div className="kv">
                  <span>
                    Preço em {cur.sell.city ? cityLabel(cur.sell.city) : '—'} <Age ts={cur.sell.date} />
                  </span>
                  <Money value={cur.sell.price} />
                </div>
                <div className="kv">
                  <span>Líquido após impostos</span>
                  <Money value={cur.net} />
                </div>
                <div className="kv">
                  <span>Lucro por unidade</span>
                  <b><Money value={cur.profit} signed /></b>
                </div>
                <label className="field" style={{ marginTop: 8 }}>
                  <span className="label">Quantidade a refinar</span>
                  <NumberInput small value={cfg.qty} onChange={(v) => set({ qty: v })} />
                  <InputIssues issues={issues} field="qty" />
                </label>
                <div className="kv">
                  <span>Lucro total</span>
                  <b><Money value={cur.profit * vcfg.qty} signed /></b>
                </div>
              </div>
            </div>
          )}

          {cur && (
            <div className={`result ${ready ? (cur.profit > 0 ? 'profit' : 'loss') : ''}`}>
              <div>
                <div className="label">{ready ? (cur.profit > 0 ? 'Vale a pena' : 'Prejuízo') : 'Cálculo incompleto'}</div>
                <div className="hint">Venda líquida {fmt(cur.net)} − custo {fmt(cur.unit.cost + perUnitExtras)}</div>
              </div>
              {ready && (
                <div style={{ textAlign: 'right' }}>
                  <div className="big"><Money value={cur.profit} signed /></div>
                  <div className={cur.profit > 0 ? 'good' : 'bad'}>{pct(cur.margin)} por unidade</div>
                </div>
              )}
            </div>
          )}
        </div>

        <ExtrasCard list={cfg.extras} onChange={(v) => set({ extras: v })} issues={issues} crafts={vcfg.qty} kind="refine" />

        {cur && <TargetPrice cost={cur.unit.cost + perUnitExtras} prices={prices} mid={cur.mid} missing={missing.length > 0} />}

        {cur && <FocusCard summary={fs} ench={ench} hasBase={fbase != null} unit="refino" />}

        {routes.length > 0 && (
          <div className="card stack">
            <div className="card-head">
              <h2>Melhor rota · T{cfg.tier}.{ench}</h2>
              <button className="btn sm" disabled={route === 'best'} onClick={() => set({ route: 'best' })}>
                <Route size={14} /> {route === 'best' ? 'Melhor rota marcada' : 'Marcar melhor rota'}
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Rota</th>
                    <th>Custo/un.</th>
                    <th>Lucro/un.</th>
                    <th>Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((r) => {
                    const profit = cur.net - r.unit.cost - perUnitExtras;
                    const isBest = bestRoute?.value === r.value;
                    return (
                      <tr key={r.value} className={isBest ? 'best' : ''} style={{ cursor: 'pointer' }} onClick={() => set({ route: r.value })}>
                        <td>
                          {r.label} {route === r.value && <small className="muted">em uso</small>}
                        </td>
                        <td>{r.ok ? <Money value={r.unit.cost} /> : <span className="muted">sem dados</span>}</td>
                        <td>{r.ok && cur.sell.price ? <Money value={profit} signed /> : '—'}</td>
                        <td className={isBest ? 'good' : ''}>{r.ok && bestRoute ? (isBest ? 'mais barata' : `+${fmt(r.unit.cost - bestRoute.unit.cost)}`) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div>
              <h3 style={{ marginBottom: 6 }}>Passo a passo ({ROUTES.find((r) => r.value === route)?.label.toLowerCase()})</h3>
              <ol className="steps">
                {path.map((s) => (
                  <li key={`${s.tier}-${s.action}`}>
                    {s.action === 'make' ? (
                      <>
                        Refinar <b>T{s.tier}</b>
                        {s.raw.length > 0 && ' — comprar '}
                        {s.raw.map((l, i) => (
                          <span key={l.mid}>
                            {i > 0 && ' + '}
                            {l.qty}× {l.name} em <b>{l.city ? cityLabel(l.city) : '—'}</b> ({fmt(l.unit)} un.)
                          </span>
                        ))}
                      </>
                    ) : (
                      <>
                        Comprar <b>T{s.tier}</b> já refinado em <b>{s.city ? cityLabel(s.city) : '—'}</b> ({fmt(s.unit)} un.)
                      </>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-head">
            <h2>Comparar tiers (.{ench})</h2>
            {bestTier && <span className="good">Melhor: T{bestTier.tier} · <Money value={bestTier.profit} signed /></span>}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Custo</th>
                  <th>Venda</th>
                  <th>Lucro/un.</th>
                  <th>Margem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const ok = r.sell.price > 0 && !r.unit.missing.length;
                  return (
                    <tr key={r.tier} className={bestTier?.tier === r.tier ? 'best' : ''} style={{ cursor: 'pointer' }} onClick={() => set({ tier: r.tier })}>
                      <td>T{r.tier}</td>
                      <td>{r.unit.missing.length ? <span className="muted">sem dados</span> : <Money value={r.unit.cost} />}</td>
                      <td>
                        {r.sell.price ? <Money value={r.sell.price} /> : <span className="muted">—</span>}
                        {r.sell.city && <small>{cityLabel(r.sell.city)}</small>}
                      </td>
                      <td>{ok ? <Money value={r.profit} signed /> : '—'}</td>
                      <td className={ok ? (r.margin > 0 ? 'good' : 'bad') : ''}>{ok ? pct(r.margin) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>Clique numa linha para detalhar o tier. Usa as cidades e bônus escolhidos ao lado.</p>
        </div>

        {prices && <PriceMatrix title={`Preços por cidade · itens desta cadeia (T${cfg.tier}.${ench})`} prices={prices} mids={chainMids} used={usedCellSet}useOrders={cfg.useOrders} targetMid={cur?.mid} />}
      </div>
    </div>
  );
}
