# IDEIA-049 — Receitas alternativas (artefato **ou** ficha de favor; base Royal SET1/2/3): plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-049`. Comandos `npm` em `client/`; `node` na raiz para o catálogo. **Pré-requisitos (assumidos mesclados):** IDEIA-001, 019, 038, 057, 060, 066, 067 e **039** (a regra "não retorna" conservadora D-017 e o formato `[id, n, 1]`). **Regra do briefing:** cada teste é escrito, **executado e visto falhar** antes da implementação.

**Objetivo:** hoje o parser lê só a primeira receita de cada item. Para 560 itens que aceitam **artefato ou ficha de favor** e para 45 itens **Royal** (base SET1/2/3), o app assume sempre a primeira (artefato; SET1) e nunca mostra a alternativa, mesmo quando é mais barata. A funcionalidade oferece as receitas alternativas no Craft e marca a **mais barata agora**. Fonte: `docs/research/IDEIA-049.md` (A1 a A7, §4 caso `T4_2H_ARCANESTAFF_HELL` com preços reais, teste de contagem do parser). Confiança: estrutura ALTA, comparação de preço MÉDIA.

## Fatos do dump conferidos pelo Planejador (2026-11-18, `items.json` do SHA fixado, em cache local)

- **Itens do catálogo com mais de uma receita de craft: 635.** Destes, **560** têm artefato/ficha de favor (todos com exatamente 2 receitas), **45** são `*_ROYAL` (3 receitas: SET1, SET2, SET3) e **30** são recursos **refinados** (`T4_PLANKS`, `T4_METALBAR`, `T4_STONEBLOCK`, T4 a T8…).
- Nos **605** itens de artefato/Royal, as alternativas diferem **em exatamente um ingrediente, na mesma posição**, com mesma quantidade, mesmo `@maxreturnamount`, mesmo foco, mesmo tempo, mesmo `amountcrafted`: **605 de 605**, em **todos** os níveis de encanto (2.420 receitas encantadas). Posições: 0 (Royal), 1 e 2 (artefato). O artefato é sempre a **primeira** receita (0 casos com a ficha primeiro); o catálogo atual já guarda a primeira, então `r` continua igual.
- **Os 30 refinados têm outra natureza (não é artefato):** `T4_PLANKS` tem 2 receitas, e a 2ª usa **1 `T4_WOOD` + 1 `T1_FACTION_FOREST_TOKEN_1` + 1 `T3_PLANKS`** (ficha de facção no lugar de 1 madeira); `T4_STONEBLOCK` tem 5 (as outras são receitas de pedra encantada com `amountcrafted` 2/4/8). **Fora de escopo** (afetaria o Refino; pergunta 1): o plano os **exclui** de forma explícita e testada.
- Valores do dump: `T4_ARTEFACT_2H_ARCANESTAFF_HELL` itemvalue **384**; `T4_ARTEFACT_TOKEN_FAVOR_2` itemvalue **896**. **Nenhum dos 110 ids de ingrediente alternativo está hoje em `vals`** (o catálogo só guarda valor do que aparece na primeira receita): vão entrar.

## Desenho (formato novo e compatível)

`r` e `er` **não mudam** (primeira receita, como hoje). Cada item de artefato/Royal ganha:

```json
"alt": { "at": 2, "v": [["T4_ARTEFACT_TOKEN_FAVOR_2", 1, 1]] }          // artefato: 1 alternativa (ficha), no índice 2 da lista r
"alt": { "at": 0, "v": [["T4_ARMOR_PLATE_SET2", 1, 1], ["T4_ARMOR_PLATE_SET3", 1, 1]] }   // Royal: 2 alternativas (SET2 e SET3), no índice 0
```
`v[k]` é o ingrediente **inteiro** (mesmo formato de `r`, com o 3º elemento `1` = "não retorna" do dump, da 039) que **substitui** o do índice `at` da receita do nível pedido (a base ou `er[n]`/regra). Variante 0 = a receita atual; variante k = a receita com `v[k-1]` no lugar. **Por que não guardar receitas completas:** o dump prova (605/605, todos os níveis) que só um ingrediente muda; guardar o par `(índice, substitutos)` custa ~40 KB em vez de ~170 KB e não cria 2.420 listas duplicadas. O build **falha com erro claro** se algum item violar a hipótese (posição ou quantidade diferente entre níveis, mais de uma diferença): o formato nunca é gravado errado em silêncio.

