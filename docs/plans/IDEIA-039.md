# IDEIA-039 — "Não retorna recursos" por ingrediente (`maxreturnamount` do dump): plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-039`. **GRUPO CATÁLOGO (3º de 3): 038 → 057 → 039. Este plano ASSUME QUE OS PLANOS 038 E 057 JÁ FORAM MESCLADOS** (SHA do dump fixado, `catalog-diff.mjs`, `catalog.real.test.js`, `cc`/`cityOf`, recursos brutos sem `r` e com `tm`). Pré-requisito: IDEIA-001.

**Objetivo (regra = UNIÃO conservadora, decisão do Gerente):** um ingrediente **NÃO retorna** se **(a)** o dump marca `@maxreturnamount="0"` **ou** **(b)** o id casa com os tokens antigos `RUNE|SOUL|RELIC|SHARD`. Ganho real da 039: ingredientes que o dump marca e o regex antigo deixava passar (peça-base `*_SET*` e token de itens Royal, capa-base, blueprint `*_BP` e token de facção/Avalon, livro de habilidade do satchel) deixam de receber RRR (caso Royal: custo subestimado em 24,8%). **O grupo "Artefato" com fragmentos (765 itens) NÃO muda:** continua "não retorna", marcado **NÃO VERIFICADO** até haver medição em jogo (errar ali subestima o custo, direção perigosa). O dossiê (M6) diria que retornam; o Gerente preferiu o lado conservador.

**Arquitetura:** `build-catalog.mjs` grava um terceiro elemento `1` nos pares de ingrediente quando há `@maxreturnamount="0"`: `["T4_ARMOR_PLATE_SET1", 1, 1]`. `catalog.js` calcula `returnable = !nr && !FRAGMENT_RE.test(uniq)` com `FRAGMENT_RE = /RUNE|SOUL|RELIC|SHARD/` (o regex antigo **encolhe** para só os fragmentos: `ARTEFACT`/`ARTIFACT` saem porque o flag já os cobre, conferido: zero exceções) e devolve também `unverified = !nr && FRAGMENT_RE.test(uniq)` (barrado só pelo token, sem confirmação do dump). `Crafting.jsx` ganha **uma linha** para exibir o selo; `craftPlan.js` já usa `r.returnable`, **sem alteração**.

**Spec:** `docs/research/IDEIA-039.md` (§2 M1 a M8, §4 exemplos e caso numérico, §5 encaixe) e `docs/research/AUDITORIA-001.md` §5. Confiança do dossiê: **MÉDIA-ALTA** (a semântica "atributo ausente = retorna" é inferida).

## Grupos e arquivos

**Exclusivos do grupo catálogo:** `scripts/build-catalog.mjs`, `client/public/data/catalog.json`, `client/src/lib/catalog.js`, `catalog.test.js`, `catalog.real.test.js`, `scripts/catalog-diff.mjs`, fixture (`scripts/build-test-fixture.mjs`, `client/src/test/catalog.fixture.json`; só acrescenta ids).
**Compartilhados com ECON (019 → 041):** **nenhum arquivo editado.** Os testes numéricos de custo ficam num arquivo **novo** `client/src/lib/craftPlan.returns.test.js` (não editar `craftPlan.test.js`, que é do ECON). Eles **leem** `computeCraft` (de `craftPlan.js`): se 019 ainda não estiver mesclada, os testes só olham `matCost`, que não inclui a taxa de bancada craft, então os números valem antes e depois da 019.
**Compartilhado (1 linha):** `client/src/components/Crafting.jsx`, só a célula `{!l.returnable && <small>não retorna</small>}` da tabela de materiais (038 mexe no seletor de cidade, 019 nos campos de taxa, 041 no select/cartão: regiões distintas).
**Impacto em planos aprovados:** `catalog.test.js` (IDEIA-001) já afirma `returnable: false` para o artefato da espada de cristal e `true` para barra/couro: continua verdadeiro. IDEIA-031 e IDEIA-023 não dependem do regex.

