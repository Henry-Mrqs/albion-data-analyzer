# IDEIA-038 — Cidade de bônus de craft pelo `@craftingcategory` do dump (correção em produção): plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-038`. Comandos `npm` em `client/`; `node` na raiz do repositório. **Pré-requisito:** IDEIA-001 mesclada. **GRUPO CATÁLOGO (1º de 3):** 038 → 057 → 039. Este plano é o primeiro do grupo.

**Objetivo:** a cidade que dá +15% de produção no craft passa a ser calculada pela categoria de craft real do item (`@craftingcategory`), com a tabela `categoria → cidade` copiada do `craftingmodifiers.xml` do dump (nenhuma tabela escrita à mão no código), com Brecilien e com a regra "item sem `@craftingcategory` = sem cidade de bônus" (itens `*_ROYAL`, capas de cidade/facção, artefatos).

**Arquitetura:** `scripts/build-catalog.mjs` passa a (a) ler a versão do dump de uma constante fixada (reprodutível), (b) gravar `cc` em cada item que tiver `@craftingcategory`, (c) ler `craftingmodifiers.xml` e gravar no topo do catálogo `cityOf` (`categoria → cidade`) com os modificadores de `0.15` das 7 cidades reais. `catalog.js` lê `cityOf` e expõe `craftBonusCity(item)`; a tabela `CRAFT_CITY` é apagada. Um script `scripts/catalog-diff.mjs` resume a diferença entre dois `catalog.json` (usado aqui, na 057 e na 039).

**Spec:** `docs/research/IDEIA-038.md` (§2 regras C1 a C6, tabela canônica, §4 casos 1 a 17), `docs/research/AUDITORIA-001.md` §4.2, `docs/manager/decisoes.md` D-010 (verificação do Gerente no XML), D-011, D-014.

## Grupos, arquivos exclusivos e compartilhados

**Exclusivos do grupo catálogo (038/057/039):** `scripts/build-catalog.mjs`, `scripts/catalog-diff.mjs` (novo), `client/public/data/catalog.json` (artefato gerado), `client/src/lib/catalog.js`, `client/src/lib/catalog.test.js`, `client/src/lib/catalog.real.test.js` (novo).
**Compartilhados com o grupo ECON (019 → 041), onde o conflito é possível:**
- `client/src/components/Crafting.jsx`: 038 mexe só em `import` de `CRAFT_CITIES` e na linha `bonusCity = craftBonusCity(item)` e no `<select>` "Craftar em"; 019 mexe no campo da taxa de bancada; 041 acrescenta um `<Select>` e um cartão. Regiões distintas: merge textual simples.
- `client/src/lib/craftPlan.test.js`: 038 troca **apenas** a linha que calcula `bonusCity` nos testes (ver Task 4); 019 e 041 não devem chamar `craftBonusCity` em testes novos (usam `specialty: true` explícito e `bonusCity: null`).
- `scripts/build-test-fixture.mjs` + `client/src/test/catalog.fixture.json`: o ECON **não** altera a fixture. Dentro do grupo catálogo as três ideias acrescentam ids (só acrescentam; em conflito, mesclar a lista `IDS` e **regenerar** com `node scripts/build-test-fixture.mjs`).
**Impacto em planos já aprovados** (descrito na Task 4): IDEIA-001 (`catalog.test.js` e `craftPlan.test.js` usam `craftBonusCity('weapons/...')`), IDEIA-023 (`rrrCalc.js` usa `craftBonusCity(category)`).

## Fidelidade e limites

- **Sem constante de jogo sem fonte:** cidades e categorias vêm do XML (parser no build); a lista de 7 `clusterid → cidade` vem dos comentários do próprio XML (`<!--thetford--> 0000`, `<!--lymhurst--> 1000`, `<!--bridgewatch--> 2000`, `<!--martlock--> 3004`, `<!--fort sterling--> 4000`, `<!--caerleon--> 3003`, `<!--brecilien--> 5000`; conferido pelo Planejador em 2026-11-17). `+15` é o valor `0.15` lido do XML; `+40` (refino) e meat `0.10` são ignorados por filtro de valor.
- **Não muda** `rrr()`, `REFINING` (refino confere, AUDITORIA §4.1), preços, Refino. Rests, hideouts e estradas ficam fora (IDEIA-025).
- `CRAFT_CITIES` (lista de cidades para o seletor) é uma lista de **nomes**, não uma tabela de bônus; `CITIES` de `market.js` (preços) **não** ganha Brecilien neste plano.

