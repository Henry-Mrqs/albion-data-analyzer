# IDEIA-023 — Calculadora de RRR: plano de implementação

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-023` (D-003). Comandos `npm` dentro de `client/`. **Pré-requisito:** IDEIA-001 mesclada (Vitest, `loadFixtureCatalog`, `mkPrices`, fixture, `craftPlan.js`).

**Objetivo:** nova aba "RRR" onde o jogador escolhe refino ou craft, cidade, categoria/recurso, foco e bônus diário e vê o RRR, a decomposição do PB, "de cada 100 materiais, quanto volta", uma tabela de referência de todos os cenários e, opcionalmente, o retorno esperado de uma receita em N crafts.

**Arquitetura:** módulo puro `lib/rrrCalc.js` que **só chama** `rrr()` de `econ.js` (nenhuma constante 18/40/15/59 é copiada) e consulta `REFINING`, `craftBonusCity`, `recipeOf` de `catalog.js` para saber se há especialização. Componente `RrrCalculator.jsx` só apresenta. A tabela de referência é gerada chamando `rrr()` em loop (R1, dossiê §5: "garante consistência").

**Tech Stack:** React 19, Vitest (da IDEIA-001), `lucide-react`.

**Spec:** `docs/research/IDEIA-023.md` (regras R1 a R14, tabela §4, caso de lote §4) e `docs/research/AUDITORIA-001.md` (§1 RRR, §4 cidades, §5 não retorna).

## Fidelidade: o que este plano consome e o que NÃO faz

- **Consome (não copia):** `rrr({ kind, specialty, focus, daily })` de `econ.js`; `REFINING[type].city` e `craftBonusCity(category)` de `catalog.js` (a tabela de cidades de craft **não** é copiada: a IDEIA-038 a corrige e a calculadora herda); `recipeOf(...).res[i].returnable` (a IDEIA-039 melhora o flag); `CITIES` de `market.js`; `ItemSelector`.
- **Não corrige** `CRAFT_CITY` (038), arredondamento da taxa de bancada (019), bônus diário no craft final (041). A calculadora já mostra craft com bônus diário porque chama `rrr()` direto (o dossiê R7 e a AUDITORIA §1 "Lacuna" tratam o diário como válido no craft).
- **Isolamento de dependência:** a decisão "este local+categoria tem especialização?" fica em UMA função, `isSpecialty(...)` em `rrrCalc.js`. Se a 038 mudar a assinatura de `craftBonusCity`, só ela é ajustada.

## Onde aparece e UI (sem código)

Nova aba **RRR** (ícone `Percent` do `lucide-react`; confirmar que existe na versão instalada, senão `Calculator`), hash `#rrr`, ao lado de Refino/Craft.
- Coluna esquerda: seletor Refino/Craft, cidade, recurso (refino) ou categoria (craft), chaves "Usar foco" e "Bônus diário" (Nenhum/+10%/+20%, escolha manual: o dossiê R7 manda não prometer automação).
- Cartão de resultado grande com o RRR (2 casas, ex. 24,81%), a soma do PB ("18 base + 15 especialização + 59 foco = 92") e "de cada 100 materiais voltam 24,81 e você gasta 75,19". Aviso fixo: "valor esperado; cada craft individual varia" (R14).
- Cartão opcional "Receita": escolher um item (ItemSelector) e nº de crafts; tabela material, bruto, retorno esperado, líquido; materiais que não retornam aparecem com retorno 0 e a nota "não retorna".
- Tabela de referência (24 linhas) com destaque na linha que corresponde à seleção atual.

## Arquivos afetados (exatos)

