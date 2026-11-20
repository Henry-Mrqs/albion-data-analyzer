import { CITIES } from '../lib/market';
import { DEFAULT_FEE, fmt } from '../lib/econ';
import InputIssues from './InputIssues';
import { Money, NumberInput, Segmented } from './ui';

/**
 * IDEIA-058: custo de craftar o mesmo item em cada cidade. Só apresentação: o cálculo está em lib/cityCompare.js.
 * result = compareCraftCities(...); general = { value, touched } da taxa geral da tela; units = unidades de produto do lote.
 */
export default function CityCompare({ result, scenario, onScenario, feeByCity, onFee, general, units }) {
  const { rows, best, spread, issues } = result;
  const anyCityFee = rows.some((r) => r.feeSource === 'city');
  const anyExtras = rows.some((r) => r.extras > 0);
  const fees = feeByCity ?? {};
  // IDEIA-073: textos honestos derivados do resultado
  const ownFee = rows.filter((r) => r.feeSource === 'city');
  const partialFee = ownFee.length > 0 && ownFee.length < rows.length;
  const generalEmpty = general.value === '' || general.value == null;
  const done = rows.filter((r) => r.complete);
  const bonusRow = rows.find((r) => r.isBonus);
  const noBonus = rows.length > 0 && !bonusRow;
  const allSame = done.length > 1 && done.every((r) => r.totalCost === done[0].totalCost && r.rrr === done[0].rrr);
  const bestRow = allSame ? null : best;
  const names = ownFee.map((r) => r.city);
  const nameList = names.length > 1 ? `${names.slice(0, -1).join(', ')} e ${names.at(-1)}` : names[0];
  const deltaWhy = noBonus ? 'Este item não tem cidade de bônus: não há diferença a mostrar.' : bonusRow && !bonusRow.complete ? `${bonusRow.city} (cidade de bônus) está sem preço: não há coluna de diferença.` : undefined;
  const why = (r) => {
    if (scenario === 'own' && !CITIES.includes(r.city)) return 'sem preços (cidade não consultada)';
    return r.missing.length ? `sem preço de ${r.missing.join(', ')}` : 'sem preço';
  };

  return (
    <div className="card stack">
      <h2>Comparar cidades de craft</h2>
      <Segmented
        value={scenario}
        onChange={onScenario}
        options={[{ value: 'own', label: 'Comprar na própria cidade' }, { value: 'best', label: 'Comprar na mais barata' }]}
      />
      {partialFee && (
        <div className="hint" data-testid="city-fee-partial">
          Só {nameList} {names.length === 1 ? 'tem' : 'têm'} taxa própria; as outras {rows.length - ownFee.length} usam {generalEmpty ? DEFAULT_FEE : fmt(general.value)} (da tela ou padrão do app).
        </div>
      )}
      {!anyCityFee && generalEmpty && (
        <div className="hint warn" data-testid="city-fee-empty">
          Taxa geral vazia: o cálculo usa o padrão {DEFAULT_FEE} do app (não confirmado) em todas as cidades.
        </div>
      )}
      {!anyCityFee && !generalEmpty && !general.touched && (
        <div className="hint warn" data-testid="city-fee-default">
          Usando {fmt(general.value)} do app em todas as cidades: informe a taxa de cada bancada; sem isso a comparação não vale.
        </div>
      )}
      {!anyCityFee && !generalEmpty && general.touched && <div className="hint" data-testid="city-fee-same">Mesma taxa em todas as cidades (a da tela).</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="sticky-col">Cidade</th>
              <th>RRR</th>
              <th>Custo total</th>
              <th>Por unidade</th>
              <th>Material</th>
              <th title="Prata por 100 de nutrição; vazio = taxa geral da tela">Taxa (por 100)</th>
              {anyExtras && <th title="Despesas extras do lote (as mesmas em todas as cidades); entram no custo total">Despesas</th>}
              <th title="Quanto a mais (+) ou a menos (−) que a cidade de bônus do item">Dif. p/ cidade de bônus</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.city} className={r === bestRow ? 'best' : ''} style={r.complete ? undefined : { opacity: 0.6 }}>
                <td className="sticky-col">
                  {r.city}
                  {r.isBonus && <small className="good">bônus</small>}
                </td>
                <td className="num">{(r.rrr * 100).toFixed(1)}%</td>
                <td>{r.complete ? <strong><Money value={r.totalCost} /></strong> : <span className="muted">—</span>}</td>
                <td>{r.complete ? <Money value={r.unitCost} /> : <span className="muted">—</span>}</td>
                <td>{r.complete ? <Money value={r.matCost} /> : <span className="muted">{why(r)}</span>}</td>
                <td>
                  <NumberInput
                    small
                    value={fees[r.city] ?? ''}
                    placeholder={fmt(general.value)}
                    onChange={(v) => onFee(r.city, v)}
                    aria-label={`Taxa da bancada em ${r.city}`}
                  />
                  <InputIssues issues={issues} field={`feeByCity.${r.city}`} />
                  <small>{fmt(r.fee)} no lote</small>
                </td>
                {anyExtras && <td>{r.complete ? <Money value={r.extras} /> : <span className="muted">—</span>}</td>}
                <td>{r.deltaVsBonus == null ? <span className="muted" title={deltaWhy}>—</span> : <Money value={r.deltaVsBonus} signed />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {bonusRow && !bonusRow.complete && <p className="hint" data-testid="city-bonus-missing">{bonusRow.city} (cidade de bônus) está sem preço: não há coluna de diferença.</p>}
      {noBonus && done.length > 0 && (
        <p className="hint" data-testid="city-no-bonus">
          Este item não tem cidade de bônus: as {rows.length} cidades dão o mesmo RRR ({(rows[0].rrr * 100).toFixed(1).replace('.', ',')}%) e a diferença vem só da taxa e do material.
        </p>
      )}
      {spread != null && bestRow && (
        <p className="hint">
          Melhor: <b>{bestRow.city}</b>. Da mais barata à mais cara há {fmt(spread)} de diferença no lote ({units} {units === 1 ? 'unidade' : 'unidades'} de produto).
        </p>
      )}
      {anyExtras && (
        <p className="hint">
          Custo total = material + taxa da bancada + despesas extras. As despesas são as mesmas em todas as cidades, então não mudam qual é a mais barata.
        </p>
      )}
      <p className="hint">
        Compara só o custo de produzir; não inclui transporte, peso nem risco da rota. A tabela ignora o interruptor de especialização e o RRR manual da tela: a especialização vem da regra do item e o RRR é o automático de cada cidade. Foco, bônus diário, refino, ordens de compra e nº de crafts valem para todas. O interruptor “Sem imposto” só afeta a venda; não entra nesta comparação.
        {scenario === 'own'
          ? ' Cada cidade usa os preços de material da própria cidade; sem preço, a linha fica incompleta (nunca custo 0). Brecilien não tem preços consultados.'
          : ' Todas usam o material mais barato de cada item, de qualquer cidade; só o RRR e a taxa mudam.'}
      </p>
    </div>
  );
}
