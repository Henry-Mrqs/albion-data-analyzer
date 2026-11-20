# IDEIA-009 — Encantar: craftar direto o .1–.3 × craftar o .0 e encantar × comprar o .0 e encantar: plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-009`. Comandos `npm` em `client/`; scripts em `scripts/` na raiz. **Pré-requisitos (já na `master`):** catálogo por `scripts/build-catalog.mjs` (dump fixado, cache em `os.tmpdir()`), `catalog.js` (`recipeVariants`, `marketId`, `nameOf`), `craftPlan.js` (`computeCraft`, `craftChainIds`), `econ.js` (`buyQuote`), 060, 069, 070, 005 (auditor). **Regras do briefing:** teste escrito, **executado e visto falhar** antes de implementar; os de componente em `*.test.jsx`; **nenhum `*.test.jsx` com `usePersisted('chave'` literal** (use `seed()`/`craftCfg()` de `src/test/ui.js`). Fonte: `docs/research/IDEIA-009.md`.

**Problema:** itens .1 a .3 valem bem mais que o .0 e há **três rotas** para obtê-los: **A** craftar direto o encantado (recursos `*_LEVEL{n}`, que retornam com o RRR); **B** craftar o .0 e gastar runa/alma/relíquia (que **não** retornam); **C** comprar o .0 pronto e encantar. Hoje o Craft só calcula a A.

**Objetivo:** cartão **"Encantar: qual rota é mais barata?"** no Craft, quando o item selecionado tem encanto .1, .2 ou .3: custo do lote nas rotas A, B e C, a rota mais barata e a diferença, com a lista de runas/almas/relíquias (quantidade, preço, cidade, idade) e um campo **"taxa de encantamento"** (prata por item, padrão vazio = 0, **marcado "não verificado"**, E8).

**Arquitetura:** (1) `scripts/build-catalog.mjs` exporta a **quantidade por passo** (`ue`) lida do dump (`enchantments/enchantment[n]/upgraderequirements/upgraderesource@count`) **só** para itens cujos 3 passos são `RUNE`, `SOUL`, `RELIC` com **a mesma quantidade**. (2) `lib/enchant.js` puro: `enchantSteps` e `enchantRoutes` (recebem **custos já calculados** por `computeCraft`; nenhuma fórmula de RRR/taxa é reescrita). (3) `EnchantCard.jsx` desenha; `Crafting.jsx` calcula a cadeia do .0 com `computeCraft` (mesma `cfg`) e amplia a lista de `ids` de `usePrices` **só** quando o item é .1–.3 com `ue`.

## Dados verificados no dump em cache (`node -e`, 2026-11-19; **corrigem o dossiê**)
- **1.244** itens craftáveis têm os 3 passos `RUNE`→`SOUL`→`RELIC` (nível 1 = runa, 2 = alma, 3 = relíquia; o nível 4 **não** tem `upgraderequirements`: E1 confirmado), mesma quantidade nos 3 passos e prefixo do **mesmo tier** do item (E2); T4 247 · T5 247 · T6 247 · T7 247 · T8 256; **tier 3 não tem**. Os outros 91 (poções, comida) usam `ALCHEMY_EXTRACT_LEVEL1..3`/`FISHSAUCE_LEVEL1..3`: **fora desta ideia**, sem cartão.
- **Quantidades do dump (E3 ALTA):** `T4_MAIN_SWORD` 288 · `T4_2H_CLAYMORE` 384 · `T4_ARMOR_PLATE_SET1` 192 · `T4_HEAD_PLATE_SET1` 96 · `T4_BAG` 192 · `T5/T6/T8_MAIN_SWORD` 288.
- **A regra E4 do dossiê ("12 × nº de recursos") NÃO é geral:** vale em só **409 de 1.244** itens (ex.: `T4_OFF_SHIELD_HELL`: 96 com 9 recursos). **O app usa a quantidade do dump, nunca E4.**
- `extra` do catálogo atual já traz `T4..T8_RUNE/SOUL/RELIC` (nome e peso); nenhum id novo precisa entrar em `needed`.

