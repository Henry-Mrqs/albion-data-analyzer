# IDEIA-072 — Foco: pendências da 002 (selo de correções, `validateCatalog` valida `ef`, RRR manual explicado, 3 mutantes): plano compacto

> **Para o Executor:** `superpowers:executing-plans`. Branch de integração (D-070); `npm` em `client/`. Teste visto falhar antes; nenhum `*.test.jsx` com `usePersisted('chave'` literal (use `seed()`). Origem: `docs/qa/IDEIA-002.md` "Pendências", D-047. Baixa prioridade; sem mudança de fórmula.

**Arquivos.** Altera: `client/src/components/Crafting.jsx` e `Refining.jsx` (1 linha cada: o selo recebe também os avisos do foco), `client/src/components/InputIssues.jsx` (`CorrectedBadge` sem mudança de contrato; só dedupe se preciso), `client/src/lib/catalogLoad.js` (`itemProblems`: valida `ef`), `client/src/components/FocusCard.jsx` (nota com RRR manual), `client/src/lib/focus.test.js`, `catalogLoad.test.js`, `catalog.test.js`; cria `Crafting.focusBadge.test.jsx` e `FocusCard.test.jsx` (se não existir). **Conflitos:** `Crafting.jsx`/`Refining.jsx` com todas as ideias do Craft (1 linha distante); `catalogLoad.js` com 007 (valida `tm`/`etm`: o laço novo acrescenta ao mesmo `itemProblems`; **072 antes de 007**); `FocusCard.jsx` com 051 (só lê os campos de foco).

## Task 1: selo "N valores corrigidos" conta o foco (pendência 1)
- [ ] **Step 1: teste falhando** (`Crafting.focusBadge.test.jsx`, project `ui`; `resetApp`; `seed('craft:cfg', craftCfg({ focusEff: String(MAX_FOCUS_EFFICIENCY + 1) }))`, importando a constante de `focusConsts`): a espada T4 mostra **"1 valor corrigido"** (antes: nenhum selo) e o aviso do foco continua sob o campo; com `focusEff` válido (`'10000'`) sem selo; com `focusEff` e `crafts:'0'` ambos inválidos: **"2 valores corrigidos"** (sem contar duas vezes o mesmo campo); Refino idem (`seed('refine:cfg', …)`).
- [ ] **Step 2:** FAIL. **Step 3:** em cada tela, `issues={[...issues, ...focusValues(cfg).issues]}` (a mesma função que o `FocusCard` usa; **não** revalidar), dedupe por `field + msg`. **Step 4:** PASS. **Step 5: Commit** `fix: selo de valores corrigidos conta os avisos do foco (IDEIA-072)`.
- Mutações: selo ignorando o foco; contagem duplicada; aviso `level:'info'` contado.

## Task 2: `validateCatalog` valida `ef` + 3 mutantes da 002 (pendências 2 e 3)
- [ ] **Step 1: testes.** `catalogLoad.test.js` (falham antes): item com `ef: { 1: 750, 2: 1313, 3: 2298, 4: 4021 }` (o de `T4_OFF_TOWERSHIELD_UNDEAD`, lido do catálogo real) é válido; `ef: [750]`, `ef: { 1: -5 }`, `ef: { 1: 'x' }`, `ef: { 9: 100 }`, `ef: { 1: 0 }`, `ef: null`, `ef: 7` → cada um vira **um problema** com o id do item e "ef inválido (esperado {1..4: número > 0})"; item **sem** `ef` continua válido (catálogo antigo). Testes de mutante (passam no código atual; devem **falhar sob mutação**): em `focus.test.js`, (a) `craftsWithBudget(9000, 148.5)` = **60** (9000 ÷ 148,5 = 60,606; `Math.round` daria 61); (b) prata por ponto **igual** à referência = `worth` (`>=`; só abaixo é `notworth`); em `catalog.test.js`, (c) `focusOf('T4_OFF_TOWERSHIELD_UNDEAD', 2) === 1313` e nível 0 `=== 429` (item com receita alternativa por ficha: o `ef` não muda com a variante).
- [ ] **Step 2:** `npx vitest run src/lib/catalogLoad.test.js src/lib/focus.test.js src/lib/catalog.test.js` → só os de `ef` falham. **Step 3:** `itemProblems` ganha o laço de `ef`. **Step 4:** PASS; rodar as 4 mutações abaixo numa cópia fora do repositório e ver cada uma falhar. **Step 5: Commit** `fix: validateCatalog confere ef; testes dos 3 mutantes do foco (IDEIA-072)`.
- Mutações: `Math.floor` → `Math.round` em `craftsWithBudget`; `>=` → `>` no veredito; `ef[ench]` lido de outro nível; `ef` ignorado na validação.

## Task 3: aviso de RRR manual no cartão Foco (pendência 4)
- [ ] **Step 1: teste falhando** (`FocusCard.test.jsx`, project `ui`): com `customRRR: '30'` a economia do foco é 0 e o cartão mostra "RRR manual digitado: ele vale no lugar do automático, por isso o foco não muda o custo aqui. Apague o RRR manual para ver a economia do foco."; sem RRR manual a nota **não** aparece; `customRRR: 'abc'` (corrigido pela 060) não mostra a nota. **Step 2–4:** FAIL → implementar (a nota lê o mesmo `cfgEff.customRRR` que o cálculo usou) → PASS; `npm run check`. **Step 5: Commit** `feat: cartão Foco explica a economia 0 com RRR manual (IDEIA-072)`. A parte "mostrar etapas sem dado no Refino" fica **fora** (opcional no laudo).

## Auditor (005, contrato `registerScreen`)
Nenhum campo salvo novo e nenhuma linha nova: `focus-points` já cobre `focusEff`; a nota lê o mesmo dado da linha `custom-rrr`. Nenhuma variável não modelada nova.

## Como o Tester valida
Os números 60/61, 1.313/429 e "1"/"2 valores corrigidos"; as 4 mutações; estado salvo `focusEff` corrompido × Craft/Refino (selo e aviso coerentes); diferencial: nenhum custo/lucro muda.

## PERGUNTAS PARA O GERENTE
1. "Mostrar etapas sem dado no Refino" (opcional no laudo 002) fica de fora. Confirma?
