# IDEIA-003 — Diários de trabalho (journals): ganho do diário por craft, sem somar ao lucro por padrão: plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-003`. Comandos `npm` em `client/`; scripts em `scripts/` na raiz. **Pré-requisitos (já na `master`):** catálogo gerado por `scripts/build-catalog.mjs` (dump fixado `0483dd97…`, cache em `os.tmpdir()`), 060, 069, 070, 005 (auditor). **Regras do briefing:** teste escrito, **executado e visto falhar** antes de implementar; os de componente em `*.test.jsx`; **nenhum `*.test.jsx` com `usePersisted('chave'` literal** (use `seed()`/`craftCfg()` de `src/test/ui.js`). Fonte: `docs/research/IDEIA-003.md`.

**Problema:** quem faz craft ganha **fama de craft**; um diário **vazio** da classe certa no inventário enche sozinho e o **cheio** vale mais no mercado. É uma fonte de lucro por craft que o app ignora (hoje só a linha "Diário de ofício: NÃO considerada" no auditor).

**Objetivo:** cartão **"Diário de ofício"** no Craft: qual diário serve ao item, preço do vazio e do cheio, **ganho por diário** (pode ser **negativo**), fração do diário que cada craft enche, ganho por craft e no lote, e **"lucro com diário" mostrado à parte**. O ganho **não é somado** ao lucro das opções de venda (lição do dossiê §4: o spread vazio→cheio pode ser menor que os impostos; o usuário liga).

**Arquitetura:** (1) `scripts/build-catalog.mjs` exporta a **classe do diário** por item (`j`: `W`/`H`/`M`/`T`) e a tabela de **capacidade por tier** (`jcap`), lidas do dump (`journalitem` → `famefillingmissions/craftitemfame/validitem`, `@maxfame`), **verificadas por mim no dump em cache** (abaixo). (2) `catalog.js` expõe `journalOf(item)` e `journalCapacity(tier)`. (3) `lib/journal.js` puro: `journalGainPerCraft`, `estimateFame`, `journalSummary`. (4) `JournalCard.jsx` desenha; `Crafting.jsx` busca os **2 preços** com um `usePrices` extra **só com o interruptor ligado**.

## Dados verificados no dump em cache (`node -e`, 2026-11-19; não são do dossiê)
- Diários de craft: `T{2..8}_JOURNAL_{WARRIOR,HUNTER,MAGE,TOOLMAKER}`; `@maxfame` **iguais nas 4 classes**: T2 900 · T3 1.800 · **T4 3.600 · T5 7.200 · T6 14.400 · T7 28.380 · T8 58.590** (confirma o dossiê J2; albionutil, 1/4 disso, descartado: J3).
- `validitem` lista ids base (`T4_MAIN_SWORD`, sem `@`); **nenhum item aparece em duas classes**; 1.455 ids no total. Dos **2.166** itens craftáveis do catálogo atual: **1.150 têm diário** (WARRIOR 400 · MAGE 359 · HUNTER 374 · TOOLMAKER 17) e 1.016 não (artefatos 765, capas de cidade 70, recursos refinados, poções/comida 92, parte de `head/armors/shoes`: 54). Exemplos: `T4_MAIN_SWORD` W · `T4_2H_BOW` H · `T4_ARMOR_CLOTH_SET1` M · `T4_BAG` T · `T4_METALBAR`, `T4_POTION_HEAL`, `T4_ARMOR_PLATE_ROYAL` sem diário.
- Na fixture de teste (42 itens): `T4_2H_ARCANESTAFF_HELL` M, `T4_2H_BOW` H, `T4_2H_KNUCKLES_SET1` W, `T4_ARMOR_CLOTH_SET1` M, `T4_ARMOR_PLATE_SET1/2/3` W, `T4_BAG`, `T4_BAG_INSIGHT`, `T4_CAPE` T, `T4_HEAD_CLOTH_SET1` M, `T4_MAIN_SWORD` W, `T4_OFF_BOOK` M, `T4_OFF_SHIELD`, `T4_OFF_SHIELD_HELL` W, `T4_OFF_TORCH` H, `T4_SHOES_CLOTH_SET1` M, `T4_SHOES_LEATHER_SET1` H, `T6_ARMOR_PLATE_SET1`, `T6_MAIN_SWORD`, `T6_MAIN_SWORD_CRYSTAL` W; **sem** diário: planks, artefatos, capas `CAPEITEM_FW_*`, `T4_MEAL_SALAD`, `T4_METALBAR`, `T4_POTION_HEAL`, `T6_POTION_COOLDOWN`, `T4_ARMOR_PLATE_ROYAL`, `T6_LEATHER/METALBAR`. (O Executor confere estas contagens ao regerar; se mudarem, o teste real deve falhar e o plano ser atualizado.)

