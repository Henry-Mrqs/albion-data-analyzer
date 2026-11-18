# IDEIA-066 — Aviso de saída ilusória (saída sem comprador real): plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-066`. Comandos `npm` em `client/`. **Pré-requisito:** IDEIA-001, 019, 023 e 030 mescladas (usa `computeCraft` com `options`, `TargetPrice.jsx` e `targetPrice.js` como estão nas branches aprovadas).

**Objetivo:** para cada saída (cidade + modo), dizer se existe **comprador real** (ordem de compra visível e recente) e marcar como **ilusória** a saída por ordem de venda sem nenhuma ordem de compra na cidade. A 066 passa a ser a **única fonte** da pergunta "esta saída tem comprador real?": o Craft usa para a tabela "Onde vender" e para o cartão de melhor destino, e o cartão **Preço-alvo (030)** a reutiliza em vez de comparar com o menor preço de venda global.

**Arquitetura:** módulo puro `lib/exits.js` (sem React, sem `fetch`), construído sobre `quote()` de `market.js` e sobre as mesmas regras que o Craft já aplica (instantânea = `buy_price_max`; ordem = `sell_price_min`, nunca no Black Market). Nenhuma mudança em `craftPlan.js`: o componente anota as `options` que `computeCraft` já devolve. Na 030, o bloco de referência de mercado troca `lowestListing` por `bestBuyer` (poucas linhas).

**Spec:** `docs/research/IDEIA-066.md` (§2 X1 a X7, regra de produto, §4 exemplo real `T4_MAIN_SWORD`, §5 encaixe) e `docs/manager/decisoes.md` D-019 item 1 + `docs/qa/IDEIA-030.md` observação 1 (aviso "difícil de vender" enganoso: poção T4, mínimo 1.275 em Caerleon, Martlock paga 3.796).

## Arquivos: exclusivos, compartilhados, ordem

**Exclusivos da 066:** `client/src/lib/exits.js` e `client/src/lib/exits.test.js` (novos).
**Compartilhados com a 060:** `client/src/components/TargetPrice.jsx` (066 troca o bloco de **referência de mercado** no fim do cartão: import, `market`, textos e o `Banner`; 060 mexe no topo: `relists`/`mode`) e `client/src/components/Crafting.jsx` (066: tabela "Onde vender" e cartão do melhor destino; 060: campos de entrada e avisos). Regiões distintas, sem dependência de lógica.
**NÃO toca:** `econ.js`, `craftPlan.js`, `targetPrice.js` (`lowestListing` fica no arquivo, sem uso; remoção opcional, pergunta 4), `market.js`, `Refining.jsx`, `Flipper.jsx`, `flip.js`, catálogo, fixture.
**Ordem recomendada 060 × 066:** 060 primeiro, mas **podem rodar em paralelo**; se sequenciais, nenhuma tarefa de uma depende da outra.

## Regras (dossiê §2 e regra de produto)

```
comprador(cidade)  = buy_price_max > 0 e dado fresco                  // X2: saída instantânea só existe com ordem de compra
fresco(date)       = date && (maxAgeH == 0 || now - date <= maxAgeH*3600000)    // mesma regra do Flipper (fresh()), maxAgeH padrão 24
saídas(cidade c):
  instantânea  se buy_price_max > 0                      -> buyer = true
  ordem        se sell_price_min > 0 e c != Black Market -> buyer = comprador(c); ilusória = !buyer   // X1: BM nunca tem ordem de venda útil
stale = !fresco(date)    // dado velho é aviso à parte, não "ilusória"
melhorComprador = maior buy_price_max fresco entre SELL_CITIES (inclui Black Market)
```
Fora de escopo (sem dado hoje): volume/dia (IDEIA-010; a coluna mostra "giro: sem dado"), qualidade (X5, X6), tempo de espera da ordem (X3, BAIXA).

## Interface (`exits.js`)

