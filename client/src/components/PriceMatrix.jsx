import { nameOf } from '../lib/catalog';
import { CITIES } from '../lib/market';
import { fmt } from '../lib/econ';
import { Age, Money } from './ui';

const tierOf = (mid) => +(mid.match(/^T(\d)/)?.[1] ?? 0);

/** Tabela item × cidade com os preços de todos os itens de uma cadeia (para conferir a rota). */
export default function PriceMatrix({ title, prices, mids, used, useOrders, targetMid }) {
  const rows = [...new Set(mids)].sort((a, b) => tierOf(a) - tierOf(b) || (a === targetMid ? 1 : 0) - (b === targetMid ? 1 : 0) || a.localeCompare(b));
  return (
    <div className="card">
      <h2 style={{ marginBottom: 12 }}>{title}</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              {CITIES.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((mid) => {
              const isTarget = mid === targetMid;
              const vals = CITIES.map((c) => {
                const q = prices?.[mid]?.[c]?.[1];
                return useOrders ? q?.b || 0 : q?.s || 0;
              }).filter(Boolean);
              const min = vals.length ? Math.min(...vals) : 0;
              return (
                <tr key={mid}>
                  <td>
                    {nameOf(mid)}{' '}
                    <small>
                      T{tierOf(mid)}
                      {isTarget ? ' · produto final' : ''}
                    </small>
                  </td>
                  {CITIES.map((c) => {
                    const q = prices?.[mid]?.[c]?.[1];
                    const main = useOrders ? q?.b : q?.s;
                    const other = useOrders ? q?.s : q?.b;
                    const isUsed = used.has(`${mid}|${c}`);
                    return (
                      <td key={c} className={`${isUsed ? 'cell-used' : ''} ${main && main === min && !isTarget ? 'cell-best' : ''}`}>
                        {main ? <Money value={main} /> : <span className="muted">—</span>}
                        <Age ts={useOrders ? q?.bd : q?.sd} />
                        {other ? (
                          <small>
                            {useOrders ? 'venda' : 'ordem'}: {fmt(other)}
                          </small>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="hint" style={{ marginTop: 10 }}>
        Mostra {useOrders ? 'o maior preço de ordem de compra' : 'o menor preço de venda'} (o que você paga) em cada cidade. Verde = mais barato da linha; fundo roxo = compra usada na rota escolhida.
      </p>
    </div>
  );
}
