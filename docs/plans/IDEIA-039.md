# IDEIA-039 — "Não retorna recursos" por ingrediente (`maxreturnamount` do dump): plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-039`. **GRUPO CATÁLOGO (3º de 3): 038 → 057 → 039. Este plano ASSUME QUE OS PLANOS 038 E 057 JÁ FORAM MESCLADOS** (SHA do dump fixado, `catalog-diff.mjs`, `catalog.real.test.js`, `cc`/`cityOf`, recursos brutos sem `r` e com `tm`). Pré-requisito: IDEIA-001.

**Objetivo:** substituir o regex `returnable = !/ARTEFACT|ARTIFACT|RUNE|SOUL|RELIC|SHARD/.test(uniq)` (em `catalog.js`) por um marcador **por ingrediente** lido do dump (`@maxreturnamount="0"` = nunca retorna). Efeito: ingredientes que o jogo não devolve (peça-base e token de itens Royal, capa-base, blueprint e token de facção, livro de habilidade do satchel) deixam de receber RRR no cálculo, e os fragmentos (`RUNE`, `SOUL`, `RELIC`, `SHARD`) usados em receitas de artefatos passam a retornar, como o dump indica.

**Arquitetura:** `build-catalog.mjs` grava um terceiro elemento `1` nos pares de ingrediente quando há `@maxreturnamount="0"`: `["T4_ARMOR_PLATE_SET1", 1, 1]`. `catalog.js` lê esse elemento (`returnable = !nr`) e nenhum regex permanece. `Crafting.jsx`/`craftPlan.js` já usam `r.returnable`, **sem alteração**.

**Spec:** `docs/research/IDEIA-039.md` (§2 M1 a M8, §4 exemplos e caso numérico, §5 encaixe) e `docs/research/AUDITORIA-001.md` §5. Confiança do dossiê: **MÉDIA-ALTA** (a semântica "atributo ausente = retorna" é inferida).

## Grupos e arquivos

**Exclusivos do grupo catálogo:** `scripts/build-catalog.mjs`, `client/public/data/catalog.json`, `client/src/lib/catalog.js`, `catalog.test.js`, `catalog.real.test.js`, `scripts/catalog-diff.mjs`, fixture (`scripts/build-test-fixture.mjs`, `client/src/test/catalog.fixture.json`; só acrescenta ids).
**Compartilhados com ECON (019 → 041):** **nenhum arquivo editado.** Os testes numéricos de custo ficam num arquivo **novo** `client/src/lib/craftPlan.returns.test.js` (não editar `craftPlan.test.js`, que é do ECON). Eles **leem** `computeCraft` (de `craftPlan.js`): se 019 ainda não estiver mesclada, os testes só olham `matCost`, que não inclui a taxa de bancada craft, então os números valem antes e depois da 019.
**Impacto em planos aprovados:** `catalog.test.js` (IDEIA-001) já afirma `returnable: false` para o artefato da espada de cristal e `true` para barra/couro: continua verdadeiro. IDEIA-031 e IDEIA-023 não dependem do regex.

## O que muda em `catalog.json` (conferência do Tester)

| Medida | Antes (pós-057) | Depois |
|---|---|---|
| `items.length`, itens com `r`, `cc`, `cityOf`, `tm`, `vals`, `extra`, `encNames` | — | **idênticos** |
| ingredientes com 3º elemento (`[id, n, 1]`) em `r` | 0 | **1.053** ocorrências em **868 itens** (receita base de itens não-brutos), **873** ids distintos |
| `er` (encantos fora da regra) | pares de 2 | pares de 2 ou 3 (flag copiada); contagem a reportar pelo Executor |
Os números de ocorrências vêm do dump em cache de 2026-11-17 (script do Planejador, 1ª receita de cada item, excluindo recursos brutos). O Tester refaz com `catalog-diff.mjs` e script próprio.

