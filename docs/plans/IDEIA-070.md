# IDEIA-070 — Estado salvo antigo ou incompleto: mesclar, validar e versionar o que o navegador guarda: plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-070`. Comandos `npm` em `client/`. **CORREÇÃO** (D-039). **Regra do briefing:** cada teste é escrito, **executado e visto falhar** antes de implementar. **Sem dossiê de jogo**: a fonte é o código de `client/src/lib/settings.js` e o histórico do git (o oráculo dos formatos que cada versão realmente salvou).

**Problema (verificado no código):** `usePersisted(key, initial)` devolve o JSON de `localStorage` **exatamente como está**, sem mesclar com `initial` e sem checar tipo; `getSettings` mescla só no primeiro nível e aceita qualquer valor. Cada ideia que acrescentou campo a uma tela depende de o código tolerar a ausência. Quem tem estado salvo por uma versão **antiga** (todos os usuários reais, inclusive o do projeto) nunca foi testado: os Testers sempre partiram de navegador limpo ou de valores injetados por eles (D-039).

**Objetivo:** (1) mesclar o salvo com os padrões; (2) validar o **tipo** de cada campo e tolerar JSON inválido ou valor que não é objeto, sem derrubar a tela; (3) **versionar** o formato salvo sem quebrar o que já está salvo sem versão; (4) migrar explicitamente os formatos antigos conhecidos; (5) **zero regressão** com estado salvo completo e atual (idêntico bit a bit); (6) tudo numa **função pura testável**, sem React nem `localStorage`.

## Quais chaves existem (conferido por `grep` em `client/src`)

| Chave (`albion:` + …) | Tela / arquivo | Tipo do padrão |
|---|---|---|
| `craft:item` | `Crafting.jsx` | objeto `{ id, ench }` |
| `craft:cfg` | `Crafting.jsx` | objeto de 13 campos |
| `refine:cfg` | `Refining.jsx` | objeto de 13 campos |
| `flip:cfg` | `Flipper.jsx` | objeto de 11 campos (4 listas) |
| `market:item` | `Market.jsx` | objeto `{ id, ench }` |
| `market:quality` | `Market.jsx` | **número** (1) |
| `rrr:cfg` | `RrrCalculator.jsx` | objeto de 8 campos |
| `target:cfg` | `TargetPrice.jsx` | objeto de 5 campos |
| `settings` | `settings.js` (`getSettings`/`setSettings`, outro mecanismo) | objeto `{ server, premium, feeCeiling }` |

## O que cada versão REALMENTE salvou (reconstruído com `git log -p`; todos os commits estão em `master`)

O estado só vai para o `localStorage` quando o usuário **muda algo** (`setValue`); o que fica salvo é o padrão da versão **mais** os campos que `set({…})` acrescentou. Campos de `NumberInput` são salvos como **texto** (`'500'`), e selects numéricos como número.