**Como o catálogo novo continua passando em `validateCatalog` (067):** `alt` é **opcional**: nenhuma linha nova em `REQUIRED` (catálogo antigo, sem `alt`, continua válido e o app mostra uma só receita, como hoje). O que muda é que a validação ganha o formato de `alt` **quando existe** (Task 4, que também fecha a DT-007). `r`, `er`, `cityOf`, `items` etc. ficam idênticos, então o catálogo novo passa em `validateCatalog` e o antigo também.

**Como não regredir 039 e 038:** (a) `recipeOf` aplica a **mesma** função de mapeamento de ingrediente (`toRes`) à receita base e às variantes: `returnable = !nr && !FRAGMENT_RE.test(uniq)` (união conservadora, D-017) vale para artefato, ficha e SET2/3 sem código novo; teste explícito. (b) `cc` e `craftBonusCity(item)` (038) são **por item**, não por receita: não mudam; teste de que itens com `alt` mantêm a cidade de antes (ex.: `T4_2H_ARCANESTAFF_HELL` → a mesma de hoje, Royal → `null`). (c) A taxa de bancada continua `recipeValue(rec)` da variante escolhida (regra atual, **NÃO VERIFICADA** quanto ao ingrediente especial, AUDITORIA §2/D-012): a ficha (896) e o artefato (384) têm itemvalue diferente, então a taxa difere entre as receitas; a tela avisa.

## Arquivos: exclusivos, compartilhados, ordem

**Criados:** `client/src/lib/recipeAlt.js`, `client/src/lib/recipeAlt.test.js`, `client/src/components/RecipePicker.jsx`.
**Alterados (catálogo, mesmo grupo de 039 e 002):** `scripts/build-catalog.mjs`, `client/public/data/catalog.json` (regenerado), `scripts/catalog-diff.mjs` (conta `alt`), `client/src/lib/catalog.js` (`recipeOf` e `recipeVariants`), `catalog.test.js`, `catalog.real.test.js`, `scripts/build-test-fixture.mjs`, `client/src/test/catalog.fixture.json` (regenerado), `client/src/lib/catalogLoad.js` + `catalogLoad.test.js` (DT-007), e o teste de `vercel.json`/URL (DT-006, em `catalogLoad.test.js`).
**Alterados (app):** `client/src/components/Crafting.jsx` (o seletor da receita e o conjunto de ids).
**NÃO toca:** `craftPlan.js` (`computeCraft` recebe a receita pronta, e `craftChainIds` já aceita qualquer `rec`), `econ.js`, `refinePlan.js`, `Refining.jsx`, `exits.js`, `market.js`, `vercel.json`/`vite.config.js` (só são **lidos** em teste), `Flipper.jsx`.
**Compartilhados:** com **039** (mesmos arquivos de catálogo; **depende** dela: o formato `[id, n, 1]` e o `recipeOf` com a união conservadora), com **002** (`build-catalog.mjs`, `catalog.json`, fixture, `catalog.js`), e com 010/002 em `Crafting.jsx` (regiões distintas: aqui o topo do componente e o seletor).
**Ordem recomendada:** **039 → 049 → 002.** **Se a ordem for outra (049 antes da 039):** (1) `alt.v` já carrega o flag do dump (é lido direto de `@maxreturnamount`), mas `recipeOf` ainda usa o regex antigo: o `returnable` das variantes sairia errado (token e SET2/3 retornariam); (2) o Executor da 039 teria de aplicar a união também em `recipeVariants` e preservar o 3º elemento de `alt.v` na regeneração, o que o plano aprovado da 039 não prevê (precisaria de adendo). Por isso a ordem 039 → 049 é **exigida**, não só preferida.

## O que muda em `catalog.json` (conferência do Tester)

