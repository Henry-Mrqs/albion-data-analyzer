# IDEIA-075 — Preço-alvo respeita "Sem imposto" (048, D1): plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-075`. Comandos `npm` em `client/`. **Pré-requisitos (já na `master`):** IDEIA-048 (`extras.js`, `ExtrasCard.jsx`, marcas `noTax`), 060 (`validateInputs`), 069 (`src/test/ui.js`). **Regra do briefing:** cada teste é escrito, **executado e visto falhar** antes de implementar. **Nenhum `*.test.jsx` pode conter `usePersisted('chave'` literal** (`persistSchemas.test.js` varre os `.jsx` de `src/components/`); a chave `target:cfg` é semeada com `seed('target:cfg', …)` de `src/test/ui.js`. **Nenhuma fórmula nova:** o líquido vem de `netSale` (`econ.js`), que já aceita o modo `'none'` (decisão X3 da 048: sem imposto de mercado e sem taxa de criação de 2,5%).

**Problema (D1 do laudo `docs/qa/IDEIA-048.md`, D-052/D-053):** o cartão **Preço-alvo** inverte `netSale` usando só o "Modo de venda" do próprio cartão (ordem de venda ou ordem de compra na hora). Ele ignora as marcas "Sem imposto" da tabela de saídas do Craft e o interruptor "Venda sem imposto" do Refino. Efeito medido pelo Tester: espada T4, custo 3.754, lucro alvo 1.000: o cartão manda listar a **5.085** (÷ 0,935) enquanto, com a saída marcada, bastam **4.755** (÷ 1). Erra para o lado seguro (nunca induz prejuízo), mas contradiz a tabela e não diz por quê.

**Objetivo:** quando a venda estiver marcada "sem imposto", o Preço-alvo calcula com fator de líquido 1 (e sem relistagens, que são taxa de criação), usando **a mesma função** `netSale(…, 'none', …)` que a tabela usa; e diz na tela que está assim.

**Arquitetura:** `targetPrice()` ganha o parâmetro `noTax` (boolean) e passa `'none'` para `netSale` em vez de `mode`; nenhuma fórmula é copiada. Um helper puro `noTaxByMode(options)` (em `targetPrice.js`) transforma as saídas do Craft (`computeCraft().options`, cada uma com `noTax`) em `{ order, instant }`. `TargetPrice.jsx` recebe `noTax = { order, instant }` por prop (não persiste nada: **nenhum campo novo em `persistSchemas.js`**). O Refino tem um interruptor só, então passa `{ order: noTax, instant: noTax }`.

## Regra de produto proposta (ver Pergunta 1)
O cartão não tem seletor de cidade (limitação já documentada no código: compara com o melhor comprador de todas as cidades). Então, para o modo escolhido no cartão, vale "sem imposto" se **alguma** saída daquele modo estiver marcada na tabela do Craft. Uma linha no cartão diz isso: "Venda sem imposto marcada: o preço-alvo não desconta imposto nem taxa de criação (relistagens não contam)." No Refino é exato (interruptor único).

## Arquivos
**Alterados:** `client/src/lib/targetPrice.js`, `client/src/lib/targetPrice.test.js`, `client/src/components/TargetPrice.jsx`, `client/src/components/Crafting.jsx` (1 linha: prop do `TargetPrice`), `client/src/components/Refining.jsx` (1 linha idem).
**Criados:** `client/src/components/TargetPrice.noTax.test.jsx`, `client/src/components/Crafting.targetNoTax.test.jsx`, `client/src/components/Refining.targetNoTax.test.jsx`.
**NÃO toca:** `econ.js` (o modo `'none'` já existe), `craftPlan.js`, `refinePlan.js`, `exits.js`, `persistSchemas.js`, `inputRules.js`, `index.css`.
**Compartilhados:** `Crafting.jsx` e `Refining.jsx` com a IDEIA-076 (linhas diferentes: aqui a linha do `<TargetPrice …/>`; lá `ExtrasCard`, "Melhor destino", `CityCompare`). **Ordem:** 075 pode ir antes ou depois da 076; se forem em paralelo, o merge é trivial.

## Interfaces

