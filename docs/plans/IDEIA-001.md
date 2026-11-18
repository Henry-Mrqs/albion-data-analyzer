# IDEIA-001 — Fundação de testes: plano de implementação

> **Para o Executor:** use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Os passos usam checkbox (`- [ ]`). Trabalhe na branch `feat/IDEIA-001` (D-003). Todos os comandos `npm` rodam dentro de `client/`.

**Objetivo:** permitir TDD e testes de regressão numéricos: Vitest no `client`, lógica de cálculo extraída dos componentes para módulos puros em `client/src/lib/`, catálogo injetável, fixture pequena versionada e testes de caracterização com contas feitas à mão.

**Arquitetura:** (1) Vitest em ambiente `node` com `vitest.config.js` próprio (não carrega o plugin React nem o proxy do `vite.config.js`). (2) `catalog.js` ganha `setCatalog(obj)` / `resetCatalog()`; o `fetch` passa a chamar `setCatalog`. (3) Três módulos novos e puros: `craftPlan.js` (Crafting), `refinePlan.js` (Refining), `flip.js` (Flipper). Os componentes só montam a tela. (4) Fixture = corte fixo do `catalog.json` real, gerado por `scripts/build-test-fixture.mjs` e versionado.

**Stack:** Vitest (>= 5.1.0; `npm view vitest peerDependencies` mostra `vite ^8` suportado, verificado em 2026-11-17), Node 22.19, Vite 8, React 19, ESLint 10 (`eslint-plugin-react-hooks` 7).

**Spec:** briefing do Gerente (IDEIA-001) + `docs/manager/estado-atual.md` §3 e §4.3 + `docs/manager/decisoes.md` D-001, D-002, D-006.

## AVISO IMPORTANTE (o que estes testes provam e o que não provam)

Os testes deste plano são de **caracterização**: eles congelam o que o código faz **hoje**, para provar que o refactor não mudou nenhum número. **Eles NÃO provam que as fórmulas batem com o jogo** (RRR 18/40/15/59, 0,1125 da bancada, 4%/8%, 2,5%, `CRAFT_CITY`). Isso é a auditoria D-008, feita por outro agente depois. Se a auditoria corrigir uma constante, o teste correspondente deve ser alterado de propósito, no mesmo commit da correção.

## Global Constraints

- Refactor **sem mudar números**: o código movido é cortado e colado; só mudam nomes de variáveis e assinatura. Revisar com `git diff --color-moved=dimmed-zebra`.
- Módulos novos em `client/src/lib/` **não importam** React, `fetch`, `localStorage` nem `import.meta.env`. (`econ.js` importa `catalog.js` e `market.js`, que importam React/settings só para hooks; isso carrega em Node sem erro, ver Task 2.)
- Sem TypeScript. Sem jsdom. Testes com `import { describe, it, expect } from 'vitest'` (sem globals, não mexe no ESLint).
- Comparações de ponto flutuante com `toBeCloseTo(valor, 4)`; inteiros e strings com `toBe`/`toEqual`.
- Não alterar `package.json` além de: devDependency `vitest` e três scripts (`test`, `test:watch`, `check`).
- Não mexer em `client/public/data/catalog.json`, `market.js`, `settings.js`, `ui.jsx`, `Market.jsx`, `PriceMatrix.jsx`, `ItemSelector.jsx`, `App.jsx`.
- Cada Task = 1 commit, mensagem em português no padrão do repositório (`feat:`, `refactor:`, `chore:`, `docs:`, `test:`), terminando com a linha de coautoria do ambiente.
- Baseline verificado pelo Planejador: `npm run lint` em `master` passa sem avisos.

## Review Focus (entradas que nenhuma Task "feliz" cobre; cada uma tem teste na Task indicada)

1. `prices === null` (carregando): `computeCraft` e `evaluateTier` não podem estourar; linhas com `unit 0` e `canRefine && prices` falso. Task 4 e 5.
2. Item sem receita (`rec === null`) e receita ausente na cadeia (`T9_PLANKS`): sem exceção, `missing` preenchido. Task 3 e 4.
3. `customRRR` inválido ou vazio, `crafts` 0/negativo/vazio: cai no automático / mínimo 1. Task 4 (`resolveRRR`, `craftRates`).
4. Dado velho no Flipper (`maxAge`) e `Black Market` nunca em "ordem de venda". Task 6.
5. Preço do material só em ordem de compra (`useOrders`), com a taxa de 2,5%. Task 3.

## Arquivos

**Criados**

| Arquivo | Responsabilidade |
|---|---|
| `client/vitest.config.js` | config mínima (`environment: 'node'`, `include: ['src/**/*.test.js']`) |
| `client/README.md` | (substitui o texto padrão do template Vite) como rodar scripts e testes |
| `scripts/build-test-fixture.mjs` | gera a fixture a partir de `client/public/data/catalog.json` com lista fixa de ids |
| `client/src/test/catalog.fixture.json` | fixture gerada (versionada) |
| `client/src/test/helpers.js` | `loadFixtureCatalog()`, `mkPrices(spec)`, `planksSpec(over)` |
| `client/src/lib/smoke.test.js` | teste de fumaça (Task 1, removido na Task 2) |
| `client/src/lib/catalog.test.js` | caracteriza `catalog.js` |
| `client/src/lib/econ.test.js` | caracteriza `econ.js` |
| `client/src/lib/craftPlan.js` + `craftPlan.test.js` | lógica de `Crafting.jsx` |
| `client/src/lib/refinePlan.js` + `refinePlan.test.js` | lógica de `Refining.jsx` |
| `client/src/lib/flip.js` + `flip.test.js` | lógica de `Flipper.jsx` |

**Alterados**

| Arquivo | Mudança |
|---|---|
| `client/package.json` (+ `package-lock.json`) | `vitest` em devDependencies; scripts `test`, `test:watch`, `check` |
| `client/src/lib/catalog.js` | adiciona `setCatalog`, `resetCatalog`; `loadCatalog` chama `setCatalog` (comportamento igual) |
| `client/src/lib/econ.js` | adiciona `resolveRRR` (extrai a expressão duplicada de customRRR) |
| `client/src/components/Crafting.jsx` | usa `craftPlan.js` |
| `client/src/components/Refining.jsx` | usa `refinePlan.js` |
| `client/src/components/Flipper.jsx` | usa `flip.js` |

**Modelo de dados:** nenhuma mudança em `catalog.json`, `localStorage` (`albion:*`) ou formato de `prices`. Formato de `prices` (para os testes): `{ [mid]: { [cidade]: { [qualidade=1]: { s, sd, b, bd } } } }`.

## Fórmulas existentes (pseudocódigo, para a refatoração; não alterar)

```
rrr(kind, specialty, focus, daily=0):
  PB = 18 + (specialty ? (kind=='refine' ? 40 : 15) : 0) + (focus ? 59 : 0) + daily
  return PB / (100 + PB)
resolveRRR(auto, raw):  custom = raw !== '' && !isNaN(+raw);  custom ? +raw/100 : auto
stationFee(valor, feePer100) = round(valor * 0.1125 * feePer100/100)      // Math.round (meio sobe)
netSale(p, 'order', premium)   = p * (1 - tax - 0.025)    tax = premium ? 0.04 : 0.08
netSale(p, 'instant', premium) = p * (1 - tax)
buyQuote(prices, mid, {city='best', useOrders}):
  menor preço > 0 entre as cidades (sell se !useOrders, buy se useOrders); se useOrders: preço *= 1.025
refineUnit(uniq, ctx{prices,city,useOrders,rrr,feePer100,route|deep}):
  route = ctx.route ?? (ctx.deep ? 'all' : 'buy')
  para cada ingrediente r:
    q = buyQuote(r.mid); unit = q.price
    se r é refinado de tier>=2 e route != 'buy':
      s = refineUnit(r.uniq)           // recursivo
      canMake = s.missing vazio && s.cost > 0
      se route=='all' OU (canMake && (!q.price || s.cost < q.price)): choice='make', unit=s.cost, alt=q.price, missing += s.missing
      senão alt = canMake ? s.cost : 0
    se choice=='buy' && !unit: missing += r.mid
    gross += r.count * unit
  value = ingredientValue(uniq) || recipeValue(rec)
  fee = stationFee(value, feePer100);  cost = gross*(1-rrr) + fee
craft (por linha): qty = count * crafts * (returnable ? 1-craftRRR : 1)
  total = matCost + fee;  fee = stationFee(recipeValue(rec), feePer100) * crafts   // arredonda ANTES de multiplicar
  units = rec.amount * crafts;  unitCost = totalCost/units
  opção de venda: instant (preço de compra) / order (preço de venda, nunca no Black Market)
  net = netSale(preço, modo, premium) * units;  profit = net - totalCost;  margin = profit/totalCost*100
```