## Regras (dossiê §2/§4; todas com fonte)
`A = totalCost(computeCraft do item encantado)`; `B = totalCost(computeCraft do .0, mesma cfg) + Σ_passos(qtd × preço) × unidades + taxa × unidades`; `C = preço do .0 pronto × unidades + Σ_passos(qtd × preço) × unidades + taxa × unidades`; `unidades = rec.amount × crafts`. Passos para o encanto `n`: os `n` primeiros de [RUNE `T{t}_RUNE`, SOUL `T{t}_SOUL`, RELIC `T{t}_RELIC`], cada um com `ue` unidades **por item**. Preço de cada material e do .0: `buyQuote(prices, mid, { city: cfg.matCity, useOrders: cfg.useOrders })` (**mesma** cidade/ordens do resto do Craft). **E5 (MÉDIA):** runa/alma/relíquia **não retornam** (sem RRR). **E7:** a taxa de bancada do encantado dobra por nível; já está em `computeCraft` (valor do ingrediente `*_LEVEL{n}`). **.3→.4 não existe por encantamento** (E1; só craft direto): para `.4` o cartão não aparece.
**NÃO considera (dito na tela e no auditor):** **taxa de encantamento em prata** (E8: **nenhuma fonte**; só o que o usuário digitar, por item, soma dos passos); **foco e fama** do ato de encantar (E9: sem dado); **qualidade**; a qualidade/probabilidade do encantamento; o **valor de venda** (as três rotas vendem o **mesmo** item, então a diferença de lucro = a diferença de custo; o cartão compara **custo**); itens com extrato (poções/comida); compra de runa com **profundidade** de mercado (AODP não tem; preço de 1 unidade × 288).

## Arquivos
**Criados:** `client/src/lib/enchant.js`, `enchant.test.js`, `client/src/lib/catalog.enchant.real.test.js`, `client/src/components/EnchantCard.jsx`, `EnchantCard.test.jsx`, `client/src/components/Crafting.enchant.test.jsx`.
**Alterados:** `scripts/build-catalog.mjs` (+`ue`), `scripts/build-test-fixture.mjs` (**só** a lista `IDS`: `T4_RUNE`, `T4_SOUL`, `T4_RELIC`, para copiar `extra`/`vals`), `client/public/data/catalog.json` e `client/src/test/catalog.fixture.json` (**regerados pelos scripts**), `client/src/lib/catalog.js` (+`enchantQty`), `catalog.test.js`, `client/src/components/Crafting.jsx` (ids, cálculo do .0, cartão; `set({ enchantFee })`), `client/src/lib/persistSchemas.js` (1 campo em `craft:cfg`), `client/src/lib/audit/craft.js` (Var `enchant`), `client/src/lib/audit/core.js` (+`enchantFocus`), `client/src/lib/audit/craft.test.js`.
**NÃO toca:** `craftPlan.js`, `econ.js`, `inputRules.js`, `focus.js`, `Refining.jsx`, `Flipper.jsx`, `catalogLoad.js`.
**Compartilhados:** `Crafting.jsx`, `audit/craft.js`, `core.js`, `persistSchemas.js` com 062/061/051/003/064; **`catalog.json` e a fixture com a 003** (ela adiciona `j`/`jcap`; as duas regeram o arquivo): **regerar com os scripts após o merge da outra**; o JSON é derivado, o script é a fonte. Conflito só textual.