## Regras (dossiê §2)
`fracao_por_craft = fama_por_craft / capacidade`; `ganho_diario = líquido(cheio) − preço(vazio)` (líquido por **ordem de venda**: `netSale(price, 'order', premium)` = × (1 − imposto − 2,5 %)); `ganho_por_craft = fração × ganho_diario`; `lote = ganho_por_craft × crafts`; **lucro com diário = lucro do melhor destino + lote** (só exibido à parte). **Fama por craft (J7, BAIXA): input do usuário.** Sugestão marcada "estimativa de fórum, baixa confiança": `Σ materiais **não artefato** × fator_tier × 2^encanto`, fator T4 22,5 · T5 90 · T6 270 · T7 645 · T8 1.395 (post de fórum 2024; **não** confere com o dump, J8); aparece só como **placeholder do campo**, **nunca é usada no cálculo** sem o usuário digitar. Preço do vazio = **menor** `sell_price_min` entre as 6 cidades (`buyQuote(..., { city: 'best' })`); do cheio = **maior** `sell_price_min` entre as 6 (usa `sell_price_min`, **não** `buy_price_*`: ordens-lixo de 5 ou 12 de prata na API, dossiê §7).
**NÃO considera (dito na tela e no auditor):** venda **instantânea** do cheio (ordem de compra) e entrega do diário a **laboradores** em ilha (J9); o diário **parcial** (não negociável: J4); **qualidade** do diário; o custo/benefício de **carregar o diário vazio** (ocupa espaço; peso 0,34 no dump); craftar **mais de um item por craft** (poções ficam sem diário); `craftitemfame @value` do dump (1.200 em T4) cuja relação com a fama real **não foi confirmada** (J8).

## Arquivos
**Criados:** `client/src/lib/journal.js`, `journal.test.js`, `client/src/lib/catalog.journal.real.test.js`, `client/src/components/JournalCard.jsx`, `JournalCard.test.jsx`, `client/src/components/Crafting.journal.test.jsx`.
**Alterados:** `scripts/build-catalog.mjs` (+`j` por item, +`jcap`), `scripts/build-test-fixture.mjs` (copia `jcap`), `client/public/data/catalog.json` (**regerado**; muda o id de versão do catálogo ⇒ o navegador baixa de novo na próxima visita), `client/src/test/catalog.fixture.json` (regerada), `client/src/lib/catalog.js` (+`journalOf`, `journalCapacity`), `client/src/lib/catalog.test.js`, `client/src/components/Crafting.jsx` (cartão após o plano; `usePrices` condicional), `client/src/lib/persistSchemas.js` (2 campos em `craft:cfg`), `client/src/lib/audit/craft.js` (Var `journal`; sai `'journal'` da lista `notConsidered`), `client/src/lib/audit/core.js` (+`journalUse`), `client/src/lib/audit/craft.test.js`.
**NÃO toca:** `craftPlan.js` (as opções de venda e o `lucro` **não** mudam: evita conflito com 059/065/012), `econ.js`, `focus.js`, `Refining.jsx` (o Refino mantém a linha `nc-journal`: diário de refino é outro item e não é modelado), `catalogLoad.js` (se `validateCatalog` rejeitar `jcap`, **PARAR e reportar**), `vercel.json`, `vite.config.js`.
**Compartilhados:** `Crafting.jsx`, `audit/craft.js`, `core.js`, `persistSchemas.js` com 062/061/051/009 (um cartão/Var/campo cada; conflito textual); `catalog.json`/fixture com a **009** (que também regera o catálogo para `ue`): **regerar o catálogo uma vez por branch e reaplicar na outra após o merge** (o JSON é derivado, o script é a fonte).

