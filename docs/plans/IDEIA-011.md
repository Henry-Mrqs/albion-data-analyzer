# IDEIA-011 — Tendência e médias (janelas 14 e 29 dias, configuráveis): plano

> **Para o Executor:** `superpowers:executing-plans` ou `subagent-driven-development`. Branch de integração (D-070). `npm` em `client/`. Teste visto falhar antes de implementar; nenhum `*.test.jsx` com `usePersisted('chave'` literal (use `seed()`). **Pré-requisitos:** IDEIA-089 (divisor por dias cobertos), 005 (auditor), 010 (`history.js`, `liquidity.js`). Dossiê: `docs/research/IDEIA-011.md`. **D-068:** janelas configuráveis, padrão **14 e 29 dias** (não 30).

**O que entrega:** cartão "Tendência" no Mercado (item aberto) com preço atual × mediana, tendência de preço e de volume (janela recente × janela anterior de mesmo tamanho) e gráfico simples em SVG. Sem chamada nova de API: a série completa já vem de `fetchHistory`. **Fórmulas** (dossiê §2, "produto"): `vol(W)=Σn/dias cobertos (089)`; `mediana(W)` dos `avg_price`; `tendência = recente/anterior − 1`; `desvio = preço_atual/mediana(W_longa) − 1`, alerta a partir de `PRICE_ABOVE_MEDIAN_WARN` = +20% (constante existente, "regra do app"). A mediana, não a média, é a referência (H4: média sofre com venda atípica).

**Janelas.** Curta `S` (padrão **14**, faixa **3–14**) e longa `L` (padrão **29**, faixa **15–29**); `S ≤ 14` porque a janela anterior precisa caber nos ~29 dias da API (`HISTORY_API_DAYS`). Faixas e padrões são decisão de produto, rotulados "regra do app". Campo salvo novo: **`trend:cfg`** `{ short: numText, long: numText }`.

## Arquivos
**Cria:** `client/src/lib/trend.js` + `trend.test.js` (puro: `trendStats`, `cleanTrendCfg`), `client/src/components/TrendCard.jsx` + `TrendCard.test.jsx`, **Altera:** `client/src/lib/liquidity.js` (só `export` de `median`; **089 já alterou `windowStats`**), `client/src/components/Market.jsx` (monta o cartão; histórico sob demanda), `client/src/lib/persistSchemas.js` (+`trend:cfg`), `client/src/lib/persistSchemas.test.js` (mapa `FILES` ganha `'TrendCard.jsx': 'trend:cfg'`), `client/src/test/savedStates.js` (`CURRENT_DEFAULTS` + 3 estados salvos), `client/src/lib/audit/tabs.js` (da 086: Mercado continua "sem auditor", mas `trend:cfg` entra em `UNAUDITED` com motivo, ver Auditor).
**Conflitos:** `liquidity.js` com 089 (vai antes) e 012 (também exporta `median`: o `export` é idempotente, quem chegar depois não faz nada); `Market.jsx` com 036 (aba/sub-seção do Mercado Negro): **011 antes da 036**; `persistSchemas.js` com todas as ideias de campo novo (merge trivial, linhas distintas).

## Interfaces
```js
// trend.js (puro)
export const TREND_DEFAULTS = { short: 14, long: 29 };
export const TREND_RANGE = { short: [3, 14], long: [15, 29] };
cleanTrendCfg(cfg) -> { values: { short, long }, issues: [{ field, level:'warn', msg }] }   // vazio/ausente = padrão sem aviso; fora da faixa/lixo/objeto = padrão COM aviso, sem eco de objeto; "14,5" → 14? NÃO: não inteiro = padrão com aviso
trendStats(series, { now, short, long }) -> {
  cur: windowStats(series,{now,days:short}), prev: windowStats(series,{now: now − short·DAY, days:short}),
  long: windowStats(series,{now,days:long}),
  priceTrend: number|null, volumeTrend: number|null,       // null se cur ou prev tem points < MIN_POINTS_IN_WINDOW ou mediana/volume anterior ≤ 0
  state: 'ok' | 'sparse' | 'nodata' | 'unloaded'
}
// TrendCard.jsx props: { series, price, now, cfg, setCfg }  (price = preço atual de referência do Mercado, null = sem alerta)
```

