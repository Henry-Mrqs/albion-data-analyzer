# IDEIA-054 — "Vale pagar Premium?": ponto de equilíbrio com o preço do ouro: plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-054`, a partir da `master` atual. Comandos `npm` em `client/`. **Pré-requisitos (já na `master`):** 002 (`focusConsts.js`: `DAILY_FOCUS_PREMIUM`), 060 (`inputRules.js`), 069, 070, 071 (`App.jsx` com limite de erro por aba). **Regras do briefing:** teste escrito, **executado e visto falhar** antes de implementar; **nenhum `*.test.jsx` pode conter `usePersisted('chave'` literal** (use `seed()` de `src/test/ui.js`); chave nova de `usePersisted` entra em `persistSchemas.js`, em `savedStates.js` (`CURRENT_DEFAULTS`) e na lista de chaves de `persistSchemas.test.js` no mesmo commit; todo teste de tela tem caso "estado antigo salvo" e "estado corrompido"; a tela diz com honestidade o que entra e o que **não** entra no cálculo.

**Dossiê:** `docs/research/IDEIA-054.md`. **Fonte de cada regra:** P1 (Premium 30 dias = **3.750 ouro**) MÉDIA, muda por patch: **constante editável e datada** (consulta 2026-11-18, AO Refinery e busca da wiki; fonte secundária); P2/P7 (benefícios; o que a AO Refinery não conta) MÉDIA; P3 (API `stats/gold`, `[{price, timestamp}]`) ALTA (observado); P4 (custo = 3.750 × ouro) ALTA; P5 (imposto 8% − 4% sobre o volume vendido; o setup fee não muda) MÉDIA-ALTA, derivado de `salesTax()`; P6 (foco 10.000/dia × 30 × prata por ponto, só se usar) MÉDIA; P8 (conclusões divergentes) é opinião: **o app não recomenda compra**. Nenhuma fórmula nova além de `saldo = 0,04·V + foco·30·s − 3.750·G` do dossiê; **decisão de produto:** o foco usado por dia é um campo (padrão 10.000) em vez de supor uso total.

**Conferência do dossiê (recalculado com `node -e`):** custo 35.302.500, imposto 800.000, foco 12.900.000, saldo **−21.602.500**, V* (s = 43) **560.062.500**, V* (s = 6,78) **831.712.500**: todos conferem.

**Problema:** o app só tem o interruptor Premium (imposto 4% × 8%). O jogador não tem como saber se o Premium se paga em prata.

**Objetivo:** nova aba **"Premium"** com preço do ouro (busca na API ou digitado), custo em prata, economia de imposto, valor do foco, saldo de 30 dias e **volume de vendas de equilíbrio**, mais a lista do que **não** é contado. Sem recomendação.

**Arquitetura:** `lib/premium.js` (puro, sem rede), `lib/gold.js` (URL, parser e busca com cache de 3 min, reaproveitando `request()` de `market.js`, como `history.js`: o 429 é compartilhado e `market.js` **não** muda), `components/Premium.jsx` (aba, lazy). A diferença de imposto vem de `salesTax(false) − salesTax(true)`; o foco do Premium de `DAILY_FOCUS_PREMIUM`.

## Arquivos: exclusivos, compartilhados, ordem
**Criados:** `client/src/lib/premium.js`, `premium.test.js`, `client/src/lib/gold.js`, `gold.test.js`, `client/src/components/Premium.jsx`, `Premium.test.jsx`, `client/src/App.premium.test.jsx`.
**Alterados:** `client/src/App.jsx` (entrada em `TABS` e `lazy`), `client/src/lib/persistSchemas.js` (chave `premium:cfg`), `client/src/lib/persistSchemas.test.js` (lista de chaves usadas: 9; `Premium.jsx` na lista `FILES` do contrato de `set({...})`), `client/src/test/savedStates.js` (`CURRENT_DEFAULTS['premium:cfg']` e 3 entradas de `SAVED_STATES`), `client/src/lib/inputRules.js` (só `export` de `br`/`echoValue`, se ainda não).
**NÃO toca:** `Crafting.jsx`, `Refining.jsx`, `Flipper.jsx`, `market.js`, `settings.js`, `econ.js`, `focus.js`, `index.css` (usa classes existentes).
**Conflitos:** `persistSchemas.js` (bloco novo, textual trivial) com 059/065; `App.jsx` com a 077 (que troca o import de `migrationNotes`: linhas distantes). **Independente da 059/065: pode ir em paralelo ou antes.**