## Campos salvos novos (`craft:cfg`) e linhas do auditor
`journalOn: 'bool'`, `journalFame: 'numText'` (set-only, fora dos padrões). **Var `journal`** (`fields: ['journalOn','journalFame']`, `kind:'info-only'`, `affects:'none'`, `probe: { cfg: { journalOn: true, journalFame: '540' } }`; o teste de sensibilidade exige custo e lucro **iguais**). Linhas: `journal` ("Diário de ofício": desligado ⇒ valor "não somado (desligado)", status `not-considered`; ligado ⇒ "ganho por craft X" status `info-only`, nota "Não entra no lucro das opções de venda."); `journal-fame` ("Fama por craft": digitada ⇒ `user`; vazia ⇒ "não informada"; nota "estimativa de fórum, baixa confiança, só como sugestão"); `journal-empty` e `journal-full` (via `apiRow`: preço, cidade e **idade**, `stale` se > limite de idade); `nc-journalUse` (`NOT_CONSIDERED.journalUse = ['Venda instantânea do diário cheio e entrega a laboradores', 'Só a venda por ordem de venda é calculada; instantânea, diário parcial e laboradores não são modelados.']`). Sai `'journal'` de `notConsidered` em `craft.js` (a linha antiga "não modelado" ficaria falsa com o cartão); em `core.js` a entrada `journal` **continua** (o Refino a usa).

## Interfaces
```js
// catalog.js
journalOf(item): 'WARRIOR'|'HUNTER'|'MAGE'|'TOOLMAKER'|null     // item.j: W/H/M/T; ausente (catálogo antigo/sem diário) ⇒ null
journalCapacity(tier): number|null                              // data.jcap[tier]; ausente ⇒ null
// journal.js (puro)
export const JOURNAL_LABEL = { WARRIOR: 'Ferreiro (Blacksmith)', HUNTER: 'Fletcher', MAGE: 'Imbuer', TOOLMAKER: 'Tinker' }
export const FAME_PER_MATERIAL = { 4: 22.5, 5: 90, 6: 270, 7: 645, 8: 1395 }          // fórum 2024, BAIXA
journalIds(tier, cls): { empty: 'T4_JOURNAL_WARRIOR_EMPTY', full: 'T4_JOURNAL_WARRIOR_FULL' }
journalGainPerCraft({ fame, capacity, priceEmpty, priceFull, premium, mode = 'order' }):
  { fraction, net, gainPerDiary, perCraft } | null    // null se capacity<=0, fame<=0 ou algum preço não for número finito > 0; mode 'order'|'instant'
estimateFame(rec, tier, ench): number|null            // Σ count dos ingredientes cujo uniq NÃO contém 'ARTEFACT' × FAME_PER_MATERIAL[tier] × 2**ench; tier fora de 4..8 ou rec nulo ⇒ null
journalSummary({ item, ench, rec, prices, premium, fame, crafts, bestProfit }): null | { cls, tier, ids, capacity, empty:{price,date,city}, full:{price,date,city}, state:'ok'|'noprice', estimate, gain: ReturnType<journalGainPerCraft>|null, lot, filledPerCraft, craftsPerDiary, profitWith }
```
Valida `fame`: aceita número ou texto numérico; `''`/inválido/≤ 0 ⇒ `null` (sem `perCraft`; o cartão ainda mostra o ganho por diário).

## Tasks (1 commit cada; teste primeiro e visto falhar)