**Criados:** `client/src/lib/rrrCalc.js`, `client/src/lib/rrrCalc.test.js`, `client/src/components/RrrCalculator.jsx`.
**Alterados:** `client/src/App.jsx` (entrada em `TABS` + `lazy` import + ícone). **Nada mais.**
**NÃO toca:** `econ.js`, `catalog.js`, `craftPlan.js`, `Crafting.jsx`, `Refining.jsx`, `build-catalog.mjs`, fixture, `index.css`.
**Conflito de paralelismo:** praticamente nenhum. Só `App.jsx` (uma linha em `TABS`; outras ideias de aba nova também mexem nele, merge trivial). Pode rodar em paralelo com 038/039 e com 019/041. Dependência de leitura: `rrr`, `craftBonusCity`, `REFINING`, `recipeOf`.

**Modelo de dados:** nenhum catálogo novo. `usePersisted('rrr:cfg', { kind:'craft', city:'Lymhurst', category:'weapons/sword', resource:'PLANKS', focus:false, daily:0, item:null, crafts:100 })` em `localStorage` (`albion:rrr:cfg`).

## Fórmulas (dossiê §2, R1/R2; implementadas por `rrr()`, não reescritas)

```
RRR = PB / (100 + PB)                       PB = base + especialização + foco + diário
parte(x) em PB  = pbOf(rrr com x) - pbOf(rrr sem x),   pbOf(r) = 100*r/(1-r)   // decomposição derivada de rrr(), sem constantes
devolve(N)  = N * RRR          gasta(N) = N * (1 - RRR)
receita: bruto_i = count_i * crafts;  retorno_i = returnable_i ? bruto_i * RRR : 0;  liquido_i = bruto_i - retorno_i
```

## Interfaces (`rrrCalc.js`)

```js
isSpecialty({ kind, city, category, resource }): boolean
  // refine: REFINING[resource].city === city ; craft: craftBonusCity(category) === city
rrrFor({ kind, city, category, resource, focus, daily }): { rrr, pb, specialty, parts: { base, specialty, focus, daily } }
referenceTable(): Array<{ key, kind, specialty, focus, daily, pb, rrr, per100: number }>   // 2x2x2x3 = 24 linhas
recipeReturn(rec, crafts, rrrValue): Array<{ uniq, name, gross, returned, net, returnable }>
```

## Tasks (1 commit cada; testes primeiro)

### Task 1: `rrrFor`, `isSpecialty`, `referenceTable` (puros)
**Files:** Create `rrrCalc.test.js`, `rrrCalc.js`.
- [ ] **Step 1: teste falhando** (`beforeEach(loadFixtureCatalog)`; `import` falha porque o módulo não existe). Casos do dossiê §4 (todos com `toBeCloseTo(x, 4)` no RRR em fração, `pb` com `toBeCloseTo(.., 6)`):

```js
const base = { kind: 'craft', city: 'Martlock', category: 'weapons/sword', resource: 'PLANKS', focus: false, daily: 0 };
const cases = [ // [nome, override, pb, rrr]
  ['cidade sem bônus',           { kind: 'refine', city: 'Martlock', resource: 'PLANKS' }, 18, 0.152542],
  ['craft em cidade de bônus',   { city: 'ESPECIALISTA' },                                   33, 0.248120],
  ['refino em cidade de bônus',  { kind: 'refine', city: 'Fort Sterling', resource: 'PLANKS' }, 58, 0.367089],
  ['foco sem bônus',             { kind: 'refine', city: 'Martlock', resource: 'PLANKS', focus: true }, 77, 0.435028],
  ['craft bônus + foco',         { city: 'ESPECIALISTA', focus: true },                      92, 0.479167],
  ['refino bônus + foco',        { kind: 'refine', city: 'Fort Sterling', resource: 'PLANKS', focus: true }, 117, 0.539171],
  ['craft bônus + foco + dia 20',{ city: 'ESPECIALISTA', focus: true, daily: 20 },           112, 0.528302],
  ['craft bônus + foco + dia 10',{ city: 'ESPECIALISTA', focus: true, daily: 10 },           102, 0.504950],
  ['refino bônus + foco + dia 20',{ kind: 'refine', city: 'Fort Sterling', resource: 'PLANKS', focus: true, daily: 20 }, 137, 0.578059],
  ['refino bônus + dia 10',      { kind: 'refine', city: 'Fort Sterling', resource: 'PLANKS', daily: 10 }, 68, 0.404762],
];
```
  `ESPECIALISTA` = `craftBonusCity('weapons/sword')` lido em tempo de execução (o teste **não** hardcoda a cidade: se a 038 mudar a tabela, o teste continua válido). Mais: `parts` de "craft bônus + foco + dia 20" = `{ base: 18, specialty: 15, focus: 59, daily: 20 }` (tolerância 1e-6); `isSpecialty` refino: `Fort Sterling`+`PLANKS` true, `Martlock`+`PLANKS` false, `Thetford`+`ORE` true; craft com categoria sem cidade de bônus (`craftBonusCity` nulo, ex. `'crafting/refinedresources'`) sempre false; `referenceTable()` tem 24 linhas, `per100 === rrr*100`, linhas únicas por `key`, e contém as linhas de PB 18, 33, 58, 77, 92, 117, 112, 102, 137, 68 com os RRR acima.
