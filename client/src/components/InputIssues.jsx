import { setSettings, useSettings } from '../lib/settings';
import { FEE_CEILING, HARD_FEE_CEILING, sanitizeFeeCeiling } from '../lib/inputRules';
import { fmt } from '../lib/econ';

const CLASS = { info: 'muted', warn: 'warn', error: 'bad' };

/** Avisos de entrada fora da faixa (IDEIA-060). `field` filtra por campo; sem `field` mostra todos. */
export default function InputIssues({ issues, field }) {
  const list = (issues ?? []).filter((i) => field == null || i.field === field);
  if (!list.length) return null;
  return (
    <div role="status" data-testid="input-issues">
      {list.map((i) => {
        const raw = +i.raw;
        const canAccept = i.code === 'fee-ceiling' && Number.isFinite(raw) && raw > 0 && raw <= HARD_FEE_CEILING;
        return (
          <div key={`${i.field}-${i.code}`} className={`hint ${CLASS[i.level]}`}>
            {i.msg}
            {canAccept && (
              <>
                {' '}
                <button type="button" className="btn sm" onClick={() => setSettings({ feeCeiling: raw })}>
                  Aceitar {fmt(raw)} como novo teto
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Indicação permanente do teto de taxa: aceito (≠ 1.000) ou salvo inválido; com botão para restaurar o padrão. */
export function CeilingNotice() {
  const { feeCeiling } = useSettings();
  const { value, issue } = sanitizeFeeCeiling(feeCeiling);
  if (!issue && value === FEE_CEILING) return null;
  return (
    <div className="hint warn" data-testid="ceiling-notice">
      {issue ? issue.msg : `Teto de taxa aceito: ${fmt(value)}.`}{' '}
      <button type="button" className="btn sm" onClick={() => setSettings({ feeCeiling: FEE_CEILING })}>
        Restaurar {fmt(FEE_CEILING)}
      </button>
    </div>
  );
}

/** Junta listas de avisos sem repetir o mesmo campo+mensagem (IDEIA-072: o selo conta também os avisos do foco). */
export const mergeIssues = (...lists) => {
  const seen = new Set();
  return lists.flat().filter((i) => i && !seen.has(`${i.field}|${i.msg}`) && seen.add(`${i.field}|${i.msg}`));
};

/** Selo "N valores corrigidos" (só conta aviso e erro; o informativo não é correção). */
export function CorrectedBadge({ issues }) {
  const n = (issues ?? []).filter((i) => i.level !== 'info').length;
  if (!n) return null;
  return <span className="warn num" title="Há valores fora da faixa do jogo; o cálculo usa os corrigidos.">{n} {n === 1 ? 'valor corrigido' : 'valores corrigidos'}</span>;
}
