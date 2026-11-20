// IDEIA-065: controles do preço de saída realista (interruptor, k e N). Só apresenta: a conta vem de lib/anchor.js.
import InputIssues from './InputIssues';
import { Field, NumberInput, Switch } from './ui';

/** cfg/set/issues da tela (campos anchorOn, anchorK, anchorDays); on = valor já limpo do interruptor. */
export default function AnchorControls({ cfg, set, issues, on }) {
  return (
    <div className="stack" data-testid="anchor-controls">
      <Switch
        label="Usar preço de saída realista (ordem de venda)"
        hint="Se o menor preço listado passa de k × a mediana dos preços médios diários dos últimos N dias completos, o lucro usa k × mediana. É uma regra do app, não do jogo: k = 1,25 e N = 7 são escolhas de produto, sem fonte. O teto pode esconder uma alta de preço real: desligue para ver o listado."
        checked={on}
        onChange={(v) => set({ anchorOn: v })}
      />
      <div className="cols-2">
        <Field label="k (teto = k × mediana)">
          <NumberInput small step="0.05" min={1} value={cfg.anchorK ?? ''} onChange={(v) => set({ anchorK: v })} placeholder="1,25" />
          <InputIssues issues={issues} field="anchorK" />
        </Field>
        <Field label="N (dias da mediana)">
          <NumberInput small step="1" min={3} value={cfg.anchorDays ?? ''} onChange={(v) => set({ anchorDays: v })} placeholder="7" />
          <InputIssues issues={issues} field="anchorDays" />
        </Field>
      </div>
      <InputIssues issues={issues} field="anchorOn" />
      <div className="hint">Mediana de preços médios diários (colaborativo); dia sem registro não conta; hoje fica de fora.</div>
    </div>
  );
}