```js
// targetPrice.js
targetPrice({ cost, profit, margin, premium, mode, relists = 0, noTax = false }): number | null
//   noTax === true  =>  k = netSale(1, 'none', premium) (= 1) e relists NÃO entram. Qualquer outro valor (inclusive 'true', 1) = false.
//   mode inválido continua devolvendo null mesmo com noTax (a tela corrige o modo antes, 060).
noTaxByMode(options): { order: boolean, instant: boolean }
//   options = [{ mode: 'order'|'instant', noTax?: boolean, … }]; verdadeiro se ALGUMA saída daquele modo tem noTax === true.
//   undefined / não-array / lista vazia => { order: false, instant: false }.
// TargetPrice.jsx  props: { cost, prices, mid, missing, noTax = { order: false, instant: false } }
```

## Tasks (1 commit cada; teste primeiro e visto falhar)

### Task 1: `targetPrice({ noTax })` e `noTaxByMode` (puros, project `logic`)
**Files:** Modify `targetPrice.test.js`, `targetPrice.js`.
- [ ] **Step 1: testes falhando** (acrescentar em `targetPrice.test.js`; premium = taxa 4%, sem premium = 8%; todos os números são `ceil(alvo ÷ k)` conferíveis à mão):

```js
const base = { cost: 1000, profit: 500, premium: true };
it('noTax: ordem de venda, premium: 1.500 ÷ 1 = 1.500 (sem noTax: 1.500 ÷ 0,935 = 1.604,3 → 1.605)', () => {
  expect(targetPrice({ ...base, mode: 'order' })).toBe(1605);
  expect(targetPrice({ ...base, mode: 'order', noTax: true })).toBe(1500);
});
it('noTax: ordem de compra na hora, premium: 1.500 (sem noTax: 1.500 ÷ 0,96 = 1.562,5 → 1.563)', () => {
  expect(targetPrice({ ...base, mode: 'instant' })).toBe(1563);
  expect(targetPrice({ ...base, mode: 'instant', noTax: true })).toBe(1500);
});
it('noTax sem premium (8%): ordem de venda 1.500 ÷ 0,895 = 1.675,98 → 1.676; com noTax 1.500', () => {
  expect(targetPrice({ ...base, premium: false, mode: 'order' })).toBe(1676);
  expect(targetPrice({ ...base, premium: false, mode: 'order', noTax: true })).toBe(1500);
});
it('noTax ignora relistagens (taxa de criação): 2 relistagens sem noTax = 1.500 ÷ 0,885 = 1.694,9 → 1.695; com noTax 1.500', () => {
  expect(targetPrice({ ...base, mode: 'order', relists: 2 })).toBe(1695);
  expect(targetPrice({ ...base, mode: 'order', relists: 2, noTax: true })).toBe(1500);
});
it('noTax com margem: 20% de 1.000 = 200; 1.200 ÷ 1 = 1.200 (sem noTax 1.200 ÷ 0,935 = 1.283,4 → 1.284)', () => {
  expect(targetPrice({ cost: 1000, margin: 0.2, premium: true, mode: 'order' })).toBe(1284);
  expect(targetPrice({ cost: 1000, margin: 0.2, premium: true, mode: 'order', noTax: true })).toBe(1200);
});
it('equilíbrio com noTax: preço = custo arredondado para cima (custo 3.754,27 → 3.755)', () => {
  expect(targetPrice({ cost: 3754.27, premium: true, mode: 'order', noTax: true })).toBe(3755);
});
it('noTax só vale com true estrito: "true", 1 e undefined contam como falso', () => {
  for (const noTax of ['true', 1, undefined, null]) expect(targetPrice({ ...base, mode: 'order', noTax })).toBe(1605);
});
it('mode inválido continua null mesmo com noTax; custo inválido idem', () => {
  expect(targetPrice({ ...base, mode: 'none', noTax: true })).toBeNull();
  expect(targetPrice({ ...base, cost: 0, mode: 'order', noTax: true })).toBeNull();
});
it('consistência com netSale: com noTax, netSale(alvo, "none") >= custo + lucro e netSale(alvo - 1, "none") < custo + lucro', () => {
  const p = targetPrice({ cost: 3754.27, profit: 1000, premium: true, mode: 'order', noTax: true }); // 4.755
  expect(p).toBe(4755); expect(netSale(p, 'none', true)).toBeGreaterThanOrEqual(4754.27); expect(netSale(p - 1, 'none', true)).toBeLessThan(4754.27);
});
it('noTaxByMode: só o modo marcado; vazio, undefined e não-array dão tudo falso', () => {
  expect(noTaxByMode([{ mode: 'order', noTax: true }, { mode: 'instant', noTax: false }])).toEqual({ order: true, instant: false });
  expect(noTaxByMode([{ mode: 'instant', noTax: true }, { mode: 'order' }])).toEqual({ order: false, instant: true });
  expect(noTaxByMode([{ mode: 'order', noTax: false }, { mode: 'order', noTax: true }])).toEqual({ order: true, instant: false });
  for (const x of [[], undefined, null, 'abc', {}]) expect(noTaxByMode(x)).toEqual({ order: false, instant: false });
});
```
- [ ] **Step 2:** `npx vitest run src/lib/targetPrice.test.js` → FAIL (`noTaxByMode is not a function`; os casos com `noTax` dão os valores antigos).
- [ ] **Step 3:** implementar em `targetPrice.js`: `const off = noTax === true; let k = netSale(1, off ? 'none' : mode, premium); if (mode === 'order' && !off) k -= relists * SETUP_FEE;` e `export const noTaxByMode`. Atualizar o comentário do topo ("inverte netSale; o modo 'none' é o da 048"). Nenhuma constante nova.
- [ ] **Step 4:** mesmo comando → PASS; `npm run test:logic`.
- [ ] **Step 5: Commit:** `feat: targetPrice aceita noTax (venda fora do mercado) usando netSale 'none'`.
- Mutações a derrubar: `off` ignorado; relistagens ainda subtraídas com noTax; `noTax` truthy em vez de `=== true`; `noTaxByMode` com `every` em vez de `some`; modo trocado (order↔instant).