### Task 1: catálogo com classe e capacidade
**Files:** Modify `scripts/build-catalog.mjs`, `scripts/build-test-fixture.mjs`; Create `catalog.journal.real.test.js` (project `logic`; lê `public/data/catalog.json` como `catalog.real.test.js`).
- [ ] **Step 1: teste falhando** (contra o catálogo **antigo**, falha por falta de `j`/`jcap`):
```js
it('capacidade por tier = @maxfame do dump (J2): T4 3.600 · T5 7.200 · T6 14.400 · T7 28.380 · T8 58.590', () => {
  expect(cat.jcap).toMatchObject({ 4: 3600, 5: 7200, 6: 14400, 7: 28380, 8: 58590 });
});
it('classe por item: 1.150 craftáveis com diário (W 400, M 359, H 374, T 17)', () => {
  const by = {}; for (const i of cat.items.filter((x) => x.r && x.j)) by[i.j] = (by[i.j] ?? 0) + 1;
  expect(by).toEqual({ W: 400, M: 359, H: 374, T: 17 });
});
it.each([['T4_MAIN_SWORD', 'W'], ['T4_2H_BOW', 'H'], ['T4_ARMOR_CLOTH_SET1', 'M'], ['T4_BAG', 'T']])('%s => %s', (id, j) => expect(byId[id].j).toBe(j));
it.each(['T4_METALBAR', 'T4_POTION_HEAL', 'T4_ARMOR_PLATE_ROYAL', 'T4_ARTEFACT_2H_ARCANESTAFF_HELL'])('%s não tem diário', (id) => expect(byId[id].j).toBeUndefined());
```
Mais: todo `j` ∈ `{W,H,M,T}`; itens sem receita não têm `j`; `validateCatalog(cat).ok` continua `true`; um catálogo **sem** `jcap`/`j` (copie e apague) também passa em `validateCatalog` (cache antigo do navegador).
- [ ] **Step 2:** `npm run test:logic -- src/lib/catalog.journal.real.test.js` → FAIL. **Step 3:** no build: ler `d.journalitem` (já em `raw`; ver como `all` é montado), montar `Map(id → classe)` por `T{n}_JOURNAL_(WARRIOR|HUNTER|MAGE|TOOLMAKER)`; **lançar** se um id aparecer em duas classes (como as outras hipóteses do script); `entry.j = 'WHMT'[...]` só para itens com receita; `jcap` = `@maxfame` por tier (lançar se as 4 classes divergirem no mesmo tier); log "N itens com diário". `build-test-fixture.mjs`: incluir `jcap: cat.jcap` em `out`.
- [ ] **Step 4:** `node scripts/build-catalog.mjs && node scripts/build-test-fixture.mjs`; `node scripts/catalog-diff.mjs` (só `j`/`jcap` novos; nenhum outro campo muda: **se mudar, PARAR**); PASS; `npm test` verde (`catalog.real.test.js` e demais intactos). **Step 5: Commit** `feat: catálogo com classe e capacidade do diário (IDEIA-003)`.

### Task 2: acessores do catálogo
**Files:** Modify `catalog.js`, `catalog.test.js`.
- [ ] **Step 1: testes falhando** (fixture): `journalOf(getItem('T4_MAIN_SWORD'))` = `'WARRIOR'`, `T4_BAG` = `'TOOLMAKER'`, `T4_METALBAR` = `null`, `undefined` = `null`; `journalCapacity(4)` 3600, `(8)` 58590, `(1)`/`(9)`/`NaN`/`'4'` = `null`; **catálogo antigo** (`setCatalog` com cópia sem `jcap`) ⇒ `journalCapacity(4) === null` e `journalOf` `null`, sem lançar.
- [ ] **Steps 2–5:** FAIL → implementar → PASS → **Commit** `feat: acessores do diário no catálogo (IDEIA-003)`.