| Chave | Commit (data) | Formato salvo |
|---|---|---|
| `craft:cfg` | `8bf3014` (2026-11-16, inicial) | `craftCity, specialty(null\|bool), focus, feePer100:400, customRRR:'', matCity, useOrders, crafts:1, refine:{ MATERIAL: 'buy'\|'refine' }, refineFocus, refineFee:400, deep:false` |
| | `9e1e4a2` (11-17) | sem `deep`; `refine` aceita `'buy'\|'refine'\|'all'\|'best'` (o código já mapeia `'refine'` → `'all'`) |
| | `7fe574e` (11-17) | + `refineCity:'auto'`, `refineDaily:{}` |
| | deploys da 019 (`ae61c3e`), 041 (`f4915f5`), 049 (QA) | + `feeSet`, `refineFeeSet` (booleanos), `craftDaily`, `craftDailyAt` (ms), `waitCost`, `recipeVariant` (texto `'auto'` ou `'0'`, `'1'`…), nunca nos padrões: só aparecem por `set` |
| `refine:cfg` | `8bf3014` (11-16) | `type, tier, ench, buyCity, refineCity, sellCity, focus, daily, feePer100, customRRR, useOrders, deep:false, sellMode, qty` |
| | `f68f0af` (11-17) | `deep` vira `route:'best'` (o código lê `cfg.route ?? (cfg.deep ? 'all' : 'best')`) |
| `rrr:cfg` | `451f0fa` (11-17, deploy 2, 023) | `kind, city, category:'weapons/sword'` (categoria **de loja**), `resource, focus, daily, item:null, crafts:100` |
| | `8e387f6` (11-18, deploy 5, 038) | `category:'sword'` (categoria de **craft**, `cc`); o componente já cai em `'sword'` para qualquer valor desconhecido |
| `target:cfg` | `943c7c8` (11-17, 030) | `goal, profit:1000, margin:20, mode, relists:0` (estável) |
| `flip:cfg` | `8bf3014` | `groups[], tiers[], enchs[], buyCities[], sellCities[], buyMode, sellMode, minProfit, minMargin, maxAge, budget:''` (estável) |
| `market:item` / `market:quality` | `8bf3014` | `{ id, ench }` / `1` (estáveis) |
| `settings` | `8bf3014` | `{ server:'west', premium:true }` |
| | `da8bf1c` (060) | + `feeCeiling:1000` |
O Tester reconstrói cada estado a partir do git com `git show <commit>:client/src/components/<arquivo>` (o bloco `usePersisted('chave', {…})` é o padrão da época) e acrescenta à mão os campos de `set` do mesmo commit. Estes formatos viram `client/src/test/savedStates.js` (comentário com o commit de cada um).

## Gravidade esperada (por leitura do código; a medição do re-teste da 010 confirma ou corrige, e o plano vale nos dois casos)

- **Tela branca (estado corrompido ou futuro, não de versão antiga conhecida):** `refine:cfg.type` desconhecido (`REFINING[cfg.type].city`); `flip:cfg.groups` com nome desconhecido (`GROUPS[g].test`); `flip:cfg.tiers/buyCities/sellCities/groups` que não é lista; `craft:cfg.refine` nulo (`cfg.refine[…]`); `craft:item.id`/`market:item.id` que não é texto (`marketId` chama `.match`); qualquer chave com `null`.
- **Numérico silencioso (versão antiga REAL):** `craft:cfg` anterior a `7fe574e` sem `refineCity`: o RRR do refino dos materiais sai 18/118 em vez de 58/158 (a condição `cfg.refineCity === 'auto'` falha); `rrr:cfg` anterior à 038 com `category:'weapons/axe'`: cai em "espada" e mostra a cidade e o RRR de **espada**.
- **Console/visual:** `<select value={undefined}>` (aviso de componente descontrolado) quando falta `refineCity`/`route`; `settings.server` inválido monta uma URL de API quebrada.

## Desenho

**Local:** módulo puro `lib/persist.js` e registro `lib/persistSchemas.js`; `settings.js` só liga os dois ao `localStorage` e ao React. **Nenhum componente muda** (o registro é por chave).

### Mescla: rasa por campo, profunda só onde o padrão tem estrutura fixa
- **Campo a campo no primeiro nível:** campo ausente ganha o padrão; campo presente e **válido** mantém o **valor salvo sem coerção** (`'500'` continua `'500'`: converter para número mudaria o comportamento e a validação da 060).
- **Recursiva** quando o padrão e o salvo são objetos **e o padrão tem chaves** (estrutura fixa: `{ id, ench }` de `craft:item`/`market:item`): `{ id: 'T4_BAG' }` salvo vira `{ id: 'T4_BAG', ench: 0 }`.
- **Mapas abertos** (`refine`, `refineDaily`, `feeByCity`, `noTax`; padrão `{}`): **o salvo vale inteiro**, mas cada entrada é validada pelo esquema da chave (entrada inválida some; o mapa continua). Não se mescla um mapa vazio com ele mesmo.
- **Listas** (`flip:cfg.groups` etc.): vale a lista salva, filtrando elementos de tipo errado ou fora do conjunto permitido; **lista vazia salva continua vazia** (o usuário pode ter desmarcado tudo: não é "ausente").

