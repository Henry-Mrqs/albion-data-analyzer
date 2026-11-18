import { FEE_DEPENDENCE_WARNING, feeDecides, variantLabel } from '../lib/recipeAlt';
import { Banner, Money, Segmented } from './ui';

const isComplete = (r) => !r.missing.length && r.totalCost > 0;

// Seletor de receita (artefato ou ficha de favor; base Royal 1/2/3). Só apresenta: a escolha e o cálculo vêm do Crafting.
export default function RecipePicker({ variants, results, auto, mode, onChange }) {
  if (variants.length < 2) return null;
  const labels = variants.map((v) => variantLabel(v.swapped));
  const cheapest = results.some(isComplete) ? auto : -1;
  const { depends } = feeDecides(results);
  return (
    <div className="stack" data-testid="recipe-picker">
      <div>
        <div className="label">Receita</div>
        <Segmented
          value={mode === undefined ? 'auto' : String(mode)}
          onChange={onChange}
          options={[{ value: 'auto', label: 'Automático' }, ...variants.map((v, i) => ({ value: String(i), label: labels[i] }))]}
        />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Receita</th>
              <th>Material</th>
              <th>Taxa da bancada</th>
              <th>Custo total</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={variants[i].variant} className={i === cheapest ? 'best' : ''}>
                <td>
                  {labels[i]}
                  {i === cheapest && <small className="good">mais barata agora</small>}
                </td>
                <td>{isComplete(r) ? <Money value={r.matCost} /> : <span className="warn">sem preço</span>}</td>
                <td><Money value={r.fee} /></td>
                <td>{isComplete(r) ? <strong><Money value={r.totalCost} /></strong> : <span className="warn">sem preço</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {depends && <Banner kind="warn">{FEE_DEPENDENCE_WARNING.charAt(0).toUpperCase() + FEE_DEPENDENCE_WARNING.slice(1)}.</Banner>}
      <p className="hint">
        A taxa de bancada usa o valor do dump de cada ingrediente (ex.: ficha de favor 896, artefato 384): ainda não verificado em jogo. A mais barata compara o custo total, com a taxa.
      </p>
    </div>
  );
}
