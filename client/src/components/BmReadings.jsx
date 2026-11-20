// IDEIA-088: as duas leituras do preço do Mercado Negro, rotuladas "NÃO VERIFICADO em jogo". Só apresenta (nada é calculado aqui
// além do líquido por econ.js). Nunca afirma qual leitura é a certa: o app não sabe (D-068).
import { BM_READING_VERIFIED, bmLabel } from '../lib/blackMarket';
import { fmt, netSale } from '../lib/econ';
import { Banner } from './ui';

const signed = (n) => (n > 0 ? '+' : '') + fmt(n);
const NEAR = 0.15; // "perto" do histórico: mesma tolerância da sonda (decisão de produto, sem fonte)

/** readings de bmReadings; cost = custo por unidade (null = sem custo completo); median7d = mediana do histórico (opcional). */
export default function BmReadings({ readings, cost, premium, median7d, verified = BM_READING_VERIFIED }) {
  const { buy, list, ratio, diverges } = readings ?? {};
  if (!buy && !list) return null;
  const hasCost = Number.isFinite(cost) && cost > 0;
  const line = (kind, r) => {
    const net = netSale(r.price, 'instant', premium);
    return (
      <li key={kind}>
        <b>{bmLabel(kind, verified)}</b>: {fmt(r.price)} → líquido {fmt(net)}
        {hasCost ? `, lucro ${signed(net - cost)}` : ', sem custo completo'}
        {r.stale && <small className="muted"> · dado velho</small>}
      </li>
    );
  };
  if (!(buy && list)) {
    const only = buy ? 'ordem de compra' : 'preço de lista';
    return (
      <div className="stack" data-testid="bm-readings">
        <Banner kind="warn">Mercado Negro: uma leitura só ({only}), NÃO VERIFICADO em jogo.</Banner>
        <ul style={{ margin: 0, paddingLeft: 18 }}>{buy ? line('buy', buy) : line('list', list)}</ul>
      </div>
    );
  }
  const near = (p) => Number.isFinite(median7d) && median7d > 0 && Math.abs(p / median7d - 1) <= NEAR;
  const hist = !Number.isFinite(median7d)
    ? null
    : near(list.price) && !near(buy.price)
      ? `O histórico dos últimos 7 dias (mediana ${fmt(median7d)}) está perto do preço de lista.`
      : near(buy.price) && !near(list.price)
        ? `O histórico dos últimos 7 dias (mediana ${fmt(median7d)}) está perto da ordem de compra.`
        : `O histórico dos últimos 7 dias (mediana ${fmt(median7d)}) não distingue as duas leituras.`;
  return (
    <div className="stack" data-testid="bm-readings">
      {diverges && (
        <div role="alert" className="banner warn">
          As duas leituras do Mercado Negro divergem (a de lista é {ratio.toFixed(1).replace('.', ',')}× a ordem de compra).
        </div>
      )}
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {line('buy', buy)}
        {line('list', list)}
      </ul>
      <p className="hint" style={{ margin: 0 }}>
        {verified ? 'Uma das leituras foi conferida em jogo: o cálculo principal usa essa.' : 'O app não sabe qual dos dois você recebe. O cálculo principal usa o menor (lado seguro).'} {hist}
      </p>
    </div>
  );
}