## O que muda em `catalog.json` (conferência do Tester)

| Medida | Antes (pós-057) | Depois |
|---|---|---|
| `items.length`, itens com `r`, `cc`, `cityOf`, `tm`, `vals`, `extra`, `encNames` | — | **idênticos** |
| ingredientes com 3º elemento (`[id, n, 1]`) em `r` | 0 | **1.053** ocorrências em **868 itens** (receita base de itens não-brutos), **873** ids distintos |
| `er` (encantos fora da regra) | pares de 2 | pares de 2 ou 3 (flag copiada); contagem a reportar pelo Executor |
Os números de ocorrências vêm do dump em cache de 2026-11-17 (script do Planejador, 1ª receita de cada item, excluindo recursos brutos). O Tester refaz com `catalog-diff.mjs` e script próprio.

**Mudança de comportamento no app (primeira receita; união conservadora × regex antigo):**
- **MUDAM (153 itens):** têm ingrediente que o regex antigo tratava como "retorna" e o dump marca "não retorna" (338 ocorrências). Maiores grupos: `T*_CAPE` como base de capa de facção/cidade (70), `QUESTITEM_TOKEN_AVALON` (14), `FACTION_*_TOKEN_1` (60), `QUESTITEM_TOKEN_ROYAL_T4..T8` (45), `*_BP`, e a peça-base `*_SET1` dos 45 itens `*_ROYAL`. **O custo desses itens sobe** (hoje está subestimado).
- **NÃO MUDAM (765 itens da família "Artefato", ingrediente `RUNE/SOUL/RELIC/SHARD` sem flag no dump; 30 ids distintos):** continuam "não retorna" (cobertos pelo token (b)); custo idêntico ao de hoje; ganham só o selo "não verificado". Nenhum item deste grupo pode mudar de custo.
- **NÃO MUDAM** também: artefatos de arma/off-hand/elmo/armadura/botas e fichas de favor (têm flag; **nenhum** `ARTEFACT`/`ARTIFACT` fica sem flag, conferido em 2026-11-17), e itens comuns (espada, arco, bolsa, capa simples, poção).
- Resultado líquido: `returnable` só passa de `true` para `false`, **nunca de `false` para `true`**: nenhuma receita fica mais barata por esta ideia.

## Onde aparece e UI

Aba **Craft**, tabela "Materiais": para itens Royal, capas de cidade/facção, satchels e itens com artefato, os ingredientes que não retornam mostram a nota **"não retorna"** (já existe) na linha correta e a coluna "Qtd. líq." exibe a quantidade bruta. Nada mais muda na tela.
Grupo "não verificado": nos 765 itens de Artefato com fragmentos (`RUNE/SOUL/RELIC/SHARD`) a nota fica **"não retorna · não verificado"** (texto amarelo, com dica "o dump não marca este ingrediente; assumimos que não retorna até medir em jogo").
No relatório da ideia o grupo é listado como NÃO VERIFICADO, junto com poção/comida (D-012), com o pedido de medição ao usuário (um artefato com fragmento: custo mostrado no jogo × custo do app).

## Arquivos afetados (exatos)

**Alterados:** `scripts/build-catalog.mjs`, `client/public/data/catalog.json` (regenerado), `client/src/lib/catalog.js` (`recipeOf`), `client/src/lib/catalog.test.js`, `client/src/lib/catalog.real.test.js`, `scripts/build-test-fixture.mjs`, `client/src/test/catalog.fixture.json` (regenerado), `client/src/components/Crafting.jsx` (1 linha: selo "não verificado").
**Criados:** `client/src/lib/craftPlan.returns.test.js`.
**NÃO toca:** `econ.js`, `craftPlan.js`, `Refining.jsx`, `refinePlan.js`, `market.js`.
**Modelo de dados:** pares de ingrediente passam a `[uniq, count]` ou `[uniq, count, 1]` (o `1` = nunca retorna); vale para `r` e `er`. O terceiro elemento só existe quando verdadeiro (catálogo pequeno).

