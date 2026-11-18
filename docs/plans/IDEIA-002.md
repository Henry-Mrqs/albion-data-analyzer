# IDEIA-002 — Foco: pontos por craft/refino, prata por ponto e "vale usar foco?": plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-002`. Comandos `npm` em `client/`; `node` na raiz para o catálogo. **Pré-requisitos (assumidos mesclados):** IDEIA-001, 019, 023, 030, 038, 057, 060, 066, 067 e **039 e 049** (esta ideia regenera o catálogo depois delas; ver ordem). **Regra do briefing:** cada teste é escrito, **executado e visto falhar** antes da implementação.

**Objetivo:** responder "em qual item gastar o foco do dia": quantos pontos de foco o craft (e o refino) gasta, quanto de material o foco economiza e **quantos pratas se economiza por ponto de foco**, com o orçamento diário esgotando em N crafts. Fonte: `docs/research/IDEIA-002.md` (F1 a F9, §4 caso Broadsword, §5 encaixe). Confiança do dossiê: **MÉDIA-ALTA**.

## O que é `f` no catálogo (conferido) e o que falta
`f` = `@craftingfocus` da **primeira** receita do dump, no encanto .0, **por ação de craft** (não por unidade: poção `T4_POTION_HEAL` tem `f=210` e rende `a=5`). Confere com o dossiê F2: `T4_MAIN_SWORD` 1.286, `T4_PLANKS` 54. 1.285 itens craftáveis têm `f > 0`; **881 têm `f = 0`** (os 765 itens de "Artefato", itens `*_ROYAL`, capas de cidade etc.): para eles o dump não traz custo de foco e a tela diz isso, não inventa. **Nunca foi usado** no código (nenhum módulo lê `recipeOf().focus`).
**Falta o foco por encanto.** O dump traz um `@craftingfocus` para cada nível (espada T4: .1 = 2.251, .2 = 3.939, .3 = 6.893, .4 = 12.064; prancha T4: .1 = 94, .2 = 164; poção T4: .1 = 277, .2 = 411, .3 = 811), e **não** segue uma regra simples (a razão ×1,75 da espada falha em 273 de 4.789 pares, ex.: poções). O build precisa exportá-lo.

## Fórmula da fonte × entrada do usuário (separação explícita)

| Item | Natureza | Fonte / confiança |
|---|---|---|
| `custo_foco = base × 0,5^(E / 10000)` | **Fórmula da fonte** (3 fontes independentes: AFM 2026-07-21, Albion-Tools-Alternate, albionutil) | dossiê F3; MÉDIA-ALTA. Constante nomeada `FOCUS_HALF_PER = 10000` |
| `base` (custo base por receita e por encanto) | **Dado do jogo** (dump `@craftingfocus`) | dossiê F2; ALTA |
| `E` (eficiência de foco, em pontos) | **Entrada do usuário** (campo "Eficiência de foco"; padrão 0 = sem especialização = custo cheio) | **não** calculada a partir dos níveis dos nós: os coeficientes 30/250/280 vêm de **uma** fonte (AFM) e variam por item (albionutil diz 265 em artefato); o plano NÃO os implementa (pergunta 2) |
| **Foco mostrado pelo jogo** na janela de craft | **Entrada do usuário, vence a fórmula** (override opcional: "Foco por craft mostrado no jogo") | dossiê §7 manda aceitar esse override |
| RRR com/sem foco (+59) | **Fórmula existente** (`rrr()`; AUDITORIA §1) | já em produção |
| `prata por ponto = economia_materiais / custo_foco` | **Definição de produto** (dossiê F: "sem fonte de jogo") | só ingredientes que retornam (usa `returnable`) |
| orçamento diário de foco | **Entrada do usuário** (padrão 10.000 = oferta Premium de 24 h; dossiê F6, MÉDIA, fontes de 2017/2023/AFM) | `DAILY_FOCUS_PREMIUM = 10000` |
| "quanto vale 1 ponto para mim" | **Entrada do usuário** (prata por ponto de referência, opcional) | decisão de produto: o jogo não vende foco por prata |
| A taxa de bancada **não** muda com foco | **Regra da fonte** (dossiê F7; AFM: 100 Broadswords = 21.600 com ou sem foco) | testada |

## Arquivos: exclusivos, compartilhados, ordem