## Campo salvo novo e linhas do auditor
`enchantFee: 'numText'` em `craft:cfg` (set-only; fora dos padrões). **Var `enchant`** (`fields: ['enchantFee']`, `kind:'info-only'`, `affects:'none'`, `probe: { scenario: 'sword', base: {}, cfg: { enchantFee: '100' } }`: custo e lucro do cálculo principal **iguais**). Linhas: `enchant-fee` ("Taxa de encantamento (prata por item)": vazio ⇒ valor "0 (não informada)", origem `app-default`, status `unconfirmed`/"padrão não confirmado", nota "Sem fonte: meça em jogo ao encantar um item"; digitada ⇒ `user`, `info-only`); `enchant-qty` ("Runas/almas/relíquias por passo": quantidade, origem `game`, fonte "dump do jogo (alta)"); `enchant-noreturn` ("Runa, alma e relíquia não retornam": `info-only`, fonte "wiki e inferência do mecanismo (média)"); `enchant-routes` (resultado: rota mais barata e a diferença, `derived`, `info-only`, "não muda o lucro da tela"); `nc-enchantFocus` (`NOT_CONSIDERED.enchantFocus = ['Foco, fama e taxa em prata do ato de encantar', 'O custo em prata e o foco de encantar não têm fonte; só a taxa que você digitar entra, e só no cartão Encantar.']`). Item .0, .4 ou sem `ue` ⇒ o Var `enchant` devolve `null` (sem linhas) e o auditor não lista nada (`build` que devolve `null` já é aceito pelo registro).

## Interfaces
```js
// catalog.js
enchantQty(item): number|null                       // item.ue (inteiro > 0) ou null (sem ue, catálogo antigo, valor inválido)
// enchant.js (puro)
export const ENCHANT_KINDS = ['RUNE', 'SOUL', 'RELIC']      // passos .0→.1, .1→.2, .2→.3
enchantSteps(item, ench): { mid, kind, qty }[] | null       // ench ∈ {1,2,3} e enchantQty(item) válido e tier 4..8; senão null. mid = `T${tier}_${kind}`
enchantRoutes({ direct, craft0, buy0Unit, steps, units, fee = 0 }):
  { A, B, C, best: 'A'|'B'|'C'|null, diffAB, stepsCost, feeTotal, missing: string[] }
  // direct = totalCost do encantado (ou null); craft0 = totalCost do .0 (ou null); buy0Unit = preço unitário do .0 pronto (0/null = sem preço)
  // steps: [{ mid, name?, qty, unit }] (unit = preço unitário; 0/null = sem preço). units: unidades do lote.
  // stepsCost = Σ qty×unit×units; feeTotal = fee×units. B = craft0 + stepsCost + feeTotal; C = buy0Unit×units + stepsCost + feeTotal. A = direct.
  // Rota sem todos os dados ⇒ null e o nome do que falta em `missing`. best = menor dos não nulos; empate A, depois B, depois C. diffAB = A − B (null se algum nulo).
readEnchantFee(raw): { value: number, issue: string|null }  // '' ⇒ 0 sem aviso; texto/NaN/negativo ⇒ 0 + aviso; finito ≥ 0 ⇒ o valor
```

## Mensagens (texto final)
Título **"Encantar: qual rota é mais barata?"**. Linhas: "A · Craftar direto o {item .n}", "B · Craftar o .0 e encantar", "C · Comprar o .0 e encantar", com custo do lote e, na mais barata, **"mais barata"**; "Diferença A − B: {X}" ("B economiza X" quando positiva; "A economiza |X|" quando negativa). Tabela de passos: material, quantidade por item, preço, cidade, idade. Campo **"Taxa de encantamento (prata por item, soma dos passos)"** com dica "Sem fonte: não verificado. Se o jogo cobra prata ao encantar, digite o valor que ele mostra." Avisos fixos: "Runas, almas e relíquias não retornam (não entram no RRR). Foco, fama e a taxa em prata de encantar não foram levantados. O preço de cada material é o de 1 unidade: comprar {qty} pode custar mais (o AODP não tem profundidade). As três rotas vendem o mesmo item: o cartão compara só o custo." Rota sem preço: "Sem preço de {material}: rota B indisponível." Item .0, .4 ou sem encantamento por runa: **cartão não aparece**.