## O que muda em `catalog.json` (conferência do Tester)

| Item | Antes | Depois |
|---|---|---|
| nº de itens (`items.length`) | 2.292 | **2.292** (nenhum sai) |
| itens com `r` (craftáveis) | 2.186 | **2.186** |
| campo `cc` por item | inexistente | **1.286** itens (os demais não têm `@craftingcategory`: artefatos, capas de cidade/facção, `*_ROYAL` etc.) |
| campo `cityOf` (topo) | inexistente | **33** entradas (categoria → cidade), igual à tabela abaixo |
| campo `src` (topo) | inexistente | SHA do dump fixado |
| `built` | data de execução | data do commit do dump fixado (reprodutível) |
Valores do Planejador (script próprio sobre o dump em cache, 2026-11-17). O Tester repete com o dump do SHA fixado e `node scripts/catalog-diff.mjs`.

**Tabela `cityOf` esperada (33):** Thetford: mace, naturestaff, firestaff, leather_armor, cloth_helmet · Lymhurst: sword, bow, arcanestaff, leather_helmet, leather_shoes · Bridgewatch: crossbow, dagger, cursestaff, plate_armor, cloth_shoes · Martlock: axe, quarterstaff, froststaff, plate_shoes, offhand · Fort Sterling: hammer, spear, holystaff, plate_helmet, cloth_armor · Caerleon: gatherergear, tools, food, knuckles, shapeshifterstaff · Brecilien: cape, bag, potion. (Dossiê §2, tabela canônica.)

**Efeito no app (itens craftáveis cuja cidade de bônus muda, 296 de 2.186):** potions Caerleon→Brecilien 41; bolsas Caerleon→Brecilien 6 + satchels 5; capas simples Caerleon→Brecilien 6; livros Lymhurst→Martlock 31; tochas Bridgewatch→Martlock 31; botas de couro Bridgewatch→Lymhurst 47; elmos de tecido Lymhurst→Thetford 41; botas de tecido Thetford→Bridgewatch 42; **45 itens `*_ROYAL`** (elmo/armadura/botas de tecido, couro, placa) perdem a cidade de bônus (→ nenhuma); 1 item sem categoria de loja conhecida (`head/other`, `T8_HEAD_CLOTH_PROTOTYPE`, `cc=cloth_helmet`) passa de nenhuma a Thetford. Inalterados: espadas, arcos, machados etc. (a lista antiga já acertava essas).

## Onde aparece e UI

Aba **Craft**, cartão "Produção": o seletor **"Craftar em"** passa a listar 7 cidades (acrescenta **Brecilien**); a marca "(bônus)" aparece na cidade certa do item escolhido e a dica passa a dizer "Cidade com bônus para este item: X". Itens sem bônus (Royal, capas de cidade, artefatos) mostram "Sem cidade de bônus para este item" e o interruptor "Bônus de especialização" começa desligado. Nada mais muda na tela.

## Arquivos afetados (exatos)

**Criados:** `scripts/catalog-diff.mjs`, `client/src/lib/catalog.real.test.js`.
**Alterados:** `scripts/build-catalog.mjs`, `client/public/data/catalog.json` (regenerado), `client/src/lib/catalog.js`, `client/src/lib/catalog.test.js`, `scripts/build-test-fixture.mjs`, `client/src/test/catalog.fixture.json` (regenerado), `client/src/components/Crafting.jsx`, `client/src/lib/craftPlan.test.js` (1 linha; Task 4), e `client/src/lib/rrrCalc.js` + `rrrCalc.test.js` **somente se** a IDEIA-023 já estiver mesclada (Task 4).
**NÃO toca:** `econ.js`, `craftPlan.js`, `market.js`, `Refining.jsx`, `Flipper.jsx`, `refinePlan.js`.

**Modelo de dados:** item ganha `cc?: string`; catálogo ganha `cityOf: { [categoria]: cidade }` e `src: string` (SHA). `setCatalog` aceita catálogo sem `cityOf` (usa `{}`), para não quebrar fixtures antigas.

