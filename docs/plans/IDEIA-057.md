# IDEIA-057 — Transmutação deixa de aparecer como receita de craft: plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-057`. **GRUPO CATÁLOGO (2º de 3): 038 → 057 → 039. Este plano ASSUME QUE O PLANO 038 JÁ FOI MESCLADO** (SHA do dump fixado em `build-catalog.mjs`, `scripts/catalog-diff.mjs`, `catalog.real.test.js`, campos `cc`/`cityOf`, fixture com `cityOf`). Pré-requisito: IDEIA-001.

**Objetivo:** os recursos brutos (madeira, minério, couro bruto, fibra, pedra) deixam de ser oferecidos como "craftáveis". Hoje 20 deles (T5 a T8 de cada tipo, ex. `T5_ORE` = 1 `T4_ORE`) têm `r` no catálogo porque o dump guarda a **transmutação** como se fosse receita; o seletor do Craft os lista e calcula um custo sem os 781 de prata do passo. Fonte do bug: `docs/research/IDEIA-050.md` §1 e §4 item 4 (e dado do dump nas regras R2/R3/R6).

**Decisão de desenho (justificada):** **marcar, não descartar.** O build reconhece recursos de transmutação por `@craftbuttonlocaoverride` contendo `TRANSMUTE`, **não grava** `r`, `er`, `a`, `f` para essas receitas e as grava em um campo novo `tm`. Motivos: (1) um simples "descartar `r`" perderia a prata (`@silver`) e os passos de encanto que a IDEIA-050 precisa (o dossiê 050 §5 pede exatamente separar em `tm`); (2) o filtro `onlyCraftable` do catálogo continua sendo `it.r` (nenhuma lógica nova em `searchItems`, nenhum caso especial por categoria); (3) o item continua no catálogo (Mercado, nomes, ingredientes, `vals`) e o Refino não toca nesses campos. Estrutura (superconjunto do `tm: {from, silver}` do 050, porque o dump traz várias receitas por variante):

```
tm: { "<n>": [ [uniqueNameDeEntrada, prata], ... ] }     // n = 0 (item base) ou 1..4 (variante _LEVELn); ordem do dump
```

**Spec:** `docs/research/IDEIA-050.md` (§1 bug, §2 R2 a R6, §4 casos, §5 encaixe); `docs/manager/decisoes.md` D-014 (a); `AUDITORIA-001` não se aplica.

## Grupos e arquivos

**Exclusivos do grupo catálogo:** `scripts/build-catalog.mjs`, `client/public/data/catalog.json`, `client/src/lib/catalog.js`, `catalog.test.js`, `catalog.real.test.js`, `scripts/catalog-diff.mjs`.
**Compartilhados com ECON (019 → 041):** nenhum arquivo de código. A fixture (`build-test-fixture.mjs` + `catalog.fixture.json`) é só do grupo catálogo; esta ideia só **acrescenta** `T5_WOOD` (e regenera). `Crafting.jsx` **não** é alterado.
**Impacto em planos aprovados:** nenhum; IDEIA-001 não testa receita de recurso bruto (`recipeOf('T4_WOOD')` já era `null`).

## O que muda em `catalog.json` (conferência do Tester)

| Medida | Antes (pós-038) | Depois |
|---|---|---|
| `items.length` | 2.292 | **2.292** (nenhum item sai do catálogo) |
| itens com `r` | 2.186 | **2.166** (saem os 20 abaixo) |
| itens `crafting/resources` com `r` | 20 | **0** |
| itens `crafting/resources` com `tm` | 0 | **25** (os 20 + os 5 recursos T4, que só tinham `er` de encanto) |
| itens `crafting/resources` com `er` | 25 | **0** |
| `vals`, `extra`, `encNames`, `cityOf`, `cc` | — | **idênticos** (os ids de entrada continuam em `needed`) |
Valores do Planejador sobre o dump em cache de 2026-11-17; o Tester refaz com `node scripts/catalog-diff.mjs`.