- [ ] **Step 2:** `npx vitest run src/lib/rrrCalc.test.js` → FAIL (`Failed to resolve import "./rrrCalc"`).
- [ ] **Step 3: implementar** `isSpecialty`, `rrrFor`, `referenceTable` em `rrrCalc.js` (somente `rrr()`, `REFINING`, `craftBonusCity`; `parts` por diferença de `pbOf`).
- [ ] **Step 4:** mesmo comando → PASS. **Step 5:** `npm run check`.
- [ ] **Step 6: Commit:** `feat: núcleo da calculadora de RRR (rrrFor, tabela de referência)`.

### Task 2: `recipeReturn` (retorno esperado de uma receita)
**Files:** Modify `rrrCalc.test.js`, `rrrCalc.js`.
- [ ] **Step 1: teste falhando** com a receita da fixture `T6_MAIN_SWORD` (16 barras + 8 couro; mesma contagem do caso do dossiê §4) e `rrrValue = rrrFor({... craft especializado}).rrr`:

```js
it('lote do dossiê: 100 crafts, sem foco (RRR 24,8120%)', () => {
  const rows = recipeReturn(recipeOf('T6_MAIN_SWORD'), 100, 33 / 133);
  expect(rows.map((r) => r.gross)).toEqual([1600, 800]);
  expect(rows[0].returned).toBeCloseTo(396.99, 2); expect(rows[1].returned).toBeCloseTo(198.50, 2);
  expect(rows[0].net).toBeCloseTo(1203.01, 2);     expect(rows[1].net).toBeCloseTo(601.50, 2);
});
it('com foco (47,9167%)', () => { /* returned 766.67 e 383.33; net 833.33 e 416.67 */ });
it('artefato não retorna', () => { /* T6_MAIN_SWORD_CRYSTAL: último item gross 100, returned 0, net 100, returnable false */ });
it('crafts inválido vira 1', () => { /* 0, '', -3 -> gross = count */ });
```
  (`33/133` é só o valor numérico do caso; em teste de integração `rrrFor` também é usado e deve dar o mesmo.)
- [ ] **Step 2:** rodar → FAIL (`recipeReturn is not a function`). **Step 3:** implementar. **Step 4:** PASS. **Step 5:** `npm run check`. **Step 6: Commit:** `feat: retorno esperado de receita na calculadora de RRR`.

