import { useMemo } from 'react';
import { marketId, nameOf, getItem, categoryLabel, weightOf } from '../lib/catalog';
import { SELL_CITIES, cityLabel, usePrices } from '../lib/market';
import { netSale, fmt } from '../lib/econ';
import { useSettings, usePersisted } from '../lib/settings';
import ItemSelector from './ItemSelector';
import { Age, Banner, PriceStatus, Segmented, Money } from './ui';

export default function Market() {
  const [sel, setSel] = usePersisted('market:item', { id: 'T6_MAIN_SWORD', ench: 0 });
  const [quality, setQuality] = usePersisted('market:quality', 1);
  const { premium } = useSettings();
  const mid = marketId(sel.id, sel.ench);
  const ids = useMemo(() => [mid], [mid]);
  const { prices, loading, error, updatedAt, refresh } = usePrices(ids, { qualities: '1,2,3,4,5' });
  const item = getItem(sel.id);

  const rows = SELL_CITIES.map((city) => {
    const q = prices?.[mid]?.[city]?.[quality];
    return { city, sell: q?.s || 0, sellDate: q?.sd, buy: q?.b || 0, buyDate: q?.bd };
  });

  // melhores pontos
  const buyFrom = rows.filter((r) => r.sell > 0 && r.city !== 'Black Market').sort((a, b) => a.sell - b.sell)[0];
  const sellOrder = rows.filter((r) => r.sell > 0 && r.city !== 'Black Market').sort((a, b) => b.sell - a.sell)[0];
  const sellInstant = rows.filter((r) => r.buy > 0).sort((a, b) => b.buy - a.buy)[0];

  // melhor flip: comprar na venda mais barata e vender em outra cidade
  const flips = [];
  if (buyFrom) {
    for (const r of rows) {
      if (r.city === buyFrom.city) continue;
      if (r.buy > 0) flips.push({ to: r.city, mode: 'instant', gross: r.buy, net: netSale(r.buy, 'instant', premium) - buyFrom.sell });
      if (r.sell > 0 && r.city !== 'Black Market') flips.push({ to: r.city, mode: 'order', gross: r.sell, net: netSale(r.sell, 'order', premium) - buyFrom.sell });
    }
  }
  flips.sort((a, b) => b.net - a.net);
  const bestFlip = flips[0];
  const hasAny = rows.some((r) => r.sell || r.buy);

  return (
    <div className="grid-2">
      <div className="card stack">
        <h2>Consultar mercado</h2>
        <ItemSelector value={sel} onChange={setSel} />
        <div className="field">
          <label>Qualidade</label>
          <Segmented
            value={quality}
            onChange={setQuality}
            options={[
              { value: 1, label: 'Normal' },
              { value: 2, label: 'Bom' },
              { value: 3, label: 'Excelente' },
              { value: 4, label: 'Notável' },
              { value: 5, label: 'Obra-prima' },
            ]}
          />
        </div>
        {item && (
          <div className="hint">
            {categoryLabel(item.c)} · {weightOf(mid).toFixed(2)} kg · <code>{mid}</code>
          </div>
        )}
      </div>

      <div className="stack">
        <div className="card stack">
          <div className="card-head">
            <h2>
              {nameOf(mid)} <span className="muted">T{item?.t}.{sel.ench}</span>
            </h2>
          </div>
          <PriceStatus loading={loading} error={error} updatedAt={updatedAt} onRefresh={refresh} />

          {!loading && prices && !hasAny && !error && (
            <Banner kind="warn" title="Sem preços para este item/qualidade">
              Ninguém enviou dados deste item recentemente. Abra o mercado dele no jogo com o Albion Data Client ligado para alimentar a base.
            </Banner>
          )}

          <div className="cols-3">
            <div className="stat">
              <span className="label">Comprar mais barato</span>
              <b>{buyFrom ? <Money value={buyFrom.sell} /> : '—'}</b>
              <div className="hint">{buyFrom ? cityLabel(buyFrom.city) : 'sem dados'}</div>
            </div>
            <div className="stat">
              <span className="label">Vender (ordem de compra)</span>
              <b>{sellInstant ? <Money value={sellInstant.buy} /> : '—'}</b>
              <div className="hint">{sellInstant ? cityLabel(sellInstant.city) : 'sem dados'}</div>
            </div>
            <div className="stat">
              <span className="label">Vender (ordem de venda)</span>
              <b>{sellOrder ? <Money value={sellOrder.sell} /> : '—'}</b>
              <div className="hint">{sellOrder ? cityLabel(sellOrder.city) : 'sem dados'}</div>
            </div>
          </div>

          {bestFlip && buyFrom && (
            <div className={`result ${bestFlip.net > 0 ? 'profit' : 'loss'}`}>
              <div>
                <div className="label">Melhor transporte</div>
                <div>
                  Comprar em <b>{cityLabel(buyFrom.city)}</b> ({fmt(buyFrom.sell)}) → vender em <b>{cityLabel(bestFlip.to)}</b>{' '}
                  {bestFlip.mode === 'instant' ? 'na ordem de compra' : 'com ordem de venda'} ({fmt(bestFlip.gross)})
                </div>
                <div className="hint">Já descontados impostos ({premium ? 'premium' : 'sem premium'}){bestFlip.mode === 'order' ? ' e taxa de listagem' : ''}</div>
              </div>
              <div className="big">
                <Money value={bestFlip.net} signed />
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Preços por cidade</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cidade</th>
                  <th>Venda (mín.)</th>
                  <th>Compra (máx.)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.city} className={r.city === buyFrom?.city ? 'best' : ''}>
                    <td>{cityLabel(r.city)}</td>
                    <td>
                      {r.sell ? <Money value={r.sell} /> : <span className="muted">—</span>}
                      <Age ts={r.sellDate} />
                      {r.city === 'Black Market' && r.sell > 0 && <small className="warn">preço de lista (sell_price_min) · NÃO VERIFICADO em jogo</small>}
                    </td>
                    <td>
                      {r.buy ? <Money value={r.buy} /> : <span className="muted">—</span>}
                      <Age ts={r.buyDate} />
                      {r.city === 'Black Market' && r.buy > 0 && <small className="warn">ordem de compra (buy_price_max) · NÃO VERIFICADO em jogo</small>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            Linha verde = onde comprar mais barato. “Compra (máx.)” é o que os compradores pagam na hora. No Mercado Negro a API traz as duas colunas e o app não sabe qual delas o jogador recebe (NÃO VERIFICADO em jogo). Dados com mais de 24 h aparecem em amarelo.
          </p>
        </div>
      </div>
    </div>
  );
}