## Regras (dossiê §2)

```
nr(ingrediente)   = (@maxreturnamount === "0")                 // M1: do dump
frag(ingrediente) = /RUNE|SOUL|RELIC|SHARD/.test(uniq)          // token antigo, mantido por prudência (decisão do Gerente)
returnable        = !nr && !frag                                // UNIÃO conservadora: só retorna se nenhum dos dois barra
unverified        = !nr && frag                                 // barrado só pelo token; o dump não confirma
qty_líquida       = count * crafts * (returnable ? 1 - RRR : 1) // fórmula existente do craft, inalterada
```
O dossiê (M6) afirma que fragmentos retornam quando são ingredientes de artefato; **este plano não adota isso** até haver medição em jogo.
Cuidados de implementação: (1) a regra do build que gera receitas de encanto `ruleRes(base.r, n)` e a comparação `sameRes` devem **preservar o 3º elemento**; (2) o ramo de `recipeOf` que monta `_LEVELn` quando não há `er` também (`([id, c, nr]) => nr ? [id', c, nr] : [id', c]`); (3) apenas a **primeira** receita do item é lida (receitas alternativas = IDEIA-049, fora de escopo; nos itens com artefato **ou** ficha de favor a primeira é a do artefato, e o flag vale nas duas, dossiê M7).

## Tasks (1 commit cada; testes primeiro)

### Task 1: teste do catálogo real (falha), build e regeneração
**Files:** Modify `catalog.real.test.js`, `build-catalog.mjs`, `catalog.json`.
- [ ] **Step 1: testes falhando** (acrescentar a `catalog.real.test.js`; dossiê §4):