## Task 1: `trendStats` e `cleanTrendCfg` (project `logic`)
**Files:** Create `trend.test.js`, `trend.js`; Modify `liquidity.js` (`export` de `median`).
- [ ] **Step 1: testes falhando.** **Caso real do dossiê §4** (T4_MAIN_SWORD, Black Market, q1, West; `now = Date.parse('2026-11-19T12:00:00Z')`, `short: 7`, `long: 14`): semana atual 12–18/11 `[n,p]` = `[186,9586] [322,9937] [287,10662] [334,10717] [340,9481] [201,10920] [183,10790]`; anterior 5–11/11 = `[284,8248] [278,8217] [412,8299] [401,8481] [222,8457] [250,10876] [228,10396]`. Esperado (recalculado com `node -e`): `cur`: soma 1.853, vol/dia **264,7143**, mediana **10.662**; `prev`: soma 2.075, vol/dia **296,4286**, mediana **8.457**; `volumeTrend` = 1853/2075 − 1 = **−0,10699** (−10,7%); `priceTrend` (mediana) = 10662/8457 − 1 = **+0,26073** (+26,1%); média simples 72.093/7 = 10.299 contra 62.974/7 = 8.996,29 → **+14,5%** (só informação, prova que mediana ≠ média); média ponderada atual 10.261,85. Preço atual 10.854 contra a mediana de 7 d (10.662) = **+1,8%** (sem alerta) e contra a mediana de 29 d (**8.248**) = **+31,6%** (alerta ≥ 20%): a janela muda o veredito. Casos extras:
```js
it('padrão 14/29 com série sintética de 29 pontos (21/10–18/11): anterior (22/10–4/11) n=100,p=1000; recente (5/11–18/11) n=120,p=1200 → volumeTrend +0,2 e priceTrend +0,2; o ponto de 21/10 (n=100,p=1000) fica fora das duas janelas', () => {});
it('série com < 3 pontos numa das janelas → priceTrend e volumeTrend null, state sparse (nunca tendência com 2 pontos)', () => {});
it('série [] → nodata; undefined → unloaded; ambos sem exceção', () => {});
it('anterior com volume 0 → volumeTrend null (nunca Infinity)', () => {});
it('cleanTrendCfg: {} e undefined → 14/29 sem aviso; short "20" → 14 com aviso (fora de 3–14); long "10" → 29 com aviso (fora de 15–29); "abc", [], {a:1}, true → padrão com aviso e a mensagem NÃO contém "[object Object]"; short "7" e long "20" → aceitos', () => {});
```
- [ ] **Step 2:** `npx vitest run --project logic src/lib/trend.test.js` → FAIL. **Step 3:** implementar (reusar `windowStats`/`median`; **nenhuma** fórmula de janela reescrita). **Step 4:** PASS; `npm run test:logic`. **Step 5: Commit** `feat: trendStats e janelas configuráveis 14/29 (IDEIA-011)`.
- Mutações: tendência com média no lugar de mediana; janela anterior = mesma da atual; sem checar `points`; divisão sem proteção (Infinity); faixa da janela curta aceitando 15.

## Task 2: campo salvo `trend:cfg` (`persistSchemas.js`)
**Files:** Modify `persistSchemas.js`, `persistSchemas.test.js`, `src/test/savedStates.js`.
- [ ] **Step 1: testes falhando** (`persistSchemas.test.js` e o teste de estados salvos existente varrem `PERSISTED` × `SAVED_STATES`): estado atual `{ short: '14', long: '29' }`; número no lugar de texto `{ short: 14, long: 29 }`; lixo `{ short: 'abc', long: {} }`; `null`. Nenhum resulta em exceção; lixo cai no padrão. **Step 2:** FAIL (chave desconhecida). **Step 3:** `'trend:cfg': { version: 1, migrations: {}, schema: { short: 'numText', long: 'numText' } }`; `CURRENT_DEFAULTS['trend:cfg'] = { short: '14', long: '29' }`. **Step 4:** PASS. **Step 5: Commit** `feat: trend:cfg no esquema salvo (IDEIA-011)`.

