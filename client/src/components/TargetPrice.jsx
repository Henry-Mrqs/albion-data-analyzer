import { fmt, netSale, SETUP_FEE } from '../lib/econ';
import { cityLabel } from '../lib/market';
import { bestBuyer } from '../lib/exits';
import { marketGap, targetPrice } from '../lib/targetPrice';
import { useSettings, usePersisted } from '../lib/settings';
import { validateInputs } from '../lib/inputRules';
import InputIssues from './InputIssues';
import { Age, Banner, Field, NumberInput, Segmented } from './ui';

const GOALS = [
  { value: 'even', label: 'Equilíbrio' },
  { value: 'profit', label: 'Lucro alvo (prata)' },
  { value: 'margin', label: 'Margem alvo (%)' },
];
const MODES = [
  { value: 'order', label: 'Ordem de venda' },
  { value: 'instant', label: 'Ordem de compra (na hora)' },
];

/** Cartão "Preço-alvo": por quanto listar para lucrar X, ter margem M ou empatar. cost = custo por unidade. */
export default function TargetPrice({ cost, prices, mid, missing, noTax = { order: null, instant: null } }) {
  const { premium } = useSettings();
  const [cfg, setCfg] = usePersisted('target:cfg', { goal: 'profit', profit: 1000, margin: 20, mode: 'order', relists: 0 });
  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));

  // IDEIA-060: valores corrigidos (a tela mostra o aviso); relistagens só contam no modo ordem
  const { values: vals, issues } = validateInputs({ relists: cfg.relists, mode: cfg.mode }, { premium });
  const mode = vals.mode ?? 'order';
  const relists = mode === 'order' ? vals.relists : 0;
  const goalArg = cfg.goal === 'profit' ? { profit: +cfg.profit || 0 } : cfg.goal === 'margin' ? { margin: (+cfg.margin || 0) / 100 } : {};
  const ok = !missing && cost > 0;
  // IDEIA-075 (D-056): vale "sem imposto" se a melhor saída DESTE modo está marcada (a cidade vem junto para o aviso)
  const exit = noTax?.[mode];
  const off = exit?.on === true;
  const target = ok ? targetPrice({ cost, premium, mode, relists, noTax: off, ...goalArg }) : null;

  const net = target ? netSale(target, off ? 'none' : mode, premium) - (mode === 'order' && !off ? relists * SETUP_FEE * target : 0) : 0;
  // Limitação: compara com o melhor comprador de TODAS as cidades (sem seletor de cidade).
  const market = ok ? bestBuyer(prices, mid) : null;
  const gap = target && market ? marketGap(target, market.price) : null;

  return (
    <div className="card stack">
      <h2>Preço-alvo</h2>
      <div className="field">
        <label>Objetivo</label>
        <Segmented value={cfg.goal} onChange={(v) => set({ goal: v })} options={GOALS} />
      </div>
      {cfg.goal === 'profit' && (
        <Field label="Lucro alvo por unidade (prata)">
          <NumberInput value={cfg.profit} onChange={(v) => set({ profit: v })} />
        </Field>
      )}
      {cfg.goal === 'margin' && (
        <Field label="Margem alvo sobre o custo (%)" hint="Lucro ÷ custo, não ÷ preço de venda.">
          <NumberInput step="0.5" value={cfg.margin} onChange={(v) => set({ margin: v })} />
        </Field>
      )}
      <div className="field">
        <label>Modo de venda</label>
        <Segmented value={mode} onChange={(v) => set({ mode: v })} options={MODES} />
        <InputIssues issues={issues} field="mode" />
      </div>
      {mode === 'order' && (
        <Field label="Relistagens (estimativa)" hint="Cada atualização da ordem cobra 2,5% de novo sobre o preço. Estimativa: 0 se você lista uma vez só.">
          <NumberInput small value={cfg.relists} onChange={(v) => set({ relists: v })} />
          <InputIssues issues={issues} field="relists" />
        </Field>
      )}

      {!ok ? (
        <Banner kind="warn">Preencha os preços ausentes para calcular o preço-alvo.</Banner>
      ) : target ? (
        <>
          <div className="result profit">
            <div>
              <div className="label">Liste a</div>
              <div className="big num">{fmt(target)}</div>
              <div className="hint">
                líquido {net.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, lucro{' '}
                {(net - cost).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} por unidade (custo {fmt(cost)})
              </div>
            </div>
          </div>
          {off && (
            <div className="hint">
              Venda sem imposto marcada ({cityLabel(exit.city)}, {mode === 'order' ? 'ordem de venda' : 'ordem de compra'}): o preço-alvo não desconta imposto nem taxa de criação (relistagens não contam).
            </div>
          )}
          {market ? (
            <>
              <div className="hint">
                Melhor comprador atual (ordem de compra, entre todas as cidades): <b>{fmt(market.price)}</b> em {cityLabel(market.city)}{' '}
                <Age ts={market.date} />
                {gap != null && <> · alvo {(Math.abs(gap) * 100).toFixed(1)}% {gap >= 0 ? 'acima' : 'abaixo'} do melhor comprador</>}
              </div>
              {gap != null && gap > 0 && (
                <Banner kind="warn">
                  {cfg.mode === 'instant'
                    ? 'Nenhuma ordem de compra paga isso hoje.'
                    : 'Alvo acima do melhor comprador atual: só vende se alguém criar uma ordem de compra maior.'}
                </Banner>
              )}
            </>
          ) : (
            <div className="hint">Nenhum comprador (ordem de compra) visível para este item: só há ordens de venda.</div>
          )}
        </>
      ) : (
        <Banner kind="warn">Não foi possível calcular o preço-alvo com estes valores.</Banner>
      )}
    </div>
  );
}
