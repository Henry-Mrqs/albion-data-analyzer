import { getItem } from '../lib/catalog';
import { ItemPicker, Field } from './ui';

/** Busca + seletor de tier e encantamento. value = { id: 'T4_MAIN_AXE', ench: 0 } */
export default function ItemSelector({ value, onChange, onlyCraftable, label = 'Item' }) {
  const item = getItem(value.id);
  const swapTier = (t) => {
    const next = getItem(value.id.replace(/^T\d/, `T${t}`));
    if (next) onChange({ id: next.i, ench: Math.min(value.ench, next.x) });
  };
  const tiers = [3, 4, 5, 6, 7, 8].filter((t) => getItem(value.id.replace(/^T\d/, `T${t}`)));
  const maxEnch = item?.x ?? 0;

  return (
    <div className="stack" style={{ gap: 12 }}>
      <Field label={label}>
        <ItemPicker
          key={value.id}
          onlyCraftable={onlyCraftable}
          initial={item ? `${item.p} T${item.t}` : ''}
          onSelect={(it) => onChange({ id: it.i, ench: Math.min(value.ench, it.x) })}
        />
      </Field>
      <div className="cols-2">
        <Field label="Tier">
          <select className="input" value={item?.t ?? 4} onChange={(e) => swapTier(+e.target.value)}>
            {tiers.map((t) => (
              <option key={t} value={t}>
                T{t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Encantamento">
          <select className="input" value={value.ench} disabled={maxEnch === 0} onChange={(e) => onChange({ ...value, ench: +e.target.value })}>
            {Array.from({ length: maxEnch + 1 }, (_, n) => (
              <option key={n} value={n}>
                .{n}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}