```js
const nrIds = (id) => byId[id].r.filter((x) => x[2] === 1).map((x) => x[0]);
it.each([
  ['T4_2H_ARCANESTAFF_HELL', ['T4_ARTEFACT_2H_ARCANESTAFF_HELL']],
  ['T4_OFF_SHIELD_HELL', ['T4_ARTEFACT_OFF_SHIELD_HELL']],
  ['T6_2H_DUALSCIMITAR_UNDEAD', ['T6_ARTEFACT_2H_DUALSCIMITAR_UNDEAD']],
  ['T4_ARMOR_PLATE_ROYAL', ['T4_ARMOR_PLATE_SET1', 'QUESTITEM_TOKEN_ROYAL_T4']],
  ['T4_HEAD_PLATE_ROYAL', ['T4_HEAD_PLATE_SET1', 'QUESTITEM_TOKEN_ROYAL_T4']],
  ['T4_CAPEITEM_FW_BRIDGEWATCH', ['T4_CAPE', 'T4_CAPEITEM_FW_BRIDGEWATCH_BP', 'T1_FACTION_STEPPE_TOKEN_1']],
  ['T4_BAG_INSIGHT', ['T4_SKILLBOOK_STANDARD']],
])('não retorna: %s', (id, esperado) => expect(nrIds(id)).toEqual(esperado));
it.each(['T4_MAIN_SWORD', 'T4_BAG', 'T4_CAPE', 'T4_POTION_HEAL'])('retorna tudo: %s', (id) => expect(nrIds(id)).toEqual([]));
it('contagem de ingredientes marcados', () => {
  const n = cat.items.filter((i) => i.c !== 'crafting/resources').flatMap((i) => i.r ?? []).filter((x) => x[2] === 1).length;
  expect(n).toBe(1053); });
it('todo ingrediente com ARTEFACT/ARTIFACT no id tem o flag (dossiê M2)', () => { /* varre r e er: nenhuma exceção */ });
it('só os fragmentos RUNE/SOUL/RELIC/SHARD aparecem sem flag entre os que o regex antigo barrava (M6)', () => {
  const semFlag = new Set(cat.items.flatMap((i) => i.r ?? []).filter((x) => x[2] !== 1 && /ARTEFACT|ARTIFACT|RUNE|SOUL|RELIC|SHARD/.test(x[0])).map((x) => x[0]));
  expect(semFlag.size).toBe(30); expect([...semFlag].every((id) => /RUNE|SOUL|RELIC|SHARD/.test(id))).toBe(true); });
it('o grupo dos 765 itens de Artefato existe e tem fragmento sem flag (será mantido como "não retorna")', () => {
  const grupo = cat.items.filter((i) => (i.r ?? []).some((x) => x[2] !== 1 && /RUNE|SOUL|RELIC|SHARD/.test(x[0])));
  expect(grupo).toHaveLength(765); expect(grupo.every((i) => i.c.startsWith('artefacts/'))).toBe(true); });
it('encanto herda o flag: T4_2H_ARCANESTAFF_HELL .1', () => { /* recipeOf-equivalente: o ingrediente do artefato no .1 tem 3º elemento 1 */ });
```
- [ ] **Step 2:** `npx vitest run src/lib/catalog.real.test.js` → FAIL.
- [ ] **Step 3: implementar no build:** `parseRecipe` emite `[id, count, 1]` quando `c['@maxreturnamount'] === '0'`, senão `[id, count]`; `ruleRes` e `sameRes` preservam o 3º elemento; `needed` continua recebendo o id.
- [ ] **Step 4:** `node scripts/build-catalog.mjs`; `node scripts/catalog-diff.mjs <catálogo pós-057> client/public/data/catalog.json` → `ingredientes com flag: 0 -> 1053`; todo o resto sem diferença. **Step 5:** PASS; `npm run check` (ainda falha nada: `catalog.js` ignora o 3º elemento até a Task 2; o regex segue valendo).
- [ ] **Step 6: Commit:** `feat: catálogo grava o flag de não-retorno por ingrediente (maxreturnamount)`.

### Task 2: `recipeOf` com a união conservadora (testes com fixture primeiro)
**Files:** Modify `build-test-fixture.mjs`, `catalog.fixture.json`, `catalog.test.js`, `catalog.js`.
- [ ] **Step 1: fixture.** Acrescentar a `IDS`: `T4_OFF_SHIELD_HELL T4_ARTEFACT_OFF_SHIELD_HELL T4_ARMOR_PLATE_ROYAL T4_ARMOR_PLATE_SET1 T4_BAG_INSIGHT T4_CAPEITEM_FW_BRIDGEWATCH T4_ARTEFACT_2H_COMBATSTAFF_MORGANA T4_2H_ARCANESTAFF_HELL T4_METALBAR` (ids já presentes não duplicam). Regenerar.
- [ ] **Step 2: testes falhando** (`beforeEach(loadFixtureCatalog)`):

