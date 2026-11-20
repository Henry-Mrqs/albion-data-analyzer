# IDEIA-083 — Preço-alvo no auditor: "aplicada" quando a saída do modo está marcada e valores vivos: plano

> **Para o Executor:** `superpowers:executing-plans` ou `subagent-driven-development`. Branch de integração (D-070). `npm` em `client/`. Teste visto falhar antes de implementar; nenhum `*.test.jsx` com `usePersisted('chave'` literal (use `seed()`). **Pré-requisitos:** 005 e **075** (já na master: `exitNoTaxByMode`, `noTax` por modo), 082 (rótulo do Mercado Negro no aviso; ver conflito). Origem: laudo 005 D3/D4, D-061, D-064, D-066.

**Problema.** (D3) A linha `target-notax` do auditor nunca vira "aplicada": D-061 pedia "aplicada" quando a melhor saída **do modo** do cartão está marcada "Sem imposto". (D4) O auditor mostra só "definidos no cartão Preço-alvo": a meta, o modo e as relistagens vivos não aparecem, e com `noTax` marcado só num modo a frase "Considerada: …" pode levar a crer que o alvo atual não desconta imposto, quando o modo escolhido no cartão é o outro. **Causa:** `TargetPrice.jsx` guarda o próprio estado (`target:cfg`), então `Crafting.jsx`/`Refining.jsx` (que montam o auditor) não sabem o que o cartão está usando.

**Solução (menor mudança):** o cartão avisa a tela do que está usando por um callback `onLive` (efeito com dependências primitivas; nenhuma duplicação do `usePersisted('target:cfg'`), a tela guarda em `useState` e repassa ao auditor em `targetLive`. O auditor **só lê** (V1): nenhuma fórmula do alvo é copiada.

## Arquivos
**Altera:** `client/src/components/TargetPrice.jsx` (prop opcional `onLive`; `useEffect`), `client/src/components/Crafting.jsx` e `client/src/components/Refining.jsx` (`const [targetLive, setTargetLive] = useState(null)`; `onLive={setTargetLive}`; `targetLive` em `auditCraft`/`auditRefine`), `client/src/lib/audit/core.js` (`targetVars` ganha o parâmetro de vivos e as linhas novas), `client/src/lib/audit/craft.js` e `refine.js` (repassam `ctx.targetLive`; testes de contagem de linhas), `client/src/lib/audit/craft.test.js`, `refine.test.js`, `core.test.js`.
**Cria:** `client/src/components/TargetPrice.live.test.jsx`, `Crafting.targetLive.test.jsx`, `Refining.targetLive.test.jsx`.
**Não toca:** `targetPrice.js` (a conta), `persistSchemas.js` (nenhum campo novo; os de `target:cfg` já estão cobertos).
**Conflitos:** **`Crafting.jsx` e `Refining.jsx`** com 059 (cartão novo), 065, 012, 062, 061, 051, 064, 003, 009, 007, 088 (tudo no Craft): 4 linhas distantes de qualquer outra; `TargetPrice.jsx` com **082** (aviso citando a saída do modo escolhido; rótulo do Mercado Negro) e **059** ("unificar com o Preço-alvo depois da 075"): **082 e 083 na mesma sequência (082 → 083)** porque as duas mexem no aviso e no efeito do cartão; `audit/core.js`/`craft.js` com 062/061/051/003/009/007/088 (acréscimos).

## Interfaces
```js
// TargetPrice.jsx: onLive?.(live) em useEffect([goal, profit, margin, mode, relists, target, off, exitCity, ok, cost])
live = { ok: boolean,                       // false = cartão sem custo ou com material faltando
         goal: 'even'|'profit'|'margin', profit: number, margin: number,   // já numéricos (±0 se vazio)
         mode: 'order'|'instant',           // o modo CORRIGIDO que o cartão usa (validateInputs), não o salvo
         relists: number,                   // 0 no modo 'instant' (só conta em 'order')
         off: boolean, city: string|null,   // a melhor saída DESTE modo está marcada "Sem imposto"? e em qual cidade
         target: number|null }              // o preço-alvo mostrado
// audit/core.js
targetVars(costOf, noTaxOf, liveOf = (ctx) => ctx.targetLive)   // liveOf devolve live | null
```