## Interfaces (`catalog.js`)

```js
export const CRAFT_CITIES: string[]        // ['Martlock','Thetford','Fort Sterling','Lymhurst','Bridgewatch','Caerleon','Brecilien']
export function cityOfCategory(cc: string | undefined): string | null     // data.cityOf[cc] ?? null
export function craftBonusCity(item: { cc?: string } | undefined): string | null   // cityOfCategory(item?.cc)
```
`craftBonusCity` **muda de assinatura** (recebia `item.c` como string). Nenhuma lógica por subcategoria de loja.

## Tasks (1 commit cada; testes primeiro)

### Task 1: Dump fixado, `built` reprodutível e `catalog-diff`
**Files:** Modify `scripts/build-catalog.mjs`; Create `scripts/catalog-diff.mjs`; Modify `client/public/data/catalog.json` só se o diff for o esperado.
- [ ] **Step 1:** em `build-catalog.mjs` substituir `BASE` por `const REF = '0483dd97f1581dfaf02eed42f25f5ea2a3cb75e5'; const REF_DATE = '2026-11-02';` e `BASE = .../ao-bin-dumps/${REF}`; nome do cache passa a incluir `REF.slice(0, 8)` (`albion-${name}` → `albion-${REF8}-${name}`) para não reaproveitar cache de outro SHA; `built = REF_DATE`; gravar `src: REF`. (SHA = HEAD de `master` em 2026-11-02T12:29:22Z, confirmado pela API do GitHub em 2026-11-17; o Executor reconfirma com `gh api repos/ao-data/ao-bin-dumps/commits/0483dd97 --jq .sha`.)
- [ ] **Step 2:** criar `scripts/catalog-diff.mjs <antigo.json> <novo.json>`: imprime nº de itens, nº com `r`, nº com `cc`, nº com `tm`, nº de ingredientes com 3º elemento, chaves de topo, e uma tabela "campo adicionado/removido por item" agregada por `item.c` (apenas contagens e até 20 ids de exemplo). Sem dependências.
- [ ] **Step 3: verificação de baseline (sem mudar a lógica):** `git show master:client/public/data/catalog.json > $TMPDIR/old.json; node scripts/build-catalog.mjs; node scripts/catalog-diff.mjs $TMPDIR/old.json client/public/data/catalog.json`. **Esperado:** `itens 2292 -> 2292`, nenhuma diferença por item; só `built` e `src` mudam. Se houver qualquer outra diferença, **pare e relate ao Gerente** (o catálogo comitado foi gerado de um dump diferente do SHA fixado).
- [ ] **Step 4: Commit:** `chore: fixa o SHA do dump no build-catalog e adiciona catalog-diff`.

### Task 2: `cc` e `cityOf` no build (teste do catálogo real primeiro)
**Files:** Create `catalog.real.test.js`; Modify `build-catalog.mjs`, `catalog.json`.
- [ ] **Step 1: teste falhando.** `catalog.real.test.js` lê `client/public/data/catalog.json` com `fs`/`JSON.parse` (sem rede, sem fixture). Casos (dossiê §4; a coluna "esperado" é a cidade do dossiê, e o teste usa `cityOf[item.cc]`):

