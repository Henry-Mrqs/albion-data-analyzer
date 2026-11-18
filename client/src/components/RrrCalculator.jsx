import { CRAFT_CITIES, REFINING, NO_CRAFT_CATEGORY_LABEL, cityOfCategory, craftCategories, craftCategoryLabel, getItem, marketId, nameOf, recipeOf } from '../lib/catalog';
import { usePersisted } from '../lib/settings';
import { itemCraftInfo, recipeReturn, referenceTable, rrrFor } from '../lib/rrrCalc';
import { validateInputs } from '../lib/inputRules';
import ItemSelector from './ItemSelector';
import InputIssues from './InputIssues';
import { Banner, Field, NumberInput, Segmented, Switch } from './ui';

const n2 = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const n1 = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const DAILY_LABEL = { 0: 'Nenhum', 10: '+10%', 20: '+20%' };
const REFERENCE = referenceTable();

export default function RrrCalculator() {
  const [cfg, setCfg] = usePersisted('rrr:cfg', {
    kind: 'craft', city: 'Lymhurst', category: 'sword', resource: 'PLANKS',
    focus: false, daily: 0, item: null, crafts: 100,
  });
  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));
  const sel = cfg.item ?? { id: 'T6_MAIN_SWORD', ench: 0 };

  const refine = cfg.kind === 'refine';
  const cats = craftCategories();
  // valor salvo de versão antiga (ex.: 'weapons/sword') não é craftingcategory: cai em espada
  const category = cfg.category === '' || cats.includes(cfg.category) ? cfg.category : 'sword';
  const dailyV = validateInputs({ daily: cfg.daily }); // daily salvo inválido: mesma validação das outras telas
  const res = rrrFor({ ...cfg, category });
  const { parts } = res;
  const per100 = res.rrr * 100;

  const bonusCity = refine ? REFINING[cfg.resource]?.city : cityOfCategory(category);
  const info = itemCraftInfo(getItem(sel.id));
  const rec = getItem(sel.id) ? recipeOf(sel.id, sel.ench) : null;
  const rows = rec ? recipeReturn(rec, cfg.crafts, res.rrr) : [];

  const current = REFERENCE.find((r) => r.kind === cfg.kind && r.specialty === res.specialty && r.focus === !!cfg.focus && r.daily === dailyV.values.daily);

  const breakdown = [
    `${n1(parts.base)} base`,
    res.specialty && `${n1(parts.specialty)} especialização`,
    cfg.focus && `${n1(parts.focus)} foco`,
    dailyV.values.daily > 0 && `${n1(parts.daily)} bônus diário`,
  ].filter(Boolean);

  return (
    <div className="grid-2">
      <div className="card stack">
        <h2>Calculadora de RRR</h2>
        <Segmented value={cfg.kind} onChange={(v) => set({ kind: v })} options={[{ value: 'refine', label: 'Refino' }, { value: 'craft', label: 'Craft' }]} />
        <Field label="Cidade" hint={bonusCity ? `Cidade com bônus de especialização: ${bonusCity}.` : 'Sem cidade de bônus conhecida para esta categoria.'}>
          <select className="input" value={cfg.city} onChange={(e) => set({ city: e.target.value })}>
            {CRAFT_CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
                {c === bonusCity ? ' (bônus)' : ''}
              </option>
            ))}
          </select>
        </Field>
        {refine ? (
          <Field label="Recurso">
            <select className="input" value={cfg.resource} onChange={(e) => set({ resource: e.target.value })}>
              {Object.entries(REFINING).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label} ({v.rawLabel})
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Categoria do item">
            <select className="input" value={category} onChange={(e) => set({ category: e.target.value })}>
              {cats.map((c) => (
                <option key={c} value={c}>
                  {craftCategoryLabel(c)}
                </option>
              ))}
              <option value="">{NO_CRAFT_CATEGORY_LABEL}</option>
            </select>
          </Field>
        )}
        <Switch label="Usar foco" hint="Soma o bônus de produção do foco" checked={!!cfg.focus} onChange={(v) => set({ focus: v })} />
        <Field label="Bônus diário" hint="Escolha manual: o jogo sorteia 2 categorias por dia.">
          <Segmented value={dailyV.values.daily} onChange={(v) => set({ daily: v })} options={[0, 10, 20].map((v) => ({ value: v, label: DAILY_LABEL[v] }))} />
          <InputIssues issues={dailyV.issues} />
        </Field>
      </div>

      <div className="stack">
        <div className="card stack">
          <div className="card-head">
            <h2>Resultado</h2>
            <span className="num">PB {n1(res.pb)}</span>
          </div>
          <div style={{ fontSize: 40, fontWeight: 700 }} className="good num">
            {n2(per100)}%
          </div>
          <div>
            {breakdown.join(' + ')} = <b>{n1(res.pb)}</b>
          </div>
          <div>
            De cada 100 materiais voltam <b>{n2(per100)}</b> e você gasta <b>{n2(100 - per100)}</b>.
          </div>
          <Banner>Valor esperado (média); cada craft individual varia.</Banner>
        </div>

        <div className="card stack">
          <h3>Receita</h3>
          <ItemSelector value={sel} onChange={(v) => set({ item: v, ...(getItem(v.id) ? { category: getItem(v.id).cc ?? '' } : {}) })} onlyCraftable />
          {!refine && info && (
            <div className="hint" data-testid="item-craft-category">
              Categoria de craft deste item no jogo: <b>{info.label}</b>
              {info.city ? ` · cidade de bônus: ${info.city}` : ' · sem cidade de bônus'}
              {(info.cc ?? '') !== category && ' · atenção: a categoria selecionada à esquerda é outra.'}
            </div>
          )}
          <Field label="Nº de crafts">
            <NumberInput min={1} value={cfg.crafts} onChange={(v) => set({ crafts: v })} />
            <InputIssues issues={validateInputs({ crafts: cfg.crafts }).issues} />
          </Field>
          {rec ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Material · {nameOf(marketId(sel.id, sel.ench))}</th>
                    <th>Bruto</th>
                    <th>Retorno esperado</th>
                    <th>Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.uniq}>
                      <td>
                        {r.name}
                        {!r.returnable && <span className="muted"> · não retorna</span>}
                      </td>
                      <td className="num">{n2(r.gross)}</td>
                      <td className="num">{n2(r.returned)}</td>
                      <td className="num">{n2(r.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Banner kind="warn">Este item não tem receita no catálogo.</Banner>
          )}
        </div>

        <div className="card stack">
          <h3>Tabela de referência</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Especialização</th>
                  <th>Foco</th>
                  <th>Diário</th>
                  <th>PB</th>
                  <th>RRR</th>
                  <th>Devolve de 100</th>
                </tr>
              </thead>
              <tbody>
                {REFERENCE.map((r) => (
                  <tr key={r.key} style={r === current ? { background: 'var(--line)', fontWeight: 600 } : undefined}>
                    <td>{r.kind === 'refine' ? 'Refino' : 'Craft'}</td>
                    <td>{r.specialty ? 'Sim' : 'Não'}</td>
                    <td>{r.focus ? 'Sim' : 'Não'}</td>
                    <td>{DAILY_LABEL[r.daily]}</td>
                    <td className="num">{n1(r.pb)}</td>
                    <td className="num">{n2(r.per100)}%</td>
                    <td className="num">{n2(r.per100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