| Medida | Antes (pós-039) | Depois |
|---|---|---|
| `items.length`, itens com `r`, `er`, `f`, `cc`, `tm`, `cityOf`, `encNames` | — | **idênticos** (diferencial item a item) |
| campo `alt` | inexistente | **605 itens** (560 artefato/ficha com 1 substituto; 45 Royal com 2) |
| `vals` | — | **+110 chaves** (20 fichas `T4..T8_ARTEFACT_TOKEN_FAVOR_1..4`, 90 bases `*_SET2`/`*_SET3`); nenhuma existente muda; `T4_ARTEFACT_TOKEN_FAVOR_2` = 896 |
| `extra` | — | **sem mudança esperada** (os 110 ids já são itens ou extras); o Executor reporta qualquer diferença antes de seguir |
| refinados (`crafting/refinedresources`) | — | **nenhum `alt`** (os 30 com ficha de facção ficam de fora) |
| tamanho | — | ~ +40 KB |
Valores do Planejador (script próprio sobre o dump em cache); o Tester refaz com `node scripts/catalog-diff.mjs` e script próprio. Lição da 057 (`vals` fora do plano): **qualquer diferença além desta tabela interrompe a execução** para decisão do Gerente.

## Interfaces

```js
// catalog.js
recipeOf(baseId, ench = 0, variant = 0): rec | null     // variant 0 = como hoje (resultado idêntico ao de antes para TODOS os itens e níveis); variant k>0: substitui o ingrediente `alt.at` por `alt.v[k-1]`; variante inexistente => null
recipeVariants(baseId, ench = 0): Array<{ variant: number, rec, swapped: string }>   // [{variant:0, swapped: <ingrediente original>}, ...]; item sem alt => 1 elemento; sem receita => []
// rec ganha `variants: number` (1 + alt.v.length)
// recipeAlt.js (puro)
variantLabel(uniq): string                // 'Ficha de favor' (TOKEN_FAVOR) | 'Artefato' (ARTEFACT) | 'Base N' (…SET<N>) | `Alternativa`
pickCheapest(results): number             // índice da variante de menor totalCost entre as COMPLETAS (missing vazio e totalCost > 0); empate: a primeira; nenhuma completa: 0
```

## Onde aparece e UI

- **Craft:** quando o item tem mais de uma receita aparece, logo abaixo do item, o seletor **"Receita"** (segmentado: "Artefato", "Ficha de favor" ou "Base 1/2/3") com o **custo total de cada receita** e o selo **"mais barata agora"**; o padrão é "Automático" (usa a mais barata com os preços atuais; sem preços completos, a primeira).
- Escolher uma receita fixa o cálculo, o plano de compra, o "Onde vender" e o preço-alvo nela; os preços de **todas** as alternativas são consultados juntos (uma só ida à API).
- Aviso fixo quando há alternativas: "A taxa de bancada usa o valor do dump de cada ingrediente (ficha 896, artefato 384): ainda não verificado em jogo."
- Itens sem alternativa não mostram nada novo. Refino e Flipper não mudam.

## Tasks (1 commit cada; testes primeiro, vistos falhar)

### Task 1: build exporta `alt` (teste do catálogo real primeiro)
**Files:** Modify `catalog.real.test.js`, `build-catalog.mjs`, `catalog-diff.mjs`, `catalog.json`.
- [ ] **Step 1: testes falhando** (acrescentar a `catalog.real.test.js`, que lê `public/data/catalog.json`; dossiê §4 "teste de contagem do parser"):