### Campos desconhecidos (que não estão nos padrões): **preservar**
Decisão e motivo: vários campos legítimos **nunca** estão nos padrões e só existem por `set` (`feeSet`, `refineFeeSet`, `craftDaily`, `craftDailyAt`, `waitCost`, `recipeVariant`, `share`…). Descartar o desconhecido apagaria esses valores a cada carga (regressão grave: por exemplo `feeSet`, D-022). Preservar também mantém compatibilidade para frente e para trás (um rollback do deploy lê o objeto sem perder nada). Exceções: chaves `__proto__`, `constructor`, `prototype` (proteção contra poluição de protótipo) e os campos que uma migração remove (`deep`). Campos **conhecidos** pelo esquema, mas **sem padrão**, são validados pelo tipo e, se inválidos, **removidos** (voltam a "ausente", que o código já trata).

### Tipo de cada campo (esquema + padrão)
Para cada campo, o esquema da chave (`persistSchemas.js`) diz o tipo; sem entrada, o tipo vem do padrão. Tipos (regras estritas onde a tela só produz aquele tipo, **permissivas onde a validação da 060 já cuida do valor** para não esconder o aviso dela):

| Tipo | Aceita | Rejeita (volta ao padrão do campo) |
|---|---|---|
| `bool` | `true`/`false` | tudo mais (inclusive `'false'`) |
| `boolOrNull` (`specialty`) | `null`, `true`, `false` | demais |
| `num` (selects e contadores: `tier`, `ench`, `quality`, `crafts` da aba RRR…) | número finito | texto, `null`, `NaN`, lista, objeto |
| `numText` (campos de `NumberInput`: `crafts`, `feePer100`, `refineFee`, `minProfit`, `budget`, `qty`, `profit`, `margin`, `relists`, `waitCost`…) | número finito **ou texto** (qualquer; a 060 mostra o aviso se for absurdo) | `null`, booleano, lista, objeto |
| `str` | texto | número, `null`, lista… |
| `enum` (`type`, `route`, `sellMode`, `buyMode`, `goal`, `mode`, `kind`, `server`, cidades, `resource`) | só valores do conjunto | demais |
| `list` de `str`/`num` com conjunto permitido (`flip:cfg.*`) | lista; elementos filtrados | não-lista |
| `obj` / `objOrNull` (`refine`, `refineDaily`, `item`) | objeto simples (não lista) / também `null` | demais |
| `passthrough` (`settings.feeCeiling`) | qualquer valor JSON | nada: **a 060 já valida e mostra o aviso permanente**; resetar em silêncio apagaria esse aviso (regressão de D-030) |
Valores especiais: `recipeVariant` (049): `'auto'` ou inteiro não negativo (texto ou número); qualquer outra coisa (`'1.5'`, `-1`, `'x'`) é **removida** (volta a automático); a escolha de receita e a variante inválida **passam pela mesma função** que o resto (pedido novo dos Testers; a 049 também passa a cair em 0 dentro de `recipeOf`, mas o estado salvo não pode mais carregar o valor ruim). `craftDailyAt`: `num`. `craft:item`/`market:item`: `id` `str`, `ench` `num` (0 a 4 não é checado aqui porque a existência do item depende do catálogo, que pode não estar carregado ainda).

### Versão do formato
O objeto salvo ganha o campo reservado **`_v`** (número). Motivos para campo dentro do objeto e não um envelope `{ v, d }`: (i) quem já tem estado **sem** `_v` (todos hoje) é o caso "versão 0" e continua legível; (ii) um **rollback** do deploy (o código antigo lê o JSON como objeto de configuração) continua funcionando, porque ignora `_v`; um envelope quebraria o código antigo. `loadPersisted` lê `_v` (ausente ou inválido = 0), aplica as migrações `0→1`, `1→2`… em ordem, mescla e **devolve o valor sem `_v`** (as telas nunca o veem); a gravação acrescenta `_v` = versão atual da chave. Estados primitivos (`market:quality`) não têm versão: só validação de tipo. Versão atual de todas as chaves de objeto: **1**.