**Criados:** `client/src/lib/focus.js`, `client/src/lib/focus.test.js`, `client/src/components/FocusCard.jsx`.
**Alterados (catálogo, mesmo grupo de 039 e 049):** `scripts/build-catalog.mjs`, `client/public/data/catalog.json` (regenerado), `client/src/lib/catalog.js` (só uma função nova, `focusOf`), `client/src/lib/catalog.real.test.js`, `catalog.test.js`, `scripts/build-test-fixture.mjs`, `client/src/test/catalog.fixture.json` (regenerado), `scripts/catalog-diff.mjs` (conta `ef`).
**Alterados (app):** `client/src/lib/inputRules.js` + `inputRules.test.js` (campos novos), `client/src/components/Crafting.jsx` (bloco Produção e cartão), `client/src/components/Refining.jsx` (cartão).
**NÃO toca:** `econ.js` (`rrr()` e `stationFee` são só consumidos), `craftPlan.js` (o foco chama `computeCraft` duas vezes; nenhuma mudança nele), `refinePlan.js`, `market.js`, `exits.js`, `catalogLoad.js`, `vercel.json`, `vite.config.js`.
**Compartilhados com 049 (catálogo):** `build-catalog.mjs` (049 muda o parser de receitas/`alt`; 002 acrescenta `ef` no mesmo laço), `catalog.json`, fixture, `catalog.js`. **Mesma regeneração não é possível: os dois são sequenciais.** **Compartilhados com 010:** `Crafting.jsx` e `inputRules.js` (acréscimos distintos).
**Ordem recomendada:** **039 → 049 → 002** (grupo catálogo). A 002 vai por último porque só acrescenta um campo; a parte pura (`focus.js`, Tasks 1 e 3) **pode ser escrita antes** em outra branch sem mexer no catálogo (usa `base` como número), mas o commit final do catálogo precisa vir depois de 049. **Se a ordem for outra** (002 antes de 049): quem vier depois faz rebase de `build-catalog.mjs` (a 049 troca `parseRecipe`; a 002 só lê `rec.f` do mesmo retorno) e regenera `catalog.json` e a fixture; os testes do `ef` não dependem de `alt`.

## O que muda em `catalog.json` (conferência do Tester)

| Medida | Antes | Depois |
|---|---|---|
| `items.length`, itens com `r`, `cc`, `tm`, `alt` (se 049), `cityOf`, `vals`, `extra`, `encNames` | — | **idênticos** |
| campo `ef` (objeto `{ nível: foco }`) | inexistente | **1.240 itens**, **4.869 entradas** (níveis 1 a 4 com `@craftingfocus > 0`; níveis com foco 0 não entram) |
| `f` (foco base .0) | existente | igual (1.285 itens com `f > 0`) |
Números do Planejador sobre o dump em cache de 2026-11-17 (SHA fixado de 2026-11-02): o Tester repete com `node scripts/catalog-diff.mjs`. Aumento esperado de ~55 KB (não comprimido). Itens de recursos refinados (`T4_PLANKS` etc.) recebem `ef` lido das variantes `_LEVELn` (94, 164…), no mesmo ramo `isResource` que já lê as receitas encantadas.

## Interfaces

```js
// catalog.js
focusOf(baseId, ench = 0): number | null     // ench 0: it.f; ench > 0: it.ef?.[ench]; catálogo sem ef (cache velho) em ench > 0 => null ("sem dado")
// focus.js (puro)
export const FOCUS_HALF_PER = 10000, DAILY_FOCUS_PREMIUM = 10000
focusCost(base, efficiency = 0): number                                   // base * 0.5 ** (efficiency / FOCUS_HALF_PER)
craftsWithBudget(budget, costPerCraft): number                            // floor(budget / custo); 0 se custo <= 0 ou orçamento <= 0
focusPerCraft({ base, efficiency, override }): { points, source: 'override' | 'formula' | 'none' }   // override > 0 vence; base 0/null => 'none'
craftFocusSummary({ rec, targetMid, prices, cfg, premium, bonusCity, base, efficiency, override, budget, reference }):
  null | { pointsPerCraft, pointsPerUnit, pointsLot, savingsPerCraft, savingsLot, silverPerPoint, craftsInBudget,
           feeOn, feeOff, costOn, costOff, profitOn, profitOff, verdict: 'worth'|'notworth'|'info'|'nofocus' }
refineFocusSummary({ uniq, ctx, rrrOn, rrrOff, base, efficiency, override, qty, budget, reference }): idem para o Refino (pontos = Σ etapas de materialPlan)
```
`craftFocusSummary` chama `computeCraft` duas vezes com `cfg.focus` `true` e `false` (nada de fórmula de RRR é escrita aqui; `rrr()` já está dentro de `computeCraft`). `savingsPerCraft = (costOff − costOn) / crafts` usa o **custo total** (`totalCost`), logo só ingredientes que retornam entram, a taxa de bancada cancela (F7) e uma rota de refino que mude com o foco também é contada.