### Task 2: cartão Preço-alvo mostra e usa o `noTax` (`TargetPrice.jsx`)
**Files:** Create `TargetPrice.noTax.test.jsx`; Modify `TargetPrice.jsx`.
- [ ] **Step 1: testes falhando** (project `ui`; `beforeEach(resetApp)`; render direto de `<TargetPrice cost={3754.27} prices={prices} mid="T4_MAIN_SWORD" missing={false} noTax={…} />`; `prices = mkPrices({ T4_MAIN_SWORD: { Caerleon: { s: 4500 } } })`; `seed('target:cfg', { goal: 'profit', profit: 1000, margin: 20, mode: 'order', relists: 0 })`; leitura do alvo: `screen.getByText('Liste a').parentElement.querySelector('.big').textContent`):

```js
it('sem noTax (padrão): lista a 5.085 (4.754,27 ÷ 0,935) e não mostra a linha de aviso', () => {});
it('noTax.order = true no modo ordem de venda: lista a 4.755 e mostra "Venda sem imposto marcada" com "relistagens não contam"', () => {});
it('noTax só no instant e modo ordem: continua 5.085 e sem aviso (a marca é de outro modo)', () => {});
it('trocar para "Ordem de compra (na hora)" com noTax.instant = false: 4.754,27 ÷ 0,96 = 4.952,4 → 4.953', () => {});
it('relistagens digitadas (2) com noTax.order = true: alvo 4.755 (não soma 2 × 2,5%); sem noTax o mesmo cenário dá 4.754,27 ÷ 0,885 = 5.372,06 → 5.373', () => {});
it('o texto "líquido … lucro …" bate: com noTax líquido 4.755,00 e lucro 1.000,73 por unidade (custo 3.754)', () => {});
it('meta de margem 20% com noTax: 3.754,27 × 1,2 = 4.505,12 → 4.506', () => {});
it('prop noTax ausente ou { } não quebra (padrão tudo falso)', () => {});
```
  (Os números deste bloco foram conferidos com `node -e`: 4.754,27 ÷ 0,935 = 5.084,8 → 5.085; ÷ 0,96 = 4.952,4 → 4.953; ÷ 0,885 = 5.372,06 → 5.373; × 1,2 = 4.505,12 → 4.506.)