**Mudança de comportamento no app (primeira receita; comparação regex × flag):**
- **153 itens** têm ingrediente que o regex tratava como "retorna" e o dump marca como "não retorna" (338 ocorrências). Maiores grupos: `T*_CAPE` como base de capa de facção/cidade (70), `QUESTITEM_TOKEN_AVALON` (14), `FACTION_*_TOKEN_1` (60), `QUESTITEM_TOKEN_ROYAL_T4..T8` (45), `*_BP`, e a peça-base `*_SET1` dos 45 itens `*_ROYAL`. **O custo desses itens sobe** (hoje está subestimado).
- **765 itens** (todos da família "Artefato", ingrediente `RUNE/SOUL/RELIC/SHARD`) têm ingrediente que o regex tratava como "não retorna" e o dump **não** marca: passam a retornar, **o custo desses itens desce** (dossiê M6, confiança MÉDIA-ALTA; ver pergunta 1).
- **Nenhum** ingrediente com `ARTEFACT`/`ARTIFACT` no id fica sem flag (conferido pelo Planejador em 2026-11-17), logo artefatos de arma/off-hand/elmo/armadura/botas e fichas de favor continuam "não retorna".

## Onde aparece e UI

Aba **Craft**, tabela "Materiais": para itens Royal, capas de cidade/facção, satchels e itens com artefato, os ingredientes que não retornam mostram a nota **"não retorna"** (já existe) na linha correta e a coluna "Qtd. líq." exibe a quantidade bruta. Nada mais muda na tela. Itens de artefato que usam fragmentos passam a mostrar quantidade líquida menor que a bruta.

## Arquivos afetados (exatos)

**Alterados:** `scripts/build-catalog.mjs`, `client/public/data/catalog.json` (regenerado), `client/src/lib/catalog.js` (`recipeOf`), `client/src/lib/catalog.test.js`, `client/src/lib/catalog.real.test.js`, `scripts/build-test-fixture.mjs`, `client/src/test/catalog.fixture.json` (regenerado).
**Criados:** `client/src/lib/craftPlan.returns.test.js`.
**NÃO toca:** `econ.js`, `craftPlan.js`, `Crafting.jsx`, `Refining.jsx`, `refinePlan.js`, `market.js`.
**Modelo de dados:** pares de ingrediente passam a `[uniq, count]` ou `[uniq, count, 1]` (o `1` = nunca retorna); vale para `r` e `er`. O terceiro elemento só existe quando verdadeiro (catálogo pequeno).

## Regras (dossiê §2)