**Os 20 que saem de "craftáveis"** (todos `crafting/resources`, receita = 1 unidade do tier anterior): `T5_WOOD T6_WOOD T7_WOOD T8_WOOD T5_ROCK T6_ROCK T7_ROCK T8_ROCK T5_ORE T6_ORE T7_ORE T8_ORE T5_HIDE T6_HIDE T7_HIDE T8_HIDE T5_FIBER T6_FIBER T7_FIBER T8_FIBER`.
Cada um perde `r`, `a`, `f`, `er` e ganha `tm`. Os 5 `T4_WOOD/ROCK/ORE/HIDE/FIBER` perdem `er` e ganham `tm` com os passos de encanto. Nenhum campo de refinados (`PLANKS`, `METALBAR`, `LEATHER`, `CLOTH`, `STONEBLOCK`) muda: são receitas `...BUTTON_REFINE` e continuam intactas (35 refinados com `r` antes e depois).

**Valores de `tm` (dump; dossiê 050 R2/R3, conferidos pelo Planejador):**
`T5_ORE.tm[0] = [["T4_ORE", 781]]` · `T8_ORE.tm[0] = [["T7_ORE", 5000]]` · `T6_WOOD.tm[0] = [["T5_WOOD", 1250]]` · `T4_ORE.tm[1] = [["T4_ORE", 1500]]` · `T4_WOOD.tm[2] = [["T4_WOOD_LEVEL1", 3000]]` · `T5_ORE.tm[1] = [["T4_ORE_LEVEL1", 1563], ["T5_ORE", 2000]]` (duas receitas, como no dossiê R2). Atenção: **pedra** custa mais (`T5_ROCK.tm[0] = [["T4_ROCK", 1180]]`; `T4_ROCK.tm[1] = [["T4_ROCK", 1800]]`), o dossiê 050 R3 diz "igual para todos"; o dump mostra que não é: registrar na IDEIA-050.

## Onde aparece e UI

Aba **Craft**, seletor de item (`onlyCraftable`): ao digitar "t5 minério" ou "T6 madeira" os recursos brutos **deixam de aparecer** (continuam aparecendo no Mercado, que não filtra por craftável). Nenhuma tela nova. A aba **Refino** não muda.

## Arquivos afetados (exatos)

**Alterados:** `scripts/build-catalog.mjs`, `client/public/data/catalog.json` (regenerado), `client/src/lib/catalog.real.test.js`, `client/src/lib/catalog.test.js`, `scripts/build-test-fixture.mjs`, `client/src/test/catalog.fixture.json` (regenerado).
**NÃO toca:** `catalog.js` (nenhuma mudança de leitura: `recipeOf` já devolve `null` sem `r`), `econ.js`, `craftPlan.js`, `refinePlan.js`, componentes.
**Modelo de dados:** item `crafting/resources` ganha `tm`; perde `r`, `er`, `a`, `f` quando as receitas são transmutação. O campo `x` (nº de encantos) **não** muda.

## Fórmulas

Nenhuma fórmula de jogo é criada ou alterada. O custo de transmutação (`entrada + prata × fator do servidor`) é da IDEIA-050 (bloqueada por medição do usuário); aqui só se preserva o dado.

## Tasks (1 commit cada; testes primeiro)

### Task 1: teste do catálogo real (falha) e regra no build
**Files:** Modify `catalog.real.test.js`, `build-catalog.mjs`, `catalog.json`.
- [ ] **Step 1: testes falhando** (acrescentar a `catalog.real.test.js`, que lê `public/data/catalog.json`):

