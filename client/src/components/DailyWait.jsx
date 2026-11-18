import { worthWaiting } from '../lib/craftPlan';
import { fmt } from '../lib/econ';
import { Field, Money, NumberInput } from './ui';

/** "Vale esperar o bônus do dia?": economia do lote se o bônus do item fosse +10% ou +20% (IDEIA-041). Some sem preços completos. */
export default function DailyWait({ savings, crafts, waitCost, onWaitCost }) {
  if (!savings) return null;
  const cost = +waitCost || 0;
  return (
    <div className="card stack">
      <h2>Vale esperar o bônus do dia?</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Bônus do item</th>
              <th>Custo total</th>
              <th>Economia por craft</th>
              <th>Economia do lote ({fmt(crafts)} {crafts === 1 ? 'craft' : 'crafts'})</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {savings.rows.map((r) => (
              <tr key={r.daily}>
                <td>+{r.daily}%</td>
                <td><Money value={r.totalCost} /></td>
                <td>{r.gain ? <Money value={r.perCraft} /> : <span className="muted">—</span>}</td>
                <td>{r.gain ? <Money value={r.lot} /> : <span className="muted">—</span>}</td>
                <td>{worthWaiting(r, cost) ? <span className="good">vale esperar</span> : <span className="muted">{r.gain ? 'não compensa' : 'sem ganho'}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Field label="Custo de esperar (prata)" hint="Quanto você perde esperando (ex.: lucro que deixa de fazer hoje). Com 0, qualquer economia marca “vale esperar”.">
        <NumberInput value={waitCost ?? ''} onChange={(v) => onWaitCost(v)} placeholder="0" />
      </Field>
      <p className="hint">O bônus diário vale para uma categoria por 24 h; informe o do dia (o app não consegue buscá-lo). O valor escolhido substitui o atual; não soma.</p>
    </div>
  );
}