## Onde aparece e UI

- **Craft:** no bloco Produção, ao lado de "Usar foco": campos **"Eficiência de foco (pontos)"**, **"Foco por craft mostrado no jogo (opcional)"**, **"Foco disponível hoje"** (padrão 10.000) e **"Quanto vale 1 ponto para você (prata, opcional)"**. Cartão **"Foco"** com: pontos por craft (e por unidade, se o craft rende mais de 1) e pelo lote; economia de material com foco (prata) e **prata por ponto**; "o orçamento esgota em N crafts"; lucro com e sem foco.
- **Veredito "vale usar foco?":** só com a referência preenchida ("vale: 6,78 ≥ 5 por ponto" / "não vale"); sem referência, o cartão diz "use o foco no item com maior prata por ponto" (a ranqueação entre itens é a IDEIA-013). Item com `f = 0`: "o dump não traz custo de foco para este item".
- **Refino:** cartão análogo para a Tábua/Barra/Couro/Tecido escolhido (pontos somando as etapas da rota, prata por ponto sobre o custo líquido).
- Texto fixo: "A taxa de bancada não muda com foco. Eficiência e foco do jogo são os que a sua conta mostra."

## Tasks (1 commit cada; testes primeiro, vistos falhar)

### Task 1: fórmula do custo de foco e orçamento (`focus.js`), números do dossiê §4
**Files:** Create `focus.test.js`, `focus.js` (parte pura).
- [ ] **Step 1: testes falhando** (`Failed to resolve import "./focus"`):

```js
it.each([[31000, 149.99], [300, 1259.53], [15500, 439.18]])('espada T4.0 (base 1286), eficiência %s → %s', (e, esperado) => expect(focusCost(1286, e)).toBeCloseTo(esperado, 2));
it('eficiência 0 = custo cheio; cada 10.000 divide ao meio', () => { expect(focusCost(1286, 0)).toBe(1286); expect(focusCost(1286, 10000)).toBeCloseTo(643, 9); expect(focusCost(1286, 20000)).toBeCloseTo(321.5, 9); });
it('orçamento 9.000: 60 crafts a 149,99 e 7 a 1.259,53 (AFM)', () => { expect(craftsWithBudget(9000, focusCost(1286, 31000))).toBe(60); expect(craftsWithBudget(9000, focusCost(1286, 300))).toBe(7); });
it('orçamento: custo 0, negativo ou orçamento 0 não dividem por zero', () => { for (const [b, c] of [[100, 0], [100, -1], [0, 10], [NaN, 10]]) expect(craftsWithBudget(b, c)).toBe(0); });
it('override vence a fórmula; base 0 ou null = none', () => {
  expect(focusPerCraft({ base: 1286, efficiency: 31000, override: 120 })).toEqual({ points: 120, source: 'override' });
  expect(focusPerCraft({ base: 1286, efficiency: 31000 }).source).toBe('formula'); expect(focusPerCraft({ base: 0 }).source).toBe('none'); expect(focusPerCraft({ base: null }).source).toBe('none'); });
it('encantos: espada .1 a 31.000 = 262,53 (2.251 do dump)', () => expect(focusCost(2251, 31000)).toBeCloseTo(262.53, 2));
```
  Contas do dossiê §4: 1286 × 0,5^3,1 = **149,99**; × 0,5^0,03 = **1.259,53**; × 0,5^1,55 = **439,18** ("tabela da AFM bate"); 9.000 / 149,99 = 60,0 → **60**; 9.000 / 1.259,53 = 7,15 → **7**.
