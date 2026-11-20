// IDEIA-059: cartão "Ordem de venda: atualizações". Só apresenta: a conta vem de lib/relist.js.
import { fmt } from '../lib/econ';
import InputIssues from './InputIssues';
import { Field, NumberInput } from './ui';

const BASES = [
  { value: 'price', label: 'Sobre o preço novo (suposição do app)' },
  { value: 'diff', label: 'Sobre a diferença de preço' },
];
const dec = (n) => (Number.isFinite(n) ? n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : fmt(n));

/**
 * cfg/set/issues da tela (campos relists, relistStep, relistBase); applies = a melhor saída é ordem de venda com imposto;
 * listings = atualizações + 1; setupTotal e relistCost = taxa de criação acumulada e parte das atualizações, no lote.
 */
export default function OrderLifeCard({ cfg, set, issues, applies, listings, setupTotal, relistCost }) {
  const updates = listings - 1;
  return (
    <div className="card stack" data-testid="order-life">
      <h2>Ordem de venda: atualizações</h2>
      <div className="hint">
        Cada vez que você atualiza o preço de uma ordem de venda, o jogo cobra a taxa de criação (2,5%) de novo; cancelar não devolve a taxa. Informe quantas atualizações espera fazer até vender.
        Vale só para saídas em “Ordem de venda”: não vale para ordem de compra na hora nem para saídas marcadas “Sem imposto”.
      </div>
      <div className="cols-2">
        <Field label="Atualizações da ordem (relistagens)">
          <NumberInput small step="1" value={cfg.relists ?? ''} onChange={(v) => set({ relists: v })} placeholder="0" />
          <InputIssues issues={issues} field="relists" />
        </Field>
        <Field label="Queda de preço por atualização (prata)" hint="Sua ordem começa acima do preço de venda mostrado: preço inicial = preço de venda + atualizações × queda. Vazio = 0 (todas as taxas sobre o mesmo preço).">
          <NumberInput step="1" value={cfg.relistStep ?? ''} onChange={(v) => set({ relistStep: v })} placeholder="0" />
          <InputIssues issues={issues} field="relistStep" />
        </Field>
      </div>
      <Field label="Base da taxa na atualização" hint="Como o jogo calcula a taxa de uma atualização NÃO foi confirmado em fonte. Para conferir: liste 1 item a 1.000 (taxa 25) e atualize para 990; se cobrar 24,75 a base é o preço novo, se cobrar 0,25 é a diferença.">
        <select className="input" value={cfg.relistBase ?? 'price'} onChange={(e) => set({ relistBase: e.target.value })}>
          {BASES.map((b) => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>
        <InputIssues issues={issues} field="relistBase" />
      </Field>
      {updates > 0 && applies && (
        <div className="hint" data-testid="order-life-summary">
          {listings} listagens: taxa de criação acumulada {dec(setupTotal)} no lote, dos quais {dec(relistCost)} são das atualizações.
        </div>
      )}
      {updates > 0 && !applies && (
        <div className="hint warn" data-testid="order-life-summary">A melhor saída não é uma ordem de venda com imposto: as atualizações não se aplicam a ela.</div>
      )}
      <div className="hint">
        Considera o lote inteiro numa única ordem. Não considera a duração/expiração da ordem nem vendas parciais (sem fonte). O cartão Preço-alvo tem a sua própria estimativa de relistagens e não usa este campo.
      </div>
    </div>
  );
}