```
nr(ingrediente) = (@maxreturnamount === "0")            // M1; ausente = elegível ao RRR (inferência declarada no dossiê)
returnable      = !nr                                   // sem regex
qty_líquida     = count * crafts * (returnable ? 1 - RRR : 1)     // fórmula existente do craft, inalterada
```
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
it('encanto herda o flag: T4_2H_ARCANESTAFF_HELL .1', () => { /* recipeOf-equivalente: o ingrediente do artefato no .1 tem 3º elemento 1 */ });
```
- [ ] **Step 2:** `npx vitest run src/lib/catalog.real.test.js` → FAIL.
- [ ] **Step 3: implementar no build:** `parseRecipe` emite `[id, count, 1]` quando `c['@maxreturnamount'] === '0'`, senão `[id, count]`; `ruleRes` e `sameRes` preservam o 3º elemento; `needed` continua recebendo o id.
- [ ] **Step 4:** `node scripts/build-catalog.mjs`; `node scripts/catalog-diff.mjs <catálogo pós-057> client/public/data/catalog.json` → `ingredientes com flag: 0 -> 1053`; todo o resto sem diferença. **Step 5:** PASS; `npm run check` (ainda falha nada: `catalog.js` ignora o 3º elemento até a Task 2; o regex segue valendo).
- [ ] **Step 6: Commit:** `feat: catálogo grava o flag de não-retorno por ingrediente (maxreturnamount)`.

### Task 2: `recipeOf` sem regex (testes com fixture primeiro)
**Files:** Modify `build-test-fixture.mjs`, `catalog.fixture.json`, `catalog.test.js`, `catalog.js`.
- [ ] **Step 1: fixture.** Acrescentar a `IDS`: `T4_OFF_SHIELD_HELL T4_ARTEFACT_OFF_SHIELD_HELL T4_ARMOR_PLATE_ROYAL T4_ARMOR_PLATE_SET1 T4_BAG_INSIGHT T4_CAPEITEM_FW_BRIDGEWATCH T4_ARTEFACT_2H_COMBATSTAFF_MORGANA T4_2H_ARCANESTAFF_HELL T4_METALBAR` (ids já presentes não duplicam). Regenerar.
- [ ] **Step 2: testes falhando** (`beforeEach(loadFixtureCatalog)`):

```js
const ret = (id, ench = 0) => recipeOf(id, ench).res.map((x) => [x.uniq, x.returnable]);
it('Royal: base e token não retornam', () => expect(ret('T4_ARMOR_PLATE_ROYAL')).toEqual([['T4_ARMOR_PLATE_SET1', false], ['QUESTITEM_TOKEN_ROYAL_T4', false]]));
it('escudo de artefato: tábua e barra retornam, artefato não', () => expect(ret('T4_OFF_SHIELD_HELL')).toEqual([['T4_PLANKS', true], ['T4_METALBAR', true], ['T4_ARTEFACT_OFF_SHIELD_HELL', false]]));
it('satchel: tela e couro retornam, livro não', () => expect(ret('T4_BAG_INSIGHT')).toEqual([['T4_CLOTH', true], ['T4_LEATHER', true], ['T4_SKILLBOOK_STANDARD', false]]));
it('capa de facção: os três não retornam', () => expect(ret('T4_CAPEITEM_FW_BRIDGEWATCH').every(([, r]) => r === false)).toBe(true));
it('fragmento retorna quando é ingrediente de artefato (M6)', () => expect(ret('T4_ARTEFACT_2H_COMBATSTAFF_MORGANA')).toEqual([['T4_RUNE', true]]));
it('encanto .1 herda o flag (receita sem er, regra de recursos)', () => expect(ret('T4_2H_ARCANESTAFF_HELL', 1).at(-1)).toEqual(['T4_ARTEFACT_2H_ARCANESTAFF_HELL', false]));
it('catálogo antigo (pares de 2 elementos) continua legível: tudo retorna', () => { /* setCatalog com item r:[['T4_X',1]] → returnable true */ });
```
  Trocar na `catalog.test.js` da IDEIA-001 o caso do artefato da espada de cristal para ler o flag: continua `returnable: false`.
- [ ] **Step 3:** FAIL (o regex ainda decide; `T4_RUNE` dá `false`, `SKILLBOOK`/`SET1`/token dão `true`). **Step 4:** em `catalog.js` `recipeOf`: desestruturar `([uniq, count, nr])`, `returnable: !nr`, preservar `nr` no ramo de fallback de encanto; **apagar o regex** e o comentário antigo. **Step 5:** PASS; `npm run check`.
- [ ] **Step 6: Commit:** `fix: returnable por ingrediente do dump em vez de regex no id`.

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
it('fragmento retorna (derivado do dossiê M6): 50 T4_RUNE a 10 com RRR 33/133', () => {
  expect(computeCraft({ rec: recipeOf('T4_ARTEFACT_2H_COMBATSTAFF_MORGANA'), targetMid: 'T4_ARTEFACT_2H_COMBATSTAFF_MORGANA', prices: mkPrices({ T4_RUNE: 10 }), cfg: craftCfg({ specialty: true }), premium: true, bonusCity: null }).matCost).toBeCloseTo(375.94, 2);   // antes: 500
});
```
  (`craftCfg` e `mkPrices` são os helpers da IDEIA-001; copiar a função `craftCfg` do `craftPlan.test.js` para este arquivo, sem importá-la.)
