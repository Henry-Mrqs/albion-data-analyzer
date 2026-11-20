import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Info, RotateCw, Search, XCircle } from 'lucide-react';
import { searchItems, categoryLabel } from '../lib/catalog';
import { ageClass, ageLabel } from '../lib/market';
import { fmt } from '../lib/econ';

export function Field({ label, hint, children }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Switch({ label, hint, checked, onChange }) {
  return (
    <label className="switch">
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.value} type="button" className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function NumberInput({ value, onChange, placeholder, min = 0, step = 1, small, ...rest }) {
  return (
    <input
      className={`input ${small ? 'input-sm' : ''}`}
      type="number"
      inputMode="decimal"
      min={min}
      step={step}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  );
}

export function Banner({ kind = 'info', title, children }) {
  const Icon = kind === 'err' ? XCircle : kind === 'warn' ? AlertTriangle : Info;
  return (
    <div className={`banner ${kind === 'info' ? '' : kind}`} role={kind === 'err' ? 'alert' : undefined}>
      <Icon size={18} />
      <div>
        {title && <strong>{title}</strong>}
        <div>{children}</div>
      </div>
    </div>
  );
}

/** Barra de status dos preços: carregando, erro e botão de atualizar. */
export function PriceStatus({ loading, error, updatedAt, onRefresh }) {
  return (
    <>
      <div className="row between">
        <span className="hint">
          {loading ? 'Buscando preços…' : updatedAt ? `Preços consultados às ${new Date(updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
        </span>
        <button className="btn ghost sm" onClick={onRefresh} disabled={loading} title="Buscar preços novamente na API">
          <RotateCw size={14} className={loading ? 'spin' : ''} /> Atualizar preços
        </button>
      </div>
      {error && (
        <Banner kind="err" title="Não foi possível carregar os preços">
          {error}
        </Banner>
      )}
    </>
  );
}

export function Age({ ts }) {
  if (!ts) return <small className="age-none">sem dados</small>;
  return <small className={ageClass(ts)}>{ageLabel(ts)}</small>;
}

export function Money({ value, signed }) {
  const v = Number.isFinite(value) ? Math.round(value) || 0 : NaN; // zero (inclusive -0) não é lucro nem prejuízo
  const cls = signed ? (v > 0 ? 'good' : v < 0 ? 'bad' : '') : '';
  return <span className={`num ${cls}`}>{(signed && v > 0 ? '+' : '') + fmt(value)}</span>;
}

/** Busca de itens com autocomplete (nome PT/EN, ID, "t6", "t6.2"). */
export function ItemPicker({ onSelect, onlyCraftable, placeholder = 'Buscar item (ex.: espada, bolsa t6, T5_MAIN_AXE)…', initial = '' }) {
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [hl, setHl] = useState(0);
  const ref = useRef(null);
  const results = open ? searchItems(q, { onlyCraftable }) : [];

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const pick = (it) => {
    onSelect(it);
    setQ(`${it.p} T${it.t}`);
    setOpen(false);
  };

  return (
    <div className="picker" ref={ref}>
      <div style={{ position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-3)' }} />
        <input
          className="input"
          style={{ paddingLeft: 32 }}
          value={q}
          placeholder={placeholder}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setHl(0);
          }}
          onFocus={(e) => {
            e.target.select();
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setHl((h) => Math.min(h + 1, results.length - 1));
            else if (e.key === 'ArrowUp') setHl((h) => Math.max(h - 1, 0));
            else if (e.key === 'Enter' && results[hl]) pick(results[hl]);
            else if (e.key === 'Escape') setOpen(false);
          }}
        />
      </div>
      {open && q.trim() && (
        <div className="picker-list">
          {results.length === 0 && <div className="picker-item muted">Nenhum item encontrado</div>}
          {results.map((it, i) => (
            <div key={it.i} className={`picker-item ${i === hl ? 'hl' : ''}`} onMouseDown={() => pick(it)}>
              <span>
                {it.p} <small>T{it.t}</small>
              </span>
              <small>{categoryLabel(it.c)}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Loading({ text = 'Carregando…' }) {
  return (
    <div className="empty">
      <RotateCw className="spin" size={22} />
      <div style={{ marginTop: 8 }}>{text}</div>
    </div>
  );
}
