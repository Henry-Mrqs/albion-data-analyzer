// Foco (IDEIA-002): campos e cartão. Só apresenta: toda conta e todo valor validado vêm de lib/focus.js.
import { fmt } from '../lib/econ';
import { DAILY_FOCUS_PREMIUM, MAX_FOCUS_EFFICIENCY } from '../lib/focus';
import InputIssues from './InputIssues';
import { Banner, Field, Money, NumberInput } from './ui';

// duas casas (prata por ponto); fmt só protege contra ∞/NaN
const dec = (n) => (Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : fmt(n));

/** Campos do foco (entradas do usuário). cfg/set/issues da tela; os valores digitados ficam em focusEff, focusPoints, focusBudget e focusRef. */
export function FocusFields({ cfg, set, issues, overrideHint }) {
  return (
    <div className="stack" data-testid="focus-fields">
      <h3>Foco (suas entradas)</h3>
      <div className="cols-2">
        <Field label="Eficiência de foco (pontos)" hint={`Entrada sua: de 0 a ${fmt(MAX_FOCUS_EFFICIENCY)}. Vazio = 0 (sem especialização, custo cheio).`}>
          <NumberInput step="1" value={cfg.focusEff ?? ''} onChange={(v) => set({ focusEff: v })} placeholder="0" />
          <InputIssues issues={issues} field="focusEff" />
        </Field>
        <Field label="Foco por craft mostrado no jogo (opcional)" hint={overrideHint ?? 'Se a janela de craft mostra o foco, digite aqui: vence a fórmula.'}>
          <NumberInput step="0.01" value={cfg.focusPoints ?? ''} onChange={(v) => set({ focusPoints: v })} />
          <InputIssues issues={issues} field="focusPoints" />
        </Field>
      </div>
      <div className="cols-2">
        <Field label="Foco disponível hoje" hint={`Entrada sua. Vazio = ${fmt(DAILY_FOCUS_PREMIUM)} (oferta Premium de 24 h).`}>
          <NumberInput step="1" value={cfg.focusBudget ?? ''} onChange={(v) => set({ focusBudget: v })} placeholder={String(DAILY_FOCUS_PREMIUM)} />
          <InputIssues issues={issues} field="focusBudget" />
        </Field>
        <Field label="Quanto vale 1 ponto para você (prata, opcional)" hint="Entrada sua: a prata por ponto que você obtém em outro item. Sem ela, não há veredito.">
          <NumberInput step="0.01" value={cfg.focusRef ?? ''} onChange={(v) => set({ focusRef: v })} />
          <InputIssues issues={issues} field="focusRef" />
        </Field>
      </div>
    </div>
  );
}

const SRC = {
  formula: 'fórmula da fonte: custo base do dump × 0,5^(eficiência ÷ 10.000)',
  override: 'valor digitado do jogo (vence a fórmula)',
};

function Row({ label, tag, children }) {
  return (
    <tr>
      <td>
        {label}
        {tag && <small className="muted">{tag}</small>}
      </td>
      <td style={{ textAlign: 'right' }}>{children}</td>
    </tr>
  );
}

/**
 * Cartão "Foco". summary = craftFocusSummary(...) | refineFocusSummary(...) | null; ench = encanto (texto do "sem dado");
 * unit = 'craft' | 'refino' (rótulos). Itens de summary: pointsPerCraft|pointsPerUnit, savings..., silverPerPoint, verdict.
 */