- [ ] **Step 2:** FAIL. **Step 3:** implementar `focusCost`, `craftsWithBudget`, `focusPerCraft` e as constantes. **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: focus.js com o custo de foco 0,5^(E/10000) e o orçamento diário`.

### Task 2: catálogo exporta o foco por encanto (`ef`) e `focusOf`
**Files:** Modify `catalog.real.test.js`, `catalog.test.js`, `build-catalog.mjs`, `catalog.json`, `build-test-fixture.mjs`, `catalog.fixture.json`, `catalog-diff.mjs`, `catalog.js`. **Assume 039 e 049 mescladas** (o parser já devolve `[id, n, 1]` e `alt`).
- [ ] **Step 1: testes falhando (catálogo real, depois fixture).** Valores do dossiê F2 e do dump:

```js
it('ef do dump: espada T4 .1 a .4 = 2.251, 3.939, 6.893, 12.064 (dossiê F2)', () => expect(byId.T4_MAIN_SWORD.ef).toEqual({ 1: 2251, 2: 3939, 3: 6893, 4: 12064 }));
it('prancha T4: f 54; ef .1 = 94 (dossiê F2) e .2 = 164 (dump)', () => { expect(byId.T4_PLANKS.f).toBe(54); expect(byId.T4_PLANKS.ef).toMatchObject({ 1: 94, 2: 164 }); });
it('poção T4: f 210 por craft de 5 unidades; ef 277, 411, 811 (dump, 3 níveis)', () => { expect(byId.T4_POTION_HEAL).toMatchObject({ f: 210, a: 5 }); expect(byId.T4_POTION_HEAL.ef).toEqual({ 1: 277, 2: 411, 3: 811 }); });
it('armadura Royal não tem foco no dump: f 0 e sem ef', () => { expect(byId.T4_ARMOR_PLATE_ROYAL.f).toBe(0); expect(byId.T4_ARMOR_PLATE_ROYAL.ef).toBeUndefined(); });
it('contagens: 1.240 itens com ef, 4.869 entradas; f e demais campos inalterados', () => { const w = cat.items.filter((i) => i.ef); expect(w).toHaveLength(1240); expect(w.reduce((s, i) => s + Object.keys(i.ef).length, 0)).toBe(4869); });
it('o catálogo novo continua válido (067)', () => expect(validateCatalog(cat)).toEqual({ ok: true, problems: [] }));
// fixture: focusOf
it('focusOf: nível 0 usa f; nível n usa ef[n]; sem dado = null', () => { expect(focusOf('T4_MAIN_SWORD', 0)).toBe(1286); expect(focusOf('T4_MAIN_SWORD', 3)).toBe(6893); expect(focusOf('T4_ARMOR_PLATE_ROYAL', 2)).toBeNull(); expect(focusOf('T9_NADA')).toBeNull(); });
it('catálogo antigo sem ef (cache velho): ench > 0 devolve null, não 0', () => { /* setCatalog de item {i:'T4_X', f:100, r:[]} → focusOf('T4_X',1) === null; focusOf('T4_X',0) === 100 */ });
```
- [ ] **Step 2:** FAIL (`ef` ausente). **Step 3:** no build, onde `rec = parseRecipe(en.craftingrequirements)` (encantos de equipamento e, no ramo `isResource`, `rec` das variantes `_LEVELn`) guardar `ef[n] = rec.f` **só se `rec.f > 0`**; gravar `entry.ef = ef` se não vazio. Acrescentar `focusOf` em `catalog.js`. Fixture: `ef` vem verbatim; acrescentar a `IDS` o que faltar entre `T4_MAIN_SWORD T4_METALBAR T4_LEATHER T4_POTION_HEAL T4_ARMOR_PLATE_ROYAL T4_PLANKS` e regenerar.
- [ ] **Step 4:** `node scripts/build-catalog.mjs`; `node scripts/catalog-diff.mjs <pós-049> client/public/data/catalog.json` mostra só `ef` (1.240 itens; 4.869 entradas) e nada mais (`vals`/`extra` iguais). **Step 5:** PASS; `npm run check`. **Step 6: Commit:** `feat: catálogo exporta o foco por encanto (ef) e focusOf`.

### Task 3: economia do foco e prata por ponto no Craft (`craftFocusSummary`)
**Files:** Modify `focus.test.js`, `focus.js`.
- [ ] **Step 1: testes falhando** (fixture; espada T4 em Lymhurst com `specialty: true` explícito para não depender da tabela de cidades; refino dos materiais em `buy`; preços `T4_METALBAR` 200 e `T4_LEATHER` 150; `crafts: 1`; taxa 500; premium; `bonusCity: null`; helpers `craftCfg`/`mkPrices` da 001):

```js
const S = (o) => craftFocusSummary({ ...base, cfg: craftCfg({ specialty: true, feePer100: 500, refine: BUY }), base: 1286, ...o });
it('dossiê §4: economia do foco = 3.308,27 − 2.291,67 = 1.016,60 por craft', () => expect(S({ efficiency: 31000 }).savingsPerCraft).toBeCloseTo(1016.60, 2));
it('prata por ponto: 6,78 com eficiência 31.000 (100/100) e 0,81 com 300 (nó 10, sem spec)', () => { expect(S({ efficiency: 31000 }).silverPerPoint).toBeCloseTo(6.78, 2); expect(S({ efficiency: 300 }).silverPerPoint).toBeCloseTo(0.81, 2); });
it('pontos e orçamento: 149,99 por craft; 9.000 de foco = 60 crafts', () => { const s = S({ efficiency: 31000, budget: 9000 }); expect(s.pointsPerCraft).toBeCloseTo(149.99, 2); expect(s.craftsInBudget).toBe(60); });
it('a taxa de bancada não muda com foco (dossiê F7): 216 por craft com ou sem foco', () => { const s = S({ efficiency: 31000 }); expect(s.feeOn).toBe(216); expect(s.feeOff).toBe(216); });   // 384 × 0,1125 × 500/100
it('override do jogo vence a fórmula: 120 pontos → prata/ponto = 1.016,60/120 = 8,47', () => expect(S({ efficiency: 31000, override: 120 }).silverPerPoint).toBeCloseTo(8.4717, 3));
it('lote: 100 crafts multiplica pontos e economia (a razão por ponto não muda)', () => { const s = S({ efficiency: 31000 }); const l = craftFocusSummary({ ...base, cfg: craftCfg({ specialty: true, feePer100: 500, refine: BUY, crafts: 100 }), base: 1286, efficiency: 31000 }); expect(l.pointsLot).toBeCloseTo(100 * s.pointsPerCraft, 6); expect(l.silverPerPoint).toBeCloseTo(s.silverPerPoint, 6); });
it('veredito: sem referência = info; referência 5 → worth (6,78 ≥ 5); referência 10 → notworth; base 0 → nofocus', () => { /* S({reference: 5}).verdict ... */ });
it('artefato não retorna: o foco só economiza o que retorna (item com artefato: economia = só barras/couro)', () => { /* T6_MAIN_SWORD_CRYSTAL: savingsPerCraft == (soma dos retornáveis) × (RRRon − RRRoff); o artefato não entra */ });
it('item rende 5 (poção): pontos por unidade = pontos por craft / 5', () => { /* T4_POTION_HEAL base 210: pointsPerUnit = pointsPerCraft / 5 */ });
it('sem preços: null (não inventa número)', () => expect(craftFocusSummary({ ...base, prices: null, cfg: craftCfg({}), base: 1286 })).toBeNull());
```
  Contas do dossiê §4: bruto 16×200 + 8×150 = **4.400**; RRR sem foco 33/133 = 24,8120%, com foco 92/192 = 47,9167%; material **3.308,27** × **2.291,67**; economia **1.016,60**; prata por ponto **1.016,60 / 149,99 = 6,78** e **/ 1.259,53 = 0,81**; taxa **216** (valor 384). (`8,4717` e a razão do lote são contas derivadas.)
- [ ] **Step 2:** FAIL. **Step 3:** implementar `craftFocusSummary` (duas chamadas a `computeCraft`; `pointsPerUnit = points / rec.amount`; `verdict` pela referência). **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: economia do foco e prata por ponto no craft (craftFocusSummary)`.

