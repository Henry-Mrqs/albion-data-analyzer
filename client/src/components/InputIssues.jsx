import { setSettings } from '../lib/settings';

const CLASS = { info: 'muted', warn: 'warn', error: 'bad' };

/** Avisos de entrada fora da faixa (IDEIA-060). `field` filtra por campo; sem `field` mostra todos. */
export default function InputIssues({ issues, field }) {
  const list = (issues ?? []).filter((i) => field == null || i.field === field);
  if (!list.length) return null;
  return (
    <div role="status" data-testid="input-issues">
      {list.map((i) => (
        <div key={`${i.field}-${i.code}`} className={`hint ${CLASS[i.level]}`}>
          {i.msg}
          {i.code === 'fee-ceiling' && Number.isFinite(+i.raw) && (
            <>
              {' '}
              <button type="button" className="btn sm" onClick={() => setSettings({ feeCeiling: +i.raw })}>
                Aceitar {(+i.raw).toLocaleString('pt-BR')} como novo teto
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/** Selo "N valores corrigidos" (só conta aviso e erro; o informativo não é correção). */
export function CorrectedBadge({ issues }) {
  const n = (issues ?? []).filter((i) => i.level !== 'info').length;
  if (!n) return null;
  return <span className="warn num" title="Há valores fora da faixa do jogo; o cálculo usa os corrigidos.">{n} {n === 1 ? 'valor corrigido' : 'valores corrigidos'}</span>;
}