### Task 3: contas puras
**Files:** Create `journal.test.js`, `journal.js`.
- [ ] **Step 1: testes falhando** (dados reais do dossiê §4, `T4_JOURNAL_WARRIOR`, Caerleon, qualidade 1, 2026-11-18: vazio 3.480; cheio `sell_price_min` 3.642; `buy_price_max` 2.200; capacidade 3.600; fama 540):
```js
const base = { fame: 540, capacity: 3600, priceEmpty: 3480, priceFull: 3642, premium: true };
it('Premium, por ordem: líquido 3.405,27 · ganho do diário −74,73 · fração 0,15 · por craft −11,2095 · 10 crafts −112,095', () => {
  const g = journalGainPerCraft(base);
  expect(g.net).toBeCloseTo(3405.27, 2); expect(g.gainPerDiary).toBeCloseTo(-74.73, 2);
  expect(g.fraction).toBeCloseTo(0.15, 6); expect(g.perCraft).toBeCloseTo(-11.2095, 4); expect(g.perCraft * 10).toBeCloseTo(-112.095, 3);
});
it('Premium, instantânea (ordem de compra a 2.200): líquido 2.112 · ganho −1.368', () => { /* mode 'instant', priceFull 2200 */ });
it('sem Premium, por ordem: líquido 3.259,59 · ganho −220,41', () => { /* premium false */ });
it('cenário hipotético do teste (preços inventados): vazio 3.000, cheio 4.500 ⇒ ganho 1.207,5 · 181,125 por craft', () => {});
it('crafts que enchem 1 diário: 3.600/540 = 6,67; 10 crafts = 1,5 diário', () => {});   // via journalSummary
```
`estimateFame`: espada T4 `T4_MAIN_SWORD` (16+8 = 24 materiais) ench 0 ⇒ **540**; ench 2 ⇒ **2.160** (= 24×22,5×4, exemplo do dossiê); cajado `T4_2H_ARCANESTAFF_HELL` (20 tábuas + 12 barras + 1 artefato) ⇒ 32 × 22,5 = **720** (artefato **não** conta); T6 espada ⇒ 24 × 270 = 6.480; tier 3 ou 9, `rec` null ⇒ `null`. **Bordas** de `journalGainPerCraft` (um `it.each`): `fame` 0/negativa/`NaN`/`Infinity`/`'abc'`/`null` ⇒ `null`; `capacity` 0/`null` ⇒ `null`; `priceEmpty`/`priceFull` 0, negativos, `NaN` ⇒ `null`; `fame` > capacidade (fração 2) ⇒ válida (ganho × 2); números enormes ⇒ finitos ou `null`, sem lançar. `journalSummary`: item sem diário ⇒ `null`; catálogo sem `jcap` ⇒ `null`; preços só em Caerleon (`mkPrices`) ⇒ `empty.city === 'Caerleon'`, `full.city === 'Caerleon'` e o ganho do dossiê; vazio mais barato em Thetford (3.300) e cheio mais caro em Lymhurst (3.700) ⇒ escolhe cada cidade pelo critério (menor vazio, maior cheio); sem preço do cheio ⇒ `state:'noprice'`, `gain: null`; `bestProfit` presente e `fame` ⇒ `profitWith = bestProfit + lot`; `fame` ausente ⇒ `profitWith: null`; `crafts` 0/NaN ⇒ tratado como 1.
- [ ] **Step 2:** FAIL. **Step 3:** implementar (`netSale` e `buyQuote`/`quote`/`CITIES` reaproveitados; nenhum imposto escrito aqui). **Step 4:** PASS.
- [ ] **Mutações:** imposto fixo 0,04; sinal do ganho invertido; fração `capacity/fame`; contar o artefato no `estimateFame`; esquecer `2**ench`; usar `buy_price_max` no cheio; escolher o vazio mais caro: derrubadas. **Step 5: Commit** `feat: ganho do diário por craft (IDEIA-003)`.