### Migrações explícitas `0 → 1` (puras, testadas com os formatos do git)
- `craft:cfg`: remover `deep`; em `refine`, `'refine'` → `'all'` (**exatamente o que `modeOf` já faz hoje**, logo nenhum número muda), valores fora de `buy|all|best` removidos.
- `refine:cfg`: se `route` ausente e `deep === true` → `route: 'all'`; remover `deep`. **Isto precisa vir ANTES da mescla**: mesclar primeiro injetaria `route:'best'` e apagaria o efeito do `deep` antigo.
- `rrr:cfg`: `category` de loja → de craft: `weapons|armors|head|shoes/<sub>` → `<sub>` (`weapons/sword` → `sword`, `armors/plate_armor` → `plate_armor`, `head/cloth_helmet` → `cloth_helmet`, `shoes/leather_shoes` → `leather_shoes`), e as exceções `offhands/*` → `offhand`, `bags/*` → `bag`, `capes/accessoires_capes_capes` → `cape`, `consumables/potions` → `potion`, `consumables/food` → `food`; resultado fora da lista de categorias de craft → `'sword'` (o padrão). Valor que já é categoria de craft fica.
- `settings`, `flip:cfg`, `target:cfg`, `market:*`: sem migração (só mescla e validação).
Uma migração que lança exceção **não derruba a tela**: a chave volta ao padrão e a causa vira um `issue` (vide `loadPersisted`).

## Interfaces (`persist.js`, puro: sem React, `localStorage` nem rede)

```js
mergeSaved(saved, defaults, schema = {}): { value, issues }
  // saved/defaults objetos simples; aplica a regra de mescla, tipos e extras acima; não muta as entradas; idempotente (mergeSaved(value, defaults).value deep-igual a value)
loadPersisted(raw: string | null, { defaults, version = 1, migrations = {}, schema = {} }): { value, fromVersion, issues }
  // raw ausente/'null'/JSON inválido/valor que não é objeto (quando o padrão é objeto) => defaults inteiros + issue; primitivo: valida tipo contra o padrão
serializePersisted(value, version): string       // objeto: JSON.stringify({ ...value, _v: version }); primitivo: JSON.stringify(value)
issue = { key, field, code: 'invalid-json' | 'not-object' | 'bad-type' | 'migration-failed' | 'dropped-unknown-proto', message }
// persistSchemas.js: PERSISTED = { 'craft:cfg': { version: 1, migrations: { 1: fn }, schema: {…} }, … }; getPersistedSpec(key)
```
`settings.js`: `usePersisted(key, initial)` passa a ser `useState(() => loadPersisted(localStorage.getItem('albion:' + key), { defaults: initial, ...getPersistedSpec(key) }).value)` (com o mesmo `try/catch` de hoje) e o setter grava com `serializePersisted`; `getSettings` inicial usa a mesma função com a chave `settings`. **`usePersisted` mantém a assinatura e o retorno** `[value, setValue]`.

## Arquivos: exclusivos, compartilhados, ordem

**Criados:** `client/src/lib/persist.js`, `client/src/lib/persist.test.js`, `client/src/lib/persistSchemas.js`, `client/src/lib/persistSchemas.test.js` (contratos), `client/src/lib/persist.history.test.js` (formatos do git), `client/src/lib/settings.test.js` (carga inicial do módulo), `client/src/test/savedStates.js` (os estados de cada versão, com o commit de origem).
**Alterados:** `client/src/lib/settings.js` (só `usePersisted` e a leitura/gravação de `getSettings`/`setSettings`; assinaturas e retornos iguais).
**NÃO toca:** nenhum componente (`Crafting.jsx`, `Refining.jsx`, `Flipper.jsx`, `RrrCalculator.jsx`, `TargetPrice.jsx`, `Market.jsx`), `inputRules.js`, `catalog*`, fixture, `build-catalog.mjs`, `vercel.json`, `vite.config.js`. Se o Tester achar uma leitura frágil que o esquema não cobre, **não se corrige no componente aqui**: vira ideia à parte.
**Compartilhados com 010/049 (em QA, ainda fora da `master`):** **nenhum arquivo.** Os campos novos delas (`share`, `recipeVariant`) entram no registro como entradas **opcionais** (o plano já lista as duas); campos que ainda não existem são ignorados e qualquer campo desconhecido é preservado. **Regra para os próximos briefings:** toda ideia que acrescente campo a uma `cfg` acrescenta a entrada em `persistSchemas.js` **no mesmo commit** (o teste de contrato da Task 2 reprova o campo gravado por `set({…})` sem esquema). Se 010/049 mesclarem **antes** da 070, o Executor da 070 acrescenta as entradas delas; se **depois**, o Executor delas acrescenta.
**Ordem recomendada:** a 070 pode começar **já** (não depende de 010/049) e deve mesclar **antes das ideias novas** (048, 058, 002 acrescentam campos): é ela que torna esses acréscimos seguros. Rebase com 010/049: só `settings.js`, que elas não editam.