### Task 4: campos validados (`inputRules.js`)
**Files:** Modify `inputRules.test.js`, `inputRules.js`.
- [ ] **Step 1: testes falhando:** `validateInputs({ efficiency })`: vazio → 0 sem aviso; negativo/texto → 0 com `error`; acima de **31.000** (máximo 100/100 do dossiê F4, AFM) → 31.000 com `warn`; decimal aceito. `focusPoints` (override): vazio → ausente (`null`, sem aviso); `≤ 0` ou texto → `null` com `error`; `> MAX_QTY` → `MAX_QTY` com `warn`. `focusBudget`: vazio → `DAILY_FOCUS_PREMIUM`; negativo/texto → padrão com `error`; `0` aceito; `> MAX_QTY` → `MAX_QTY`. `focusRef` (referência): vazio → `null`; negativo/texto → `null` com `error`; `0` aceito. Idempotentes.
- [ ] **Step 2:** FAIL. **Step 3:** implementar na mesma estrutura dos campos existentes. **Step 4: DT-008 (só se ainda aberta, `grep` por teste de `fmt` em 1e15):** fechar como descrito no plano da 010 (Task 4, Step 4). **Step 5:** PASS; `npm run check`. **Step 6: Commit:** `feat: campos de foco validados (eficiência, foco do jogo, orçamento, referência)`.