## Task 1: o cartão publica o que usa (`TargetPrice.jsx`)
**Files:** Create `TargetPrice.live.test.jsx`; Modify `TargetPrice.jsx`.
- [ ] **Step 1: testes falhando** (project `ui`; `resetApp`; `seed('target:cfg', {...})`; **sem** `usePersisted('target:cfg'` no teste): `onLive = vi.fn()`, `cost = 3524.27`, premium (padrão do app), `noTax = { order: null, instant: null }`. (a) meta `profit 1000`, modo `order`, relistagens `2` → última chamada `{ ok:true, goal:'profit', profit:1000, mode:'order', relists:2, off:false, target:5113 }` (**5.113** = ⌈(3.524,27 + 1.000) ÷ (0,935 − 2×0,025)⌉; recalculado com `node -e`); (b) `noTax = { order: { on:true, city:'Caerleon' }, instant:null }` → `off:true, city:'Caerleon', target:4525` (sem imposto e sem taxa de criação; relistagens não contam); (c) modo `instant` (relistagens salvas 2): `relists:0` e `target:4713` (⌈4.524,27 ÷ 0,96⌉); com a marca só em `order` → `off:false` (o modo escolhido é o outro); (d) sem relistagens, `order`: `target:4839`; (e) `cost = 0` ou `missing` → `{ ok:false, target:null }`; (f) `mode` salvo inválido (`'FOO'`) → `mode:'order'` (o corrigido) e o aviso de `validateInputs` continua na tela; (g) **sem loop:** re-renderizar o pai 5 vezes com as mesmas props chama `onLive` **1** vez (dependências primitivas), e digitar na meta chama de novo com o valor novo; (h) `onLive` ausente: nada quebra (comportamento atual).
- [ ] **Step 2:** `npx vitest run --project ui src/components/TargetPrice.live.test.jsx` → FAIL. **Step 3:** adicionar `onLive` (prop opcional) e o `useEffect` com dependências **primitivas** (`mode`, `relists`, `target`, `off`, `cfg.goal`, números da meta, `cost`, `ok`, `exit?.city`). **Step 4:** PASS; `npm run test:ui` (os `TargetPrice.noTax.test.jsx` e `Crafting.targetNoTax.test.jsx` existentes seguem verdes). **Step 5: Commit** `feat: cartão Preço-alvo publica os valores vivos (IDEIA-083)`.
- Mutações: dependência `cfg` (objeto) que faz loop; `mode` salvo em vez do corrigido; `relists` do modo `instant` não zerado; `off` lido da outra saída.

## Task 2: linhas do auditor (`core.js`, `craft.js`, `refine.js`)
**Files:** Modify `audit/core.js`, `audit/craft.js`, `audit/refine.js`, `core.test.js`, `craft.test.js`, `refine.test.js`.
- [ ] **Step 1: testes falhando** (project `logic`; `auditCraft`/`auditRefine` via `assembleCraft` do `test/auditKit.js` com `targetLive` injetado). Linhas esperadas na seção "Preço-alvo":
  | caso | `target-goal` | `target-mode` | `target-relists` | `target-notax` |
  |---|---|---|---|---|
  | live `{profit:1000, mode:'order', relists:2, off:false, target:5113}` | "lucro de 1.000 por unidade" | "ordem de venda" | 2 ("cada atualização soma 2,5%; estimativa digitada no cartão") | `info-only`: "não marcada: o alvo desconta imposto e taxa de criação (nenhuma saída do modo ordem de venda está marcada)" |
  | idem com `off:true, city:'Caerleon', target:4525` | idem | idem | 2 (nota "relistagens não contam com Sem imposto") | **`applied`**: "aplicada: ordem de venda (Caerleon) sem imposto e sem taxa de criação" |
  | `mode:'instant'`, marca só em `order` (`noTaxOf = {order:{on:true,city:'Caerleon'}, instant:{on:false,...}}`) | idem | "ordem de compra (na hora)" | 0 ("só conta no modo ordem de venda") | `info-only`: "marcada só em ordem de venda; o modo escolhido no cartão (ordem de compra) conta imposto" |
  | `profit` vazio → meta "equilíbrio" (`goal:'even'`) | "equilíbrio (lucro 0)" | | | |
  | `targetLive === null` (cartão ainda não montou) ou `ok:false` | "cartão sem custo ou sem preço de material" (`not-considered`... **não**: `info-only` com a nota) | | | mesma regra de hoje (frase 075) |
  e `target-price` (`derived`, `info-only`): "5.113 (a ser listado)". Contagem de linhas da seção atualizada nos testes de contagem existentes (nenhum teste existente muda de **significado**, só o número).
  **Contrato:** `target-notax` passa a `kind: 'applied'`, `affects: 'none'`, `fields: []` (aceito pelo registro: sem campo não exige `probe`); `target-card` continua `info-only` com os cinco campos de `target:cfg` em `fields` (a cobertura do contrato não muda). **Sensibilidade:** nenhum probe novo (nenhum campo novo); o teste de sensibilidade existente continua passando; **mutação:** `target-notax` `applied` com `off:false` reprova no teste de linhas.