```js
const ret = (id, ench = 0) => recipeOf(id, ench).res.map((x) => [x.uniq, x.returnable]);
it('Royal: base e token não retornam', () => expect(ret('T4_ARMOR_PLATE_ROYAL')).toEqual([['T4_ARMOR_PLATE_SET1', false], ['QUESTITEM_TOKEN_ROYAL_T4', false]]));
it('escudo de artefato: tábua e barra retornam, artefato não', () => expect(ret('T4_OFF_SHIELD_HELL')).toEqual([['T4_PLANKS', true], ['T4_METALBAR', true], ['T4_ARTEFACT_OFF_SHIELD_HELL', false]]));
it('satchel: tela e couro retornam, livro não', () => expect(ret('T4_BAG_INSIGHT')).toEqual([['T4_CLOTH', true], ['T4_LEATHER', true], ['T4_SKILLBOOK_STANDARD', false]]));
it('capa de facção: os três não retornam', () => expect(ret('T4_CAPEITEM_FW_BRIDGEWATCH').every(([, r]) => r === false)).toBe(true));
it('fragmento continua NÃO retornando e fica marcado não verificado (união conservadora)', () => {
  const res = recipeOf('T4_ARTEFACT_2H_COMBATSTAFF_MORGANA').res;
  expect(res.map((x) => [x.uniq, x.returnable, x.unverified])).toEqual([['T4_RUNE', false, true]]); });
it('só o token barra: unverified é falso quando o dump já marca ou nada barra', () => {
  expect(recipeOf('T4_ARMOR_PLATE_ROYAL').res.every((x) => x.unverified === false)).toBe(true);   // barrado pelo dump
  expect(recipeOf('T4_OFF_SHIELD_HELL').res.every((x) => x.unverified === false)).toBe(true); });
it('regressão: returnable nunca passa de false para true em relação ao regex antigo', () => {
  const antigo = (id) => !/ARTEFACT|ARTIFACT|RUNE|SOUL|RELIC|SHARD/.test(id);
  for (const id of ['T4_ARMOR_PLATE_ROYAL','T4_OFF_SHIELD_HELL','T4_BAG_INSIGHT','T4_CAPEITEM_FW_BRIDGEWATCH','T4_ARTEFACT_2H_COMBATSTAFF_MORGANA','T4_2H_ARCANESTAFF_HELL'])
    for (const x of recipeOf(id).res) if (!antigo(x.uniq)) expect(x.returnable).toBe(false); });
it('encanto .1 herda o flag (receita sem er, regra de recursos)', () => expect(ret('T4_2H_ARCANESTAFF_HELL', 1).at(-1)).toEqual(['T4_ARTEFACT_2H_ARCANESTAFF_HELL', false]));
it('catálogo antigo (pares de 2 elementos) continua legível: tudo retorna', () => { /* setCatalog com item r:[['T4_X',1]] → returnable true */ });
```
  Trocar na `catalog.test.js` da IDEIA-001 o caso do artefato da espada de cristal para ler o flag: continua `returnable: false`.
- [ ] **Step 3:** FAIL (o regex antigo ainda decide: `SKILLBOOK`/`SET1`/token dão `true`; `unverified` inexistente). **Step 4:** em `catalog.js` `recipeOf`: desestruturar `([uniq, count, nr])`; `FRAGMENT_RE = /RUNE|SOUL|RELIC|SHARD/`; `returnable: !nr && !FRAGMENT_RE.test(uniq)`; `unverified: !nr && FRAGMENT_RE.test(uniq)`; preservar `nr` no ramo de fallback de encanto; trocar o regex antigo e seu comentário por este, explicando que o token é prudência até medição em jogo. **Step 5:** PASS; `npm run check`.
- [ ] **Step 6: Commit:** `fix: não retorna = dump (maxreturnamount) OU fragmento; fragmentos marcados não verificados`.

### Task 3: efeito no custo (dossiê §4) em arquivo de teste novo
**Files:** Create `craftPlan.returns.test.js`.
- [ ] **Step 1: testes** (devem passar com Task 2; sem preço de venda, só `matCost`; `craftCfg({ specialty: true, refine: { PLANKS: 'buy', METALBAR: 'buy' } })`, `bonusCity: null`, 1 craft; preços em `Fort Sterling` via `mkPrices`; RRR do craft = 33/133, explícito por `specialty: true`, sem consultar cidade):