```js
const RAW = cat.items.filter((i) => i.c === 'crafting/resources');
const VINTE = ['WOOD','ROCK','ORE','HIDE','FIBER'].flatMap((t) => [5,6,7,8].map((n) => `T${n}_${t}`));
it('nenhum recurso bruto é craftável', () => { expect(RAW.filter((i) => i.r || i.er || i.a || i.f)).toEqual([]); });
it('os 20 recursos de transmutação saíram de craftáveis mas continuam no catálogo', () => {
  for (const id of VINTE) { expect(byId[id]).toBeDefined(); expect(byId[id].r).toBeUndefined(); expect(byId[id].tm[0]).toHaveLength(1); }
  expect(cat.items.filter((i) => i.r)).toHaveLength(2166);  expect(cat.items).toHaveLength(2292);
});
it('tm preserva a prata do dump', () => {
  expect(byId.T5_ORE.tm[0]).toEqual([['T4_ORE', 781]]);        expect(byId.T8_ORE.tm[0]).toEqual([['T7_ORE', 5000]]);
  expect(byId.T6_WOOD.tm[0]).toEqual([['T5_WOOD', 1250]]);     expect(byId.T4_ORE.tm[1]).toEqual([['T4_ORE', 1500]]);
  expect(byId.T4_WOOD.tm[2]).toEqual([['T4_WOOD_LEVEL1', 3000]]);
  expect(byId.T5_ORE.tm[1]).toEqual([['T4_ORE_LEVEL1', 1563], ['T5_ORE', 2000]]);
});
it('25 recursos têm tm', () => expect(RAW.filter((i) => i.tm)).toHaveLength(25));
it('refinados intactos: 35 com receita de refino', () => {
  const ref = cat.items.filter((i) => i.c === 'crafting/refinedresources'); expect(ref).toHaveLength(35); expect(ref.every((i) => i.r)).toBe(true);
  expect(byId.T4_PLANKS.r).toEqual([['T4_WOOD', 2], ['T3_PLANKS', 1]]); });
it('encanto dos refinados continua em er', () => expect(byId.T4_PLANKS.er[1]).toEqual([['T4_WOOD_LEVEL1', 2], ['T3_PLANKS', 1]]));
```
  Os 35 e o `T4_PLANKS` vêm do catálogo atual (2186 = 2166 + 20; 35 refinados conferidos pelo Planejador).
- [ ] **Step 2:** `npx vitest run src/lib/catalog.real.test.js` → FAIL (`r` presente em recursos).
- [ ] **Step 3: implementar no build:** em `parseRecipe(cr)` devolver também `tm: boolean` por requisito (`/TRANSMUTE/.test(r['@craftbuttonlocaoverride'])`); criar `parseTransmute(it)` que devolve `[[uniqueNameDaEntrada, @silver], ...]` de **todos** os requisitos de transmutação do item. Para entradas `isResource` cujo item base tem requisitos de transmutação: não gravar `a/f/r`/`er` vindos desses requisitos; gravar `tm[0] = parseTransmute(base)` e `tm[n] = parseTransmute(itemId_LEVELn)` (só chaves não vazias); continuar acrescentando os ids de entrada a `needed` (mantém `vals`/`extra` idênticos). `entry.x` continua sendo o nº de variantes `_LEVELn` encontradas. Refinados (`...BUTTON_REFINE`) seguem o caminho antigo, sem alteração.
- [ ] **Step 4:** `node scripts/build-catalog.mjs`; `node scripts/catalog-diff.mjs <catálogo da 038> client/public/data/catalog.json` → `itens 2292 -> 2292`, `com r 2186 -> 2166`, `crafting/resources com tm 0 -> 25`, `com er 25 -> 0`, `vals/extra/encNames/cityOf: sem diferença`. **Step 5:** rodar o teste da Task → PASS; `npm run check`.
- [ ] **Step 6: Commit:** `fix: transmutação de recursos brutos sai de r e vai para tm (não é receita de craft)`.

### Task 2: fixture e prova de que Craft e Refino não quebram
**Files:** Modify `build-test-fixture.mjs`, `catalog.fixture.json`, `catalog.test.js`.
- [ ] **Step 1:** acrescentar `T5_WOOD` a `IDS`; regenerar a fixture (o gerador copia `tm` por ser campo do item, verbatim).
- [ ] **Step 2: testes** (com `beforeEach(loadFixtureCatalog)`; devem passar sem alteração de `catalog.js`, o que é a prova do desenho):

```js
it('recurso bruto não é craftável: recipeOf e searchItems(onlyCraftable)', () => {
  expect(recipeOf('T5_WOOD')).toBeNull(); expect(recipeOf('T5_WOOD', 1)).toBeNull();
  expect(searchItems('t5_wood').map((i) => i.i)).toEqual(['T5_WOOD']);                       // Mercado continua achando
  expect(searchItems('t5_wood', { onlyCraftable: true })).toEqual([]);                        // Craft não oferece
});
it('nome e peso do bruto seguem funcionando', () => { expect(nameOf('T5_WOOD')).not.toBe('T5_WOOD'); expect(weightOf('T5_WOOD')).toBeGreaterThan(0); });
it('Refino inalterado: cadeia T4_PLANKS usa só receitas de refino', () => {
  expect(recipeOf('T4_PLANKS').res.map((r) => r.uniq)).toEqual(['T4_WOOD', 'T3_PLANKS']);
  expect(refineChainIds('T4_PLANKS', true)).toEqual(['T4_PLANKS','T4_WOOD','T3_PLANKS','T3_WOOD','T2_PLANKS','T2_WOOD']); });
```
  Os custos do Refino (Cenário A: 76,6203 / 62,3530 / 61,5265 com as taxas da IDEIA-001) **não mudam** nesta ideia; se a IDEIA-019 já estiver mesclada, valem os números do plano 019. Rodar a suíte inteira (`npm test`) como prova de regressão.