```js
const CASES = [ // [id, c esperado, cc esperado, cidade esperada]
  ['T4_MAIN_SWORD','weapons/sword','sword','Lymhurst'], ['T4_ARMOR_CLOTH_SET1','armors/cloth_armor','cloth_armor','Fort Sterling'],
  ['T4_HEAD_CLOTH_SET1','head/cloth_helmet','cloth_helmet','Thetford'], ['T4_SHOES_LEATHER_SET1','shoes/leather_shoes','leather_shoes','Lymhurst'],
  ['T4_SHOES_CLOTH_SET1','shoes/cloth_shoes','cloth_shoes','Bridgewatch'], ['T4_OFF_BOOK','offhands/booktype','offhand','Martlock'],
  ['T4_OFF_TORCH','offhands/torchtype','offhand','Martlock'], ['T4_OFF_SHIELD','offhands/shieldtype','offhand','Martlock'],
  ['T4_BAG','bags/bags','bag','Brecilien'], ['T4_BAG_INSIGHT','bags/satchels','bag','Brecilien'],
  ['T4_CAPE','capes/accessoires_capes_capes','cape','Brecilien'], ['T4_POTION_HEAL','consumables/potions','potion','Brecilien'],
  ['T4_MEAL_SALAD','consumables/food','food','Caerleon'], ['T4_2H_KNUCKLES_SET1','weapons/knuckles','knuckles','Caerleon'],
  ['T4_CAPEITEM_FW_LYMHURST','capes/accessoires_capes_lymhurst',undefined,null], ['T4_ARMOR_PLATE_ROYAL','armors/plate_armor',undefined,null],
];  // casos 1 a 16 do dossiê
it.each(CASES)('%s', (id, c, cc, city) => { const it = byId[id]; expect(it.c).toBe(c); expect(it.cc).toBe(cc); expect(cat.cityOf[it.cc] ?? null).toBe(city); });
it('caso 17 (exceção C4): T4_2H_IRONGAUNTLETS_HELL não está no catálogo; a categoria dagger vai para Bridgewatch', () => {
  expect(byId.T4_2H_IRONGAUNTLETS_HELL).toBeUndefined(); expect(cat.cityOf.dagger).toBe('Bridgewatch'); });
it('cityOf é a cópia fiel do XML (33 entradas, tabela do dossiê)', () => { expect(cat.cityOf).toEqual(DOSSIE_TABELA); expect(Object.keys(cat.cityOf)).toHaveLength(33); });
it('contagens', () => { expect(cat.items).toHaveLength(2292); expect(cat.items.filter((i) => i.cc)).toHaveLength(1286);
  expect(cat.items.filter((i) => /_ROYAL$/.test(i.i) && i.cc)).toHaveLength(0); });
it('cc ausente em todos os 45 ROYAL, capas de cidade e artefatos', ...);
```
  `DOSSIE_TABELA` é a tabela canônica do dossiê §2 escrita no próprio teste (oráculo independente do build); `byId` = `Object.fromEntries(cat.items.map(i => [i.i, i]))`.
- [ ] **Step 2:** `npx vitest run src/lib/catalog.real.test.js` → FAIL (`cc` e `cityOf` inexistentes).
- [ ] **Step 3: implementar no build:** gravar `cc: it['@craftingcategory']` quando existir; baixar `craftingmodifiers.xml` (mesmo `cached()` com o `REF` fixado; é XML, usar `fs.readFileSync` + regex, sem dependência nova): para cada `<craftinglocation clusterid="X">...</craftinglocation>` com `X` em `{0000: 'Thetford', 1000: 'Lymhurst', 2000: 'Bridgewatch', 3004: 'Martlock', 4000: 'Fort Sterling', 3003: 'Caerleon', 5000: 'Brecilien'}`, coletar `<craftingmodifier name="N" value="0.15" />` em `cityOf[N] = cidade`; falhar o build (`throw`) se a mesma categoria aparecer em duas cidades ou se `cityOf` não tiver exatamente 33 chaves (trava contra mudança silenciosa do XML). Gravar `cityOf` e `src` no topo do JSON.
- [ ] **Step 4:** `node scripts/build-catalog.mjs` (imprime a linha de resumo) e `node scripts/catalog-diff.mjs old.json client/public/data/catalog.json` → `itens 2292 -> 2292`, `cc: 0 -> 1286`, `cityOf: 33`. **Step 5:** `npx vitest run src/lib/catalog.real.test.js` → PASS. `npm run check`.
- [ ] **Step 6: Commit** (script, teste e `catalog.json`): `feat: catálogo exporta craftingcategory (cc) e cityOf do craftingmodifiers.xml`.