- [ ] **Step 2:** FAIL. **Step 3:** `targetVars(costOf, noTaxOf, liveOf)` constrói as linhas lendo `liveOf(ctx)` (o `by[m]` de `noTaxOf` só complementa a cidade quando `live.city` falta); `craft.js`/`refine.js` passam `ctx.targetLive` (de `auditCraft({ …, targetLive })`). **Step 4:** PASS; `npm run test:logic`. **Step 5: Commit** `feat: auditor mostra meta, modo e relistagens vivos do Preço-alvo; sem imposto "aplicada" (IDEIA-083)`.
- Mutações: `applied` com `off:false`; modo corrigido trocado pelo salvo; `relists` do modo instantâneo mostrado como 2; texto "considerada" sem dizer o modo.

## Task 3: ligação nas telas (Craft e Refino)
**Files:** Create `Crafting.targetLive.test.jsx`, `Refining.targetLive.test.jsx`; Modify `Crafting.jsx`, `Refining.jsx`.
- [ ] **Step 1: testes falhando** (project `ui`; mocks como em `Crafting.audit.test.jsx`/`Refining.audit.test.jsx`; `resetApp`; `seed('craft:cfg', craftCfg({...}))` e `seed('target:cfg', {...})`): Craft com espada T4 (custo 3.524,27) e a melhor saída da ordem de venda marcada "Sem imposto": o quadro (linhas `data-row-id="target-notax"`) tem `data-status="applied"`; desmarcar → `info-only`; trocar o modo do cartão para "Ordem de compra (na hora)" com a marca só em ordem de venda → `info-only` com "marcada só em ordem de venda"; alterar a meta no cartão muda `target-goal` **sem recarregar**; Refino idem (`Refining.targetLive.test.jsx`, com `route` e `noTax` do Refino: usar `REFINE_NO_TAX_KEY`); estado `target:cfg` corrompido (`null`, `{mode:'FOO'}`) → quadro presente, sem tela branca, modo exibido = o corrigido; o cartão Preço-alvo e o resultado do Craft **não mudam** com a ligação (diferencial: mesmo `target` mostrado).
- [ ] **Step 2–4:** FAIL → `useState` + `onLive` + `targetLive` no auditor → PASS; `npm run check`. **Step 5: Commit** `feat: Craft e Refino repassam o Preço-alvo vivo ao auditor (IDEIA-083)`.
- Mutações: `targetLive` não repassado (o quadro volta a "definidos no cartão"); `onLive` ligado ao cartão errado; estado `setTargetLive` em render (loop: o teste de renders > N falha).

## Como o Tester valida
1. Os números 5.113 / 4.525 / 4.713 / 4.839 recalculados à mão: k(order, premium) = 0,935; −2×0,025 = 0,885; 4.524,27 ÷ 0,885 = 5.112,1 → 5.113; 4.524,27 ÷ 1 → 4.525; ÷ 0,96 = 4.712,8 → 4.713; ÷ 0,935 = 4.838,6 → 4.839. 2. **Auditoria da verdade** (D-064): o status "aplicada" aparece **exatamente** quando o cartão mostra o alvo sem imposto; trocar modo/meta/relistagens muda a linha. 3. Sem loop de renderização (contador de renders). 4. Estados salvos antigos/corrompidos × Craft e Refino (regressão 070). 5. Mutações. 6. Nenhum campo salvo novo.

## Riscos
1. O efeito roda depois do primeiro render: o quadro tem 1 quadro (frame) com "cartão ainda não montou"; o teste usa `findBy`. 2. Arquivos quentes (`Crafting.jsx`, `Refining.jsx`): só 4 linhas em cada. 3. Se a 059 unificar o Preço-alvo com o ciclo da ordem, a forma de `live` precisa acompanhar (`relists` pode virar `relistCount`): a 059 deve manter `onLive`.

## PERGUNTAS PARA O GERENTE
1. `target-notax` muda de `info-only` para `applied` (quando marcada): confirma o texto "aplicada: ordem de venda (cidade)…"? (D-061 pediu "aplicada".)