```js
it('dossiê §4: escudo de artefato em Martlock (RRR 24,8120%)', () => {
  // prancha 100, barra 200, artefato 5000
  const c = computeCraft({ rec: recipeOf('T4_OFF_SHIELD_HELL'), targetMid: 'T4_OFF_SHIELD_HELL', prices: mkPrices({ T4_PLANKS: 100, T4_METALBAR: 200, T4_ARTEFACT_OFF_SHIELD_HELL: 5000 }), cfg, premium: true, bonusCity: null });
  expect(c.lines.map((l) => l.qty)).toEqual([expect.closeTo(3.0075, 4), expect.closeTo(3.0075, 4), 1]);
  expect(c.matCost).toBeCloseTo(5902.2556, 3);      // 1200 * 0,751880 = 902,26 + 5000 (dossiê: 902,26 e 5.902,26)
});
it('dossiê §4: armadura Royal em Bridgewatch, base 3000 e token 500', () => {
  const c = computeCraft({ rec: recipeOf('T4_ARMOR_PLATE_ROYAL'), targetMid: 'T4_ARMOR_PLATE_ROYAL', prices: mkPrices({ T4_ARMOR_PLATE_SET1: 3000, QUESTITEM_TOKEN_ROYAL_T4: 500 }), cfg: craftCfg({ specialty: true }), premium: true, bonusCity: null });
  expect(c.matCost).toBeCloseTo(5000, 4);           // flag: nada retorna (antes: (3000+2000)*0,751880 = 3759,40; erro de 1240,60 = 24,8%)
  expect(c.lines.every((l) => l.qty === l.count)).toBe(true);
});
it('fragmento NÃO retorna (união conservadora): 50 T4_RUNE a 10 com RRR 33/133 = 500, igual a antes', () => {
  expect(computeCraft({ rec: recipeOf('T4_ARTEFACT_2H_COMBATSTAFF_MORGANA'), targetMid: 'T4_ARTEFACT_2H_COMBATSTAFF_MORGANA', prices: mkPrices({ T4_RUNE: 10 }), cfg: craftCfg({ specialty: true }), premium: true, bonusCity: null }).matCost).toBeCloseTo(500, 4);
  // o dossiê M6 daria 375,94 (500 × 0,751880); NÃO adotado até haver medição em jogo
});
```
  (`craftCfg` e `mkPrices` são os helpers da IDEIA-001; copiar a função `craftCfg` do `craftPlan.test.js` para este arquivo, sem importá-la.)
- [ ] **Step 2:** `npm run check` → código 0. Smoke: `npm run dev`, aba Craft com `T4_ARMOR_PLATE_ROYAL`: linhas com "não retorna" em ambos os materiais; com `T4_BAG_INSIGHT`: só o livro de habilidade; com `T4_OFF_SHIELD_HELL`: só o artefato.
- [ ] **Step 3: selo na tela.** Em `Crafting.jsx`, trocar `{!l.returnable && <small>não retorna</small>}` por `{!l.returnable && <small title={l.unverified ? 'O dump não marca este ingrediente; assumimos que não retorna até medir em jogo.' : undefined}>não retorna{l.unverified ? ' · não verificado' : ''}</small>}` (`unverified` já chega em `l` pelo `...r` de `computeCraft`). `npm run check`; smoke com um item de `artefacts/weapons` (ex. `T4_ARTEFACT_2H_COMBATSTAFF_MORGANA`): selo amarelo; com `T4_ARMOR_PLATE_ROYAL`: só "não retorna".
- [ ] **Step 4: Commit:** `test: efeito do não-retorno no custo (Royal, artefato, fragmento) e selo "não verificado"`.

## Como o Tester valida