## Tasks (1 commit cada; teste primeiro e visto falhar)

### Task 1: catálogo com a quantidade por passo
**Files:** Modify `scripts/build-catalog.mjs`, `scripts/build-test-fixture.mjs`; Create `catalog.enchant.real.test.js` (project `logic`, lê `public/data/catalog.json`).
- [ ] **Step 1: testes falhando** (contra o catálogo antigo):
```js
it.each([['T4_MAIN_SWORD', 288], ['T5_MAIN_SWORD', 288], ['T6_MAIN_SWORD', 288], ['T8_MAIN_SWORD', 288], ['T4_2H_CLAYMORE', 384], ['T4_ARMOR_PLATE_SET1', 192], ['T4_HEAD_PLATE_SET1', 96], ['T4_BAG', 192]])('%s => ue %i (dump, E3)', (id, q) => expect(byId[id].ue).toBe(q));
it('1.244 itens craftáveis com ue; tiers 4..8 (247·247·247·247·256); nenhum de tier 3', () => {});
it('poção e comida (extrato) não têm ue', () => { /* T4_POTION_HEAL, T4_MEAL_SALAD */ });
it('E4 NÃO é regra geral: ue === 12 × nº de recursos em só 409 itens (T4_OFF_SHIELD_HELL: 96 com 9 recursos)', () => {});
it('todo ue é inteiro > 0; item sem receita não tem ue; validateCatalog continua ok; catálogo sem ue (cache antigo) também passa', () => {});
```
- [ ] **Step 2:** FAIL. **Step 3:** no build, por item com receita: ler `it.enchantments.enchantment[].upgraderequirements.upgraderesource` (objeto único); aceitar **só** se houver os níveis 1, 2, 3 com `@uniquename` = `T{tier}_RUNE`, `T{tier}_SOUL`, `T{tier}_RELIC` e `@count` iguais; então `entry.ue = count`; se houver upgrade de outro tipo (extratos) ou contagens diferentes, **não** gravar e contar em `nUeSkipped` (log; esperado 91 nos extratos, 0 por contagens diferentes: se não for 0, **PARAR e reportar**). Fixture: acrescentar `'T4_RUNE', 'T4_SOUL', 'T4_RELIC'` em `IDS`.
- [ ] **Step 4:** `node scripts/build-catalog.mjs && node scripts/build-test-fixture.mjs && node scripts/catalog-diff.mjs` (só `ue` novo; **nenhum outro campo muda**: senão PARAR); PASS; `npm test` verde. **Step 5: Commit** `feat: catálogo com a quantidade de runas por passo (IDEIA-009)`.

### Task 2: `enchantQty` e `enchantSteps`
**Files:** Modify `catalog.js`, `catalog.test.js`; Create `enchant.test.js`, `enchant.js` (parte 1).
- [ ] **Step 1: testes falhando** (fixture): `enchantQty(getItem('T4_MAIN_SWORD'))` 288; `T4_METALBAR` `null`; `undefined` `null`; `ue: 0`/`-1`/`'288'`/`1.5` ⇒ `null`; `enchantSteps(sword, 1)` = `[{ mid: 'T4_RUNE', kind: 'RUNE', qty: 288 }]`; `ench 2` = RUNE e SOUL; `ench 3` = os três; `ench 0`, `4`, `5`, `-1`, `NaN`, `'1'` ⇒ `null`; item sem `ue` ⇒ `null`; tier 3 ou 9 ⇒ `null`; tier 6 ⇒ `T6_RUNE`.
- [ ] **Steps 2–5:** FAIL → implementar → PASS → mutação (`ench <= 4`; tier fixo 4): derrubadas → **Commit** `feat: passos de encantamento por item (IDEIA-009)`.