### Task 5: tela do Craft
**Files:** Create `components/FocusCard.jsx`; Modify `Crafting.jsx`.
- [ ] **Step 1:** em `Crafting.jsx`, os quatro campos no bloco Produção (persistidos em `craft:cfg`: `focusEff`, `focusPoints`, `focusBudget`, `focusRef`), `validateInputs` + `InputIssues` sob cada campo; `const fs = rec && prices ? craftFocusSummary({..., base: focusOf(sel.id, sel.ench), ...valores validados}) : null`; `<FocusCard summary={fs} />` abaixo do cartão de resultado. `FocusCard` só apresenta (pontos, economia, prata por ponto, N crafts, lucro com e sem foco, veredito); `source: 'none'` mostra a nota do dump; `focusOf(...) === null` (catálogo sem dado) mostra "sem dado de foco para este encanto".
- [ ] **Step 2:** `npm run check`; smoke (`npm run dev`): espada T4 em Lymhurst, preços ao vivo: eficiência 31.000 → pontos ≈ 150; trocar encanto para .1 muda a base para 2.251; item Royal mostra a nota; "Usar foco" continua alterando o RRR como antes (nenhum número do resto da tela muda). **Step 3: Commit:** `feat: cartão Foco no Craft (pontos, prata por ponto, orçamento e veredito)`.

### Task 6: Refino (`refineFocusSummary` e cartão)
**Files:** Modify `focus.test.js`, `focus.js`, `Refining.jsx`.
- [ ] **Step 1: testes falhando** (Cenário A da 001: `planksSpec()`, `T4_PLANKS`, `ctx = { prices, city: 'best', useOrders: false, feePer100: 400, route: 'buy' }`; `rrrOff = 58/158` (cidade especializada), `rrrOn = 117/217`):

```js
it('Tábua T4, rota buy: pontos por unidade = f(T4_PLANKS) = 54 com eficiência 0', () => expect(refineFocusSummary({ uniq: 'T4_PLANKS', ctx, rrrOn: 117 / 217, rrrOff: 58 / 158, base: focusOf('T4_PLANKS', 0), qty: 1 }).pointsPerUnit).toBeCloseTo(54, 9));
it('economia por unidade = bruto 110 × (0,632911 − 0,460829) = 18,93 → 0,35 prata por ponto', () => { const s = refineFocusSummary({ /* idem */ }); expect(s.savingsPerUnit).toBeCloseTo(18.929, 3); expect(s.silverPerPoint).toBeCloseTo(0.3505, 4); });
it('rota all soma o foco de cada etapa: T4 (54) + T3 (31 × etapas) + T2 (18 × etapas), usando as quantidades do materialPlan com foco', () => { /* conferir contra soma manual: pontos = 54 + 31·(1−117/217)·1 + 18·(1−117/217)²·1, por unidade */ });
it('encanto .1 usa ef: T4_PLANKS_LEVEL1 (94)', () => {});
it('sem foco no catálogo (f null): summary.verdict = nofocus', () => {});
```
  (T3 f = 31 e T2 f = 18 vêm do catálogo; o teste lê `focusOf`, não repete os números. Conta da economia: 110 × (100/158 − 100/217) = 110 × 0,172082 = **18,929**; /54 = **0,3505**.)
- [ ] **Step 2:** FAIL. **Step 3:** implementar `refineFocusSummary` (usa `refineUnit` duas vezes e `materialPlan(unit, 1, rrrOn).makes` com `parseMarketId` + `focusOf`); cartão no `Refining.jsx` com os mesmos campos (eficiência e referência próprias em `refine:cfg`). **Step 4:** PASS; `npm run check`; smoke com a Tábua T4. **Step 5: Commit:** `feat: foco no Refino (pontos por etapa e prata por ponto)`.