1. **Diff do catálogo:** `node scripts/catalog-diff.mjs <pós-057> <branch>` → só `ingredientes com flag 0 → 1.053` (868 itens); nenhuma outra medida muda. Amostra de 10 ids aleatórios comparados com o campo `@maxreturnamount` do `items.json` do SHA fixado.
2. **Casos do dossiê §4** (recalcular sem `econ.js`): **escudo de artefato** (Martlock, RRR 33/133 = 24,8120%): 4×100 + 4×200 = 1.200; líquido 1.200 × 0,751880 = **902,26**; artefato **5.000**; material **5.902,26** (igual ao regex: `ARTEFACT` já estava no padrão). **Armadura Royal** (base 3.000 + 4 tokens a 500): com o regex antigo e RRR 24,8120%: (3.000 + 2.000) × 0,751880 = **3.759,40**; com o flag **5.000**; subestimação do código antigo **1.240,60 (24,8%)**.
3. **Os 765 NÃO mudaram (verificação obrigatória):** com o catálogo e o `catalog.js` de `master` (pós-057) e os da branch, para **todos** os 765 itens (`artefacts/*` com `RUNE/SOUL/RELIC/SHARD` sem flag) comparar `recipeOf(id).res[i].returnable` e o `matCost` de `computeCraft` com os mesmos preços: **100% idênticos**. Exemplo: 50 `T4_RUNE` a 10 com RRR 24,8120% → material **500** antes e depois (o dossiê M6 daria 375,94; não adotado). Todos mostram o selo "não retorna · não verificado".
4. **Regra "só sobe":** em **todos** os itens do catálogo, o `matCost` da branch ≥ o de `master` com os mesmos preços; nenhum item fica mais barato. Os 153 itens do ganho real (Royal, capas, `*_BP`, tokens) ficam mais caros; os demais ficam iguais.
5. **Itens de controle (sem mudança de custo):** `T4_MAIN_SWORD`, `T4_BAG`, `T4_CAPE` (4 tela + 4 couro), `T4_POTION_HEAL` (ervas e ovos: o dump não marca; política de retorno de poção segue NÃO VERIFICADA, dossiê IDEIA-046).
6. **O que um jogador experiente estranharia:** armadura/elmo/botas Royal com RRR aplicado na peça-base ou no token; capa de facção devolvendo a capa-base; satchel devolvendo o livro de habilidade; artefato devolvendo; custo de itens comuns (espada, arco, armadura normal) mudando (não deve mudar); **qualquer item de Artefato ficando mais barato** (não pode; ficaria subestimando o custo); margem absurda (> 300%) em itens Royal ou de capa por falta de preço do token (`QUESTITEM_TOKEN_ROYAL_Tn` raramente tem preço no AODP: o item deve aparecer em "Faltam preços", não com custo 0).

## Riscos

1. **Semântica inferida:** "sem atributo = retorna" (dossiê §7). Mitigação: pedir ao usuário uma conferência em jogo (Royal, capa de facção, e um artefato com fragmento).
2. Grupo "Artefato" (765 itens) mantido "não retorna" por prudência: se o jogo na verdade devolver os fragmentos, o app **superestima** o custo deles (direção segura); o selo "não verificado" e o pedido de medição fecham o ponto.
3. `er` e receitas encantadas: o build compara `rec.r` com `ruleRes(base.r, n)`; esquecer de preservar o 3º elemento geraria milhares de `er` falsos (o diff do Tester pega: contagem de `er` não deve explodir).
4. Receitas alternativas (artefato **ou** ficha) ainda só leem a primeira (IDEIA-049).

## Critério de pronto

`npm run check` verde; `returnable = !nr && !FRAGMENT_RE` (o regex antigo só sobrevive restrito a `RUNE|SOUL|RELIC|SHARD`, com comentário); diff do catálogo = só o flag; casos Royal e escudo em teste; os 765 comprovadamente idênticos e nenhum item mais barato; selo "não verificado" visível; só os arquivos listados alterados.

## PERGUNTAS PARA O GERENTE

1. Medição em jogo para fechar o grupo "não verificado": um item de artefato com fragmento (ex. `T4_ARTEFACT_2H_COMBATSTAFF_MORGANA`, 50 `T4_RUNE`): quanto o jogo devolve com RRR conhecido. Entra no pedido de medições ao usuário (D-012/D-014)?
2. Aceita o aviso ao usuário, no relatório, de que poções/comida também seguem NÃO VERIFICADAS (D-012)?