- [ ] **Step 3:** `npm run check`; `npm run dev`: aba Craft, buscar "t5 minério" e "t6 madeira" → nenhum recurso bruto; buscar "tábuas" (refinado) → continua aparecendo (refinados têm `r` e seguem craftáveis; só os brutos saem); aba Refino com Tábua T4 → mesmos números de antes; aba Mercado: buscar "minério t5" → aparece.
- [ ] **Step 4: Commit:** `test: fixture e testes de regressão do Craft/Refino após a 057`.

## Como o Tester valida

1. `node scripts/catalog-diff.mjs <master pós-038> <branch>`: contagens da tabela acima (2.292 / 2.186→2.166 / `tm` 25 / `er` em recursos 25→0; `vals`, `extra`, `encNames`, `cityOf` iguais). Conferir a **lista dos 20 ids** contra o `items.json` do SHA (todos com `@craftbuttonlocaoverride` TRANSMUTE e `@silver` ≥ 781).
2. **Valores de `tm`** (dossiê 050 §2 R3 e §4): `T5_ORE` 781, `T8_ORE` 5.000, `T6_WOOD` 1.250, `T4_ORE_LEVEL1` 1.500, `T4_WOOD_LEVEL2` 3.000, `T5_ORE_LEVEL1` 1.563 e 2.000; pedra T5 = 1.180 (difere do dossiê, ver acima).
3. **Efeito antigo reproduzido (bug):** no `master` pré-057 o Craft de `T5_ORE` mostrava custo ≈ preço de 1 `T4_ORE` (sem os 781); o lucro de transmutar T4→T5 (dossiê 050 §4: entrada 113, saída 393, líquido 367,46) ficava +254,46 em vez de −526,54 (erro de 781). Pós-057: o item não é oferecido.
4. **Refino:** aba Refino, Tábua T4 (e Metal T4, Couro T4, Tecido T4): custos idênticos a antes. Mercado: busca de recurso bruto continua funcionando.
5. **O que um jogador experiente estranharia:** o Craft oferecendo "Minério de Titânio" como craftável; o Mercado perdendo os recursos brutos; Refino com "sem dados" onde antes tinha preço; contagem de itens do Mercado diferente.

## Riscos

1. Procurar por tier de recurso "T4" ou "T3" no Craft (esses já não eram craftáveis); sem mudança.
2. Quem consumir `er` de recurso bruto (nenhum código atual o faz; verificado por `grep` na leitura de `catalog.js`/`Refining.jsx`/`Market.jsx`); a Task 1 roda a suíte inteira.
3. `tm` aumenta o catálogo (alguns KB); aceitável.
4. Se o dump futuro marcar outro tipo de receita com `TRANSMUTE`, o build mantém a regra por texto do botão (decisão deliberada: é o que o dump usa).

## Critério de pronto

`npm run check` verde; os testes novos de `catalog.real.test.js` e `catalog.test.js` verdes; `catalog-diff` com as contagens da tabela; seletor do Craft sem recursos brutos; Refino e Mercado sem regressão; só os arquivos listados alterados.

## PERGUNTAS PARA O GERENTE

1. `tm` com chave por nível (`0..4`) e várias receitas por variante é um superconjunto do `tm: {from, silver}` do dossiê 050. Aceita? (A alternativa, só o passo base, perderia o enchant-up.)
2. O dossiê 050 R3 diz que a prata é "igual para todos os recursos"; o dump mostra pedra diferente (1.180 e 1.800). Devo avisar o Pesquisador para corrigir o dossiê 050?
