// IDEIA-005: cartão "Variáveis deste cálculo". Só apresenta: as linhas e as contagens vêm de lib/audit (nada é calculado aqui).
import { ORIGIN_LABEL, STATUS_LABEL } from '../lib/audit/core';
import { Age } from './ui';

const NOTE =
  'Este quadro só lê o que o cálculo usou; ele não calcula nada. ‘Bônus diário’ aqui é o bônus de produção +10/+20 que você informa; o diário de ofício (journal) não é modelado.';

// valor pt-BR com a unidade; sem valor = traço; texto passa como veio
function valueText(value, unit) {
  if (value === null || value === undefined) return '—';
  if (typeof value !== 'number') return String(value);
  if (!Number.isFinite(value)) return '—';
  const digits = unit === '' && Math.abs(value) < 10 ? 3 : 2;
  const n = value.toLocaleString('pt-BR', { maximumFractionDigits: digits });
  return unit === '%' ? `${n}%` : unit ? `${n} ${unit}` : n;
}

const STATUS_CLASS = { unconfirmed: 'warn', stale: 'warn' };

function Row({ r }) {
  return (
    <div data-testid="audit-row" data-row-id={r.id} data-status={r.status} style={{ padding: '6px 0', borderTop: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span>{r.label}</span>
        <span className="num"><b>{valueText(r.value, r.unit)}</b></span>
      </div>
      <div className="hint">
        {ORIGIN_LABEL[r.origin]} · <span className={STATUS_CLASS[r.status]}>{r.status === 'not-considered' ? <b>{r.statusText ?? STATUS_LABEL[r.status]}</b> : (r.statusText ?? STATUS_LABEL[r.status])}</span>
        {r.source && <> · {r.source}</>}
        {r.date ? <> · <Age ts={r.date} /></> : null}
      </div>
      {r.note && <div className="hint">{r.note}</div>}
    </div>
  );
}

// linhas em ordem, com o nome da seção quando ela muda
function Rows({ list }) {
  let last;
  return list.map((r) => {
    const head = r.section && r.section !== last ? r.section : null;
    last = r.section;
    return (
      <div key={r.id}>
        {head && <div style={{ fontWeight: 600, marginTop: 10 }}>{head}</div>}
        <Row r={r} />
      </div>
    );
  });
}

/** audit = { rows, counts } de auditScreen/auditCraft/auditRefine/auditRrr. Recolhido por padrão; o cabeçalho mostra as contagens. */
export default function VarAuditCard({ audit }) {
  if (!audit || !Array.isArray(audit.rows) || audit.rows.length === 0) return null;
  const { rows, counts: c } = audit;
  const open = rows.filter((r) => r.status === 'unconfirmed' || r.status === 'stale' || r.status === 'not-considered');
  const applied = rows.filter((r) => r.status === 'applied');
  const info = rows.filter((r) => r.status === 'info-only');
  return (
    <details className="card" data-testid="var-audit">
      <summary data-testid="var-audit-summary">
        <b>Variáveis deste cálculo</b>{' '}
        <span className="muted">
          {c.applied} aplicadas · {c.unconfirmed} não confirmadas · {c.stale} velhas/expiradas · {c.notConsidered} não consideradas
        </span>
      </summary>
      <div className="stack" style={{ marginTop: 12 }}>
        <p className="hint" data-testid="var-audit-note">{NOTE}</p>
        <div>
          <Rows list={open} />
        </div>
        {applied.length > 0 && (
          <details>
            <summary>{applied.length === 1 ? 'Ver a 1 variável aplicada' : `Ver as ${applied.length} variáveis aplicadas`}</summary>
            <Rows list={applied} />
          </details>
        )}
        {info.length > 0 && (
          <details>
            <summary>{info.length === 1 ? 'Ver a 1 variável informativa (não muda o lucro)' : `Ver as ${info.length} variáveis informativas (não mudam o lucro)`}</summary>
            <Rows list={info} />
          </details>
        )}
      </div>
    </details>
  );
}
