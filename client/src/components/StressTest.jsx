import { useEffect, useRef } from 'react';
import { breakEven, stressGrid, stressProfit, verdict } from '../lib/stress';
import { fmt } from '../lib/econ';
import { cityLabel } from '../lib/market';

const CLS = { loss: 'bad', thin: 'warn', ok: 'good' };
const SIGN = (n) => `${n > 0 ? '+' : ''}${Math.round(n * 100)}%`;
const P1 = (n) => (Number.isFinite(n) ? `${(Math.abs(n) * 100).toFixed(1).replace('.', ',')}%` : fmt(n)); // nunca Infinity%/NaN%

/**
 * IDEIA-031: teste de estresse (só apresenta; quem calcula é lib/stress.js). `input` vem de craftStressInput /
 * refineStressInput (null = faltam preços). Lucro por unidade; taxa de bancada, despesas e RRR não mudam.
 */
export default function StressTest({ input }) {
  const wrapRef = useRef(null);
  // Em tela estreita a grade rola na horizontal: começa com a coluna 0% (centro) à vista.
  useEffect(() => {
    const w = wrapRef.current;
    const c = w?.querySelector('[data-testid="stress-center"]');
    if (w && c && w.scrollWidth > w.clientWidth) w.scrollLeft = c.offsetLeft - (w.clientWidth - c.offsetWidth) / 2;
  }, [input]);
  if (!input) {
    return (
      <div className="card stack" data-testid="stress-card">
        <h2>Teste de estresse</h2>
        <p className="hint" style={{ margin: 0 }}>Preencha os preços ausentes para ver quanto o lucro aguenta.</p>
      </div>
    );
  }
  const cost = input.variable + input.fixed;
  const base = stressProfit(input, {});
  const be = breakEven(input);
  const { steps, cells } = stressGrid(input);
  const loss = base < 0;
  const priceText = loss
    ? `Preço precisa subir ${P1(be.dp ?? 0)} (para ${fmt(be.minPrice)}).`
    : `Aguenta queda de ${P1(be.dp ?? 0)} no preço (preço mínimo ${fmt(be.minPrice)}, ${fmt(be.priceDrop)} de folga).`;
  const matText =
    be.dm == null
      ? 'Sem ruptura de materiais: a receita não cobre as taxas e despesas fixas, ou não há material comprado.'
      : loss
        ? `Materiais precisam cair ${P1(be.dm)}.`
        : `Aguenta alta de ${P1(be.dm)} nos materiais.`;

  return (
    <div className="card stack" data-testid="stress-card">
      <h2>Teste de estresse</h2>
      <p style={{ margin: 0 }} data-testid="stress-summary">
        Lucro hoje <b className={CLS[verdict(base, cost)]}>{fmt(base)}</b> por unidade. {priceText} {matText}
      </p>
      <div className="table-wrap" ref={wrapRef}>
        <table data-testid="stress-grid">
          <thead>
            <tr>
              <th>Materiais ↓ / Preço de venda →</th>
              {steps.map((dp) => (
                <th key={dp} className="num">{SIGN(dp)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {steps.map((dm, i) => (
              <tr key={dm}>
                <th className="num">{SIGN(dm)}</th>
                {cells[i].map((v, j) => {
                  const center = dm === 0 && steps[j] === 0;
                  return (
                    <td
                      key={steps[j]}
                      className={`num ${CLS[verdict(v, cost + input.variable * dm)]}`}
                      style={center ? { fontWeight: 700, outline: '2px solid var(--accent)', outlineOffset: -2 } : undefined}
                      data-testid={center ? 'stress-center' : undefined}
                    >
                      {fmt(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="hint">
        {input.city && (
          <>
            Saída de venda variada: {cityLabel(input.city)}, {input.label}
            {input.noTax ? ', sem imposto' : ''}.{' '}
          </>
        )}
        A variação de material (±5% a ±20%) vale para todos os materiais, inclusive artefatos.
      </div>
      <div className="hint">
        Lucro por unidade em cada cenário: vermelho = prejuízo, amarelo = menos de 5% do custo, verde = folgado. Taxa de bancada, despesas e RRR não mudam; a rota (comprar/produzir) é mantida. Em tela estreita, role a grade para os lados.
      </div>
    </div>
  );
}