```js
const withAlt = cat.items.filter((i) => i.alt);
it('contagem do parser (dossiê §4): arcanestaff 2 receitas, Royal 3, espada 1', () => {
  expect(1 + byId.T4_2H_ARCANESTAFF_HELL.alt.v.length).toBe(2); expect(1 + byId.T4_ARMOR_PLATE_ROYAL.alt.v.length).toBe(3); expect(byId.T4_MAIN_SWORD.alt).toBeUndefined(); });
it('formato: arcanestaff at 2 com a ficha 2; Royal at 0 com SET2 e SET3', () => {
  expect(byId.T4_2H_ARCANESTAFF_HELL.alt).toEqual({ at: 2, v: [['T4_ARTEFACT_TOKEN_FAVOR_2', 1, 1]] });
  expect(byId.T4_ARMOR_PLATE_ROYAL.alt).toEqual({ at: 0, v: [['T4_ARMOR_PLATE_SET2', 1, 1], ['T4_ARMOR_PLATE_SET3', 1, 1]] }); });
it('605 itens com alt: 560 de artefato/ficha e 45 Royal', () => { expect(withAlt).toHaveLength(605); expect(withAlt.filter((i) => /_ROYAL$/.test(i.i))).toHaveLength(45); expect(withAlt.filter((i) => i.alt.v.length === 1)).toHaveLength(560); });
it('invariante: a alternativa só troca o ingrediente em alt.at (mesma quantidade e mesmo flag)', () => {
  for (const i of withAlt) for (const v of i.alt.v) { expect(v[1]).toBe(i.r[i.alt.at][1]); expect(v[2] ?? 0).toBe(i.r[i.alt.at][2] ?? 0); expect(v[0]).not.toBe(i.r[i.alt.at][0]); } });
it('refinados NÃO têm alt (ficha de facção fica de fora)', () => { expect(byId.T4_PLANKS.alt).toBeUndefined(); expect(cat.items.filter((i) => i.c === 'crafting/refinedresources' && i.alt)).toEqual([]); });
it('r, er, f, cc, tm intocados: T4_2H_ARCANESTAFF_HELL.r continua com o artefato na 3ª posição', () => expect(byId.T4_2H_ARCANESTAFF_HELL.r).toEqual([['T4_PLANKS', 20], ['T4_METALBAR', 12], ['T4_ARTEFACT_2H_ARCANESTAFF_HELL', 1, 1]]));
it('vals ganhou os ingredientes alternativos: ficha 896; 110 ids novos', () => { expect(cat.vals.T4_ARTEFACT_TOKEN_FAVOR_2).toBe(896); expect(Object.keys(cat.vals).filter((k) => /TOKEN_FAVOR|SET[23]$/.test(k))).toHaveLength(110); });
it('o catálogo novo é válido (067)', () => expect(validateCatalog(cat)).toEqual({ ok: true, problems: [] }));
```
- [ ] **Step 2:** `npx vitest run src/lib/catalog.real.test.js` → FAIL. **Step 3: implementar no build:** nova `parseAlternatives(it, baseRes)`: para o item (e para cada nível `enchantment`) listar as receitas de craft **não** transmutação; aceitar como alternativas só quando (i) o item tem ingrediente `ARTEFACT` em alguma receita **ou** termina em `_ROYAL` **e** (ii) cada receita extra difere da primeira em **exatamente um índice**, com mesma quantidade e mesmo flag; calcular `at` e `v`; **lançar erro** se `at` for diferente entre níveis ou se a hipótese falhar; gravar `entry.alt` e acrescentar os ids de `v` a `needed` (assim `vals` os recebe). Refinados e demais itens com várias receitas: contar e imprimir "ignorados: N" (esperado 30). `catalog-diff.mjs` passa a imprimir contagem de `alt` e de ingredientes alternativos.
- [ ] **Step 4:** `node scripts/build-catalog.mjs` → linha de resumo com `605 alt, 30 ignorados`; `node scripts/catalog-diff.mjs <pós-039> client/public/data/catalog.json` bate com a tabela acima (`alt` 0 → 605; `vals` +110; todo o resto sem diferença). **Step 5:** PASS; `npm run check`. **Step 6: Commit:** `feat: catálogo exporta receitas alternativas (alt) de artefato/ficha e Royal`.

### Task 2: `recipeOf` com variante, `recipeVariants`, fixture e DT-006
**Files:** Modify `catalog.js`, `catalog.test.js`, `build-test-fixture.mjs`, `catalog.fixture.json`; Create/Modify `catalogLoad.test.js` (DT-006).
- [ ] **Step 1: fixture.** Acrescentar a `IDS`: `T4_ARTEFACT_TOKEN_FAVOR_2 T4_ARMOR_PLATE_SET2 T4_ARMOR_PLATE_SET3` (os demais, `T4_2H_ARCANESTAFF_HELL`, `T4_ARTEFACT_2H_ARCANESTAFF_HELL`, `T4_ARMOR_PLATE_ROYAL`, `T4_ARMOR_PLATE_SET1`, `T4_METALBAR`, vêm da 039). No gerador, a regra de `vals` passa a incluir também os ids de `alt.v` dos itens listados. Regenerar.
- [ ] **Step 2: testes falhando** (`beforeEach(loadFixtureCatalog)`):