### Task 3: Componente e aba
**Files:** Create `components/RrrCalculator.jsx`; Modify `App.jsx`.
- [ ] **Step 1:** implementar o componente conforme "Onde aparece e UI" usando `Field`, `Switch`, `Segmented`, `NumberInput`, `Banner` de `ui.jsx` e `ItemSelector` (mesmo padrão de uso do `Crafting.jsx`). Categorias: `Object.keys(CATEGORIES)` exceto as `crafting/*`, rotuladas por `categoryLabel`. Cidades: `CITIES`. Estado em `usePersisted('rrr:cfg', ...)`.
- [ ] **Step 2:** em `App.jsx` adicionar `lazy(() => import('./components/RrrCalculator'))` e `{ id: 'rrr', label: 'RRR', icon: Percent, View: RrrCalculator }` em `TABS`.
- [ ] **Step 3:** `npm run check` → código 0. **Step 4:** `npm run dev`, abrir `#rrr`: sem erro no console; escolher Craft/Lymhurst/Espada/foco e conferir o cartão (92 de PB, 47,92%); trocar para Refino/Fort Sterling/Madeira (58, 36,71%); selecionar espada T6 e 100 crafts (tabela 1.600/800).
- [ ] **Step 5: Commit:** `feat: aba RRR com calculadora e tabela de referência`.

## Como o Tester valida (recalcular sem importar `econ.js`)

Casos do dossiê §4 (`PB → RRR → devolve de 100`): 18 → 15,2542 → 15,25; 33 → 24,8120 → 24,81; 58 → 36,7089 → 36,71; 77 → 43,5028 → 43,50; 92 → 47,9167 → 47,92; 117 → 53,9171 → 53,92; 112 → 52,8302 → 52,83; 102 → 50,4950 → 50,50; 137 → 57,8059 → 57,81; 68 → 40,4762 → 40,48. Lote (AFM, 100 crafts em Lymhurst, 16 barras + 8 couro): sem foco retorno 396,99 e 198,50, líquido 1.203,01 e 601,50; com foco 766,67 e 383,33, líquido 833,33 e 416,67 (a conta: 1.600 × 0,248120; 1.600 × 0,479167; 800 × 0,479167).
Fora do escopo desta entrega (não testar): Rest 15 → 13,04%, Ilha 0 e 59 → 0% e 37,11% (exigem base ≠ 18; ver pergunta 1).
**O que um jogador experiente estranharia:** RRR acima de 58% ou "100%"; 15,3% em vez de 15,25%; refino em cidade errada mostrando bônus de 40; craft numa cidade sem bônus mostrando 24,8%; foco que "diminui" o RRR; bônus diário sem efeito no craft; artefato com retorno positivo; retorno + líquido ≠ bruto; falta do aviso "valor esperado". Conferir também que a cidade de bônus de craft exibida bate com o jogo na época do teste (depende da 038).

## Riscos

1. 038 pode mudar `craftBonusCity`/`CATEGORIES`: mitigado por `isSpecialty` único e testes que leem a cidade do próprio `craftBonusCity`.
2. Decomposição do PB por diferença de `rrr()` introduz ruído de ponto flutuante: arredondar a 2 casas na tela e testar com tolerância.
3. `lucide-react` 0.344 pode não ter `Percent`: verificar na Task 3.
4. Brecilien não está em `CITIES` (IDEIA-025/038): fora de escopo.

## Critério de pronto

`npm run check` verde; aba `#rrr` funcional; todos os casos do dossiê acima em teste; nenhum literal 18/40/15/59 em `rrrCalc.js` ou no componente (`grep` limpo); nenhum arquivo fora da lista alterado.

## PERGUNTAS PARA O GERENTE

1. **Base por local (R8, R9):** Rest (refino 15 → 13,04%, MÉDIA/ALTA) e Ilha (0 → 0% / 37,11%, MÉDIA) pedem um parâmetro `base` em `rrr()` (hoje fixo em 18), o que toca `econ.js` e conflita com 019/041. Este plano **exclui** Rest/Ilha/hideout. Quer incluir depois (junto da IDEIA-025)?
2. O dossiê oferece "nova aba" ou "painel na aba Craft". Escolhi nova aba (isolamento de arquivos). Confirma?
3. Brecilien (cape/bag/potion) só aparece na calculadora depois da 038/025; ok?