## Task 3: `TrendCard.jsx` e ligação no Mercado
**Files:** Create `TrendCard.test.jsx`, `TrendCard.jsx`; Modify `Market.jsx`.
- [ ] **Step 1: testes falhando** (project `ui`; `beforeEach(resetApp)`; `seed('trend:cfg', {short:'7', long:'14'})` quando precisar; **sem** `usePersisted('trend:cfg'` no teste). Usa a série do dossiê §4 e `now` fixo:
  1. mostra "Volume por dia: 264,7 (7 d) × 296,4 (7 d anteriores): −10,7%" e "Preço (mediana): 10.662 × 8.457: +26,1%";
  2. com `long: 14` (14 pontos do caso, mediana **9.761,5**): `price=10854` → desvio +11,2%, **sem** alerta; `price=12000` → +22,9% e aviso "O preço atual (12.000) está 23% acima da mediana de 14 dias (9.762)" (limiar 20%); com a série de 29 dias do dossiê a mediana é 8.248 e 10.854 dá +31,6% (use como teste de `trendStats`, Task 1);
  3. série curta (2 pontos): "Dados insuficientes para tendência" e **nenhum** percentual;
  4. rótulo honesto fixo: "A API devolve cerca de 29 dias; janelas maiores não existem. Preço do dia e histórico têm origens diferentes (preço ao vivo × média do dia)." e a contagem de dias com dado ("N de M dias com dados");
  5. campos de janela: digitar 20 em "Janela curta" mostra o aviso de `cleanTrendCfg` e o cartão usa 14; salvar e remontar mantém;
  6. gráfico: `<svg role="img" aria-label="Preço médio diário e vendas por dia">` com 1 `<polyline>` e N barras = nº de pontos; série vazia = sem svg;
  7. sem eco de objeto/`NaN`/`Infinity` com `cfg` corrompido.
  Em `Market.jsx`: histórico **sob demanda** (botão "Carregar tendência", como o "Carregar giro" do Craft; nada automático; `useHistory(ids,{enabled})`), cidade = a do melhor comprador (`sellInstant`) ou seletor das 7 cidades; preço de referência = preço mostrado para essa cidade.
- [ ] **Step 2:** `npx vitest run --project ui src/components/TrendCard.test.jsx` → FAIL. **Step 3:** implementar `TrendCard` (apresenta; toda conta em `trend.js`) e montar em `Market.jsx` abaixo do cartão de preços. **Step 4:** PASS; `npm run check`. **Step 5: Commit** `feat: cartão Tendência no Mercado (IDEIA-011)`.
- Mutações: média no lugar da mediana na linha de preço; rótulo "30 dias"; alerta com limiar errado; botão que busca sem clique; janela curta gravando valor fora da faixa.

## Auditor (IDEIA-005, contrato `registerScreen`)
O Mercado **não** tem tela registrada no auditor (v1 = Craft/Refino/RRR, D-059; a 086 passa a exigir justificativa explícita). Portanto: em `lib/audit/tabs.js` (criado pela 086) a aba Mercado segue `{ screen: null, reason: '...' }` e `trend:cfg` entra em `UNAUDITED` com o motivo "Tendência é informativa: não muda lucro de nenhuma tela; as janelas aparecem no próprio cartão". **Se a 086 ainda não entrou, o contrato atual não vigia `trend:cfg` (só craft/refine/rrr/target): nada a registrar.** O Craft não ganha o cartão nesta ideia, então não há linha nova no auditor do Craft. Variável não modelada: "tendência futura / previsão" não é prometida (texto do cartão: "histórico, não previsão").

## Como o Tester valida
Números do dossiê (−10,7%, +26,1%, +14,5% só informativo, 264,71, 296,43, +31,6%, +1,8%); janelas 14/29 padrão; < 3 pontos sem percentual; estado salvo antigo/corrompido de `trend:cfg` (3 formatos) × a aba Mercado sem tela branca; rótulo "~29 dias" presente; nenhum botão busca sem clique; limite `HISTORY_MAX_REQUESTS` respeitado; 375 px sem rolagem horizontal da página.

## Riscos
1. Série curta (qualidade 3–5, item raro): `sparse`, sem tendência. 2. Preço ao vivo × média do dia: comparação aproximada (dito na tela). 3. O limite de ~29 dias foi observado em uma chamada (West, Black Market/Caerleon): NÃO VERIFICADO em East/Europe (dito no rodapé do cartão). 4. Outliers: mediana por padrão; contagem do dia (item_count 2–4) é frágil e aparece.

## PERGUNTAS PARA O GERENTE
1. O gráfico fica só no Mercado (item aberto); o Craft ganha o cartão numa ideia à parte (arquivo quente `Crafting.jsx`). Aceita?
2. Faixas 3–14 (curta) e 15–29 (longa) são decisão de produto (limite físico = ~29 dias da API). Aceita?