```js
const ret = (id, ench = 0, v = 0) => recipeOf(id, ench, v).res.map((x) => [x.uniq, x.returnable]);
it('variante 0 é igual à receita de sempre (para todos os itens e níveis da fixture)', () => { for (const it of allItems()) for (let n = 0; n <= it.x; n++) if (it.r) expect(recipeOf(it.i, n, 0)).toEqual(recipeOf(it.i, n)); });
it('arcanestaff: variante 1 troca o artefato pela ficha; o resto idêntico', () => {
  expect(ret('T4_2H_ARCANESTAFF_HELL', 0, 0)).toEqual([['T4_PLANKS', true], ['T4_METALBAR', true], ['T4_ARTEFACT_2H_ARCANESTAFF_HELL', false]]);
  expect(ret('T4_2H_ARCANESTAFF_HELL', 0, 1)).toEqual([['T4_PLANKS', true], ['T4_METALBAR', true], ['T4_ARTEFACT_TOKEN_FAVOR_2', false]]); });
it('39 não regride: ficha de favor e SET2/SET3 e o token Royal NÃO retornam', () => {
  expect(ret('T4_ARMOR_PLATE_ROYAL', 0, 1)).toEqual([['T4_ARMOR_PLATE_SET2', false], ['QUESTITEM_TOKEN_ROYAL_T4', false]]);
  expect(ret('T4_ARMOR_PLATE_ROYAL', 0, 2)[0]).toEqual(['T4_ARMOR_PLATE_SET3', false]); });
it('encanto .1: a variante troca só o ingrediente especial; planks e barras ficam _LEVEL1', () => {
  const r = recipeOf('T4_2H_ARCANESTAFF_HELL', 1, 1).res.map((x) => x.uniq); expect(r).toEqual(['T4_PLANKS_LEVEL1', 'T4_METALBAR_LEVEL1', 'T4_ARTEFACT_TOKEN_FAVOR_2']); });
it('recipeVariants: 2 (arcanestaff), 3 (Royal), 1 (espada), 0 (sem receita)', () => { expect(recipeVariants('T4_2H_ARCANESTAFF_HELL')).toHaveLength(2); expect(recipeVariants('T4_ARMOR_PLATE_ROYAL')).toHaveLength(3); expect(recipeVariants('T4_MAIN_SWORD')).toHaveLength(1); expect(recipeVariants('T4_WOOD')).toEqual([]); });
it('variante inexistente: null; rec.variants conta as receitas', () => { expect(recipeOf('T4_MAIN_SWORD', 0, 1)).toBeNull(); expect(recipeOf('T4_ARMOR_PLATE_ROYAL').variants).toBe(3); });
it('38 não regride: a cidade de bônus é do item, não da receita', () => { expect(craftBonusCity(getItem('T4_ARMOR_PLATE_ROYAL'))).toBeNull(); expect(craftBonusCity(getItem('T4_2H_ARCANESTAFF_HELL'))).toBe(cityOfCategory('arcanestaff')); });
it('ingredientValue dos novos ids: ficha 896 e artefato 384 (taxa usa o valor do dump)', () => { expect(ingredientValue('T4_ARTEFACT_TOKEN_FAVOR_2')).toBe(896); expect(ingredientValue('T4_ARTEFACT_2H_ARCANESTAFF_HELL')).toBe(384); });
// DT-006 (primeiro plano que toca catalog.js)
it('DT-006: vercel.json serve /data/ com revalidação sempre (max-age=0, must-revalidate)', () => { const h = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url))).headers.find((x) => x.source.startsWith('/data/')); expect(h.headers.find((k) => k.key === 'Cache-Control').value).toBe('public, max-age=0, must-revalidate'); });
it('DT-006: loadCatalog pede a URL com ?v= quando há id de build', async () => {
  vi.stubEnv('VITE_CATALOG_V', 'abc123'); const f = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => GOOD_CATALOG }); vi.stubGlobal('fetch', f); resetCatalog(); await loadCatalog();
  expect(f.mock.calls[0][0]).toMatch(/data\/catalog\.json\?v=abc123$/); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
```
- [ ] **Step 3:** FAIL (`recipeVariants` inexistente; `recipeOf` ignora o 3º argumento). **Step 4:** em `catalog.js` extrair o mapeamento de ingrediente de `recipeOf` para `toRes(entries)` (mesmo código atual da 039: `returnable`, `unverified`, `value`, `name`), implementar `recipeOf(…, variant)` (monta a lista do nível, troca `alt.at` por `alt.v[variant-1]`, passa por `toRes`), `recipeVariants` e `rec.variants`. **Step 5:** PASS; `npm run check`. **Step 6: Commit:** `feat: recipeOf com variante e recipeVariants; testes de DT-006 (vercel.json e ?v=)`.