export default function FocusCard({ summary, ench = 0, unit = 'craft', hasBase = true, manualRRR = false }) {
  const s = summary;
  const perUnit = unit === 'refino';
  return (
    <div className="card stack" data-testid="focus-card">
      <h2>Foco</h2>
      {!s && <div className="hint">Sem preços completos dos materiais: não dá para calcular a economia do foco.</div>}
      {s && s.verdict === 'nofocus' && (
        <Banner kind="warn">
          {!hasBase && ench > 0
            ? 'Sem dado de foco para este encanto no catálogo.'
            : 'O dump do jogo não traz custo de foco para este item (comum em artefatos, itens Royal e capas de cidade).'}{' '}
          Se a janela de craft do jogo mostra o foco, digite-o em “Foco por craft mostrado no jogo”.
        </Banner>
      )}
      {s && s.verdict !== 'nofocus' && (
        <>
          {s.verdict === 'worth' && <Banner kind="info" title="Vale usar foco">{dec(s.silverPerPoint)} ≥ {dec(s.reference)} prata por ponto (a sua referência).</Banner>}
          {s.verdict === 'notworth' && <Banner kind="warn" title="Não vale usar foco neste item">{dec(s.silverPerPoint)} &lt; {dec(s.reference)} prata por ponto (a sua referência).</Banner>}
          {s.verdict === 'info' && (
            <div className="hint">Sem referência: use o foco no item com a maior prata por ponto. Digite “Quanto vale 1 ponto para você” para ter o veredito “vale usar foco?”.</div>
          )}
          {manualRRR && (
            <div className="hint warn" data-testid="focus-manual-rrr">
              RRR manual digitado: ele vale no lugar do automático, por isso o foco não muda o custo aqui. Apague o RRR manual para ver a economia do foco.
            </div>
          )}
          <div className="table-wrap">
            <table>
              <tbody>
                <Row label={perUnit ? 'Pontos por unidade' : 'Pontos por craft'} tag={SRC[s.source]}>
                  <b className="num">{dec(perUnit ? s.pointsPerUnit : s.pointsPerCraft)}</b>
                </Row>
                {!perUnit && s.pointsPerUnit !== s.pointsPerCraft && (
                  <Row label="Pontos por unidade produzida"><span className="num">{dec(s.pointsPerUnit)}</span></Row>
                )}
                <Row label={perUnit ? 'Pontos do lote' : 'Pontos do lote de crafts'}><span className="num">{dec(s.pointsLot)}</span></Row>
                <Row label="Economia de material com foco" tag="só o que retorna; a taxa de bancada não muda com foco">
                  <Money value={perUnit ? s.savingsPerUnit : s.savingsPerCraft} /> {perUnit ? 'por unidade' : 'por craft'} · lote <Money value={s.savingsLot} />
                </Row>
                <Row label="Prata por ponto de foco" tag="economia ÷ pontos (definição do app)">
                  <b className={`num ${s.verdict === 'worth' ? 'good' : ''}`}>{s.silverPerPoint == null ? '—' : dec(s.silverPerPoint)}</b>
                </Row>
                <Row label="O foco do dia esgota em" tag={`com ${fmt(s.budget)} de foco`}>
                  <span className="num">{fmt(perUnit ? s.unitsInBudget : s.craftsInBudget)}</span> {perUnit ? 'unidades' : 'crafts'}
                </Row>
                {s.profitOn != null && s.profitOff != null && (
                  <Row label="Lucro do lote com foco / sem foco" tag="melhor destino de cada caso">
                    <Money value={s.profitOn} signed /> / <Money value={s.profitOff} signed />
                  </Row>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="hint">
        A taxa de bancada não muda com foco. Eficiência e foco do jogo são os que a sua conta mostra.
        Confiança: a fórmula do custo (0,5 elevado a eficiência ÷ 10.000) vem de 3 fontes independentes de terceiros e é
        <b> média-alta</b>, ainda não conferida em jogo; os custos base vêm do dump oficial. A eficiência <b>não</b> é calculada dos
        níveis de especialização (os coeficientes por nível vêm de uma só fonte e variam por item): digite a sua.
        {perUnit
          ? ' No refino, a mesma eficiência vale para todas as etapas da rota e o foco do jogo vale só para a etapa final.'
          : ' O foco do refino dos materiais usados no craft não entra neste cartão.'}
      </p>
    </div>
  );
}