## Interfaces
```js
// premium.js (puro)
export const PREMIUM = { goldCost: 3750, days: 30, asOf: '2026-11-18', source: 'AO Refinery (aorefinery.com/gold) e trecho da wiki; fonte secundária, pode mudar por patch' }
export const TAX_SAVING = salesTax(false) - salesTax(true)        // 0,04, derivado de econ.js
export const NOT_COUNTED = [ ...textos da P7 ]                     // lista exibida na tela
cleanPremiumInputs(cfg) -> { values: { gold, goldCost, volume, silverPerFocus, focusPerDay }, issues }
  // cfg.gold|goldCost|volume|silverPerFocus|focusPerDay (texto digitado). gold: > 0 ou null (ausente); goldCost: >= 0, vazio = PREMIUM.goldCost;
  // volume e silverPerFocus: >= 0, vazio = 0; focusPerDay: >= 0, vazio = DAILY_FOCUS_PREMIUM; teto MAX_QTY 1e9 (volume: 1e15); lixo -> padrão + aviso (sem eco de objeto)
premiumBalance(values) -> { state: 'nogold' | 'ok', cost, taxSaving, focusValue, balance, breakEven, paysAlone }
  // cost = goldCost*gold; taxSaving = TAX_SAVING*volume; focusValue = focusPerDay*days*silverPerFocus; balance = taxSaving+focusValue-cost
  // breakEven = volume V* em que balance = 0: (cost - focusValue)/TAX_SAVING; se cost - focusValue <= 0: breakEven 0 e paysAlone true
// gold.js
parseGold(rows) -> { price, t } | null          // último ponto por timestamp; price número finito > 0; ignora ruim; rows não array -> null
goldUrl(server, count = 1)
fetchGold({ server, signal, now, requestFn }) -> { price, t }   // cache de 3 min por servidor; erros repassados como estão (MarketError)
useGold() -> { gold, loading, error, refresh }
```

## Mensagens (texto final, em português)
**Título:** "Vale pagar Premium?". **Introdução:** "Compara, em prata, o que o Premium de 30 dias custa com o que ele economiza de imposto e de foco. É uma conta de economia de jogo, não uma recomendação." **Campos:** "Preço do ouro (prata por ouro)" com o botão "Usar o preço atual ({preço} · {idade})" e o texto de erro da API quando falha ("você pode digitar o preço"); "Custo do Premium de 30 dias (ouro)" com a dica "Padrão {3.750}, conferido em 2026-11-18 em fonte secundária (AO Refinery). Pode mudar por patch: confira no jogo e edite."; "Prata vendida no mercado por mês" com a dica "Soma dos preços de venda (antes do imposto) das vendas que passam pelo mercado em 30 dias. Vazio = 0."; "Prata por ponto de foco" com a dica "Veja ‘Prata por ponto de foco’ no cartão Foco do Craft ou do Refino. Vazio = 0."; "Foco do Premium que você usa por dia" com a dica "Padrão {10.000} (oferta diária do Premium). Só conta o foco que você realmente gasta." **Resultado:** linhas "Custo do Premium", "Imposto economizado (4 pontos de diferença sobre o volume)", "Valor do foco", "Saldo em 30 dias" e "Volume de vendas de equilíbrio" (frase: "O Premium empata, só com imposto e foco, vendendo cerca de {V*} de prata por mês no mercado."). Com `paysAlone`: "O valor do foco que você informou, sozinho, já cobre o custo do Premium." Sem ouro: "Informe o preço do ouro para calcular." **Rodapé fixo:** "Não conta: +50% de prata e saque de monstros, fama extra, pontos de aprendizado, +50% de rendimento de coleta, ilhas e animais (lista da fonte). O resultado é só imposto + foco − custo. Fontes divergem sobre se os demais benefícios compensam; o app não recomenda a compra."

## Tasks (1 commit cada; teste primeiro e visto falhar; cada passo tem comando e saída esperada)