### Task 3: rotas A, B e C (puro)
**Files:** Modify `enchant.test.js`, `enchant.js` (`enchantRoutes`, `readEnchantFee`).
- [ ] **Step 1: testes falhando** (Broadsword T4, Lymhurst, bônus de espada: RRR 33/133 = 24,8120 %, bancada 500, preços reais do dossiê §4 consultados em 2026-11-18, **constantes do teste**: `T4_METALBAR` 267, `T4_LEATHER` 322, `T4_METALBAR_LEVEL1@1` 571, `T4_LEATHER_LEVEL1@1` 461, `T4_RUNE` 10). Valores **recalculados** (conferidos com `computeCraft` da fixture): `direct` = **10.074,105** (bruto 12.824 × 0,751880 = 9.642,105 + taxa 432); `craft0` = **5.364,872** (6.848 × 0,751880 = 5.148,872 + 216):
```js
const steps1 = [{ mid: 'T4_RUNE', qty: 288, unit: 10 }];
it('rota B = 5.364,872 + 288 × 10 = 8.244,872; A = 10.074,105; A − B = 1.829,233; best B', () => {
  const r = enchantRoutes({ direct: 10074.105263, craft0: 5364.872180, buy0Unit: 0, steps: steps1, units: 1 });
  expect(r.A).toBeCloseTo(10074.105, 3); expect(r.B).toBeCloseTo(8244.872, 3); expect(r.diffAB).toBeCloseTo(1829.233, 3);
  expect(r).toMatchObject({ best: 'B', C: null }); expect(r.missing).toEqual(['preço do item .0']);
});
it('teste de sinal: runa a 100 ⇒ B = 5.364,872 + 28.800 = 34.164,872 e A vence', () => {});
it('C com .0 pronto a 5.000 (valor inventado do teste): C = 5.000 + 2.880 = 7.880 ⇒ best C (< B 8.244,872)', () => {});
it('encanto .3 (valores inventados: runa 10, alma 12, relíquia 20; direct 16.000): B = 5.364,872 + 288×42 = 17.460,872; C(5.000) = 17.096; best A', () => {});
it('taxa de encantamento 2.000 por item: B = 10.244,872 > A 10.074,105 ⇒ best A (a taxa muda a rota)', () => {});
it('lote de 10 unidades: tudo × 10 (runas, taxa e o .0 pronto), nunca dobrando `direct`/`craft0` (já são do lote)', () => {});
```
(no teste do lote: `direct`/`craft0` são passados **do lote** e `units: 10`; `B = craft0 + 10×2.880`.) Bordas: `direct`/`craft0` `null` ⇒ A/B `null` e `missing` os cita; passo com `unit` 0/`null`/`NaN` ⇒ B e C `null`, `missing` cita a runa; todos nulos ⇒ `best: null`; empate exato A = B ⇒ `best: 'A'`; `units` 0/negativo/`NaN` ⇒ trata como 1; `steps: []` ⇒ B = `craft0` (sem runa) — **proibido** (um encanto sem passo não existe): devolve B/C `null`; `fee` negativo/`NaN` ⇒ 0; números enormes finitos sem lançar. `readEnchantFee`: `''` ⇒ `{0, null}`; `'abc'`, `'-5'`, `NaN`, `{}`, `[1]` ⇒ `{0, aviso}`; `'250'` ⇒ 250; `'1e300'` ⇒ finito aceito.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS. **Mutações:** `craft0` somado sem runas; runa com RRR; `C` usando `direct`; esquecer `units`; empate escolhendo B; taxa ignorada: derrubadas. **Step 5: Commit** `feat: rotas de encantamento A, B e C (IDEIA-009)`.

### Task 4: campo salvo e contrato
**Files:** Modify `persistSchemas.js`, `persistSchemas.test.js`, `audit/craft.js` (Var `enchant` com linhas provisórias), `core.js`, `audit/craft.test.js`.
- [ ] **Step 1: testes falhando:** `craft:cfg` aceita `enchantFee: '100'`/`''`; **corrompido** `enchantFee: {}`/`[5]`/`true` ⇒ descartado, resto preservado; `contract.test.js` reprova `enchantFee` **antes** do Var (prova o contrato); sensibilidade com o probe: custo e lucro iguais; `nc-enchantFocus` presente no Craft.
- [ ] **Steps 2–5:** esquema + Var → `npm run test:logic` verde. **Commit** `feat: taxa de encantamento salva e linhas do auditor (IDEIA-009)`.