```js
export const DEFAULT_MAX_AGE_H = 24                      // decisão de produto: igual ao padrão do Flipper (não é dado do jogo)
cityBuyer(prices, mid, city, { now, maxAgeH }): { buyer: boolean, price: number, date: number|null, stale: boolean }
bestBuyer(prices, mid, { now, maxAgeH }): { price, city, date } | null          // mesmo formato de lowestListing
exitsFor(prices, mid, { now, maxAgeH }): Array<{ city, mode: 'instant'|'order', price, date, buyer, illusory, stale }>
annotateOptions(options, prices, mid, opts): options com { buyer, illusory, stale } (mesma ordem, sem mutar)
pickExit(options): { best, bestReal }      // best = options[0]; bestReal = primeira com !illusory e !stale
```
`now` entra por parâmetro (padrão `Date.now()`), para testes determinísticos.

## Onde aparece e UI

- **Craft, tabela "Onde vender":** nova coluna **"Comprador"** com "sim (ordem de compra 1.185)" ou "nenhum visível", e o selo **"ilusória"** nas linhas por ordem de venda sem comprador; "dado velho" quando passou do limite; linha em tom apagado quando ilusória. Nota fixa: "Giro (vendas/dia): sem dado".
- **Craft, cartão do melhor destino:** se o melhor lucro é uma saída ilusória, um aviso amarelo: "A melhor saída no papel (Caerleon, 12.000) não tem ordem de compra visível. Saída com comprador: Black Market, instantânea, lucro −2.386,67." O cartão não esconde o prejuízo.
- **Craft, cartão Preço-alvo:** a linha de referência passa a ser "Melhor comprador atual: 3.796 em Martlock (idade)" e o alerta só aparece quando o alvo está **acima do melhor comprador real**; sem nenhum comprador, uma nota informativa "Nenhum comprador (ordem de compra) visível para este item: só há ordens de venda" (sem alarme).
- Refino e Flipper: sem mudança (ver pergunta 1).

## Tasks (1 commit cada; testes primeiro)

### Task 1: `exits.js` (dossiê §4, exemplo real)
**Files:** Create `exits.test.js`, `exits.js`.
- [ ] **Step 1: testes falhando** (módulo inexistente). Preços do dossiê (API West, 2026-11-18 ~01:15 UTC; qualidade 1), com `now = 1_000_000_000_000` e `H = 3_600_000`, via `mkPrices`:

