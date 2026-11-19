import { usePersisted } from '../lib/settings';
import { fmt } from '../lib/econ';
import { ageLabel } from '../lib/market';
import { useGold } from '../lib/gold';
import { DAILY_FOCUS_PREMIUM } from '../lib/focusConsts';
import { NOT_COUNTED, PREMIUM, cleanPremiumInputs, premiumBalance } from '../lib/premium';
import InputIssues from './InputIssues';
import { Banner, Field, Money, NumberInput } from './ui';

export default function Premium() {
  const [cfg, setCfg] = usePersisted('premium:cfg', { gold: '', goldCost: '', volume: '', silverPerFocus: '', focusPerDay: '' });
  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));
  const { gold: api, loading, error, refresh } = useGold();

  const { values, issues } = cleanPremiumInputs(cfg);
  const res = premiumBalance(values);

  return (
    <div className="grid-2">
      <div className="card stack">
        <h2>Vale pagar Premium?</h2>
        <p className="muted">
          Compara, em prata, o que o Premium de 30 dias custa com o que ele economiza de imposto e de foco. É uma conta de economia de jogo, não uma recomendação.
        </p>

        <Field label="Preço do ouro (prata por ouro)">
          <NumberInput value={cfg.gold} placeholder="ex.: 9414" onChange={(v) => set({ gold: v })} />
          <div className="row between">
            {api ? (
              <button type="button" className="btn sm" onClick={() => set({ gold: String(api.price) })}>
                Usar o preço atual ({fmt(api.price)} · {ageLabel(api.t)})
              </button>
            ) : (
              <span className="hint">{loading ? 'Buscando o preço do ouro…' : error ? '' : 'A API não trouxe o preço do ouro: digite o preço.'}</span>
            )}
            <button type="button" className="btn ghost sm" onClick={refresh} disabled={loading} title="Buscar o preço do ouro de novo">
              Atualizar
            </button>
          </div>
          {error && (
            <Banner kind="err" title="Não foi possível buscar o preço do ouro">
              {error} Você pode digitar o preço.
            </Banner>
          )}
          <InputIssues issues={issues} field="gold" />
        </Field>

        <Field
          label="Custo do Premium de 30 dias (ouro)"
          hint={`Padrão ${fmt(PREMIUM.goldCost)}, conferido em ${PREMIUM.asOf} em fonte secundária (AO Refinery). Pode mudar por patch: confira no jogo e edite.`}
        >
          <NumberInput value={cfg.goldCost} placeholder={String(PREMIUM.goldCost)} onChange={(v) => set({ goldCost: v })} />
          <InputIssues issues={issues} field="goldCost" />
        </Field>

        <Field label="Prata vendida no mercado por mês" hint="Soma dos preços de venda (antes do imposto) das vendas que passam pelo mercado em 30 dias. Vazio = 0.">
          <NumberInput value={cfg.volume} placeholder="0" onChange={(v) => set({ volume: v })} />
          <InputIssues issues={issues} field="volume" />
        </Field>

        <Field label="Prata por ponto de foco" hint="Veja ‘Prata por ponto de foco’ no cartão Foco do Craft ou do Refino. Vazio = 0.">
          <NumberInput value={cfg.silverPerFocus} placeholder="0" step="any" onChange={(v) => set({ silverPerFocus: v })} />
          <InputIssues issues={issues} field="silverPerFocus" />
        </Field>

        <Field
          label="Foco do Premium que você usa por dia"
          hint={`Padrão ${fmt(DAILY_FOCUS_PREMIUM)} (oferta diária do Premium; padrão do app, não confirmado). Só conta o foco que você realmente gasta.`}
        >
          <NumberInput value={cfg.focusPerDay} placeholder={String(DAILY_FOCUS_PREMIUM)} onChange={(v) => set({ focusPerDay: v })} />
          <InputIssues issues={issues} field="focusPerDay" />
        </Field>
      </div>

      <div className="stack">
        <div className="card stack">
          <h2>Resultado</h2>
          {res.state === 'nogold' ? (
            <Banner>Informe o preço do ouro para calcular.</Banner>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <tbody>
                    <tr>
                      <td>Custo do Premium</td>
                      <td className="num">{fmt(res.cost)} prata</td>
                    </tr>
                    <tr>
                      <td>Imposto economizado (4 pontos de diferença sobre o volume)</td>
                      <td className="num">{fmt(res.taxSaving)} prata</td>
                    </tr>
                    <tr>
                      <td>Valor do foco</td>
                      <td className="num">{fmt(res.focusValue)} prata</td>
                    </tr>
                    <tr>
                      <td>
                        <b>Saldo em 30 dias</b>
                      </td>
                      <td>
                        <b>
                          <Money value={res.balance} signed /> prata
                        </b>
                      </td>
                    </tr>
                    <tr>
                      <td>Volume de vendas de equilíbrio</td>
                      <td className="num">{res.paysAlone ? 'não precisa de vendas' : `${fmt(res.breakEven)} prata por mês`}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {res.paysAlone ? (
                <div>O valor do foco que você informou, sozinho, já cobre o custo do Premium.</div>
              ) : (
                <div>O Premium empata, só com imposto e foco, vendendo cerca de {fmt(res.breakEven)} de prata por mês no mercado.</div>
              )}
              <span className="hint">Estimativa, com os números que você informou. Custo = {fmt(values.goldCost)} ouro × preço do ouro.</span>
            </>
          )}
        </div>

        <Banner kind="warn" title="O que este cálculo não conta">
          Não conta: {NOT_COUNTED.join(', ')} (lista da fonte). O resultado é só imposto + foco − custo. Fontes divergem sobre se os demais benefícios compensam; o app não recomenda a compra.
        </Banner>
      </div>
    </div>
  );
}
