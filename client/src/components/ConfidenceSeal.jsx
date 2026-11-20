// IDEIA-012: selo de confiança do preço. Só apresenta: a decisão vem de lib/confidence.js. O selo só marca; nenhum número muda.
import { sealLabel, sealVisible } from '../lib/confidence';

export const SEAL_FOOTER =
  'Regra do app, não dado do jogo (limiares de produto: 24 h, 72 h, 7 dias, +20%, −50%, desvio 25%, z 3,5, piso 5%). O selo só marca: nenhum número muda. Os dados do AODP são colaborativos e podem ter lixo (ordens de 1 prata, preços fantasma).';
const CLASS = { alta: 'good', media: 'warn', baixa: 'bad', nenhuma: 'muted' };

/** conf = saída de priceConfidence. withReasons mostra as razões em texto abaixo do rótulo; o tooltip sempre as lista. */
export default function ConfidenceSeal({ conf, withReasons = false }) {
  if (!conf || !sealVisible(conf)) return null;
  const title = [...conf.reasons.map((r) => `- ${r.text}`), SEAL_FOOTER].join('\n');
  return (
    <span data-testid="confidence-seal" data-level={conf.level} title={title}>
      <small className={CLASS[conf.level]}>{sealLabel(conf.level)}</small>
      {withReasons && conf.reasons.map((r) => <small key={r.code} className="muted">{r.text}</small>)}
    </span>
  );
}