## Como o Tester valida

1. **Dossiê §4 (recalcular à mão):** base 1.286; eficiência 31.000 → 1.286 × 0,5^3,1 = **149,99**; 300 → **1.259,53**; 15.500 → **439,18**. Preços 200/150: bruto **4.400**; RRR 24,8120% × 47,9167%; material **3.308,27** × **2.291,67**; economia **1.016,60**; prata por ponto **6,78** e **0,81**; 9.000 de orçamento = **60** e **7** crafts; taxa **216** com e sem foco.
2. **Catálogo:** `node scripts/catalog-diff.mjs`: só `ef` muda (1.240 itens, 4.869 entradas); amostra de 10 itens comparada com o `@craftingfocus` de cada `<enchantment>` do `items.json` do SHA fixado (espada .1 a .4 = 2.251/3.939/6.893/12.064; prancha .1 = 94).
3. **Override:** digitar o valor mostrado pela janela de craft do jogo (ex.: 120) e conferir que ele vence a fórmula e que a razão por ponto muda de acordo. Pedido de medição ao usuário (já previsto no dossiê §7): um print do foco por craft com a sua eficiência, para validar a fórmula uma vez.
4. **Regressão:** com o campo de foco em branco, nenhum número do resto do Craft/Refino muda (diferencial com `master` em 50 combinações); `rrr()` e `computeCraft` inalterados.
5. **Mutações:** `0,5` → `0,4`; `/10000` → `/1000`; `floor` → `round` no orçamento; economia usando o custo sem separar o que retorna (o artefato entraria); foco somando à taxa; override ignorado; `ef[n]` trocado por `f`. Todas devem derrubar teste.
6. **O que um jogador experiente estranharia:** prata por ponto negativa ou infinita; pontos > custo base; foco "grátis" em item Royal (deve dizer que o dump não traz custo); poção mostrando pontos por craft em vez de por unidade sem rótulo; veredito "vale" sem a referência preenchida; o orçamento do dia dando fração de craft.

## Riscos

1. **Eficiência em pontos é digitada pelo usuário**; sem ela o custo é o cheio (sobrestima o foco gasto). A conversão níveis→eficiência fica fora (fonte única, pergunta 2).
2. **Foco por receita/encanto vem de uma só leitura do dump** (primeira receita); itens com receitas alternativas (049) têm o mesmo foco nas alternativas (dossiê 049 A3, confirmado 560 de 560).
3. O foco do refino dos materiais usados no Craft (`refineFocus`) **não** entra no cartão do Craft (só o foco do item final); o cartão do Refino cobre o refino. Limitação declarada na tela.
4. O catálogo cresce ~55 KB; o `?v=<hash>` (067) garante a troca sem cache velho.
5. Conflito mecânico com a 049 em `build-catalog.mjs`: por isso a ordem 049 → 002.

## Critério de pronto

`npm run check` verde; casos do dossiê §4 em teste; `ef` no catálogo (1.240/4.869) e validado pela 067; cartões no Craft e no Refino; nenhum literal 0,5/10000/31000/10000 fora das constantes nomeadas (`grep`); só os arquivos listados alterados.

## PERGUNTAS PARA O GERENTE

1. **"Vale usar foco?"** O jogo não vende foco por prata, então o veredito só existe contra uma referência digitada pelo usuário (prata por ponto que ele obtém em outro item); sem ela, o cartão só mostra o número. Aceita, ou prefere esperar a IDEIA-013 (ranking) para o veredito?
2. **Níveis de especialização → eficiência (coeficientes 30/250/280 da AFM):** fonte única e variável por item (albionutil: 265). O plano pede a eficiência direta ao usuário e **não** implementa o conversor. Confirma?
3. **Padrão de orçamento 10.000** (oferta Premium, dossiê F6: fontes de 2017/2023): aceita como padrão editável?
4. **Foco dos materiais refinados dentro do Craft** (`refineFocus`) fica fora do cartão do Craft; quer que entre numa 2ª fase?
5. Ordem 039 → 049 → 002: confirma que a 002 espera as duas por causa de `build-catalog.mjs`/`catalog.json`/fixture?