### Task 3: `catalog.js` e fixture
**Files:** Modify `catalog.js`, `catalog.test.js`, `build-test-fixture.mjs`, `catalog.fixture.json`.
- [ ] **Step 1:** em `build-test-fixture.mjs` copiar também os campos de topo `cityOf` e `src`, e acrescentar a `IDS`: `T4_MAIN_SWORD T4_ARMOR_CLOTH_SET1 T4_HEAD_CLOTH_SET1 T4_SHOES_LEATHER_SET1 T4_SHOES_CLOTH_SET1 T4_OFF_BOOK T4_OFF_TORCH T4_OFF_SHIELD T4_BAG T4_BAG_INSIGHT T4_CAPE T4_POTION_HEAL T4_MEAL_SALAD T4_2H_KNUCKLES_SET1 T4_CAPEITEM_FW_LYMHURST T4_ARMOR_PLATE_ROYAL`. Regenerar: `node scripts/build-test-fixture.mjs`.
- [ ] **Step 2: testes falhando** em `catalog.test.js` (fixture, `beforeEach(loadFixtureCatalog)`):

```js
it.each(CASES_1_A_16)('craftBonusCity(%s)', (id, _c, _cc, city) => expect(craftBonusCity(getItem(id))).toBe(city));   // mesma tabela da Task 2
it('item sem cc ou indefinido: null', () => { expect(craftBonusCity({})).toBeNull(); expect(craftBonusCity(undefined)).toBeNull(); });
it('ROYAL não herda bônus pela categoria de loja', () => { expect(getItem('T4_ARMOR_PLATE_ROYAL').c).toBe('armors/plate_armor'); expect(craftBonusCity(getItem('T4_ARMOR_PLATE_ROYAL'))).toBeNull(); });
it('cityOfCategory: dagger = Bridgewatch (exceção C4); categoria desconhecida = null', ...);
it('CRAFT_CITIES inclui Brecilien e as 6 cidades de CITIES', () => expect(CRAFT_CITIES).toEqual(['Martlock','Thetford','Fort Sterling','Lymhurst','Bridgewatch','Caerleon','Brecilien']));
it('catálogo sem cityOf não quebra', () => { resetCatalog(); setCatalog({ items: [], extra: {}, vals: {}, encNames: {} }); expect(cityOfCategory('sword')).toBeNull(); });
```
  Remover do arquivo as asserções antigas `craftBonusCity('weapons/bow')`, `craftBonusCity('armors/plate_armor')`, `craftBonusCity('crafting/refinedresources')` (da IDEIA-001), substituídas pelas acima.
- [ ] **Step 3:** rodar → FAIL. **Step 4:** em `catalog.js`: `setCatalog` guarda `data.cityOf ??= {}`; apagar `CRAFT_CITY`; implementar as três exportações. **Step 5:** PASS; `npm run check` (o lint vai acusar os chamadores antigos: ver Task 4).
- [ ] **Step 6: Commit:** `feat: craftBonusCity(item) por craftingcategory, cityOfCategory e CRAFT_CITIES (Brecilien)`. (Se `check` falhar só por chamadores, fazer as Tasks 3 e 4 no mesmo commit.)

### Task 4: Chamadores, seletor de Brecilien e planos aprovados
**Files:** Modify `Crafting.jsx`, `craftPlan.test.js`; condicional `rrrCalc.js`, `rrrCalc.test.js`.
- [ ] **Step 1:** `grep -rn "craftBonusCity\|CRAFT_CITY" client/src` e tratar cada ocorrência.
- [ ] **Step 2: `Crafting.jsx`:** `bonusCity = item ? craftBonusCity(item) : null`; o `<select>` "Craftar em" usa `CRAFT_CITIES`; `matCity`/`refineCity` continuam com `CITIES` (preços). A dica "Sem cidade de bônus conhecida" permanece.
- [ ] **Step 3: `craftPlan.test.js` (IDEIA-001):** onde o teste faz `bonusCity = craftBonusCity('weapons/bow')`, trocar por `craftBonusCity(getItem('T4_2H_BOW'))` (item já está na fixture) e ajustar as asserções de `craftRates`: `'Lymhurst'` continua a cidade do arco (cc `bow`, dossiê §2). Nenhum número muda.
- [ ] **Step 4: IDEIA-023 (só se já mesclada):** `isSpecialty({ kind: 'craft', city, category })` passa a receber a **categoria de craft (`cc`)** e a chamar `cityOfCategory(cc) === city`; o seletor de categoria da aba RRR lista as chaves de `data.cityOf` mais as sem cidade (ex. `offhand` aparece), com rótulos próprios por `cc` (sem tabela de cidades). Atualizar `rrrCalc.test.js`: `ESPECIALISTA = cityOfCategory('sword')`. Se a 023 ainda não estiver mesclada, **não editar**: o Executor da 023 recebe esta mudança no briefing.
- [ ] **Step 5:** `npm run check` → código 0. `npm run dev`: aba Craft; escolher `T4_BAG` → seletor oferece Brecilien e marca "(bônus)" nele; `T4_OFF_TORCH` → Martlock; `T4_ARMOR_PLATE_ROYAL` → "Sem cidade de bônus", interruptor desligado; `T4_MAIN_SWORD` → Lymhurst.
- [ ] **Step 6: Commit:** `fix: bônus de cidade de craft por craftingcategory; seletor com Brecilien; Royal sem bônus`.