### Task 3: escolha da mais barata (`recipeAlt.js`), números do dossiê §4
**Files:** Create `recipeAlt.test.js`, `recipeAlt.js`.
- [ ] **Step 1: testes falhando** (fixture; helpers `craftCfg`/`mkPrices`/`computeCraft` da 001/019; `specialty: true` explícito; refino dos materiais em `buy`; `bonusCity: null`; preços **hipotéticos** de tábua 100 e barra 200 (bruto 20×100 + 12×200 = 4.400) e os **reais do dossiê** para o especial: artefato **1.840**, ficha **18.498**):

```js
const price = (artefact, token) => mkPrices({ T4_PLANKS: 100, T4_METALBAR: 200, T4_ARTEFACT_2H_ARCANESTAFF_HELL: artefact, T4_ARTEFACT_TOKEN_FAVOR_2: token });
const run = (p) => recipeVariants('T4_2H_ARCANESTAFF_HELL').map((v) => computeCraft({ rec: v.rec, targetMid: 'T4_2H_ARCANESTAFF_HELL', prices: p, cfg: craftCfg({ specialty: true, refine: BUY }), premium: true, bonusCity: null }));
it('dossiê §4: especial A = 1.840 e B = 18.498; diferença de material 16.658; a mais barata é a do artefato', () => {
  const [a, b] = run(price(1840, 18498));
  expect(a.lines[2]).toMatchObject({ qty: 1, unit: 1840, returnable: false }); expect(b.lines[2]).toMatchObject({ qty: 1, unit: 18498, returnable: false });
  expect(b.matCost - a.matCost).toBeCloseTo(16658, 6); expect(pickCheapest([a, b])).toBe(0); });
it('com a taxa do dump: a diferença total é 16.889 (16.658 + 231 da taxa: ficha 896 × 0,1125 × 4 contra artefato 384)', () => {
  const [a, b] = run(price(1840, 18498)); expect(a.fee).toBe(403); expect(b.fee).toBe(634); expect(b.totalCost - a.totalCost).toBeCloseTo(16889, 6); });   // 896 e 1.408 de valor; × 0,45 arredonda no total (019)
it('material comum igual nas duas: (20×100 + 12×200) × 0,751880 = 3.308,27', () => { const [a, b] = run(price(1840, 18498)); expect(a.matCost - 1840).toBeCloseTo(3308.27, 2); expect(b.matCost - 18498).toBeCloseTo(3308.27, 2); });
it('inverte quando a ficha é mais barata: ficha 1.000, artefato 1.840 → índice 1', () => { const r = run(price(1840, 1000)); expect(pickCheapest(r)).toBe(1); });
it('ignora a receita incompleta: ficha sem preço (missing) → escolhe o artefato mesmo sendo mais caro', () => expect(pickCheapest(run(price(1840, null)))).toBe(0));
it('nenhuma completa → 0; empate → a primeira; lista de 1 → 0', () => { /* ... */ });
it('Royal (derivado do dossiê: mínimo(SET1,SET2,SET3) + 4 × token): SET1 3.000, SET2 2.500, SET3 3.200, token 500', () => {
  const p = mkPrices({ T4_ARMOR_PLATE_SET1: 3000, T4_ARMOR_PLATE_SET2: 2500, T4_ARMOR_PLATE_SET3: 3200, QUESTITEM_TOKEN_ROYAL_T4: 500 });
  const r = recipeVariants('T4_ARMOR_PLATE_ROYAL').map((v) => computeCraft({ rec: v.rec, targetMid: 'T4_ARMOR_PLATE_ROYAL', prices: p, cfg: craftCfg({ specialty: true }), premium: true, bonusCity: null }));
  expect(pickCheapest(r)).toBe(1); expect(r[1].matCost).toBeCloseTo(4500, 6); expect(r[0].matCost).toBeCloseTo(5000, 6); expect(r[2].matCost).toBeCloseTo(5200, 6); });   // nada retorna (039)
it('variantLabel', () => { expect(variantLabel('T4_ARTEFACT_TOKEN_FAVOR_2')).toBe('Ficha de favor'); expect(variantLabel('T4_ARTEFACT_2H_ARCANESTAFF_HELL')).toBe('Artefato'); expect(variantLabel('T4_ARMOR_PLATE_SET3')).toBe('Base 3'); });
```
  Dossiê §4: artefato **1.840** (Caerleon), ficha **18.498** (Martlock); diferença **16.658**; Royal: `min(SET1, SET2, SET3) + 4 × token` (preços de SET a consultar: os 3.000/2.500/3.200/500 acima são hipotéticos, rotulados no teste). A taxa (403 e 634) é a regra atual aplicada ao valor do dump (`896×0,45 = 403,2`; `1.408×0,45 = 633,6`), **não verificada** (dossiê A3, D-012).