## Cenários numéricos (usados nas Tasks 3 a 5; contas à mão)

Preços fictícios (cidade `Fort Sterling`, preço de venda mínimo `s`). `R = 58/158 = 0,367089` (refino em cidade especializada: 18+40=58). `1−R = 100/158 = 0,632911`.
Taxas de bancada com `feePer100 = 400`: valor 16 (T4_PLANKS) → `round(16·0,1125·4)=round(7,2)=7`; valor 8 (T3) → `round(3,6)=4`; valor 4 (T2) → `round(1,8)=2`. (valores vêm de `vals` do catálogo: T4_PLANKS 16, T3_PLANKS 8, T2_PLANKS 4.)

**Cenário A** (`planksSpec()`): T4_WOOD 30, T3_WOOD 15, T2_WOOD 8, T4_PLANKS 120, T3_PLANKS 50, T2_PLANKS 5. Receitas: T4 = 2×T4_WOOD + 1×T3_PLANKS; T3 = 2×T3_WOOD + 1×T2_PLANKS; T2 = 1×T2_WOOD.

| Rota | Conta | Custo T4_PLANKS |
|---|---|---|
| comprar pronto (`buy`) | bruto = 2·30 + 50 = 110; 110·0,632911 + 7 | **76,6203** |
| produzir tudo (`all`) | T2 = 8·0,632911+2 = 7,0633; T3 = (2·15+7,0633)·0,632911+4 = 27,4578; T4 = (2·30+27,4578)·0,632911+7 | **62,3530** |
| melhor (`best`) | T2: fazer 7,0633 > comprar 5 → compra; T3 = (30+5)·0,632911+4 = 26,1519 < 50 → faz; T4 = (60+26,1519)·0,632911+7 | **61,5265** |

**Cenário B** = A com T3_PLANKS 20 (`planksSpec({ T3_PLANKS: 20 })`): `best`: T3 fazer 26,1519 > comprar 20 → compra; T4 = (60+20)·0,632911+7 = **57,6329** (= `buy`); `all` continua **62,3530**.

Variações: sem T3_WOOD (`planksSpec({ T3_WOOD: null })`): `all` → T3 = (0+7,0633)·0,632911+4 = 8,4704; T4 = **50,3357**, `missing=['T3_WOOD']`; `best` → T3 não pode ser feito, compra a 50 → **76,6203**, `missing=[]`. Sem T4_WOOD, rota `buy`: (0+50)·0,632911+7 = **38,6456**, `missing=['T4_WOOD']`.

Venda do refinado T4 no Cenário A: Black Market `b=140` (instantânea): 140·0,96 = 134,4 → lucro 134,4 − 61,5265 = **72,8735**, margem 72,8735/61,5265·100 = **118,44%**. Martlock `s=135` por ordem: 135·0,935 = 126,225 → lucro **64,6985**.

**Craft C1 — arco T4, 1000 crafts, Lymhurst** (cidade de bônus do arco → especializada): RRR craft = (18+15)/(100+33) = 33/133 = **0,248120**. Receita `T4_2H_BOW`: 32×T4_PLANKS (valor da receita = 32·16 = 512). `qty = 32·1000·(100/133) = 24060,1504`. Preço de T4_PLANKS: Fort Sterling 120, Martlock 130 → melhor 120 (Fort Sterling). Modo `buy`: material = 24060,1504·120 = **2.887.218,0451**; taxa = `round(512·0,1125·4)=round(230,4)=230` × 1000 = **230.000** (se arredondasse depois seriam 230.400); custo total **3.117.218,0451**; por unidade **3117,2180**. Preços do arco: Lymhurst `s=9500`; Caerleon `s=9000`, `b=8000`; Black Market `b=8500`. Premium (4% + 2,5%): Lymhurst ordem 9500·0,935·1000 = **8.882.500**; Caerleon ordem 8.415.000; Black Market instantânea 8500·0,96·1000 = 8.160.000; Caerleon instantânea 7.680.000. Melhor = Lymhurst/order: lucro 8.882.500 − 3.117.218,0451 = **5.765.281,9549**, margem **184,9496%**. Sem premium (8%+2,5%): 9500·0,895·1000 = 8.502.500 → lucro **5.385.281,9549**, margem **172,7592%**.

**Craft C2 — mesmo arco, modo `best` do PLANKS** (refino em cidade de bônus automática, RRR de refino = R): custo unitário do material = 61,5265; material = 24060,1504·61,5265 = **1.480.337,2797**; custo total = + 230.000 = **1.710.337,2797**. Lucro Lymhurst/order = 8.882.500 − 1.710.337,2797 = **7.172.162,7203**, margem **419,3420%**. Comparação `cmp` da linha: `buy 120`, `all 62,3530`, `best 61,5265` (`bestIsMake=true`); com bônus diário +10% (PB = 18+40+10 = 68 → 68/168 = 0,404762) → `d10 = 57,4960`; +20% (78/178 = 0,438202) → `d20 = 54,0016`. Plano (n = 24060,1504; k = 0,632911): fazer T4_PLANKS n (taxa 7·n = 168.421,0526); fazer T3_PLANKS n·k = 15227,9433 (taxa 4·15227,9433 = 60.911,7731); comprar T4_WOOD n·2·k = 30455,8866 a 30 = 913.676,5966; T3_WOOD 15227,9433·2·k = 19275,8776 a 15 = 289.138,1635; T2_PLANKS 15227,9433·k = 9637,9388 a 5 = 48.189,6939. Soma do plano = 1.480.337,2797 (= material), + taxa 230.000 = custo total.

**Craft C3 — espada T6 com artefato** (`T6_MAIN_SWORD_CRYSTAL`: 16×T6_METALBAR, 8×T6_LEATHER, 1×T6_ARTEFACT_MAIN_SWORD_CRYSTAL; 3 ingredientes. Não existe espada/armadura T6 com 4 ingredientes no catálogo; as de 4 são poções): Lymhurst (espada), 1 craft, RRR 33/133. Valores: 64, 64 e 5760 → valor da receita = 16·64 + 8·64 + 5760 = **7296**; taxa = `round(7296·0,45)=round(3283,2)=3283`. Preços: T6_METALBAR 200, T6_LEATHER 150, artefato 90000; modo `buy` nos dois refinados. qty barra = 16·100/133 = **12,0301**, couro = 8·100/133 = **6,0150**, artefato = **1** (não retorna). Material = 12,0301·200 + 6,0150·150 + 90000 = **93.308,2707**; total = **96.591,2707**.

**Flipper (`flipRows`)**: item `T6_MAIN_SWORD`, comprar em Martlock `s=1000` (há 1 h); Caerleon `s=1600`, `b=1500`; Black Market `b=1700`. Premium: Caerleon instantânea 1500·0,96−1000 = **440**; Caerleon ordem 1600·0,935−1000 = **496**; Black Market instantânea 1700·0,96−1000 = **632** (margem 63,2%); BM nunca em ordem. Compra por ordem: custo = 900·1,025 = **922,5**; lucro BM = 1632−922,5 = **709,5**. Sem premium, BM: 1700·0,92−1000 = **564**.