- [ ] **Step 2:** `npm run check` → código 0. Smoke: `npm run dev`, aba Craft com `T4_ARMOR_PLATE_ROYAL`: linhas com "não retorna" em ambos os materiais; com `T4_BAG_INSIGHT`: só o livro de habilidade; com `T4_OFF_SHIELD_HELL`: só o artefato.
- [ ] **Step 3: Commit:** `test: efeito do flag de não-retorno no custo (Royal, artefato, fragmento)`.

## Como o Tester valida

1. **Diff do catálogo:** `node scripts/catalog-diff.mjs <pós-057> <branch>` → só `ingredientes com flag 0 → 1.053` (868 itens); nenhuma outra medida muda. Amostra de 10 ids aleatórios comparados com o campo `@maxreturnamount` do `items.json` do SHA fixado.
2. **Casos do dossiê §4** (recalcular sem `econ.js`): **escudo de artefato** (Martlock, RRR 33/133 = 24,8120%): 4×100 + 4×200 = 1.200; líquido 1.200 × 0,751880 = **902,26**; artefato **5.000**; material **5.902,26** (igual ao regex: `ARTEFACT` já estava no padrão). **Armadura Royal** (base 3.000 + 4 tokens a 500): com o regex antigo e RRR 24,8120%: (3.000 + 2.000) × 0,751880 = **3.759,40**; com o flag **5.000**; subestimação do código antigo **1.240,60 (24,8%)**.
3. **Caso derivado do dossiê (M6), sem número publicado:** 50 `T4_RUNE` a 10 → 500 × 0,751880 = **375,94** (antes 500). O Tester deve confirmar com o dossiê que fragmentos de receita de artefato retornam; está marcado MÉDIA-ALTA.
4. **Itens de controle (sem mudança de custo):** `T4_MAIN_SWORD`, `T4_BAG`, `T4_CAPE` (4 tela + 4 couro), `T4_POTION_HEAL` (ervas e ovos: o dump não marca; política de retorno de poção segue NÃO VERIFICADA, dossiê IDEIA-046).
5. **O que um jogador experiente estranharia:** armadura/elmo/botas Royal com RRR aplicado na peça-base ou no token; capa de facção devolvendo a capa-base; satchel devolvendo o livro de habilidade; artefato devolvendo; custo de itens comuns (espada, arco, armadura normal) mudando (não deve mudar); item de artefato (fragmentos) ficando **mais caro** (deve ficar mais barato); margem absurda (> 300%) em itens Royal ou de capa por falta de preço do token (`QUESTITEM_TOKEN_ROYAL_Tn` raramente tem preço no AODP: o item deve aparecer em "Faltam preços", não com custo 0).

## Riscos

1. **Semântica inferida:** "sem atributo = retorna" (dossiê §7). Mitigação: pedir ao usuário uma conferência em jogo (Royal, capa de facção, e um artefato com fragmento).
2. Efeito grande no grupo "Artefato" (765 itens mais baratos): se a inferência estiver errada, o app passa a subestimar o custo deles; ver pergunta 1.
3. `er` e receitas encantadas: o build compara `rec.r` com `ruleRes(base.r, n)`; esquecer de preservar o 3º elemento geraria milhares de `er` falsos (o diff do Tester pega: contagem de `er` não deve explodir).
4. Receitas alternativas (artefato **ou** ficha) ainda só leem a primeira (IDEIA-049).

## Critério de pronto

`npm run check` verde; nenhum regex de `returnable` em `catalog.js` (`grep` limpo); diff do catálogo = só o flag; casos Royal e escudo em teste; só os arquivos listados alterados.

## PERGUNTAS PARA O GERENTE

1. **Fragmentos em artefatos (765 itens ficam mais baratos):** o dossiê trata como "retornam" com base no dump (MÉDIA-ALTA, sem texto de wiki). Aceita aplicar já, ou prefere segurar esse grupo (manter "não retorna" só para `artefacts/*`) até uma medição do usuário? O plano aplica o dossiê.
2. Aceita o aviso ao usuário, no relatório, de que poções/comida seguem NÃO VERIFICADAS (D-012)?
