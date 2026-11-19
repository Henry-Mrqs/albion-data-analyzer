import { Plus, Trash2 } from 'lucide-react';
import { MAX_EXTRAS, extrasParts } from '../lib/extras';
import { validateExtras } from '../lib/inputRules';
import { fmt } from '../lib/econ';
import InputIssues from './InputIssues';
import { NumberInput } from './ui';

const LABELS = {
  craft: { per: 'por craft', title: 'Despesas extras', unit: 'craft' },
  refine: { per: 'por unidade', title: 'Despesas extras', unit: 'unidade' },
};

/**
 * IDEIA-048: lista editável de despesas extras (transporte, comida/poção, re-roll, reparo...). Só apresenta:
 * quem calcula é craftPlan/refinePlan. Sem linhas nem valores sugeridos (não há fonte para eles).
 * `list` é a lista como digitada; `issues` vêm da validação da 060 (campo `extras[i].value|name|scope`).
 */
export default function ExtrasCard({ list, onChange, issues, crafts, kind = 'craft' }) {
  const rows = Array.isArray(list) ? list : [];
  const lab = LABELS[kind] ?? LABELS.craft;
  const parts = extrasParts(validateExtras(rows).values, crafts);
  const patch = (i, p) => onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const bits = [];
  if (parts.perCraft > 0) bits.push(`${fmt(parts.perCraft)} ${lab.per}`);
  if (parts.perLote > 0) bits.push(`${fmt(parts.perLote)} por lote`);

  return (
    <div className="card stack" data-testid="extras-card">
      <h2>{lab.title}</h2>
      <p className="hint" style={{ margin: 0 }}>
        Transporte, comida ou poção de buff, re-roll, reparo: o que você paga fora dos materiais. Não mudam RRR, foco nem taxa de bancada.
      </p>
      {rows.map((r, i) => (
        <div key={i} className="stack" style={{ gap: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) auto', gap: 8, alignItems: 'center' }}>
            <input
              className="input input-sm"
              type="text"
              maxLength={200}
              placeholder="Nome (opcional)"
              aria-label={`Nome da despesa ${i + 1}`}
              value={typeof r?.name === 'string' ? r.name : ''}
              onChange={(e) => patch(i, { name: e.target.value })}
            />
            <NumberInput small aria-label={`Valor da despesa ${i + 1}`} placeholder="Valor" value={r?.value ?? ''} onChange={(v) => patch(i, { value: v })} />
            <select className="input input-sm" aria-label={`Escopo da despesa ${i + 1}`} value={r?.scope === 'lote' ? 'lote' : 'craft'} onChange={(e) => patch(i, { scope: e.target.value })}>
              <option value="craft">{lab.per}</option>
              <option value="lote">por lote</option>
            </select>
            <button type="button" className="btn sm ghost" aria-label={`Remover despesa ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
              <Trash2 size={14} />
            </button>
          </div>
          <InputIssues issues={issues} field={`extras[${i}].name`} />
          <InputIssues issues={issues} field={`extras[${i}].value`} />
          <InputIssues issues={issues} field={`extras[${i}].scope`} />
        </div>
      ))}
      <InputIssues issues={issues} field="extras" />
      <div>
        <button type="button" className="btn sm ghost" disabled={rows.length >= MAX_EXTRAS} onClick={() => onChange([...rows, { name: '', value: '', scope: 'craft' }])}>
          <Plus size={14} /> Adicionar despesa
        </button>
        {rows.length >= MAX_EXTRAS && <span className="hint"> Limite de {MAX_EXTRAS} despesas.</span>}
      </div>
      {parts.total > 0 && (
        <div className="hint" data-testid="extras-summary">
          Despesas: {bits.join(' + ')} ({fmt(parts.total)} no lote de {fmt(crafts)})
        </div>
      )}
    </div>
  );
}