## Tasks (1 commit cada; testes primeiro, vistos falhar)

### Task 1: núcleo puro (`persist.js`)
**Files:** Create `persist.test.js`, `persist.js`.
- [ ] **Step 1: testes falhando** (`Failed to resolve import "./persist"`), todos de função pura:

```js
const D = { a: 1, b: 'x', flag: false, sub: { id: 'T6_MAIN_SWORD', ench: 0 }, map: {}, list: ['w'] };
it('campo ausente ganha o padrão; presente e válido mantém o salvo SEM coerção', () => {
  expect(mergeSaved({ a: '500' }, D).value).toMatchObject({ a: '500', b: 'x', flag: false });     // '500' continua texto
  expect(mergeSaved({}, D).value).toEqual(D); });
it('estado completo e atual passa idêntico (bit a bit)', () => {
  const s = { ...D, a: 7, b: 'y', flag: true, sub: { id: 'T4_BAG', ench: 2 }, map: { K: 'buy' }, list: [] };
  expect(mergeSaved(s, D, SCHEMA).value).toEqual(s); expect(loadPersisted(serializePersisted(s, 1), { defaults: D, schema: SCHEMA }).value).toEqual(s); });
it('tipo errado volta ao padrão SÓ daquele campo', () => expect(mergeSaved({ a: null, b: 5, flag: 'false', list: 'w', map: [], sub: 3 }, D, SCHEMA).value).toEqual(D));
it('mescla profunda só onde o padrão tem chaves: { id } vira { id, ench: 0 }; mapa aberto vale inteiro', () => {
  expect(mergeSaved({ sub: { id: 'T4_BAG' } }, D).value.sub).toEqual({ id: 'T4_BAG', ench: 0 }); expect(mergeSaved({ map: { M: 'all' } }, D).value.map).toEqual({ M: 'all' }); });
it('extras desconhecidos preservados, menos __proto__/constructor/prototype', () => {
  const r = mergeSaved(JSON.parse('{"feeSet":true,"craftDailyAt":1,"__proto__":{"x":1},"constructor":{"y":1}}'), D).value;
  expect(r.feeSet).toBe(true); expect(r.craftDailyAt).toBe(1); expect(Object.prototype.hasOwnProperty.call(r, '__proto__')).toBe(false); expect(({}).x).toBeUndefined(); });
it('lista salva vazia continua vazia; elemento de tipo errado ou fora do conjunto sai', () => {
  expect(mergeSaved({ list: [] }, D).value.list).toEqual([]); expect(mergeSaved({ list: ['w', 3, 'zz'] }, D, { list: { list: 'str', allowed: ['w', 'a'] } }).value.list).toEqual(['w']); });
it('não muta as entradas (congeladas) e é idempotente', () => {});
describe('loadPersisted', () => {
  it.each([null, '', 'null', 'abc{', '"texto"', '42', '[]', 'true'])('raw %j com padrão objeto: padrão inteiro, sem exceção', (raw) => expect(loadPersisted(raw, { defaults: D }).value).toEqual(D));
  it('sem _v = versão 0: migrações em ordem, depois a mescla; devolve o valor SEM _v', () => {});
  it('_v inválido = 0; _v maior que o atual não migra e preserva os campos', () => {});
  it('migração que lança: padrão da chave + issue migration-failed, sem propagar', () => {});
  it('primitivo (market:quality): 2 → 2; "x" → padrão 1; null → padrão', () => {});
});
it('serializePersisted: objeto ganha _v; primitivo sai puro', () => { expect(JSON.parse(serializePersisted({ a: 1 }, 1))).toEqual({ a: 1, _v: 1 }); expect(serializePersisted(2, 1)).toBe('2'); });
it('propriedade (500 estados sorteados): para estados que a UI atual produz (padrão + remendos válidos), carregar = identidade', () => {});
```
- [ ] **Step 2:** `npx vitest run src/lib/persist.test.js` → FAIL. **Step 3:** implementar `mergeSaved`, `loadPersisted`, `serializePersisted` conforme "Desenho". **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: persist.js, mescla, validação de tipo e versão do estado salvo (puro)`.

### Task 2: esquemas, migrações e os formatos reais do git
**Files:** Create `persistSchemas.js`, `src/test/savedStates.js`, `persist.history.test.js`, `persistSchemas.test.js`.
- [ ] **Step 1: `savedStates.js`** com **um objeto por linha da tabela "O que cada versão REALMENTE salvou"** (commit em comentário), incluindo campos de `set` típicos: `craft:cfg` de `8bf3014` com `refine: { METALBAR: 'refine', LEATHER: 'buy' }` e `deep: true`; `refine:cfg` de `8bf3014` com `deep: true` e `qty: '250'` (texto); `rrr:cfg` de `451f0fa` com `category: 'weapons/axe'`; `settings` de `8bf3014` sem `feeCeiling`.
- [ ] **Step 2: testes falhando** (`persist.history.test.js`): para **cada** estado antigo, carregar com o padrão **atual** (copiado do componente) não lança, devolve todos os campos do padrão atual com o tipo certo, não contém `deep`, e:

```js
it('craft:cfg de 8bf3014 (deep:true, refine {METALBAR:"refine"}): refine vira "all", deep some, ganha refineCity "auto" e refineDaily {}', () => {});
it('refine:cfg de 8bf3014 com deep:true: route "all" (e NÃO "best"), deep some, qty continua "250"', () => {});
it('refine:cfg de 8bf3014 com deep:false: route ausente → padrão "best"', () => {});
it('rrr:cfg de 451f0fa: weapons/axe → axe; armors/plate_armor → plate_armor; offhands/booktype → offhand; bags/satchels → bag; capes/accessoires_capes_capes → cape; consumables/potions → potion; desconhecido → "sword"', () => {});
it('craft:cfg com feePer100 "250" e SEM feeSet (019): preservado; nenhum feeSet injetado', () => {});
it('craft:cfg com craftDaily 20 e craftDailyAt "abc": craftDailyAt removido; craftDaily 20 preservado', () => {});
it('recipeVariant: "auto", "0", 1 e "2" passam; "1.5", -1, "x", true, null saem (voltam ao automático)', () => {});
it('settings de 8bf3014 ({server,premium}): ganha feeCeiling 1000; server "marte" → "west"; premium "false" → true (padrão); feeCeiling null/0/-5/"abc" passa INTACTO (a 060 avisa)', () => {});
it('flip:cfg com groups ["weapons","zzz"]: zzz sai; tiers "6" (texto) → padrão; buyCities nulo → padrão', () => {});
it('refine:cfg com type "FOO" → "PLANKS"; tier 99 → 4; route "x" → ausente → "best"', () => {});
it('craft:item/market:item com id número ou ausente: id → "T6_MAIN_SWORD"; ench texto → 0', () => {});
```
  Mais: **estado atual completo (padrão atual + remendos válidos que a UI produz) carrega como identidade**, por chave (regressão bit a bit). **Contratos** (`persistSchemas.test.js`): (i) listas permitidas do esquema são **iguais** a `CITIES`, `CRAFT_CITIES`, `REFINING` (chaves), `SERVERS` (chaves) e `craftCategories()` importados do app (o esquema não importa `market.js`, para não criar ciclo com `settings.js`; o teste importa); (ii) as chaves de `GROUPS` de `Flipper.jsx` (lidas do **texto** do arquivo) são as do esquema de `flip:cfg.groups`; (iii) **todo campo gravado por `set({ … })` em `Crafting.jsx`, `Refining.jsx`, `Flipper.jsx`, `RrrCalculator.jsx`, `TargetPrice.jsx` (varredura do texto) existe no esquema da chave** (campo novo sem esquema reprova); (iv) toda chave `usePersisted('x', …)` do código tem entrada em `PERSISTED`.
- [ ] **Step 3:** FAIL. **Step 4:** implementar `persistSchemas.js` (versão 1, migrações `0→1` acima, esquema de todos os campos conhecidos, `settings.feeCeiling: 'passthrough'`, `recipeVariant`, `share`, `craftDaily`, `craftDailyAt`, `waitCost`, `feeSet`, `refineFeeSet`). **Step 5:** PASS; `npm run check`. **Step 6: Commit:** `feat: esquemas e migrações do estado salvo, testados com os formatos reais do git`.

### Task 3: ligar em `settings.js`
**Files:** Modify `settings.js`; Create `settings.test.js`.
- [ ] **Step 1: testes falhando** (projeto `logic`, Node: `vi.stubGlobal('localStorage', fake)`, `vi.resetModules()` e `await import('./settings')` por caso; **sem jsdom**):

```js
it('settings: nada salvo = padrões; salvo antigo {server,premium} ganha feeCeiling 1000', async () => {});
it.each([['marte', 'west'], [5, 'west'], [null, 'west']])('settings.server inválido %j cai em west', async () => {});
it('JSON quebrado, "texto" e [] não derrubam o módulo; valem os padrões', async () => {});
it('feeCeiling inválido (null, 0, -5, "abc") chega intacto a getSettings() (o CeilingNotice da 060 continua avisando)', async () => {});
it('setSettings grava com _v e preserva o resto; getSettings() nunca expõe _v', async () => {});
it('localStorage que lança (modo privado) em leitura e em gravação: sem exceção', async () => {});
```
- [ ] **Step 2:** FAIL. **Step 3:** em `settings.js` a leitura usa `loadPersisted(raw, { defaults: DEFAULTS, ...getPersistedSpec('settings') })`; a gravação usa `serializePersisted`; `usePersisted` idem (assinatura, retorno e `useCallback` iguais; o `try/catch` de hoje fica). **Step 4:** PASS; **`npm test` inteiro sem alterar nenhum teste existente**; `npm run build`. **Step 5: Commit:** `fix: usePersisted e settings usam a mescla validada do estado salvo`.

### Task 4 (conferência manual guiada, sem commit)
`npm run dev` e, no console do navegador (**conferir `location.port` antes de gravar**, regra do briefing dos Testers), gravar **cada estado antigo do `savedStates.js`** em `albion:<chave>` e abrir cada aba: nenhuma tela branca, nenhum erro novo no console, números esperados (seção "Como o Tester valida").

## Testes que ficam para a IDEIA-069 (jsdom, ainda não mesclada)

(a) `usePersisted` montado com estado antigo devolve o valor mesclado e o setter grava `_v` (`renderHook`); (b) `Crafting` com o estado de `8bf3014` mostra "Cada recurso na sua cidade de bônus" em "Refinar em" e o RRR do refino dos materiais 58/158; (c) `Refining` com `deep:true` mostra a rota "Produzir tudo" ativa; (d) `RrrCalculator` com `category: 'weapons/axe'` mostra "Machado" e a cidade do machado; (e) `Flipper` com grupo desconhecido e `Refining` com `type: 'FOO'` renderizam sem lançar; (f) `Crafting` com `recipeVariant: '1.5'` renderiza a receita automática sem lançar. Até a 069, essas ligações são cobertas pela função pura (formatos e migrações) e pela conferência manual.

## Como o Tester valida

1. **Estados do git (oráculo):** para **cada linha** da tabela de formatos, refazer o estado com `git show <commit>:…` (o bloco `usePersisted('chave', {…})` do commit é o padrão da época; somar os campos de `set` daquele commit), gravar no `localStorage` (host conferido) e abrir a aba. **Esperado:** nenhuma tela branca, nenhum erro de console novo, nenhum aviso "controlado/descontrolado" nos selects, todos os campos do padrão atual presentes.
2. **Casos numéricos que mudam de propósito (só estes):** `craft:cfg` de `8bf3014`/`9e1e4a2`: o RRR do refino dos materiais passa de 18/118 (0,1525) para 58/158 (0,3671) na cidade de bônus do recurso (`refineCity: 'auto'`); `refine:cfg` com `deep:true` continua em "Produzir tudo" (nada muda); `rrr:cfg` de `451f0fa` com `weapons/axe` passa a mostrar machado, Martlock e 24,81% em vez de espada/Lymhurst.
3. **Zero regressão:** com estado **atual e completo** (cada tela configurada pelo Tester e salva pela versão nova), recarregar reproduz **os mesmos números e o mesmo texto**; diferencial com a `master` em 50 estados atuais: nenhum campo e nenhum resultado muda; o JSON no `localStorage` só ganha `_v`.
4. **Rollback seguro:** salvar com a versão nova, voltar ao build anterior e abrir as telas: funcionam (o `_v` é ignorado).
5. **Corrupção:** `null`, `[]`, `"x"`, `123`, `{}`, JSON quebrado e cada campo com tipo trocado em cada chave: a tela abre com o padrão **daquele campo**; o resto é preservado; `feeCeiling` inválido continua mostrando o aviso da 060.
6. **Mutações a rodar:** mesclar sem validar tipo; coerção `'500'` → `500`; descartar campos desconhecidos (derruba `feeSet`); migrar **depois** da mescla (perde o `deep`); migração de `deep` removida; `__proto__` aceito; lista vazia tratada como ausente; `feeCeiling` tratado como tipo estrito; `_v` exposto; `_v` não gravado; `'refine'` → `'best'`; exceção de migração propagada. Todas devem derrubar teste.
7. **O que um usuário estranharia:** a configuração dele voltando ao padrão sem motivo; o aviso do teto de taxa sumindo; números mudando em estado atual; a aba RRR em "espada" depois de ele ter escolhido outra categoria; campos de texto (`'500'`) virando número e perdendo o aviso da 060; tela branca por qualquer valor salvo.

## Riscos

1. **Mudança deliberada** para estados muito antigos (`refineCity` ausente): a tela passa a usar `'auto'`; muda um número para quem tinha esse estado (item 2 do Tester).
2. **Esquema incompleto ou duplicado** das listas: coberto pelos contratos; o esquema não importa o app (evita o ciclo `settings.js` → `market.js` → `settings.js`).
3. **Ideias futuras** que acrescentem campo sem esquema: o campo é preservado (fail-open) e o contrato (iii) reprova o commit.
4. **Duas abas com versões diferentes do código** continuam se sobrescrevendo (comportamento atual, fora de escopo).
5. As listas de cidades precisam acompanhar a IDEIA-025; o contrato (i) avisa.
6. Nenhum aviso vai ao `console` (ruído); os `issues` ficam disponíveis para um futuro painel (IDEIA-005).

## Critério de pronto

`npm run check` verde sem alterar nenhum teste existente; todos os formatos do git carregam como a Task 2 descreve; carga de estado atual completo é identidade; `settings.js` é o único arquivo de produção alterado; contratos de esquema passando; Tester com os 7 itens.

## PERGUNTAS PARA O GERENTE

1. **Campos desconhecidos preservados** (por causa de `feeSet`, `craftDaily` etc., que nunca estão nos padrões). Concorda, ou prefere descartar e declarar todos nos padrões (mudaria 5 componentes)?
2. **Mescla:** rasa por campo, profunda só onde o padrão tem chaves (`{id, ench}`); mapas abertos valem inteiros. Aprova?
3. **Estados muito antigos** (sem `refineCity`) passam a usar o RRR de refino `'auto'` (58/158) em vez de 18/118. Aceita sem aviso na tela, ou quer um aviso "configuração antiga atualizada"?
4. **Versão `_v` dentro do objeto** (não envelope), por rollback seguro. Aprova?
5. Os testes que renderizam telas ficam para a 069. Aceita a 070 mesclar antes dela, com a conferência manual do Tester?