### Task 1: `premium.js` (puro, project `logic`)
**Files:** Create `premium.test.js`, `premium.js`; Modify `inputRules.js` (exports, se ainda não).
- [ ] **Step 1: testes falhando** (exemplo da AO Refinery, dossiê §4):
```js
it('TAX_SAVING = 0,04 (derivado de salesTax) e PREMIUM.goldCost 3750, days 30, asOf "2026-11-18"', () => {});
it('G 9.414, V 20.000.000, s 43, foco 10.000: cost 35.302.500, taxSaving 800.000, focusValue 12.900.000, balance −21.602.500', () => {});
it('breakEven (s 43) = 560.062.500; com s 6,78: focusValue 2.034.000 e breakEven 831.712.500', () => {});
it('G 9.411: cost 35.291.250; G 10.000: breakEven (s 43) = 615.000.000', () => {});
it('foco usado 5.000/dia, s 43: focusValue 6.450.000 e breakEven 721.312.500', () => {});
it('paysAlone: s 120 -> focusValue 36.000.000 > cost: breakEven 0, paysAlone true, balance com V 0 = +697.500', () => {});
it('V vazio (0), s 43: balance −22.402.500; V 5e8: −2.402.500', () => {});
it('sem ouro (null/0/negativo/NaN): state "nogold", sem NaN nem ∞ em nenhum campo', () => {});
it('goldCost editado (3.000, G 9.414): cost 28.242.000; goldCost vazio usa 3.750; goldCost 0 é aceito (cost 0, paysAlone true)', () => {});
it('cleanPremiumInputs: tudo vazio/undefined -> padrões sem aviso (estado antigo); "abc", -5, NaN com aviso e padrão; "1e300" volume -> teto com aviso; { }, [1], null não aparecem ecoados; cfg null/array/texto -> padrões sem lançar', () => {});
it('volume enorme (1e15 no teto) não gera Infinity em balance/breakEven', () => {});
```
- [ ] **Step 2:** `npx vitest run --project logic src/lib/premium.test.js` → FAIL. **Step 3:** implementar (dividir por `TAX_SAVING`, nunca por literal 0,04; `focusPerDay` padrão de `DAILY_FOCUS_PREMIUM`). **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: premium.js, saldo e ponto de equilíbrio do Premium (IDEIA-054)`.
- Mutações: `0,04` escrito à mão; `days` 31; esquecer `focusPerDay` (usar 10.000 fixo); `<` no lugar de `<=` em `paysAlone`; V* sem subtrair o foco; custo sem `goldCost` editável.

### Task 2: `gold.js` (project `logic`)
**Files:** Create `gold.test.js`, `gold.js`.
- [ ] **Step 1: testes falhando** (linhas reais do dossiê P3):
```js
it('goldUrl: https://west.albion-online-data.com/api/v2/stats/gold?count=1; europe e east; count 3', () => {});
it('parseGold com [{price:9416,timestamp:"2026-11-17T23:00:00"},{price:9414,"…T00:00:00"},{price:9411,"2026-11-18T01:00:00"}] (qualquer ordem) -> { price: 9411, t: Date.UTC(2026,10,18,1) }', () => {});
it('parseGold: price 0, negativo, NaN, texto, ausente e timestamp inválido são ignorados; só lixo -> null; rows null/objeto/texto -> null; linha null no meio não lança', () => {});
it('fetchGold usa requestFn injetado com a URL e o rótulo "ouro"; segunda chamada em < 3 min não faz requisição; depois de 3 min faz; servidor diferente não compartilha o cache; erro do requestFn é repassado e NÃO entra no cache', () => {});
it('resposta vazia ([]) -> erro claro "A API não devolveu o preço do ouro" (não retorna preço 0)', () => {});
```
- [ ] **Step 2:** FAIL. **Step 3:** implementar como `history.js` (`goldDeps = { requestFn: request }`, `clearGoldCache()` exportado para testes). **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: gold.js, preço do ouro da API (IDEIA-054)`.
- Mutações: pegar o primeiro da lista em vez do mais recente; aceitar price 0; cache sem servidor na chave; TTL 30 min; cachear erro.