**RRR (tabela da Task 3)**: base 18/118 = **0,152542**; refino especializado 58/158 = **0,367089**; craft especializado 33/133 = **0,248120**; craft esp.+foco (18+15+59=92) 92/192 = **0,479167**; refino esp.+foco (117) 117/217 = **0,539171**; refino esp.+diário 20 (78) 78/178 = **0,438202**; refino esp.+foco+diário 20 (137) 137/237 = **0,578059**; craft sem especialização + foco (77) 77/177 = **0,435028**.

---

## Task 1: Vitest, scripts e README

**Files:**
- Modify: `client/package.json`, `client/package-lock.json`
- Create: `client/vitest.config.js`, `client/src/lib/smoke.test.js`
- Modify: `client/README.md` (substituir o texto do template)

**Interfaces:** Produz os comandos `npm test`, `npm run test:watch`, `npm run check`.

- [ ] **Step 1: Baseline.** Em `client/`: `npm run lint` e `npm run build`. Esperado: ambos terminam com código 0 (lint sem saída de erro). Se falhar, pare e avise o Gerente (o plano assume baseline verde).
- [ ] **Step 2: Escrever o teste de fumaça** `client/src/lib/smoke.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { rrr } from './econ';

describe('smoke', () => {
  it('econ.js carrega em Node (sem jsdom) e rrr funciona', () => {
    expect(rrr({ kind: 'refine', specialty: true, focus: false })).toBeCloseTo(58 / 158, 6);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar.** `npx vitest run` → falha porque `vitest` não está instalado (`command not found` / `ERR_MODULE_NOT_FOUND`).
- [ ] **Step 4: Instalar e configurar.** `npm install -D vitest@^5.1.0` (único `npm install` permitido; se `npm view vitest@5.1.0 engines` exigir Node maior que 22.19, usar `vitest@^4.1.12` e registrar no commit). Criar `client/vitest.config.js` com `defineConfig({ test: { environment: 'node', include: ['src/**/*.test.js'] } })` (import de `vitest/config`). Em `package.json` scripts acrescentar: `"test": "vitest run"`, `"test:watch": "vitest"`, `"check": "npm run lint && npm test && npm run build"`.
- [ ] **Step 5: Verificar.** `npm test` → saída contém `Test Files  1 passed (1)` e `Tests  1 passed (1)`. Isso também prova que `econ.js → catalog.js/market.js/settings.js` importam em Node (o `localStorage` ausente cai no `catch` de `settings.js`).
- [ ] **Step 6: README.** Substituir `client/README.md` por um texto curto em PT-BR: o que é o app; `npm run dev`; `npm test` (uma execução), `npm run test:watch`, `npm run check` (lint + test + build, rodar antes de todo commit/PR); onde ficam os testes (`src/**/*.test.js`, ao lado do código); como regenerar a fixture (`node scripts/build-test-fixture.mjs`, a partir da raiz do repositório); o aviso "testes de caracterização não validam fórmulas contra o jogo". Máx. 40 linhas.
- [ ] **Step 7: Verificar o check completo.** `npm run check` → termina com código 0 (lint limpo, 1 teste passando, build ok).
- [ ] **Step 8: Commit.** `git add client/package.json client/package-lock.json client/vitest.config.js client/src/lib/smoke.test.js client/README.md` → `chore: adiciona Vitest, scripts test/test:watch/check e README`.

## Task 2: Catálogo injetável, fixture e testes de `catalog.js`

**Files:**
- Modify: `client/src/lib/catalog.js` (apenas `loadCatalog`, mais duas funções novas)
- Create: `scripts/build-test-fixture.mjs`, `client/src/test/catalog.fixture.json`, `client/src/test/helpers.js`, `client/src/lib/catalog.test.js`
- Delete: `client/src/lib/smoke.test.js`

**Interfaces:**
- Produz em `catalog.js`: `setCatalog(d: { items, extra, vals, encNames, built }): void` (faz o que o `.then` fazia: guarda `data`, preenche `byId`, calcula `it._s`) e `resetCatalog(): void` (zera `data`, `byId`, `promise`).
- Produz em `helpers.js`: `loadFixtureCatalog(): void` (= `resetCatalog(); setCatalog(structuredClone(fixture))`; chamar em `beforeEach`, porque `setCatalog` muta os itens com `_s`); `mkPrices(spec): prices` onde `spec[mid]` é um número (preço de venda `s` em `Fort Sterling`) ou `{ [cidade]: { s=0, b=0, sd=null, bd=null } }`; `planksSpec(over = {}): spec` com o Cenário A, onde `over[mid] = número` troca o preço e `null` remove o item.

- [ ] **Step 1: Gerador da fixture** `scripts/build-test-fixture.mjs` (mesmo estilo de `build-catalog.mjs`). Lê `client/public/data/catalog.json` e grava `client/src/test/catalog.fixture.json` (JSON com indentação de 1 espaço, chaves em ordem estável, `items` ordenados por id). Lista fixa `IDS`:
  `T2_WOOD T3_WOOD T4_WOOD T2_PLANKS T3_PLANKS T4_PLANKS T4_2H_BOW T6_MAIN_SWORD T6_MAIN_SWORD_CRYSTAL T6_ARTEFACT_MAIN_SWORD_CRYSTAL T6_ARMOR_PLATE_SET1 T6_METALBAR T6_LEATHER`.
  Regras: `items` = itens com esses ids, **verbatim**; `vals` = toda chave de `vals` cujo id sem `_LEVELn` esteja em `IDS` ou seja ingrediente (`r` e `er`) de um item de `IDS`; `encNames` = chaves cujo id base esteja em `IDS`; `extra` = chaves em `IDS`; `built` copiado. Cadeias de `T6_METALBAR`/`T6_LEATHER` abaixo do T6 ficam **ausentes de propósito** (ver Task 4, C3: `recipeOf` do T5 devolve `null` e a cadeia vira "sem dados").
- [ ] **Step 2: Rodar o gerador.** `node scripts/build-test-fixture.mjs` (na raiz) → imprime `fixture: 13 itens, N vals`; o arquivo existe e tem menos de 20 KB.
- [ ] **Step 3: Escrever `helpers.js`** (assinaturas acima) e **`catalog.test.js` (falhando)**. O teste importa `setCatalog`/`resetCatalog`, que ainda não existem. Casos (todos com `beforeEach(loadFixtureCatalog)`):

```js
it('marketId', () => {
  expect(marketId('T4_PLANKS', 1)).toBe('T4_PLANKS_LEVEL1@1');
  expect(marketId('T4_PLANKS_LEVEL1')).toBe('T4_PLANKS_LEVEL1@1');
  expect(marketId('T4_2H_BOW', 2)).toBe('T4_2H_BOW@2');
  expect(marketId('T4_2H_BOW')).toBe('T4_2H_BOW');
});
it('refinedTypeOf / tierOf / splitUniq', () => {
  expect(refinedTypeOf('T4_PLANKS_LEVEL2')).toBe('PLANKS');
  expect(refinedTypeOf('T4_WOOD')).toBeNull();
  expect(tierOf('T6_METALBAR')).toBe(6);
  // splitUniq vem de econ.js; testado na Task 3
});
it('recipeOf T4_PLANKS .0', () => {
  const r = recipeOf('T4_PLANKS', 0);
  expect(r.amount).toBe(1); expect(r.focus).toBe(54);
  expect(r.res.map((x) => [x.uniq, x.mid, x.count, x.value, x.returnable])).toEqual([
    ['T4_WOOD', 'T4_WOOD', 2, 4, true], ['T3_PLANKS', 'T3_PLANKS', 1, 8, true]]);
  expect(recipeValue(r)).toBe(16);
});
it('recipeOf T4_PLANKS .1 usa er[1]', () => {
  const r = recipeOf('T4_PLANKS', 1);
  expect(r.res[0].uniq).toBe('T4_WOOD_LEVEL1'); expect(r.res[0].mid).toBe('T4_WOOD_LEVEL1@1');
  expect(r.res[0].value).toBe(12); expect(r.res[1].uniq).toBe('T3_PLANKS');
});
it('recipeOf espada T6 .1 sem er: aplica RULE_RE só em recursos', () => {
  const r = recipeOf('T6_MAIN_SWORD', 1);
  expect(r.res.map((x) => x.uniq)).toEqual(['T6_METALBAR_LEVEL1', 'T6_LEATHER_LEVEL1']);
});
it('artefato não retorna e tem valor 5760', () => {
  const a = recipeOf('T6_MAIN_SWORD_CRYSTAL', 0).res.at(-1);
  expect(a).toMatchObject({ uniq: 'T6_ARTEFACT_MAIN_SWORD_CRYSTAL', count: 1, value: 5760, returnable: false });
  expect(recipeValue(recipeOf('T6_MAIN_SWORD_CRYSTAL', 0))).toBe(7296); // 16*64 + 8*64 + 5760
});
it('ingredientValue: LEVEL sem entrada dobra por nível', () => {
  expect(ingredientValue('T3_PLANKS_LEVEL1')).toBe(16); // 8 * 2^1
  expect(ingredientValue('T4_PLANKS_LEVEL1')).toBe(32); // entrada direta em vals
  expect(ingredientValue('T9_NADA')).toBe(0);
});
it('recipeOf sem receita', () => { expect(recipeOf('T4_WOOD', 0)).toBeNull(); expect(recipeOf('XXX')).toBeNull(); });
it('nameOf / craftBonusCity', () => {
  expect(nameOf('T4_PLANKS')).toBe('Tábuas de Pinho');
  expect(nameOf('T4_WOOD_LEVEL1@1')).toBe('Troncos de Pinho Incomuns');
  expect(craftBonusCity('weapons/bow')).toBe('Lymhurst');
  expect(craftBonusCity('armors/plate_armor')).toBe('Bridgewatch');
  expect(craftBonusCity('crafting/refinedresources')).toBeNull();
});
it('resetCatalog esvazia', () => { resetCatalog(); expect(getItem('T4_PLANKS')).toBeUndefined(); expect(nameOf('T4_PLANKS')).toBe('T4_PLANKS'); });
```

- [ ] **Step 4: Rodar e ver falhar.** `npx vitest run src/lib/catalog.test.js` → falha com `setCatalog is not a function` (ou export ausente).
- [ ] **Step 5: Implementar em `catalog.js`.** Extrair o corpo do `.then((d) => {...})` para `export function setCatalog(d)` (mesmo código: `data = d`, loop com `_s` e `byId.set`) e adicionar `export function resetCatalog()`. O `.then` passa a ser `.then((d) => { setCatalog(d); return d; })`. Nenhuma outra linha muda.
- [ ] **Step 6: Rodar e ver passar.** `npx vitest run src/lib/catalog.test.js` → todos os casos passam. Se um valor esperado divergir (por exemplo `value` 12), a fixture ou o gerador está errado: corrija o gerador, não o teste (os valores acima vêm do `catalog.json` real conferido pelo Planejador).
- [ ] **Step 7: Remover `smoke.test.js`; `npm run check`** → código 0.
- [ ] **Step 8: Commit.** `test: catálogo injetável (setCatalog/resetCatalog), fixture versionada e testes de catalog.js`.

## Task 3: Testes de caracterização de `econ.js` (sem mudar `econ.js`)

**Files:** Create `client/src/lib/econ.test.js`. Nenhum arquivo de produção muda.

**Interfaces:** Consome `rrr, stationFee, netSale, buyQuote, splitUniq, refineUnit, materialPlan, refineChainIds, SETUP_FEE` de `econ.js`; `loadFixtureCatalog, mkPrices, planksSpec` de `helpers.js`.

Observação TDD: estes testes passam de primeira (caracterização do que existe). Para provar que não são vácuos, o Step 3 faz uma mutação manual.

- [ ] **Step 1: Escrever os testes.**

```js
// rrr (tabela de cenários)
const cases = [
  [{ kind: 'refine', specialty: false, focus: false }, 18 / 118],
  [{ kind: 'refine', specialty: true, focus: false }, 58 / 158],
  [{ kind: 'craft', specialty: true, focus: false }, 33 / 133],
  [{ kind: 'craft', specialty: true, focus: true }, 92 / 192],
  [{ kind: 'refine', specialty: true, focus: true }, 117 / 217],
  [{ kind: 'refine', specialty: true, focus: false, daily: 20 }, 78 / 178],
  [{ kind: 'refine', specialty: true, focus: true, daily: 20 }, 137 / 237],
  [{ kind: 'craft', specialty: false, focus: true }, 77 / 177],
];
it.each(cases)('rrr %j', (arg, esperado) => expect(rrr(arg)).toBeCloseTo(esperado, 6));
it('rrr valores literais', () => { // 0,1525 / 0,3671 / 0,2481 / 0,4792 / 0,5392 / 0,4382 / 0,5781 / 0,4350
  expect(rrr({ kind: 'refine', specialty: true, focus: false })).toBeCloseTo(0.3671, 4);
  expect(rrr({ kind: 'craft', specialty: true, focus: false })).toBeCloseTo(0.2481, 4);
});
// stationFee
expect(stationFee(16, 400)).toBe(7);   // 7,2
expect(stationFee(8, 400)).toBe(4);    // 3,6
expect(stationFee(4, 400)).toBe(2);    // 1,8
expect(stationFee(7296, 400)).toBe(3283); // 3283,2
expect(stationFee(1024, 400)).toBe(461);  // 460,8
expect(stationFee(40, 100)).toBe(5);   // 4,5 -> Math.round sobe
expect(stationFee(100, 0)).toBe(0);
// netSale (1000): order premium 935, instant premium 960, order sem premium 895, instant sem premium 920
// buyQuote: T4_WOOD Martlock s32, Thetford s28, Fort Sterling s0/b25 -> 'best' = {price 28, city 'Thetford'};
//   city 'Martlock' -> 32; useOrders com b: Martlock 20, Thetford 22 -> {price 20.5 (=20*1.025), city 'Martlock'};
//   sem preço -> {price 0, date null, city null}; datas sd/bd são devolvidas em `date`.
// splitUniq('T4_PLANKS_LEVEL1') -> {base:'T4_PLANKS', ench:1}; splitUniq('T4_PLANKS') -> {base:'T4_PLANKS', ench:0}
// refineChainIds('T4_PLANKS', true) -> ['T4_PLANKS','T4_WOOD','T3_PLANKS','T3_WOOD','T2_PLANKS','T2_WOOD']
// refineChainIds('T4_PLANKS', false) -> ['T4_PLANKS','T4_WOOD','T3_PLANKS']
```

  `refineUnit` (`ctx = { prices, city: 'best', useOrders: false, rrr: 58/158, feePer100: 400, route }`; `beforeEach(loadFixtureCatalog)`):

```js
const A = () => mkPrices(planksSpec());
it('A buy', () => {
  const u = refineUnit('T4_PLANKS', ctx(A(), 'buy'));
  expect(u.cost).toBeCloseTo(76.6203, 4); expect(u.fee).toBe(7); expect(u.missing).toEqual([]);
  expect(u.lines.map((l) => [l.mid, l.qty, l.unit, l.choice, l.refined])).toEqual([
    ['T4_WOOD', 2, 30, 'buy', false], ['T3_PLANKS', 1, 50, 'buy', true]]);
});
it('A all', () => {
  const u = refineUnit('T4_PLANKS', ctx(A(), 'all'));
  expect(u.cost).toBeCloseTo(62.3530, 4);
  expect(u.lines[1]).toMatchObject({ choice: 'make', alt: 50 });
  expect(u.lines[1].unit).toBeCloseTo(27.4578, 4);
  expect(u.lines[1].sub.lines[1]).toMatchObject({ choice: 'make', alt: 5 });
  expect(u.lines[1].sub.lines[1].unit).toBeCloseTo(7.0633, 4);
});
it('A best: faz T3, compra T2', () => {
  const u = refineUnit('T4_PLANKS', ctx(A(), 'best'));
  expect(u.cost).toBeCloseTo(61.5265, 4);
  expect(u.lines[1]).toMatchObject({ choice: 'make', alt: 50 });
  expect(u.lines[1].unit).toBeCloseTo(26.1519, 4);
  const t2 = u.lines[1].sub.lines[1];
  expect(t2).toMatchObject({ choice: 'buy', unit: 5 }); expect(t2.alt).toBeCloseTo(7.0633, 4);
});
it('B best: compra T3 a 20 (= rota buy)', () => { /* cost 57.6329; lines[1] {choice:'buy', unit:20, sub:null}; alt ≈ 26.1519; all ≈ 62.3530 */ });
it('sem T3_WOOD: all acusa, best contorna', () => { /* all: cost 50.3357, missing ['T3_WOOD']; best: cost 76.6203, missing [] */ });
it('sem T4_WOOD na rota buy', () => { /* cost 38.6456, missing ['T4_WOOD'] */ });
it('sem receita', () => expect(refineUnit('T9_PLANKS', ctx(A(), 'buy'))).toEqual({ uniq: 'T9_PLANKS', cost: 0, fee: 0, missing: ['T9_PLANKS'], lines: [] }));
it('deep legado: ctx.deep=true sem route equivale a all; sem ambos equivale a buy', () => { /* 62.3530 e 76.6203 */ });
it('materialPlan(best A, n=1000)', () => {
  const p = materialPlan(refineUnit('T4_PLANKS', ctx(A(), 'best')), 1000, 58 / 158);
  expect(p.makes.map((m) => m.mid)).toEqual(['T4_PLANKS', 'T3_PLANKS']);
  expect(p.makes[0]).toMatchObject({ qty: 1000, fee: 7000 }); expect(p.makes[1].qty).toBeCloseTo(632.9114, 4); expect(p.makes[1].fee).toBeCloseTo(2531.6456, 4);
  expect(p.buys.map((b) => [b.mid, b.unit])).toEqual([['T4_WOOD', 30], ['T3_WOOD', 15], ['T2_PLANKS', 5]]);
  expect(p.buys.map((b) => b.qty)).toEqual([expect.closeTo(1265.8228, 4), expect.closeTo(801.1537, 4), expect.closeTo(400.5768, 4)]);
});
```

  (Os comentários `/* ... */` indicam asserções a escrever com exatamente esses números; não são placeholders: os valores estão na seção Cenários.)
- [ ] **Step 2: Rodar.** `npx vitest run src/lib/econ.test.js` → todos passam.
- [ ] **Step 3: Mutação manual (não commitar).** Em `econ.js` troque `0.1125` por `0.1126`, rode o teste (deve falhar em `stationFee`/`refineUnit`), reverta com `git checkout client/src/lib/econ.js`. Repita com `+ 40` → `+ 41` no `rrr`. Ambos devem derrubar testes. Confirme `git status` sem mudança em `econ.js`.
- [ ] **Step 4: `npm run check`** → código 0.
- [ ] **Step 5: Commit.** `test: caracteriza econ.js (RRR, taxa de bancada, imposto, buyQuote, cadeia de refino, plano de materiais)`.

## Task 4: Extrair a lógica de `Crafting.jsx` para `craftPlan.js`

**Files:** Create `client/src/lib/craftPlan.js`, `client/src/lib/craftPlan.test.js`. Modify `client/src/lib/econ.js` (+`resolveRRR`), `client/src/lib/econ.test.js`, `client/src/components/Crafting.jsx`.

**Interfaces:**
- `econ.js`: `export const resolveRRR = (auto: number, raw: string|number|undefined): number` (expressão da fórmula acima).
- `craftPlan.js` exporta:
  - `keyOf(uniq): string` (igual ao do componente), `canRefineUniq(uniq): boolean`, `modeOf(refineCfg, uniq): 'buy'|'all'|'best'` (`'buy'`→buy; `'refine'|'all'`→all; resto→best).
  - `craftChainIds(rec, targetMid): string[]` (o `ids` único do componente; `[]` se `rec` nulo).
  - `craftRates(cfg, bonusCity): { specialty: boolean, crafts: number, autoRRR: number, craftRRR: number, refineRRRFor: (type: string, daily?: number) => number }`.
  - `computeCraft({ rec, targetMid, prices, cfg, premium, bonusCity }): { rates, lines, matCost, fee, totalCost, units, unitCost, missing: string[], options, best, ready, plan, used: Set<string>, refinable, allBest }`. Tudo idêntico ao que o componente calcula hoje (campos de `lines`: `{...r, rr, qty, unit, total, date, city, sub, mode, cmp, useRefine, canRefine}`; `sub0` vira função interna). `rec === null` devolve listas vazias e `ready` falsy. `prices === null` não estoura.
- Componente: `usePrices(craftChainIds(rec, targetMid))` continua antes; depois `const c = computeCraft({...})`; JSX passa a ler `c.lines`, `c.rates.craftRRR` etc. `setAllBest` e `keyOf` (importado) ficam no componente.

- [ ] **Step 1: `resolveRRR` com teste primeiro.** Em `econ.test.js`: `resolveRRR(0.3, '')`→0,3; `(0.3,'25')`→0,25; `(0.3, 25)`→0,25; `(0.3,'abc')`→0,3; `(0.3, undefined)`→0,3; `(0.3,'0')`→0 (zero é "manual", documenta o comportamento atual). Rodar → falha (`resolveRRR is not a function`). Implementar em `econ.js` → passa.
- [ ] **Step 2: Escrever `craftPlan.test.js` (falhando: módulo não existe).** `cfg` base: `{ craftCity:'Lymhurst', specialty:null, focus:false, feePer100:400, customRRR:'', matCity:'best', useOrders:false, crafts:1, refine:{}, refineFocus:false, refineFee:400, refineCity:'auto', refineDaily:{} }` (função `craftCfg(over)`). `rec = recipeOf('T4_2H_BOW')`, `targetMid='T4_2H_BOW'`, `bonusCity = craftBonusCity('weapons/bow')`. Preços do arco: `mkPrices({ ...planksSpec({ T4_PLANKS: { 'Fort Sterling': { s: 120 }, Martlock: { s: 130 } } }), T4_2H_BOW: { Lymhurst: { s: 9500 }, Caerleon: { s: 9000, b: 8000 }, 'Black Market': { b: 8500 } } })`.

```js
describe('craftRates', () => {
  it('especialização automática quando a cidade é a de bônus', () => {
    const r = craftRates(craftCfg(), 'Lymhurst');
    expect(r.specialty).toBe(true); expect(r.autoRRR).toBeCloseTo(33 / 133, 6); expect(r.craftRRR).toBeCloseTo(0.2481, 4);
  });
  it('cidade errada = sem bônus; specialty explícito vence', () => {
    expect(craftRates(craftCfg({ craftCity: 'Martlock' }), 'Lymhurst').autoRRR).toBeCloseTo(18 / 118, 6);
    expect(craftRates(craftCfg({ craftCity: 'Martlock', specialty: true }), 'Lymhurst').specialty).toBe(true);
    expect(craftRates(craftCfg({ specialty: false }), 'Lymhurst').autoRRR).toBeCloseTo(18 / 118, 6);
  });
  it('foco e RRR manual', () => {
    expect(craftRates(craftCfg({ focus: true }), 'Lymhurst').autoRRR).toBeCloseTo(92 / 192, 6);
    expect(craftRates(craftCfg({ customRRR: '30' }), 'Lymhurst').craftRRR).toBeCloseTo(0.3, 6);
    expect(craftRates(craftCfg({ customRRR: 'x' }), 'Lymhurst').craftRRR).toBeCloseTo(33 / 133, 6);
  });
  it('crafts: mínimo 1; aceita decimal (comportamento atual)', () => {
    for (const v of ['', 0, '0', -5, undefined]) expect(craftRates(craftCfg({ crafts: v }), null).crafts).toBe(1);
    expect(craftRates(craftCfg({ crafts: '1000' }), null).crafts).toBe(1000);
    expect(craftRates(craftCfg({ crafts: '2.5' }), null).crafts).toBe(2.5);
  });
  it('refineRRRFor: auto = cidade do recurso; cidade fixa só bate no recurso dela; diário soma', () => {
    const base = craftRates(craftCfg(), 'Lymhurst');
    expect(base.refineRRRFor('PLANKS')).toBeCloseTo(58 / 158, 6);
    expect(craftRates(craftCfg({ refineCity: 'Martlock' }), 'Lymhurst').refineRRRFor('PLANKS')).toBeCloseTo(18 / 118, 6);
    expect(craftRates(craftCfg({ refineCity: 'Fort Sterling' }), 'Lymhurst').refineRRRFor('PLANKS')).toBeCloseTo(58 / 158, 6);
    expect(craftRates(craftCfg({ refineDaily: { PLANKS: 20 } }), 'Lymhurst').refineRRRFor('PLANKS')).toBeCloseTo(78 / 178, 6);
    expect(craftRates(craftCfg({ refineFocus: true }), 'Lymhurst').refineRRRFor('PLANKS')).toBeCloseTo(117 / 217, 6);
  });
});
describe('computeCraft', () => {
  it('C1: 1000 arcos, planks comprado pronto', () => {
    const c = computeCraft({ rec, targetMid, prices, cfg: craftCfg({ crafts: 1000, refine: { PLANKS: 'buy' } }), premium: true, bonusCity });
    const l = c.lines[0];
    expect(l).toMatchObject({ uniq: 'T4_PLANKS', mode: 'buy', unit: 120, city: 'Fort Sterling', sub: null, useRefine: false, canRefine: true });
    expect(l.qty).toBeCloseTo(24060.1504, 4); expect(l.total).toBeCloseTo(2887218.0451, 3); expect(l.rr).toBeCloseTo(58 / 158, 6);
    expect(l.cmp).toMatchObject({ buy: 120, bestIsMake: true });
    expect(l.cmp.all).toBeCloseTo(62.353, 3); expect(l.cmp.best).toBeCloseTo(61.5265, 3);
    expect(l.cmp.d10).toBeCloseTo(57.496, 3); expect(l.cmp.d20).toBeCloseTo(54.0016, 3);
    expect(c.fee).toBe(230000); expect(c.units).toBe(1000);
    expect(c.totalCost).toBeCloseTo(3117218.0451, 3); expect(c.unitCost).toBeCloseTo(3117.218, 3);
    expect(c.options.map((o) => [o.city, o.mode])).toEqual([['Lymhurst', 'order'], ['Caerleon', 'order'], ['Black Market', 'instant'], ['Caerleon', 'instant']]);
    expect(c.best.net).toBeCloseTo(8882500, 2); expect(c.best.profit).toBeCloseTo(5765281.9549, 3); expect(c.best.margin).toBeCloseTo(184.9496, 3);
    expect(c.ready).toBeTruthy(); expect(c.missing).toEqual([]);
  });
  it('C1 sem premium', () => { /* best.net 8502500; profit 5385281.9549; margin 172.7592 */ });
  it('C2: modo best (produz T3, compra T2) e plano', () => {
    // cfg refine: { PLANKS: 'best' }, crafts 1000
    // lines[0]: useRefine true; unit ≈ 61.5265; total ≈ 1480337.2797; c.totalCost ≈ 1710337.2797
    // best.profit ≈ 7172162.7203; margin ≈ 419.3420
    // plan: kinds ['make','make','buy','buy','buy']; mids ['T4_PLANKS','T3_PLANKS','T4_WOOD','T3_WOOD','T2_PLANKS']
    //       qty ≈ [24060.1504, 15227.9433, 30455.8866, 19275.8776, 9637.9388]
    //       total ≈ [168421.0526, 60911.7731, 913676.5966, 289138.1635, 48189.6939]
    // soma dos totals do plano + c.fee ≈ c.totalCost (diferença < 0.01); c.used.has('T2_PLANKS|Fort Sterling') === true
  });
  it('C3: espada T6 com artefato (3 ingredientes), refinados em modo buy', () => {
    // rec = recipeOf('T6_MAIN_SWORD_CRYSTAL'); preços T6_METALBAR 200, T6_LEATHER 150, T6_ARTEFACT_MAIN_SWORD_CRYSTAL 90000
    // lines.map(l=>l.qty) ≈ [12.0301, 6.0150, 1]; lines[2].returnable === false; lines[0].canRefine && lines[2].canRefine === false
    // c.fee === 3283; c.totalCost ≈ 96591.2707; c.missing === []
  });
  it('C4: item sem preço', () => {
    // planksSpec({ T4_PLANKS: null }) + cfg refine {PLANKS:'buy'} -> lines[0].unit 0; missing contém 'Tábuas de Pinho'; ready falsy
    // planksSpec({ T3_WOOD: null }) + refine {PLANKS:'all'} -> missing === ['Troncos de Castanheira'] (vem do sub0), ready falsy
  });
  it('prices null (carregando) e rec null', () => {
    const c = computeCraft({ rec, targetMid, prices: null, cfg: craftCfg(), premium: true, bonusCity });
    expect(c.lines[0].unit).toBe(0); expect(c.lines[0].cmp).toBeNull(); expect(c.options).toEqual([]); expect(c.ready).toBeFalsy();
    const v = computeCraft({ rec: null, targetMid: 'X', prices: null, cfg: craftCfg(), premium: true, bonusCity: null });
    expect(v.lines).toEqual([]); expect(v.plan).toEqual([]); expect(v.totalCost).toBe(0);
  });
  it('craftChainIds', () => { /* bow: ['T4_2H_BOW','T4_PLANKS','T4_WOOD','T3_PLANKS','T3_WOOD','T2_PLANKS','T2_WOOD']; rec null -> [] */ });
  it('modeOf', () => { /* {PLANKS:'buy'}->'buy'; 'refine'->'all'; 'all'->'all'; undefined->'best' */ });
});
```

- [ ] **Step 3: Rodar e ver falhar.** `npx vitest run src/lib/craftPlan.test.js` → `Failed to resolve import "./craftPlan"` (ou equivalente).
- [ ] **Step 4: Implementar `craftPlan.js` movendo (cortar e colar) o código de `Crafting.jsx`:** linhas 24-32 (`crafts`, `autoRRR`, `craftRRR` via `resolveRRR`, `refineRRRFor`), 34-40 (`keyOf`, `canRefineUniq`, `modeOf`), 42-51 (ids), 57-100 (`lines`), 102-108 (custos e `missing`), 110-125 (`options`, `best`, `ready`), 127-144 (`plan`, `used`, `refinable`, `allBest`) e `sub0`. A semântica de `bonusCity === cfg.craftCity` e `cfg.specialty ?? ...` não muda. Nenhuma mudança de número; sem React.
- [ ] **Step 5: Rodar e ver passar.** `npx vitest run src/lib/craftPlan.test.js src/lib/econ.test.js` → tudo verde.
- [ ] **Step 6: Religar `Crafting.jsx`.** Remover o código movido; chamar `craftRates`/`computeCraft`/`craftChainIds`; imports não usados saem (o lint acusa). JSX continua igual, lendo de `c` (use `const { lines, matCost, ... } = c;` para o diff do JSX ficar mínimo).
- [ ] **Step 7: Verificação completa.** `npm run check` → lint limpo, todos os testes verdes, build ok. Depois `npm run dev`, abrir a aba Craft com o item padrão (`T6_MAIN_SWORD`), conferir no navegador (ferramenta de navegador) que a tela renderiza sem erro no console e que as seções "Materiais", "Onde vender", "Plano de compra e produção" e "Comparar rotas" aparecem; alternar "Comprar pronto / Produzir tudo / Melhor" e "Marcar melhor rota". Preços reais mudam com o tempo; o objetivo é não ter exceção nem seção faltando (os números são garantidos pelos testes).
- [ ] **Step 8: Commit.** `refactor: extrai a lógica de Crafting.jsx para lib/craftPlan.js com testes de caracterização`.

## Task 5: Extrair a lógica de `Refining.jsx` para `refinePlan.js`

**Files:** Create `client/src/lib/refinePlan.js`, `client/src/lib/refinePlan.test.js`. Modify `client/src/components/Refining.jsx`.

**Interfaces:**
- `ROUTE_ORDER = ['buy', 'all', 'best']` (ordem de `ROUTES`; rótulos e hints continuam no componente).
- `routePath(unit, tier): Array<{ tier, action: 'make'|'buy', raw?, unit?, city? }>` (movido sem alteração).
- `evaluateTier({ tier, uniq, prices, ctx, sellCity, sellMode, premium }): { tier, uniq, mid, unit, sell: {price, city, date}, mode, net, profit, margin }` (corpo de `evaluate`; `sellCity === 'best'` usa `SELL_CITIES`; `mid = marketId(uniq)`).
- `compareRoutes(uniq, ctx): { routes: Array<{ value, unit, ok }>, best: route | undefined }` (`ok = !unit.missing.length`; `best` = menor `unit.cost` entre os `ok`, **estável**: empate mantém a primeira na ordem buy, all, best).
- `pickBestTier(rows): row | undefined` (`sell.price > 0 && !unit.missing.length`, maior `profit`).
- `usedCells(unit): Set<string>` (`${mid}|${city}` das compras folha, recursivo).
- `resolveRRR` de `econ.js` substitui a expressão `custom ? ... : autoRRR` no componente.

- [ ] **Step 1: Escrever `refinePlan.test.js` (falhando).** `ctx = { prices, city:'best', useOrders:false, rrr: 58/158, feePer100:400 }`. Preços: Cenário A + T4_PLANKS `{ 'Fort Sterling': {s:120}, Martlock: {s:135}, 'Black Market': {b:140} }`.

```js
it('evaluateTier: melhor cidade de venda (Black Market, instantânea)', () => {
  const r = evaluateTier({ tier: 4, uniq: 'T4_PLANKS', prices, ctx: { ...ctx, route: 'best' }, sellCity: 'best', sellMode: 'order', premium: true });
  expect(r.sell).toMatchObject({ price: 140, city: 'Black Market' }); expect(r.mode).toBe('instant');
  expect(r.unit.cost).toBeCloseTo(61.5265, 4); expect(r.net).toBeCloseTo(134.4, 4);
  expect(r.profit).toBeCloseTo(72.8735, 4); expect(r.margin).toBeCloseTo(118.4424, 3);
});
it('evaluateTier: cidade fixa Martlock por ordem', () => { /* net 126.225; profit ≈ 64.6985 */ });
it('evaluateTier: sellMode instant usa preço de compra (b); Martlock s=135 sem b -> price 0', () => { /* sell.price 0, net 0, profit = -unit.cost, margin -100 */ });
it('evaluateTier: sem premium', () => { /* BM 140*0.92 = 128.8; profit ≈ 67.2735 */ });
it('evaluateTier: tier sem receita no catálogo (T5) não estoura', () => { /* unit.missing = ['T5_PLANKS'], unit.cost 0 */ });
it('compareRoutes A: best vence', () => {
  const { routes, best } = compareRoutes('T4_PLANKS', ctx);
  expect(routes.map((r) => r.value)).toEqual(ROUTE_ORDER);
  expect(routes.map((r) => +r.unit.cost.toFixed(4))).toEqual([76.6203, 62.353, 61.5265]); expect(best.value).toBe('best');
});
it('compareRoutes B: empate buy = best, vence a primeira (buy)', () => { /* costs [57.6329, 62.3530, 57.6329]; best.value === 'buy' */ });
it('compareRoutes com rota incompleta é excluída do best', () => { /* planksSpec({T3_WOOD:null}): all.ok false; best.value 'buy' ... */ });
it('pickBestTier: ignora linhas sem preço ou com missing', () => { /* linhas sintéticas {tier, sell:{price}, unit:{missing:[]}, profit} */ });
it('usedCells', () => { /* best A: has 'T4_WOOD|Fort Sterling','T3_WOOD|Fort Sterling','T2_PLANKS|Fort Sterling'; não tem 'T3_PLANKS|…' */ });
it('routePath best A', () => { /* [{tier:4,action:'make',raw:[T4_WOOD line]}, {tier:3,action:'make',raw:[T3_WOOD line]}, {tier:2,action:'buy',unit:5,city:'Fort Sterling'}] */ });
```

  Observação sobre o último caso: em `routePath`, o `buy` registra `tier: t - 1` do nível pai; no exemplo, o T2 comprado fica `tier: 2`. Escrever a asserção com `.map(s => [s.tier, s.action])` → `[[4,'make'],[3,'make'],[2,'buy']]`.
- [ ] **Step 2: Rodar e ver falhar** (`Failed to resolve import "./refinePlan"`).
- [ ] **Step 3: Implementar `refinePlan.js`** movendo `routePath` (linhas 19-36), o corpo de `evaluate` (70-84), o cálculo de `routes`/`bestRoute` (94-97), o `bestTier` (88) e o `walk` de `usedCells` (103-104). Sem React.
- [ ] **Step 4: Rodar e ver passar.** `npx vitest run src/lib/refinePlan.test.js`.
- [ ] **Step 5: Religar `Refining.jsx`.** `rrrValue = resolveRRR(autoRRR, cfg.customRRR)`; `evaluate = (tier) => evaluateTier({...})`; `routes = ROUTES.map(...)` usando `compareRoutes` (reanexar `label`/`hint` do `ROUTES` do componente por `value`); `bestRoute = best`; `bestTier = pickBestTier(rows)`; `usedCells`. `ROUTES` (rótulos) permanece no componente.
- [ ] **Step 6: `npm run check`** → código 0. Smoke no navegador: aba Refino, Tábua T4; conferir seções "Custo por unidade", "Melhor rota", "Comparar tiers", clique em linha de tier, troca de rota; sem erro no console.
- [ ] **Step 7: Commit.** `refactor: extrai a lógica de Refining.jsx para lib/refinePlan.js com testes de caracterização`.

## Task 6: Extrair as linhas do Flipper para `flip.js`

**Files:** Create `client/src/lib/flip.js`, `client/src/lib/flip.test.js`. Modify `client/src/components/Flipper.jsx`.

**Interfaces:** `flipRows(prices, cfg, premium, now = Date.now()): Array<{ mid, buy, sell, mode, cost, price, profit, margin, bdate, sdate }>` (o `useMemo` atual sem o `sort`; o componente ordena com `[...rows].sort(...)` dentro do mesmo `useMemo`). `now` é parâmetro para teste determinístico. `GROUPS`, `MAX_IDS` e o cálculo de `ids` ficam no componente (YAGNI).

- [ ] **Step 1: `flip.test.js` (falhando).** `now = 1_700_000_000_000`, `H = 3600000`. `prices = mkPrices({ T6_MAIN_SWORD: { Martlock: { s: 1000, sd: now-1*H, b: 900, bd: now-1*H }, Caerleon: { s: 1600, sd: now-2*H, b: 1500, bd: now-1*H }, 'Black Market': { b: 1700, bd: now-1*H } } })`. `cfg = { buyCities:['Martlock'], sellCities:['Caerleon','Black Market'], buyMode:'instant', sellMode:'any', minProfit:0, minMargin:0, maxAge:24, budget:'' }`.

```js
it('escolhe o melhor destino (BM instantânea 632)', () => {
  const [r] = flipRows(prices, cfg, true, now);
  expect(r).toMatchObject({ mid: 'T6_MAIN_SWORD', buy: 'Martlock', sell: 'Black Market', mode: 'instant', cost: 1000, price: 1700 });
  expect(r.profit).toBeCloseTo(632, 4); expect(r.margin).toBeCloseTo(63.2, 4);
});
it('só Caerleon: ordem de venda 496 vence instantânea 440', () => { /* sellCities ['Caerleon'] -> mode 'order', profit 496, margin 49.6 */ });
it('sellMode instant em Caerleon: 440; sellMode order em Black Market: nenhuma linha', () => {});
it('compra por ordem: custo 922.5 e lucro BM 709.5', () => { /* buyMode 'order' */ });
it('sem premium: BM 564', () => {});
it('dado velho some: maxAge 1 (h) com sd de 1h exatos? usar sd = now-3*H em Martlock -> sem linhas; maxAge 0 desliga o filtro', () => {});
it('budget 950 barra compra instantânea (1000) mas aceita ordem (922.5)', () => {});
it('minProfit 700 e minMargin 70 removem a linha', () => {});
it('não vende na mesma cidade em que comprou', () => { /* buyCities ['Caerleon'], sellCities ['Caerleon'] -> [] */ });
```

- [ ] **Step 2: Rodar e ver falhar; implementar `flip.js`** movendo o corpo do `useMemo` (linhas 65-99 de `Flipper.jsx`, sem `out.sort`); **rodar e ver passar.**
- [ ] **Step 3: Religar `Flipper.jsx`** (`const rows = useMemo(() => [...flipRows(scan.prices ?? {}, cfg, premium)].sort(...), [...])`; manter `if (!scan.prices) return []`).
- [ ] **Step 4: `npm run check`** → código 0. Smoke: aba Flipper, "Varrer mercado" com o padrão (rate limit da API pode atrasar; se a API recusar, registrar e seguir, os testes cobrem o cálculo).
- [ ] **Step 5: Commit.** `refactor: extrai as linhas do Flipper para lib/flip.js com testes`.

## Task 7: Fechamento (README, verificação final)

**Files:** Modify `client/README.md` (se algo mudou), `docs/manager/estado-atual.md` NÃO (é do Gerente).

- [ ] **Step 1:** `git diff master --stat` e conferir que só os arquivos da lista "Arquivos" mudaram.
- [ ] **Step 2:** `npm run check` em árvore limpa (`npm ci` antes, D-003) → código 0; anotar a contagem de testes na mensagem final ao Gerente.
- [ ] **Step 3:** `git diff master --color-moved=dimmed-zebra -- client/src/components` e conferir que o JSX não mudou além de nomes de variáveis.
- [ ] **Step 4:** garantir que o README lista os três scripts e o comando da fixture; commit `docs: ajusta README de testes` só se houver mudança.

## Riscos

1. **ESLint/React Compiler (`eslint-plugin-react-hooks` 7).** As regras novas (`purity`, `immutability`, `set-state-in-effect`, `static-components`) rodam hoje no código dos componentes e passam. Mover cálculo para `lib/` só reduz risco; o perigo é o contrário: `computeCraft` devolve `Set` e objetos novos a cada render. Hoje já era assim (nada é memoizado); **não** adicionar `useMemo`. Em `Flipper.jsx` o `Date.now()` passa a ser o default de `flipRows` (fora do componente), o que evita a regra de pureza.
2. **Vitest 5 + Vite 8:** o `peerDependencies` do pacote aceita `vite ^8`; mesmo assim a Task 1 valida com um teste real. Fallback: `vitest@^4.1.12`.
3. **`import.meta.env.BASE_URL` em `catalog.js`** só é lido dentro de `loadCatalog` (não executa nos testes). **`settings.js`** lê `localStorage` dentro de `try/catch` no import: seguro em Node (Task 1 prova).
4. **`setCatalog` muta os itens** (`_s`). Por isso `loadFixtureCatalog` clona a fixture a cada teste; sem isso, testes ficam dependentes de ordem.
5. **Fixture desatualizada:** é um corte congelado do catálogo; se `build-catalog.mjs` mudar valores, a fixture só muda quando alguém rodar o gerador (de propósito: testes estáveis). Se rodar, os números das Tasks 2 a 6 podem mudar; não há CI de drift (YAGNI).
6. **Conflito entre ideias seguintes:** `craftPlan.js`/`computeCraft` e `Crafting.jsx` viram o ponto quente (foco, diários, encantar, lote, estresse, preço-alvo). Ver "Arquivos estáveis".
7. **Ponto flutuante:** `toBeCloseTo` sempre; só `stationFee` e quantidades inteiras usam `toBe`.
8. **Comportamentos estranhos preservados de propósito** (não "consertar" neste refactor): `crafts` aceita decimal ('2.5' → 2,5); `customRRR '0'` vira RRR 0; a taxa de craft arredonda por craft antes de multiplicar; empate de rotas favorece "Comprar pronto"; `alt` da escolha não escolhida; `missing` pode ter duplicatas (o componente deduplica). Se algum for bug, vira ideia própria com teste que muda.

## Critério de pronto

- `npm run check` passa (lint limpo, todos os testes verdes, build ok) numa árvore limpa após `npm ci`.
- `npm test` roda em menos de 10 s e em ambiente `node`.
- `Crafting.jsx`, `Refining.jsx`, `Flipper.jsx` não contêm mais fórmula (`1 - rrr`, `stationFee`, `netSale`, `refineUnit`, `materialPlan`, `buyQuote`): só chamadas a `lib/` e JSX.
- Todos os números das seções "Cenários" e "RRR" estão em testes e passam sem alterar nenhuma constante de produção.
- Mutação manual da Task 3 derruba testes (prova de que não são vácuos).
- Smoke manual das abas Craft, Refino e Flipper sem erro no console.
- README em `client/README.md` explica `npm test`, `test:watch`, `check` e a fixture, com o aviso de que testes de caracterização não validam fórmulas contra o jogo.
- 6 commits (Tasks 1 a 6) mais o 7 se houver ajuste; nenhum toca arquivos fora da lista.

## Arquivos estáveis após o IDEIA-001 (para o Gerente decidir paralelismo, D-006)

- **Estáveis (só leitura para as próximas ideias):** `catalog.js` (exceto ideias de catálogo: 024, 025), `market.js` (exceto 010, 011, 012, 035, que são os donos dele), `settings.js`, `PriceMatrix.jsx`, `ItemSelector.jsx`, `ui.jsx`, `App.jsx`, `vitest.config.js`, `helpers.js`, a fixture.
- **Pontos quentes (uma ideia por vez por arquivo):** `craftPlan.js` + `Crafting.jsx` (002 foco, 003 diários, 004 fama, 007 tempo, 009 encantar, 029 lote, 030, 031, 032, 014); `econ.js` (`rrr`/`stationFee`: 019, 023, 002).
- **Podem rodar em paralelo entre si:** ideias de `refinePlan.js`/`Refining.jsx` (006, 020) × ideias de `flip.js`/`Flipper.jsx` (036, 012 parte Flipper) × ideias de `market.js` + histórico (010, 011) × ideias que criam arquivos novos (023 calculadora de RRR, 026 link, 027 histórico, 015 favoritos).
- Cada ideia futura acrescenta seus testes em arquivo `*.test.js` próprio ou no do módulo que ela possui; ninguém edita a fixture sem avisar (se precisar de item novo, acrescentar o id em `scripts/build-test-fixture.mjs` e regenerar; a regeneração só acrescenta itens).

## PERGUNTAS PARA O GERENTE

1. **Versão do Vitest:** o plano usa Vitest 5.1.0 (última, compatível com Vite 8). A alternativa conservadora é 4.1.12. Qual prefere? (Padrão do plano: 5.x, com fallback automático para 4.x se o Node não servir.)
2. **README:** o plano **substitui** o `client/README.md` (texto padrão do template Vite) por um README do projeto. Pode, ou prefere um arquivo novo em `docs/`?
3. **Flipper na IDEIA-001:** incluí `flip.js` (Task 6) por ser puro e dono de ideias futuras (010, 012, 036). Se quiser reduzir o escopo, a Task 6 pode sair sem afetar as demais.
4. **Caso de 4 ingredientes:** no catálogo real não existe espada ou armadura T6 com 4 ingredientes (o máximo é 3, com artefato; os de 4 são poções). Usei a espada T6 com artefato (3). Quer também um caso de poção T6 (4 ingredientes, `amount` 5) para testar `rec.amount > 1`? Não está no plano.
5. **CI:** fora de escopo (sem GitHub Actions). O `npm run check` é a porta; o Deployer deve rodá-lo antes do merge. Confirmar.
