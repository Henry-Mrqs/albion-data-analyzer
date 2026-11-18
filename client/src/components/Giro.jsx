// Apresentação do giro (IDEIA-010). Toda a conta e o texto vêm de lib/liquidity.js; aqui só se desenha.
import { cityLabel } from '../lib/market';
import { PRICE_ABOVE_MEDIAN_WARN, coverageLabel, daysToSell, giroText, priceVsMedian } from '../lib/liquidity';
import { fmt } from '../lib/econ';
import { Banner } from './ui';

const TONE = { good: 'good', warn: 'warn', bad: 'bad', muted: 'muted' };

/** Célula "Giro": vendas/dia (ou o estado) e, sempre que há histórico, "X de 7 dias com dados". */
export function GiroCell({ stats, loading }) {
  if (!stats) return loading ? <span className="muted">carregando…</span> : null;
  const g = giroText(stats);
  return (
    <span title={g.title}>
      <span className={TONE[g.tone]}>{g.text}</span>
      {!['nodata', 'unloaded'].includes(stats.state) && <small className="muted">{coverageLabel(stats)}</small>}
    </span>
  );
}

/**
 * Cartão "Giro do item": por cidade de venda, vendas/dia, dias com dados, mediana e dias para vender o lote.
 * rows: [{ city, stats }]; best: { city, price } (melhor destino) para o alerta de preço acima da mediana.
 */
export function GiroCard({ rows, units, sharePct, best, loading, children }) {
  const bestStats = rows.find((r) => r.city === best?.city)?.stats;
  const usable = bestStats && ['ok', 'low', 'none'].includes(bestStats.state);
  const gap = usable && best ? priceVsMedian(best.price, bestStats.medianPrice) : null;
  return (
    <div className="card stack">
      <h2>Giro do item</h2>
      <div className="hint">Vendas registradas por dia nos últimos 7 dias completos (hoje fica de fora). Dados colaborativos da API: dia sem registro conta como 0 vendas, por isso o contador de dias com dados.</div>
      {children}
      {gap != null && gap > PRICE_ABOVE_MEDIAN_WARN && (
        <Banner kind="warn">
          O melhor destino ({cityLabel(best.city)}, {fmt(best.price)}) está {(gap * 100).toFixed(0)}% acima da mediana de 7 dias ({fmt(bestStats.medianPrice)}): o preço pode não se sustentar.
        </Banner>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cidade</th>
              <th>Giro</th>
              <th>Mediana 7 dias</th>
              <th title={`Lote de ${fmt(units)} un. capturando ${sharePct}% do volume diário`}>Dias para vender o lote</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ city, stats }) => {
              const days = ['ok', 'low', 'none'].includes(stats.state) ? daysToSell(units, stats.volumePerDay, sharePct) : null;
              return (
                <tr key={city}>
                  <td>{cityLabel(city)}</td>
                  <td><GiroCell stats={stats} loading={loading} /></td>
                  <td className="num">{stats.medianPrice != null && stats.state !== 'sparse' ? fmt(stats.medianPrice) : '—'}</td>
                  <td className="num">{days != null ? `${days.toFixed(1).replace('.', ',')} dias` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