### Task 5: cartão e Craft (jsdom; `usePrices`/`useHistory` mockados como `Crafting.targetNoTax.test.jsx`)
**Files:** Create `EnchantCard.test.jsx`, `EnchantCard.jsx`, `Crafting.enchant.test.jsx`; Modify `Crafting.jsx`.
- [ ] **Step 1: testes falhando.** `EnchantCard` (props `{ routes, steps, fee, onFee, issue }`): mostra A/B/C, "mais barata" **só** na melhor, "Diferença A − B: 1.829" e "B economiza"; rota nula mostra "Sem preço de …"; a dica da taxa diz "Sem fonte: não verificado"; avisos fixos presentes ("não retornam", "1 unidade", "mesmo item"); `issue` aparece. **Craft** (item `T4_MAIN_SWORD`, ench 1; preços **só em Lymhurst**, valores do dossiê acima, `T4_MAIN_SWORD@1` com preço qualquer, bancada 500, `specialty: true`, `refine: { METALBAR: 'buy', LEATHER: 'buy' }`): o cartão mostra **A 10.074**, **B 8.245**, "B economiza 1.829"; digitar taxa 2000 ⇒ "A economiza 171"; **`usePrices` recebe os ids do .0 e `T4_RUNE`** apenas com ench 1..3 (com ench 0 a lista de ids é **idêntica à de hoje**: teste de regressão); ench 4 e item sem `ue` ⇒ sem cartão; **mudar de encanto 1→2** acrescenta `T4_SOUL` à lista e ao cartão; estado antigo (`craftCfg()` sem `enchantFee`) ⇒ cartão com taxa vazia, `localStorage` inalterado até digitar; **corrompido** (`enchantFee: {}`) ⇒ taxa 0, sem tela branca; o **lucro e o custo do Craft principal não mudam** com o cartão presente.
- [ ] **Steps 2–4:** implementar em `Crafting.jsx`: `const steps = enchantSteps(item, sel.ench)`; `ids` ganha `craftChainIds(rec0, marketId(sel.id, 0))`, `marketId(sel.id, 0)` e `steps.map(s => s.mid)` **só se** `steps`; `rec0`/`c0` = `computeCraft` da variante mais barata do .0 (`recipeVariants(sel.id, 0)` + `pickCheapest`, mesma `cfgEff`); `buy0Unit = buyQuote(prices, marketId(sel.id, 0), { city: cfg.matCity, useOrders: cfg.useOrders }).price`; `routes = enchantRoutes({ direct: c.missing.length ? null : c.totalCost, craft0: c0.missing.length ? null : c0.totalCost, buy0Unit, steps: stepsWithPrices, units, fee })`. PASS; `npm run test:ui` verde. **Step 5: Commit** `feat: cartão Encantar no Craft (IDEIA-009)`.

### Task 6: auditor (verdade das linhas) e conferência
- [ ] **Step 1: testes falhando** em `craft.test.js`: com ench 1 e os preços do dossiê ⇒ `enchant-routes` diz "B é a mais barata; diferença 1.829" (monta por `enchantRoutes`, nunca recalcula); `enchant-qty` 288 `game`; `enchant-fee` vazio ⇒ `unconfirmed`, digitada ⇒ `user`; `enchant-noreturn` presente; ench 0 ou 4 ⇒ **nenhuma** linha `enchant-*` (e o contrato segue verde); `ctx.enchant` lixo ⇒ "não foi possível ler" sem lançar. `npm run check` verde.
- [ ] **Manual (Executor registra, API real):** espada T4.1 e T4.3 em Lymhurst: rotas e preços de runa/alma/relíquia aparecem com idade; um preço absurdo de runa (ordens-lixo) é visível na tabela; recarregar mantém a taxa. **Commit** `feat: auditor lê as rotas de encantamento (IDEIA-009)`.