## Como o Tester valida

1. **Regeneração reprodutível:** no SHA `0483dd97...` rodar `node scripts/build-catalog.mjs` duas vezes; `git diff` entre as duas saídas é vazio. `node scripts/catalog-diff.mjs <master> <branch>`: `itens 2292 → 2292`, `r: 2186 → 2186`, `cc: 0 → 1286`, `cityOf: 33 entradas`; tabela por `c` com os 296 itens craftáveis e as mudanças de cidade acima.
2. **Caso numérico do dossiê (§4, caso 3):** `T4_HEAD_CLOTH_SET1` em Thetford: PB 18+15 = 33 → RRR **24,8120%**; no código antigo (Lymhurst, categoria errada) PB 18 → **15,2542%**; diferença 9,56 pontos; com 8 recursos, 8 × 0,0956 = **0,77 unidade por craft**. Recalcular sem importar `econ.js`.
3. **16 casos reais** da tabela da Task 2 conferidos contra `items.json` do SHA (campo `@craftingcategory`) e `craftingmodifiers.xml` (o Tester lê o XML, não o `cityOf` do app). O 17º (`T4_2H_IRONGAUNTLETS_HELL`, `dagger` → Bridgewatch) não está no catálogo: conferir só `cityOf.dagger`.
4. **Royal:** `T4_ARMOR_PLATE_ROYAL` no Craft: sem cidade de bônus em nenhuma cidade; com "Bônus de especialização" ligado à mão o RRR é 24,81%, desligado 15,25% (base 18).
5. **O que um jogador experiente estranharia:** Brecilien ausente do seletor de craft; capa/bolsa/poção ainda marcando Caerleon; livro e tocha marcando Lymhurst/Bridgewatch (agora Martlock); armadura Royal com bônus de cidade; espada/arco/machado mudando de cidade sem motivo (não devem mudar); cidade de refino alterada (não deve); cálculo de preço de materiais mudando (não deve; só o RRR do craft muda).

## Riscos

1. O catálogo comitado pode ter sido gerado de um dump diferente do SHA fixado (Task 1 detecta e para).
2. `T8_HEAD_CLOTH_PROTOTYPE` (`head/other`) ganha Thetford por ter `cc=cloth_helmet`: comportamento correto pelo dump (C1); anotar no relatório.
3. O parser de XML por regex depende do formato atual do arquivo; o `throw` de 33 chaves e de duplicata evita falha silenciosa.
4. Brecilien só é cidade de **craft** aqui; comprar/vender lá exige `CITIES`/AODP (fora de escopo, IDEIA-025).
5. Cache do `os.tmpdir()` com nome novo baixa ~40 MB na primeira execução.

## Critério de pronto

`npm run check` verde; `catalog.real.test.js` e `catalog.test.js` verdes; regeneração reprodutível; nenhuma ocorrência de `CRAFT_CITY` ou de `craftBonusCity(item.c)` no código; seletor com Brecilien; só os arquivos listados alterados.

## PERGUNTAS PARA O GERENTE

1. **Impacto em planos aprovados:** IDEIA-023 usa `craftBonusCity(category)` e uma lista de categorias de loja; a Task 4 prevê o ajuste, mas o plano 023 precisa de adendo (categoria de craft `cc`). Quer que eu emita o adendo?
2. O SHA fixado é o do dump de 2026-11-02. Atualizar o dump (novos itens/receitas) deve ser ideia própria. Confirma?
3. `CITIES` (preços) continua sem Brecilien. Quer incluí-la na IDEIA-025 ou já aqui?