```js
const now = 1e12, H = 3.6e6;
const prices = mkPrices({ T4_MAIN_SWORD: {
  Caerleon: { s: 12000, sd: now - 14.5 * H },            // só ordem de venda
  Lymhurst: { s: 5525, sd: now - 10 * H },               // só ordem de venda
  'Black Market': { b: 1185, bd: now - 2 * H },          // só comprador
} });
const C = 3524.2707;     // custo do dossiê 030 (espada T4, Lymhurst)
it('exitsFor lista exatamente 3 saídas, na ordem das cidades', () => {
  expect(exitsFor(prices, 'T4_MAIN_SWORD', { now }).map((e) => [e.city, e.mode, e.price, e.buyer, e.illusory]))
    .toEqual([['Lymhurst', 'order', 5525, false, true], ['Caerleon', 'order', 12000, false, true], ['Black Market', 'instant', 1185, true, false]]); });
it('as outras cidades não têm saída (Bridgewatch, Fort Sterling, Martlock, Thetford)', () => expect(exitsFor(prices, 'T4_MAIN_SWORD', { now })).toHaveLength(3));
it('lucros do dossiê', () => {
  expect(netSale(1185, 'instant', true)).toBeCloseTo(1137.60, 2);  expect(netSale(1185, 'instant', true) - C).toBeCloseTo(-2386.67, 2);
  expect(netSale(12000, 'order', true)).toBeCloseTo(11220, 2);     expect(netSale(12000, 'order', true) - C).toBeCloseTo(7695.73, 2);
  expect(netSale(5525, 'order', true) - C).toBeCloseTo(1641.61, 1); });    // 5.165,875 − 3.524,27 = 1.641,60 (dossiê arredonda para .61)
it('pickExit: melhor no papel é ilusória; a com comprador é o Black Market com prejuízo', () => {
  const opts = [{ city: 'Caerleon', mode: 'order', price: 12000, date: now - 14.5 * H }, { city: 'Lymhurst', mode: 'order', price: 5525, date: now - 10 * H }, { city: 'Black Market', mode: 'instant', price: 1185, date: now - 2 * H }]
    .map((o) => ({ ...o, profit: netSale(o.price, o.mode, true) - C })).sort((a, b) => b.profit - a.profit);
  const { best, bestReal } = pickExit(annotateOptions(opts, prices, 'T4_MAIN_SWORD', { now }));
  expect(best).toMatchObject({ city: 'Caerleon', illusory: true }); expect(bestReal).toMatchObject({ city: 'Black Market', illusory: false }); expect(bestReal.profit).toBeCloseTo(-2386.67, 2); });
it('Black Market nunca gera ordem de venda, mesmo com sell_price_min (X1; fecha a lacuna do DT-001 no lado das saídas)', () => {
  const p = mkPrices({ T4_X: { 'Black Market': { s: 5000, sd: now, b: 1000, bd: now } } });
  expect(exitsFor(p, 'T4_X', { now }).map((e) => e.mode)).toEqual(['instant']); });
it('ordem com comprador na mesma cidade não é ilusória', () => {
  const p = mkPrices({ T4_X: { Caerleon: { s: 12000, sd: now, b: 900, bd: now } } });
  expect(exitsFor(p, 'T4_X', { now }).map((e) => [e.mode, e.illusory])).toEqual([['instant', false], ['order', false]]); });
it('borda da idade: 24 h exatas = fresco; +1 ms = velho; maxAgeH 0 desliga; data nula = velho (como no Flipper)', () => {
  const at = (age) => mkPrices({ T4_X: { Caerleon: { b: 100, bd: now - age } } });
  expect(cityBuyer(at(24 * H), 'T4_X', 'Caerleon', { now, maxAgeH: 24 }).stale).toBe(false);
  expect(cityBuyer(at(24 * H + 1), 'T4_X', 'Caerleon', { now, maxAgeH: 24 }).stale).toBe(true);
  expect(cityBuyer(at(1000 * H), 'T4_X', 'Caerleon', { now, maxAgeH: 0 }).stale).toBe(false);
  expect(cityBuyer(mkPrices({ T4_X: { Caerleon: { b: 100 } } }), 'T4_X', 'Caerleon', { now }).stale).toBe(true); });
it('bestBuyer: maior ordem de compra fresca, inclui Black Market; velha ou zero não conta', () => {
  const p = mkPrices({ T4_X: { Martlock: { b: 3796, bd: now - H }, Caerleon: { s: 1275, sd: now - H }, 'Black Market': { b: 2000, bd: now - 30 * H } } });
  expect(bestBuyer(p, 'T4_X', { now })).toMatchObject({ price: 3796, city: 'Martlock' });
  expect(bestBuyer(mkPrices({ T4_X: { Caerleon: { s: 1275, sd: now } } }), 'T4_X', { now })).toBeNull(); });
it('prices null ou item ausente: listas vazias e null', () => { expect(exitsFor(null, 'T4_X', { now })).toEqual([]); expect(bestBuyer(null, 'T4_X', { now })).toBeNull(); });
```
  Casos do dossiê: BM 1.185 × 0,96 = **1.137,60** (lucro −2.386,67); Caerleon 12.000 × 0,935 = **11.220** (lucro nominal 7.695,73); Lymhurst 5.525 × 0,935 = **5.165,88** (lucro 1.641,61). Os testes não consultam a API (preços fixos); o Tester refaz com dados ao vivo.