### Task 4: campos salvos e contrato
**Files:** Modify `persistSchemas.js`, `persistSchemas.test.js`, `audit/craft.js`, `core.js`, `audit/craft.test.js`.
- [ ] **Step 1: testes falhando:** `craft:cfg` aceita `journalOn: true`, `journalFame: '540'`; **corrompido**: `journalOn: 'sim'`/`{}`/`1` e `journalFame: {}`/`[3]` ⇒ campo descartado (padrão), resto do estado preservado; `contract.test.js` reprova os 2 campos **antes** do Var (prova que o contrato vigia); `sensitivity.test.js` com o probe: custo e lucro iguais; `craft.test.js`: sem `ctx.journal` ⇒ linha `journal` `not-considered` "não somado (desligado)"; `nc-journalUse` presente; `nc-journal` **ausente** do Craft.
- [ ] **Steps 2–5:** esquema + Var (linhas completas na Task 6) → `npm run test:logic` verde. **Commit** `feat: campos salvos do diário e linhas do auditor (IDEIA-003)`.

### Task 5: cartão e Craft (jsdom; `usePrices` e `useHistory` mockados como `Crafting.targetNoTax.test.jsx`)
**Files:** Create `JournalCard.test.jsx`, `JournalCard.jsx`, `Crafting.journal.test.jsx`; Modify `Crafting.jsx`.
- [ ] **Step 1: testes falhando.** `JournalCard` (props `{ summary, on, fame, onToggle, onFame }`): desligado ⇒ só a chave "Usar diário" e o texto "Diário recomendado: Ferreiro (Blacksmith), T4, enche 3.600 de fama"; ligado com os preços do dossiê e fama 540 ⇒ "−74,73" por diário (em vermelho, classe `bad`), "15%" por craft, "−11" por craft e "−112" em 10 crafts, e a frase **"O ganho é negativo: com estes preços o diário vale menos que o vazio depois dos impostos"**; hipotético (+1.207,5) ⇒ "+181"; sem fama ⇒ mostra o ganho por diário e "Informe a fama por craft (a janela do jogo mostra)"; placeholder do campo = estimativa **com o rótulo** "estimativa de fórum, baixa confiança" e **não** é usada: `lot` fica vazio; `noprice` ⇒ "Sem preço do diário vazio/cheio nas 6 cidades"; item sem diário ⇒ **nada** é desenhado. **Craft** (mock de preços com `T4_JOURNAL_WARRIOR_EMPTY: { Caerleon: { s: 3480 } }`, `…_FULL: { Caerleon: { s: 3642 } }`, espada T4 como no dossiê 005: custo 3.524,27): sem `journalOn` ⇒ **`usePrices` do diário chamado com `enabled:false`** e nenhum pedido; ligar ⇒ `enabled:true` com os 2 ids `T4_JOURNAL_WARRIOR_EMPTY/FULL`; as **linhas e o lucro das opções de venda ficam idênticos** com o interruptor ligado (compara o texto da tabela antes/depois); item de poção ⇒ sem cartão; **estado antigo** (`craftCfg()` sem os campos) ⇒ interruptor desligado, `localStorage` inalterado até clicar; **corrompido** (`journalOn: 'x'`, `journalFame: {}`) ⇒ sem erro nem tela branca; catálogo sem `jcap` ⇒ sem cartão.
- [ ] **Steps 2–4:** implementar (`journalSummary` chamado em `Crafting.jsx` com `bestProfit: best?.profit` e `crafts: c.rates.crafts`; `set({ journalOn })`, `set({ journalFame })` ficam em `Crafting.jsx`). `npm run test:ui` verde. **Step 5: Commit** `feat: cartão Diário de ofício no Craft (IDEIA-003)`.

### Task 6: auditor (verdade das linhas)
- [ ] **Step 1: testes falhando** em `craft.test.js`: ligado, com os preços do dossiê ⇒ `journal` `info-only` com o **mesmo** número do cartão (monta por `journalSummary`, nunca recalcula); `journal-empty`/`journal-full` com cidade e idade; preço com 30 h ⇒ `stale`; sem preço ⇒ `not-considered` "sem preço"; `journal-fame` vazio ⇒ "não informada", digitada ⇒ `user`; `ctx.journal` lixo ⇒ "não foi possível ler" sem lançar; `Crafting.audit.test.jsx` mostra as linhas. `npm run check` verde.
- [ ] **Manual (Executor registra, API real):** espada T4 em Lymhurst: preços reais dos diários; ganho provavelmente **negativo ou pequeno** (valores do mercado, **não são asserções**); recarregar mantém o interruptor; "Restaurar configurações" o apaga. **Commit** `feat: auditor lê o diário de ofício (IDEIA-003)`.