- [ ] **Step 2:** `npx vitest run --project ui src/components/TargetPrice.noTax.test.jsx` → FAIL.
- [ ] **Step 3:** em `TargetPrice.jsx`: ler `const off = noTax?.[mode] === true`; passar `noTax: off` a `targetPrice`; `net = netSale(target, off ? 'none' : mode, premium) - (mode === 'order' && !off ? relists * SETUP_FEE * target : 0)` (mesma subtração que já existe, só condicionada); acrescentar `<div className="hint">Venda sem imposto marcada: o preço-alvo não desconta imposto nem taxa de criação (relistagens não contam).</div>` quando `off`. O banner "Alvo acima do melhor comprador" continua igual (o preço de mercado segue sendo a referência, texto já dito na tabela).
- [ ] **Step 4:** PASS; `npm run check`.
- [ ] **Step 5: Commit:** `feat: cartão Preço-alvo respeita Sem imposto`.
- Mutações: `off` calculado do modo errado (`noTax[cfg.mode]` cru em vez do modo corrigido); líquido ainda descontando relistagens; aviso sempre visível; aviso ausente.

### Task 3: ligar no Craft e no Refino
**Files:** Modify `Crafting.jsx` (linha do `<TargetPrice …/>`) e `Refining.jsx`; Create `Crafting.targetNoTax.test.jsx`, `Refining.targetNoTax.test.jsx`.
- [ ] **Step 1: testes falhando.** Cenários copiados dos de `Crafting.extras.test.jsx`/`Refining.extras.test.jsx` (mesmos mocks de `usePrices`/`useHistory`, `mount()` idêntico; helpers de `src/test/ui.js`).
  Craft (espada T4, taxa 500, venda Caerleon 4.500, despesas 150 + 80 por craft, custo 3.754,27, `target:cfg` padrão):
```js
it('sem marca: Preço-alvo lista a 5.085 (caso medido pelo Tester em D1)', () => {});
it('marcar "Sem imposto" em Caerleon|order (pela tela, clicando no checkbox da tabela): lista a 4.755 e a tabela mostra lucro +746', () => {});
it('desmarcar volta a 5.085', () => {});
it('marca em saída do modo "instant" não muda o cartão em modo ordem (5.085)', () => {});
it('estado salvo com noTax: { "Caerleon|order": true } já abre com 4.755', () => {});
```
  Refino (cenário A: tábua T4, custo 61,4734; 10 por unidade → 71,4734; venda instantânea no Mercado Negro 140; `target:cfg` padrão lucro 1000, ordem de venda, premium):
```js
it('sem interruptor: alvo 1.146 ((71,4734 + 1.000) ÷ 0,935 = 1.145,96)', () => {});
it('com "Venda sem imposto": alvo 1.072 (1.071,4734 ÷ 1 → 1.072) e a linha de aviso', () => {});
it('o interruptor vale nos dois modos do cartão (ordem de venda e na hora): na hora com interruptor também 1.072', () => {});
```
- [ ] **Step 2:** FAIL. **Step 3:** `Crafting.jsx`: `<TargetPrice … noTax={noTaxByMode(options)} />` (`options` = `c.options`, que já traz `noTax` por saída; importar `noTaxByMode` de `../lib/targetPrice`). `Refining.jsx`: `noTax={{ order: noTax, instant: noTax }}` (`noTax` já existe na linha 62). **Step 4:** PASS; `npm run check`; **conferência na tela real** a 1280 px e 375 px (Vite, preços simulados como no laudo da 048): espada T4, marcar/desmarcar, ver 5.085 ↔ 4.755. **Step 5: Commit:** `feat: Craft e Refino passam o Sem imposto ao Preço-alvo`.
- Mutações: Craft passando o mapa cru (`cfg.noTax`) em vez de `noTaxByMode(options)`; Refino passando só `order`; `some` → `every` (cobertura: só uma saída marcada entre duas de ordem, ver Pergunta 1).