- [ ] **Step 2:** `npx vitest run src/lib/exits.test.js` → FAIL (`Failed to resolve import "./exits"`).
- [ ] **Step 3:** implementar as cinco funções sobre `quote()` e `SELL_CITIES`/`CITIES` de `market.js`; `fresco` com a expressão exata do Flipper. **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: exits.js, saídas por cidade com comprador real e saída ilusória`.

### Task 2: Craft, tabela "Onde vender" e melhor destino
**Files:** Modify `Crafting.jsx`.
- [ ] **Step 1:** em `Crafting.jsx`, `const opts = annotateOptions(options, prices, targetMid)`; coluna "Comprador" e selo "ilusória"/"dado velho" na tabela; `const { best: shown, bestReal } = pickExit(opts)` e, quando `shown.illusory`, o aviso do cartão de melhor destino com a saída `bestReal` (ou "nenhuma saída com comprador visível" se `bestReal` for indefinido). O restante do cálculo (ordenação, `best`, `ready`) **não muda**.
- [ ] **Step 2:** `npm run check`; smoke (`npm run dev`, aba Craft com `T4_MAIN_SWORD` e preços ao vivo): linhas por ordem sem ordem de compra mostram "ilusória"; BM só aparece como instantânea; o aviso do melhor destino cita a saída com comprador. **Step 3: Commit:** `feat: tabela Onde vender mostra comprador real e marca saída ilusória`.

### Task 3: Preço-alvo reutiliza `exits.js` (030; mínimo de linhas)
**Files:** Modify `TargetPrice.jsx`; Modify `exits.test.js` se necessário.
- [ ] **Step 1: teste** (em `exits.test.js`, reproduzindo a observação da 030 com preços sintéticos; **o caso real depende dos preços do dia**: o Tester repete com a API):

```js
it('030: poção T4, alvo 2.924, menor listado 1.275 em Caerleon mas Martlock tem ordem de compra a 3.796 → não é "difícil de vender"', () => {
  const p = mkPrices({ T4_POTION_HEAL: { Caerleon: { s: 1275, sd: now - H }, Martlock: { b: 3796, bd: now - H } } });
  const ref = bestBuyer(p, 'T4_POTION_HEAL', { now });
  expect(ref).toMatchObject({ price: 3796, city: 'Martlock' }); expect(marketGap(2924, ref.price)).toBeLessThan(0);          // alvo abaixo do melhor comprador
  expect(marketGap(2924, lowestListing(p, 'T4_POTION_HEAL').price)).toBeGreaterThan(0);   // lógica antiga: 2924/1275 − 1 = +129% → alarme sem sentido
});
```
  Conta: 2.924 / 3.796 − 1 = **−23,0%**; antiga: 2.924 / 1.275 − 1 = **+129,3%**.
- [ ] **Step 2: alterações em `TargetPrice.jsx` (4 pontos, ~8 linhas):** (a) `import { bestBuyer } from '../lib/exits'` no lugar de `lowestListing` (o `marketGap` continua de `targetPrice.js`); (b) `const market = ok ? bestBuyer(prices, mid) : null;` (mesmo formato `{price, city, date}`, o resto do JSX segue funcionando); (c) o texto "Menor preço de venda atual:" vira "Melhor comprador atual (ordem de compra):"; (d) o `Banner` "Alvo acima do mercado: difícil de vender." vira "Alvo acima do melhor comprador atual: só vende se alguém criar uma ordem de compra maior." (no modo instantâneo: "nenhuma ordem de compra paga isso hoje"); (e) o texto do caso sem referência vira "Nenhum comprador (ordem de compra) visível para este item: só há ordens de venda." (informativo, sem `Banner`).
- [ ] **Step 3:** `npm run check`; smoke com poção T4 e espada T4 no Craft: o alerta some quando há comprador acima do alvo. **Step 4: Commit:** `fix: preço-alvo compara com o melhor comprador real (exits.js) em vez do menor preço listado`.

## Como o Tester valida

1. **Exemplo real do dossiê (§4)** com os preços fixos acima: saídas = Lymhurst (ordem 5.525, ilusória), Caerleon (ordem 12.000, ilusória), Black Market (instantânea 1.185, com comprador). Contas: BM 1.185 × 0,96 = **1.137,60** → lucro **−2.386,67**; Caerleon 12.000 × 0,935 = **11.220** → **+7.695,73** (sem comprador); Lymhurst 5.525 × 0,935 = **5.165,88** → **+1.641,61** (sem comprador). Conclusão exibida: a única saída com comprador é o Black Market e dá prejuízo. Recalcular sem importar `econ.js`.
2. **Dados ao vivo:** consultar a API (`stats/prices/T4_MAIN_SWORD`, qualidade 1) no dia do teste e classificar cada cidade com script próprio (comprador = `buy_price_max > 0` e idade ≤ 24 h); a tela deve concordar linha a linha.
3. **Preço-alvo (030):** caso sintético: Caerleon `s=1.275`, Martlock `b=3.796`, alvo 2.924 → sem alerta (−23,0%); antes, +129,3% e alerta. Repetir com a poção T4 real (D-019). Item sem nenhuma ordem de compra → nota informativa, não alarme.
4. **Regressão:** a ordenação e o "melhor destino" do Craft continuam iguais (`options`/`best` não mudam); só ganham anotações. O Black Market nunca aparece como "Ordem de venda".
5. **O que um jogador experiente estranharia:** a melhor saída do papel apresentada como segura quando não tem comprador; Black Market com opção de listar; prejuízo escondido; alerta "difícil de vender" disparando por uma cidade de preço outlier; item com comprador visível marcado "ilusória"; dado de 30 h tratado como atual; coluna "giro" inventando número (deve dizer "sem dado").

## Riscos

1. **"Comprador real" é uma heurística** sobre a API colaborativa: uma ordem de compra pode existir e não estar no AODP (dado esparso). O texto diz "visível", nunca "inexistente".
2. O limite de idade de 24 h é decisão de produto (igual ao Flipper), parametrizável.
3. O Craft e o Preço-alvo mostram o melhor comprador **da cidade com maior ordem de compra**, não necessariamente a cidade que o jogador usa; seletor de cidade fica para depois (pergunta 3).
4. `TargetPrice.jsx` e `Crafting.jsx` são pontos de contato com a 060: rebase por região.
5. Volume/dia (010) e qualidade (X5, X6) não entram.

## Critério de pronto

`npm run check` verde; exemplo do dossiê e caso da poção em teste; `exits.js` é o único lugar com a regra de comprador real (`TargetPrice.jsx` e `Crafting.jsx` não têm lógica própria; `grep` por `buy_price_max`/`.b > 0` nos componentes não acha nada); tabela e cartões mostram o selo e os avisos; só os arquivos listados alterados.

## PERGUNTAS PARA O GERENTE

1. **Refino e Flipper:** o dossiê só pede o Craft (e o Flipper "já trata o BM"). `Refining.jsx` também escolhe "melhor cidade de venda" sem olhar comprador. Incluo o Refino numa próxima ideia, ou já aqui (acrescentaria `evaluateTier` e `Refining.jsx` à lista)?
2. Limite de idade padrão de 24 h para "dado fresco": aceita (é igual ao padrão do Flipper)?
3. Preço-alvo: o plano compara com o **melhor comprador entre todas as cidades**. Prefere um seletor "cidade de venda" no cartão (D-019 fala em "a cidade escolhida ou o melhor comprador real")? Fica fora para não crescer o escopo.
4. `lowestListing` fica sem uso em `targetPrice.js`. Removo (e seus testes) nesta ideia ou deixo para limpeza futura?