## Como o Tester valida
1. **Casos concretos:** −74,73 · −11,2095 · −112,095 · −1.368 · −220,41 · +181,125; 540 / 720 / 2.160 de fama estimada; 1.150 itens com diário (400/359/374/17); capacidades T4 a T8; item sem diário sem cartão.
2. **Mutações** da Task 3 (cópia fora do repo): sobrevivente reprova. Conferir a mão: `3642 × 0,935 = 3405,27`.
3. **Catálogo:** `catalog-diff.mjs` só mostra `j` e `jcap` novos; catálogo **antigo** em cache do navegador (sem `jcap`) não quebra a tela (cartão some).
4. **Lucro intacto:** com e sem o interruptor, as opções de venda e o "melhor destino" têm os **mesmos** números; o "lucro com diário" aparece **separado** e rotulado.
5. **Estado antigo/corrompido:** `craft:cfg` do commit `9e1e4a2` e lixo nos campos novos sem tela branca (perfis do laudo 070).
6. **Honestidade:** o cartão e o auditor dizem "só por ordem de venda", "estimativa de fórum, baixa confiança" e "não é somado ao lucro". **O que o usuário estranharia:** diário "grátis" somado ao lucro; ganho positivo sem mostrar o sinal; estimativa de fama tratada como fato; pedido de preços com o interruptor desligado.

## Riscos
1. **Fama por craft sem fonte sólida (BAIXA):** por isso é input; a estimativa é só placeholder. Dossiê pede **2 medições em jogo** (fama ao craftar T4 .0 e T4 .2) antes de qualquer automação.
2. **Preço de diário ralo na API** (ordens-lixo em `buy_price_*`; poucas cidades com `sell_price_min`): o cartão mostra cidade e idade; ganho calculado com preço velho é rotulado.
3. **Catálogo muda de id** (hash do arquivo): primeira visita pós-deploy baixa ~0,7 MB de novo (hoje já é assim a cada regeneração).
4. **`validitem` por tier:** o dump pode listar item sem diário no tier dele (`mintier 4`); o teste real cobre T4 a T8.
5. **Conflito** com 009 no catálogo regenerado (ver Compartilhados).

## Critério de pronto
`npm run check` verde sem alterar teste existente (exceto contagens de linhas de `craft.test.js`, declaradas); mutações derrubadas; catálogo e fixture regerados **pelos scripts** (não editados à mão); só os arquivos listados alterados; 2 campos no esquema **e** no auditor no mesmo commit; conferência manual registrada.

## PERGUNTAS PARA O GERENTE
1. **Não somar ao lucro por padrão** (cartão à parte com "lucro com diário"): aprova, ou quer um interruptor que some às opções de venda (mexe em `craftPlan.js`, conflito com 059/065/012)?
2. **Só venda por ordem de venda** (sem instantânea) e cidade do vazio = a mais barata, do cheio = a mais cara (sem exigir a mesma cidade, sem transporte): aceita?
3. **Fama estimada** só como placeholder rotulado "baixa confiança": ok, ou prefere nenhum valor sugerido até medir em jogo?
4. Regerar `catalog.json` muda o id de versão do catálogo (cache dos usuários): ok neste deploy?
5. **Refino** tem diários próprios (gatherer/refiner journals): fora desta ideia. Quer ideia separada?
6. O usuário pode medir em jogo: (a) fama mostrada ao craftar um T4 .0 e um T4 .2; (b) quantos crafts enchem 1 diário T4. Entra na lista de conferências?