- [ ] **Step 2:** FAIL. **Step 3:** implementar `variantLabel` e `pickCheapest`. **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: recipeAlt, rótulo e escolha da receita mais barata`.

### Task 4: `validateCatalog` mais firme e mensagem clara (DT-007)
**Files:** Modify `catalogLoad.test.js`, `catalogLoad.js`.
- [ ] **Step 1: testes falhando:** (a) `items` com um elemento `null`, sem `i` ou com `i` não string → inválido, com a mensagem apontando o índice; (b) `alt` presente com formato errado (`at` não inteiro, `v` não lista, `v[0]` sem id) → inválido; (c) `alt` ausente → válido (catálogo antigo e o novo, ambos passam); (d) corpo que não é JSON (HTML de erro, resposta cortada) → `fetchCatalog` rejeita com a mensagem "A resposta do catálogo não é um JSON válido… Recarregue a página (Ctrl+F5)", **não** o erro cru de `JSON.parse`; (e) o catálogo real passa. Mutantes: remover a checagem de `i`; aceitar `alt` malformado.
- [ ] **Step 2:** FAIL. **Step 3:** implementar na lista `REQUIRED` (mantendo o estilo "1 linha + 1 teste") e no `get()` (try/catch em `r.json()`). **Step 4:** PASS. **Step 5: Commit:** `fix: validateCatalog valida itens e alt; resposta não-JSON mostra mensagem clara (DT-007)`.

### Task 5: Craft (seletor de receita)
**Files:** Create `components/RecipePicker.jsx`; Modify `Crafting.jsx`.
- [ ] **Step 1:** em `Crafting.jsx`: `const variants = recipeVariants(sel.id, sel.ench)`; `ids` = união de `craftChainIds(v.rec, targetMid)` de todas as variantes; `results = variants.map((v) => computeCraft({ rec: v.rec, ... }))` (mesmos argumentos de hoje, uma vez por variante); `auto = pickCheapest(results)`; `idx = cfg.recipeVariant === undefined || cfg.recipeVariant === 'auto' ? auto : Math.min(+cfg.recipeVariant, variants.length - 1)`; `rec = variants[idx]?.rec ?? null` e `c = results[idx]` no lugar do `c`/`rec` de hoje (o restante do componente continua lendo `c`). `RecipePicker` só apresenta (rótulos de `variantLabel(v.swapped)`, custo de cada, selo "mais barata agora", aviso da taxa). `cfg.recipeVariant` é novo em `craft:cfg` e **volta a 'auto' ao trocar de item** (`setSel`).
- [ ] **Step 2:** `npm run check`; smoke (`npm run dev`): `T4_2H_ARCANESTAFF_HELL`: seletor com Artefato e Ficha de favor; `T4_ARMOR_PLATE_ROYAL`: três bases; `T4_MAIN_SWORD`: nenhum seletor; uma única ida à API de preços por item (aba Rede); trocar a receita muda "Materiais", plano e preço-alvo. **Step 3: Commit:** `feat: seletor de receita no Craft com a mais barata agora`.

### Task 6: conferência final do catálogo (diferencial)
- [ ] Rodar `node scripts/catalog-diff.mjs` e um script diferencial **fora do repositório**: para **todos** os itens e níveis, `recipeOf(id, n)` (variante 0) do catálogo novo contra o da `master` (catálogo e código antigos): **0 diferenças**. Reportar `vals +110`, `extra +0`. Sem commit (só o relato).

## Como o Tester valida

1. **Contagens do dossiê §4:** `T4_2H_ARCANESTAFF_HELL` → 2 receitas; `T4_ARMOR_PLATE_ROYAL` → 3; `T4_MAIN_SWORD` → 1. No catálogo: 605 itens com `alt` (560 + 45), 110 `vals` novos, refinados sem `alt`.
2. **Caso numérico real:** artefato 1.840 (Caerleon) × ficha 18.498 (Martlock): diferença de ingrediente **16.658**; com a taxa pela regra atual (valores do dump 384 e 896, taxa 400): **+231** → **16.889**. Material comum 4.400 × 0,751880 = **3.308,27** nas duas. Conferir os preços ao vivo no dia (AODP, `T4_ARTEFACT_2H_ARCANESTAFF_HELL` e `T4_ARTEFACT_TOKEN_FAVOR_2`) e que o selo "mais barata agora" segue o menor custo **total**; Royal: `min(SET1, SET2, SET3) + 4 × token` (dossiê), nada retorna.
3. **Diferencial com a `master`:** todos os itens e níveis têm a variante 0 idêntica (script próprio, sem importar a lib nova); `r`, `er`, `f`, `cc`, `tm` iguais; só `alt` e `vals` mudam.
4. **Não retorna (039) e cidade (038):** token, ficha e SET2/3 mostram "não retorna"; fragmentos continuam "não retorna · não verificado"; cidade de bônus igual à de antes em todos os itens com `alt`; Royal sem cidade.
5. **Catálogo e cache (067):** catálogo novo e **catálogo antigo** (sem `alt`) passam em `validateCatalog`; um catálogo corrompido (item `null`, `alt` malformado, HTML no lugar do JSON) mostra o Banner claro; o app com catálogo antigo mostra uma só receita, sem erro.
6. **O que um jogador experiente estranharia:** a ficha de favor "retornando" recursos; o seletor aparecendo em item sem alternativa ou nos refinados; "mais barata" escolhendo uma receita com preço faltando; trocar de item mantendo a receita do item anterior; a taxa de bancada mudando ao trocar de receita **sem aviso** (ela muda, com aviso); custo total que não bate com a tabela de materiais; Royal oferecendo só SET1.

## Riscos

1. **Hipótese "só um ingrediente muda"** vale em 605/605 no dump atual; mudança futura do jogo quebraria o build com erro claro (de propósito), não o app.
2. **Taxa de bancada por receita NÃO VERIFICADA** (valor do ingrediente especial e foco iguais nas duas receitas, dossiê A3): a escolha da "mais barata" depende dessa regra; o aviso na tela e o pedido de medição (D-012) cobrem.
3. **Ficha de favor e artefato têm preço esparso no AODP** (a ficha foi vista numa só cidade): a comparação herda a idade e a confiança do preço; a tela mostra a idade (já existente) e "sem preço" exclui a receita do automático.
4. **Ordem exigida 039 → 049** (ver acima) e conflito mecânico com a 002 em `build-catalog.mjs`/fixture/catálogo.
5. A aba RRR (023) e o preço-alvo usam a variante 0 (sem seletor); não regridem.
6. Tamanho e tempo de build: +40 KB; o `?v=<hash>` (067) troca o catálogo sem cache velho.

## Critério de pronto

`npm run check` verde; build com `605 alt, 30 ignorados`; `catalog-diff` igual à tabela; diferencial com a `master` = 0 diferenças em `recipeOf` variante 0; casos do dossiê §4 em teste; seletor funcionando; DT-006 e DT-007 fechadas; só os arquivos listados alterados.

## PERGUNTAS PARA O GERENTE

1. **Descoberta fora do dossiê:** os 30 recursos refinados (`T4_PLANKS`, `T4_METALBAR`…) têm uma 2ª receita com **ficha de facção** no lugar de 1 recurso bruto (ex.: 1 madeira + 1 `T1_FACTION_FOREST_TOKEN_1` + 1 tábua T3). Isso afeta o **Refino**. Fica fora desta ideia (excluída e testada). Abro como ideia nova (dossiê do Pesquisador, fonte e preço das fichas)?
2. **Ordem 039 → 049 é exigida** (a 049 reaproveita o formato `[id, n, 1]` e a união conservadora da 039). Confirma que a 049 só começa depois do deploy da 039?
3. **Taxa de bancada por receita:** o plano compara pelo custo total com a regra atual (valor do dump do ingrediente especial: ficha 896 × artefato 384). Prefere comparar **sem** a diferença de taxa até haver medição (só o preço do ingrediente especial)?
4. **Aba RRR e preço-alvo** usam a variante 0; aceita deixar o seletor só no Craft nesta ideia?
5. DT-006 e DT-007 foram incluídas aqui (a 049 toca `catalog.js` e `catalogLoad.js`). Se a 039 fechar a DT-006 antes, a Task 2 só confere que o teste existe.