## Verificação dos demais cartões (apenas apontar; nada a mudar nesta ideia)
| Cartão | Usa imposto? | Precisa do mesmo cuidado? |
|---|---|---|
| **Giro** (`Giro.jsx`, `GiroCell`, `liquidity.js`) | Não: usa preço bruto e histórico (mediana, vendas/dia, `sharePct` × unidades). `GiroCard best` recebe `{ city, price }` e compara preço com mediana. | Não. |
| **Comprador / saídas** (`exits.js`: `cityBuyer`, `bestBuyer`, `exitsFor`, `annotateOptions`, `pickExit`) | Não calcula líquido; só marca "ilusória/velha". A ordem das saídas vem de `computeCraft` (já ordenada por lucro com `noTax`). | Não. |
| **"Melhor destino"** (`Crafting.jsx`) | Usa `best.net`/`best.profit` do `computeCraft`: **o número está certo**; o texto não diz que a melhor saída está sem imposto. | Sim, só texto: tratado na **IDEIA-076** (D4). |
| **Foco (Craft)** (`craftFocusSummary`) e **"vale esperar"** (`waitSavings`) | Passam por `computeCraft`; o laudo verificou coerência (a despesa cancela). | Não. |
| **Comparar cidades** (`cityCompare.js`) | Só custo de produção; `noTax` não entra. | Só explicar na tela: **076**. |
| **Flipper** (`flip.js`) | Usa `netSale(o.price, o.mode, premium)` direto, sem despesas nem `noTax` (revenda no mercado). | Não: não há marca "Sem imposto" no Flipper. |
| **"Estresse"** | Não existe tela, função ou cartão com esse nome em `client/src` (busca por `stress`/`estress` vazia). O mais próximo é a parte do mercado (`sharePct`) do Giro, que usa unidades, não imposto. | **Pergunta 3**: confirmar a que o gerente se referia. |
| **Refino: "Comparar rotas"** | Já usa `cur.net` (com `noTax`) e `perUnitExtras`. | Não. |

## Como o Tester valida
1. Os números das Tasks 1 a 3 existem como testes, falharam antes e passam depois; recalculá-los por conta própria (`ceil(alvo ÷ k)`).
2. **Oráculo:** para ~500 combinações (custo, lucro/margem, premium, modo, relistagens, `noTax`), `targetPrice` com `noTax` igual a `ceil((custo + L) ÷ 1)` e, sem `noTax`, **idêntico à master** (diferencial bit a bit); e `netSale(alvo, modo)` ≥ custo + L > `netSale(alvo − 1, modo)`.
3. Mutações das Tasks em cópia fora do repositório; sobrevivente reprova.
4. UI real (375 px e desktop): marcar/desmarcar muda o alvo e a linha de aviso; a tabela e o cartão não se contradizem (com a saída marcada, `lucro da tabela = lucro do cartão` quando o preço é o alvo).
5. `persistSchemas.test.js` verde; nenhum `usePersisted('…'` literal nos `.test.jsx`; `git diff` sem `persistSchemas.js`.
6. **O que um usuário estranharia:** cartão pedindo preço maior que a tabela mostra; aviso de "sem imposto" aparecendo sem marca; relistagens ainda encarecendo o alvo com a venda marcada.

## Riscos
1. **Granularidade:** a marca do Craft é por cidade e modo, o cartão não tem cidade. A regra "alguma saída do modo marcada" pode baixar o alvo para uma cidade não marcada. Mitigação: aviso fixo no cartão; alternativa na Pergunta 1.
2. **Aviso mudou de lugar:** o laudo sugeria só uma linha de aviso; aqui o cálculo muda de fato (decisão D-052: a ideia é "respeitar").
3. `Crafting.jsx`/`Refining.jsx` são arquivos quentes: só uma linha cada.

## Critério de pronto
`npm run check` verde sem alterar teste existente; todos os casos concretos e as mutações das Tasks; só os arquivos listados alterados; `econ.js` e `persistSchemas.js` intactos; conferência na tela registrada.

## PERGUNTAS PARA O GERENTE
1. **Regra do Craft (cartão sem cidade):** "alguma saída do modo marcada" (proposta), "todas as saídas do modo marcadas" (mais conservadora, quase nunca liga), ou **dar ao cartão um seletor de cidade** (mais correto, mais escopo; hoje o cartão compara com o melhor comprador de todas)?
2. **Aviso do cartão:** o texto fixo proposto basta, ou o cartão deve listar as cidades marcadas ("Caerleon, ordem de venda")?
3. **"Estresse"** do enunciado: não há nada com esse nome no código. Referia-se ao Giro/parte do mercado, ou a uma ideia futura?