## Como o Tester valida
1. **Casos concretos:** A 10.074,105 · B 8.244,872 · A−B 1.829,233; sinal (runa 100 ⇒ A); C 7.880 (inventado); .3: 17.460,872 / 17.096 / A 16.000; taxa 2.000 ⇒ A; `ue` 288/384/192/96/192; 1.244 itens; E4 só em 409.
2. **Mutações** da Task 3: sobrevivente reprova. Conferir a mão: `6.848 × (1 − 33/133) + 216 = 5.364,872`.
3. **Catálogo:** `catalog-diff.mjs` só mostra `ue`; cache antigo (sem `ue`) não quebra (sem cartão); poções sem cartão.
4. **Regressão:** com ench 0 a lista de ids de `usePrices` e todos os números do Craft são **idênticos** aos de antes; com o cartão presente, o custo/lucro principal igual.
5. **Estado antigo/corrompido:** `craft:cfg` do `9e1e4a2`, `enchantFee` lixo e as 8 chaves ruins (perfis do laudo 070) sem tela branca.
6. **Honestidade:** a tela diz que a taxa de encantar é "não verificada", que runas não retornam (MÉDIA) e que o preço é de 1 unidade × 288. **O que o usuário estranharia:** rota "mais barata" calculada com runa a 10 sem aviso de 1 unidade; taxa 0 apresentada como fato; cartão em .0/.4; B ignorando o retorno de recursos do .0.

## Riscos
1. **Taxa de encantamento desconhecida (E8 BAIXA):** pode inverter a rota (o teste de 2.000 mostra); o campo existe para o usuário medir em jogo (o dossiê pede: custo em prata ao encantar um T4).
2. **Preço de runa/alma/relíquia ralo ou lixo** (`sell_price_min` de 1 ordem): × 288/384 amplifica; a tabela mostra idade e cidade; um aviso de "1 unidade" fica na tela.
3. **E5 (não retornam) é MÉDIA:** se o jogo devolver parte, B/C ficam pessimistas; dito na tela.
4. **Mais ids no `usePrices`** (cadeia do .0 + até 3 materiais): ≤ 1 requisição extra; só com encanto .1 a .3.
5. **Conflito** com a 003 no `catalog.json` regerado e textual nos arquivos compartilhados.
6. **Variante de receita do .0** (artefato/ficha): usa a mais barata (`pickCheapest`); se o usuário escolheu outra variante no encantado, a do .0 **não** acompanha (dito no cartão: "receita mais barata do .0").

## Critério de pronto
`npm run check` verde sem alterar teste existente (exceto contagens de linhas de `craft.test.js`, declaradas); mutações derrubadas; catálogo/fixture regerados **pelos scripts**; só os arquivos listados alterados; campo no esquema **e** no auditor no mesmo commit; conferência manual registrada.

## PERGUNTAS PARA O GERENTE
1. **Taxa de encantamento** (E8, sem fonte): campo "prata por item" vazio = 0, marcado "não verificado". Aprova? O usuário pode medir em jogo?
2. **Comparar só o custo** (o item vendido é o mesmo): ok, ou o cartão deve mostrar também o lucro de cada rota?
3. **Receita do .0 = a mais barata** (não acompanha a variante escolhida do encantado): aceita?
4. **Poções e comida** (extratos `ALCHEMY_EXTRACT`/`FISHSAUCE`) ficam fora: quer uma ideia separada?
5. **Arbitragem ".0 + runas × .n à venda"** no Flipper (IDEIA-013) fica fora. Ok?
6. O dossiê dizia E4 (12 × recursos) para a quantidade; no dump só 409 de 1.244 itens seguem. O app usa o dump. Confirma?