### Task 3: aba `Premium.jsx` e ligação no app
**Files:** Create `Premium.test.jsx`, `Premium.jsx`, `App.premium.test.jsx`; Modify `App.jsx`, `persistSchemas.js`, `persistSchemas.test.js`, `savedStates.js`.
- [ ] **Step 1: testes falhando** (project `ui`; `beforeEach(resetApp)`; `vi.mock('../lib/gold', async (orig) => ({ ...(await orig()), useGold: goldHook }))`; estado semeado com `seed('premium:cfg', …)`; padrão `{ gold: '', goldCost: '', volume: '', silverPerFocus: '', focusPerDay: '' }`):
```js
it('estado antigo/limpo (sem premium:cfg): abre, mostra "Informe o preço do ouro" e o rodapé "Não conta:" com a lista; nada de recomendação ("compre"/"não compre" ausentes)', () => {});
it('gold 9414, volume 20000000, s 43: mostra 35.302.500, 800.000, 12.900.000, saldo −21.602.500 e equilíbrio 560.062.500', () => {});
it('botão "Usar o preço atual (9.411 · …)" copia o preço da API para o campo e grava gold em premium:cfg; a API não preenche sozinha o campo digitado', () => {});
it('erro da API (throttle): mostra a mensagem e a aba continua utilizável digitando o ouro', () => {});
it('API devolve null (sem preço): sem botão, texto "digite o preço"', () => {});
it('custo editado (3.000) muda o resultado; a dica mostra "3.750" e "2026-11-18"', () => {});
it('paysAlone: s 120 mostra a frase "já cobre o custo" e NÃO mostra volume negativo', () => {});
it('estado corrompido: gold "abc" -> aviso "não é um número" sob o campo e "Informe o preço do ouro"; volume {} ou null salvo (descartado no carregamento) -> sem aviso e sem exceção; premium:cfg inteiro null/[]/texto -> padrões; números enormes mostram "valor enorme", nunca ∞/NaN', () => {});
it('digitar grava em premium:cfg (campos gold, volume...) e remontar mantém os valores', () => {});
// App.premium.test.jsx: #premium abre a aba "Premium" (botão na barra), as 5 abas antigas continuam; aba Premium que lança fica contida no limite de erro por aba (cabeçalho e abas intactos)
```
- [ ] **Step 2:** `npx vitest run --project ui src/components/Premium.test.jsx src/App.premium.test.jsx src/lib/persistSchemas.test.js` → FAIL. **Step 3:** `persistSchemas.js`: `'premium:cfg': { version: 1, migrations: {}, schema: { gold: 'numText', goldCost: 'numText', volume: 'numText', silverPerFocus: 'numText', focusPerDay: 'numText' } }`; `persistSchemas.test.js`: acrescentar `'premium:cfg'` à lista de chaves usadas e `'Premium.jsx': 'premium:cfg'` ao `FILES` do contrato de `set`; `savedStates.js`: `CURRENT_DEFAULTS['premium:cfg']` (literal idêntico ao do componente) e 3 entradas de `SAVED_STATES` (`current: true` vazio de campos; texto lixo; campos como número) para o teste de histórico de formatos; `Premium.jsx` (lazy em `App.jsx`, ícone `Coins` de `lucide-react`, `{ id: 'premium', label: 'Premium' }` no fim de `TABS`). **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: aba Premium, vale pagar? (IDEIA-054)`.
- Mutações: botão "Usar" que preenche sozinho ao abrir; saldo sem o foco; rodapé "Não conta" removido; chave fora do esquema; lixo no ouro virando 0 sem aviso.

### Task 4: conferência manual (sem commit)
- [ ] 375 px com 6 abas: a barra de abas não rola a página na horizontal nem corta "Premium" (se cortar, parar e perguntar: ver pergunta 3). API real: preço do ouro aparece com idade. Estado antigo: sem `albion:premium:cfg`. **Conferir `location.port` antes de gravar em `localStorage`.**

## Review Focus
1. API do ouro fora do ar, em throttle ou vazia: aba continua útil (Tasks 2-3). 2. Foco muito valioso (V* ≤ 0): `paysAlone`, nunca volume negativo (Task 1). 3. Números gigantes: "valor enorme" (Task 3). 4. Constante 3.750 mudar por patch: editável e datada (Task 3). 5. Texto parecer conselho de compra: teste de ausência (Task 3).

## Como o Tester valida
1. Casos do dossiê (saldo, V* com s = 43 e 6,78) com oráculo próprio; API real (`stats/gold?count=1`) conferida contra a AO Refinery no mesmo dia. 2. Mutações das Tasks. 3. Estado antigo e corrompido; seis abas a 375 px. 4. O que um usuário estranharia: preço do ouro preenchido sem pedir; número sem unidade ("prata") ou sem a lista do que não é contado; conclusão do app ("vale"/"não vale").

## Riscos
1. 3.750 ouro e a lista de benefícios vêm de fonte secundária e mudam por patch (editável e datado). 2. Sexta aba aperta a barra no celular. 3. `V` é entrada do usuário (sem histórico de vendas no app): resultado é tão bom quanto a estimativa.

## Critério de pronto
`npm run check` verde sem alterar teste existente (exceto a lista de chaves de `persistSchemas.test.js`); mutações derrubadas; só os arquivos listados; chave nova nos três lugares; conferência registrada.

## PERGUNTAS PARA O GERENTE
1. **Aba nova ou cartão** (dossiê aceita "cabeçalho ou aba")? O plano usa aba (6ª).
2. **Foco usado por dia** como campo (padrão 10.000) em vez de supor uso total: aprova esta decisão de produto?
3. Se a sexta aba não couber a 375 px: aceita ícone sem rótulo ou mover para o rodapé?
4. O texto de "não recomendação" basta, ou quer remover o campo de equilíbrio em frases ("empata vendendo cerca de…") e deixar só a tabela?
5. O preço do ouro vem do **servidor escolhido no cabeçalho** (cada servidor tem o seu): confirma?

## Adendo D-059: auditor (IDEIA-005) e ordem
A aba Premium **não registra tela** no auditor (não calcula lucro de item); a 005 não a cobre na v1. Ordem sugerida do conjunto: **005 → 059 → 065 → 012**, com a **054 independente** (pode ir em paralelo a qualquer uma: só toca `App.jsx`, `persistSchemas.js` e arquivos novos).
