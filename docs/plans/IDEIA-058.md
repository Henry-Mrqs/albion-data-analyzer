# IDEIA-058 — Comparar cidades de craft: plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-058`. Comandos `npm` em `client/`. **Pré-requisitos (assumidos mesclados):** IDEIA-001, 019, 038, 039, 041, 060, 066, 010 e 049 (a comparação usa a receita escolhida do seletor da 049). **Regra do briefing:** cada teste é escrito, **executado e visto falhar** antes de implementar.

**Objetivo:** responder "em qual cidade eu craftaria este item pelo menor custo?". O jogador presume que a cidade de bônus é sempre a melhor e esquece que o material lá pode custar mais. Uma tabela mostra, para cada cidade de craft (as 6 + Brecilien), o RRR, o material, a taxa de bancada, o custo total e a diferença para a cidade de bônus, ordenada pelo menor custo. Fonte: `docs/research/IDEIA-058.md` (K1 a K5, §4 com preços reais). Confiança: conta ALTA, preços MÉDIA. Não cria regra de jogo: recombina RRR (AUDITORIA §1), cidade por categoria (038) e taxa por cidade (019).

**Arquitetura:** módulo puro `lib/cityCompare.js` que **chama `computeCraft` uma vez por cidade** com a configuração da tela trocando só `craftCity`, `specialty`, `matCity`, `feePer100` e `customRRR`. Nenhuma fórmula de RRR, taxa ou custo é reescrita: `rrr()`, `stationFee`/`roundFee`, `buyQuote`, a cidade de bônus por `craftBonusCity(item)` (038) e o bônus diário efetivo (041) vêm do que já existe. O componente `CityCompare.jsx` só apresenta e guarda o cenário e as taxas por cidade.

## Dois cenários (dossiê K4)
- **(a) "Comprar na própria cidade":** `matCity = cidade` (sem transporte). Cidade sem preço de algum material fica **incompleta**, nunca com custo 0 (K5): a linha mostra "sem preço de <material>" e vai para o fim da tabela. **Brecilien** não faz parte das cidades que o app consulta (`CITIES`/`SELL_CITIES` de `market.js`), logo no cenário (a) ela sempre aparece "sem preços (cidade não consultada)"; incluir Brecilien nos preços é a IDEIA-025, fora de escopo.
- **(b) "Comprar na mais barata":** `matCity = 'best'` (já existe no Craft); só RRR e taxa mudam entre as cidades; ignora peso, transporte e risco (IDEIA-017/018/044). Brecilien entra normalmente (é só o RRR).

## O que é ignorado de propósito na comparação (e dito na tela)
`cfg.specialty` (o interruptor manual), `cfg.customRRR` (RRR manual) e `cfg.craftCity` valem **só para a cidade escolhida na tela**; na tabela a especialização vem da regra do item (`specialty: null` → `craftBonusCity(item) === cidade`) e o RRR manual é desligado, senão todas as cidades dariam o mesmo RRR e a comparação não faria sentido. Foco, bônus diário efetivo, rotas de refino, ordens de compra, nº de crafts e a receita escolhida (049) valem para todas.

## Taxa de bancada por cidade (obrigatória para valer; D-008, K3)
Não existem presets por cidade (IDEIA-019/D-010). A tabela tem um campo de taxa **por cidade**; **vazio = usa a taxa geral** da tela (`cfg.feePer100`). Cada valor digitado passa por `validateInputs` (060): negativo → 0, acima do teto → teto, com aviso sob o campo. Avisos fixos acima da tabela: (i) nenhuma taxa por cidade preenchida e a taxa geral ainda é o padrão do app (`feeIsUnconfirmedDefault`, 019): "usando 400 do app em todas as cidades: informe a taxa de cada bancada; sem isso a comparação não vale"; (ii) nenhuma preenchida e a geral confirmada: "mesma taxa em todas as cidades"; (iii) alguma preenchida: nada. O dossiê §7 explica o motivo: uma taxa diferente por cidade pode inverter o empate (exemplo testado abaixo).

## Arquivos: exclusivos, compartilhados, ordem

**Criados:** `client/src/lib/cityCompare.js`, `client/src/lib/cityCompare.test.js`, `client/src/components/CityCompare.jsx`, e **só se a IDEIA-069 já estiver mesclada** `client/src/components/CityCompare.test.jsx`.
**Alterados:** `client/src/components/Crafting.jsx` (1 import e 1 elemento, depois do cartão "Comparar rotas dos materiais refinados"; dois campos novos em `craft:cfg`: `cityScenario` e `feeByCity`).
**NÃO toca:** `craftPlan.js`, `econ.js`, `inputRules.js`, `catalog.js`, `market.js`, `exits.js`, `build-catalog.mjs`, `catalog.json`, fixture, `Refining.jsx`, `refinePlan.js`. A comparação **herda** qualquer mudança futura de `computeCraft` (por exemplo as despesas extras da 048) sem edição.
**Compartilhados:** só `Crafting.jsx` (a 048 acrescenta cartão, linhas de tabela e coluna "sem imposto"; regiões distintas) e, se a 069 estiver mesclada, os testes de `Crafting.test.jsx` (devem continuar verdes). **Ordem recomendada:** 069 → **058** → 048 (a 058 é só aditiva; pode rodar em paralelo com a 069 se o teste de componente ficar para depois).

## Interfaces (`cityCompare.js`)

```js
compareCraftCities({ rec, targetMid, prices, cfg, premium, bonusCity, feeCeiling, scenario = 'best', feeByCity = {}, cities = CRAFT_CITIES }):
  { rows: Row[], best: Row | null, spread: number | null, issues: Issue[] }
Row = { city, isBonus, specialty, rrr, matCost, fee, totalCost: number|null, unitCost: number|null,
        complete, missing: string[], feeSource: 'city'|'general', deltaVsBonus: number|null, deltaVsBest: number|null }
// rows: completas primeiro, por totalCost crescente (empate: ordem de CRAFT_CITIES); incompletas depois, na ordem de CRAFT_CITIES, com totalCost/unitCost/delta = null
// best = primeira completa; spread = maior − menor totalCost entre as completas (null se < 2)
// scenario 'own' => matCity = cidade; 'best' => matCity 'best'
// issues: avisos de validateInputs para feeByCity (campo `feeByCity.<cidade>`)
```
`computeCraft` é chamado com `{ ...cfg, craftCity: city, specialty: null, matCity, feePer100, customRRR: '' }`; `rec`, `targetMid`, `prices`, `premium`, `bonusCity` e `feeCeiling` iguais aos da tela. `deltaVsBonus = totalCost − totalCost(cidade de bônus)` (null se o item não tem cidade de bônus ou a dela está incompleta).

## Onde aparece e UI

Aba **Craft**, novo cartão **"Comparar cidades de craft"** (abaixo de "Comparar rotas"): alternância "Comprar na própria cidade / Comprar na mais barata"; tabela ordenada com **Cidade (selo "bônus")**, **RRR**, **Material**, **Taxa** (campo editável por cidade, vazio = geral), **Custo total**, **Por unidade** e **Diferença para a cidade de bônus**; a melhor linha em verde.
Linhas sem preço aparecem no fim em cinza, "sem preço de Couro Endurecido" (ou "cidade não consultada" para Brecilien no cenário da própria cidade). Acima da tabela, o aviso da taxa (casos i e ii) e a frase "Compara só o custo de produzir; não inclui transporte, peso nem risco da rota." O cartão some sem receita ou sem preços.

## Tasks (1 commit cada; testes primeiro, vistos falhar)

### Task 1: comparação pura (`cityCompare.js`), números do dossiê §4
**Files:** Create `cityCompare.test.js`, `cityCompare.js`.
- [ ] **Step 1: testes falhando** (`Failed to resolve import "./cityCompare"`). Fixture (`beforeEach(loadFixtureCatalog)`): `T4_MAIN_SWORD` (16 `T4_METALBAR` + 8 `T4_LEATHER`, valor 384); preços **reais do dossiê** (API West, 2026-11-18), venda mínima por cidade:

```js
const PRICES = mkPrices({
  T4_METALBAR: { Lymhurst: { s: 267 }, 'Fort Sterling': { s: 220 }, Martlock: { s: 267 }, Thetford: { s: 248 }, Bridgewatch: { s: 301 }, Caerleon: { s: 410 } },
  T4_LEATHER:  { Lymhurst: { s: 322 }, 'Fort Sterling': { s: 319 }, Martlock: { s: 339 }, Thetford: { s: 337 }, Bridgewatch: { s: 363 } },   // Caerleon sem preço
});
const item = getItem('T4_MAIN_SWORD');
const base = { rec: recipeOf('T4_MAIN_SWORD'), targetMid: 'T4_MAIN_SWORD', prices: PRICES, premium: true, bonusCity: craftBonusCity(item), feeCeiling: 1000 };
const cfg = (o = {}) => craftCfg({ feePer100: 500, refine: { METALBAR: 'buy', LEATHER: 'buy' }, ...o });   // taxa 500 → 384 × 0,1125 × 5 = 216 em todas
const by = (rows) => Object.fromEntries(rows.map((r) => [r.city, r]));
```
  Casos (dossiê §4; `toBeCloseTo(x, 2)`):

```js
it('premissa do dossiê: a cidade de bônus da espada é Lymhurst (lida do catálogo, não escrita na lib)', () => expect(base.bonusCity).toBe('Lymhurst'));
it('cenário (a), cada cidade com o material da própria cidade', () => {
  const { rows, best, spread } = compareCraftCities({ ...base, cfg: cfg(), scenario: 'own' }); const r = by(rows);
  expect(r.Lymhurst.matCost).toBeCloseTo(5148.87, 2); expect(r.Lymhurst.totalCost).toBeCloseTo(5364.87, 2);        // 6.848 × 0,751880 + 216
  expect(r['Fort Sterling'].totalCost).toBeCloseTo(5361.76, 2);                                                       // 6.072 × 0,847458 + 216
  expect(r.Thetford.totalCost).toBeCloseTo(5863.46, 2); expect(r.Martlock.totalCost).toBeCloseTo(6134.64, 2); expect(r.Bridgewatch.totalCost).toBeCloseTo(6758.37, 2);
  expect(rows.map((x) => x.city)).toEqual(['Fort Sterling', 'Lymhurst', 'Thetford', 'Martlock', 'Bridgewatch', 'Caerleon', 'Brecilien']);   // as incompletas por último
  expect(best.city).toBe('Fort Sterling'); expect(spread).toBeCloseTo(1396.61, 2); });                              // 6.758,37 − 5.361,76
it('RRR por cidade: 33/133 na de bônus e 18/118 nas outras (K1)', () => { const r = by(compareCraftCities({ ...base, cfg: cfg(), scenario: 'own' }).rows); expect(r.Lymhurst.rrr).toBeCloseTo(0.248120, 6); expect(r['Fort Sterling'].rrr).toBeCloseTo(0.152542, 6); expect(r.Lymhurst.isBonus).toBe(true); });
it('a cidade sem bônus empata com a de bônus: diferença de 3,11 por craft', () => { const r = by(compareCraftCities({ ...base, cfg: cfg(), scenario: 'own' }).rows); expect(r['Fort Sterling'].deltaVsBonus).toBeCloseTo(-3.11, 2); expect(r.Lymhurst.deltaVsBonus).toBe(0); });
it('K5: cidade sem preço de algum material é incompleta, nunca custo 0', () => {
  const r = by(compareCraftCities({ ...base, cfg: cfg(), scenario: 'own' }).rows);
  expect(r.Caerleon).toMatchObject({ complete: false, totalCost: null, unitCost: null, deltaVsBonus: null }); expect(r.Caerleon.missing).toHaveLength(1);   // o couro
  expect(r.Brecilien).toMatchObject({ complete: false, totalCost: null }); });                                                 // Brecilien não consultada
it('cenário (b), material da cidade mais barata (Fort Sterling, bruto 6.072)', () => {
  const r = by(compareCraftCities({ ...base, cfg: cfg(), scenario: 'best' }).rows);
  expect(r.Lymhurst.totalCost).toBeCloseTo(4781.41, 2);                                                                    // 6.072 × 0,751880 + 216
  for (const c of ['Fort Sterling', 'Thetford', 'Martlock', 'Bridgewatch', 'Caerleon', 'Brecilien']) expect(r[c].totalCost).toBeCloseTo(5361.76, 2);   // 6.072 × 0,847458 + 216
  expect(r['Fort Sterling'].deltaVsBonus).toBeCloseTo(580.35, 2); });                                                       // 6.072 × (0,248120 − 0,152542)
```
  Mais casos: **taxa por cidade inverte o empate** (derivado, dossiê §7): `feeByCity: { 'Fort Sterling': 1000 }` → FS = 6.072 × 0,847458 + 432 = **5.577,76**, e `best.city` passa a `Lymhurst` (5.364,87); `feeSource` é `'city'` só em FS; vazio = taxa geral (216) nas outras; valor 5000 → 1000 com `issues[0].field === 'feeByCity.Fort Sterling'`; −10 → 0 com `error`; `''`/`undefined` nunca viram 400 (o 400 da 060 é só do campo geral). **Especialização e RRR manual ignorados:** `cfg({ specialty: false, customRRR: '30', craftCity: 'Martlock' })` não muda nenhuma linha. **Foco** (`focus: true`): Lymhurst 92/192 e as outras 77/177; **diário** (`craftDaily: 20`): 112/212 e 38/138 (sempre via `rrr()`). **Item sem cidade de bônus** (`T4_ARMOR_PLATE_ROYAL`): todas as cidades com o mesmo RRR 18/118, `isBonus` falso em todas, `deltaVsBonus` nulo. **Item de Brecilien** (`T4_BAG`): no cenário (b) Brecilien tem 33/133 e é a de bônus; no (a) fica incompleta. **Sem preços** (`prices: null`) e **sem receita** (`rec: null`): linhas todas incompletas/`[]`, sem exceção. **Reuso:** `rows[i].totalCost` é igual ao `totalCost` de `computeCraft` chamado à mão com a mesma configuração (a lib não recalcula nada).
- [ ] **Step 2:** `npx vitest run src/lib/cityCompare.test.js` → FAIL. **Step 3:** implementar (uma chamada de `computeCraft` por cidade; ordenação estável; `validateInputs` só para taxas não vazias). **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: compareCraftCities, custo de craft em cada cidade com taxa por cidade`.

### Task 2: cartão e integração no Craft
**Files:** Create `components/CityCompare.jsx`; Modify `Crafting.jsx`.
- [ ] **Step 1:** `CityCompare({ result, scenario, onScenario, feeByCity, onFee, general: { value, touched }, units })`, só apresentação (tabela, campos de taxa com `InputIssues` por campo, avisos i e ii, linha incompleta em cinza). Em `Crafting.jsx`: `const compare = rec && prices ? compareCraftCities({ rec, targetMid, prices, cfg: cfgEff, premium, bonusCity, feeCeiling, scenario: cfg.cityScenario ?? 'best', feeByCity: cfg.feeByCity ?? {} }) : null;` e `{compare && <CityCompare … />}` (`rec` e `cfgEff` são os que a tela já usa; `cityScenario` padrão `'best'` por não exigir preço em cada cidade).
- [ ] **Step 2:** `npm run check`; smoke (`npm run dev`, aba Craft, `T4_MAIN_SWORD`): as 7 cidades; o cenário (a) deixa Brecilien e cidades sem preço no fim; digitar uma taxa numa cidade reordena a tabela; o aviso (i) aparece com a taxa 400 ainda padrão. **Step 3: Commit:** `feat: cartão Comparar cidades de craft`.

### Task 3 (só se a 069 já estiver mesclada): teste de componente
**Files:** Create `CityCompare.test.jsx`. Casos: com o resultado do Task 1 (cenário a): a primeira linha é "Fort Sterling" e mostra a diferença com `Money signed` ("-3", arredondada; o valor exato -3,11 é do teste de lib); as linhas incompletas mostram "sem preço" e **nenhum** "0" como custo; o aviso (i) aparece com `touched=false` e some com `touched=true`; digitar no campo de uma cidade chama `onFee('Fort Sterling', '1000')`. **Mutações a derrubar:** mostrar `0` no lugar de "sem preço"; ordenar incompletas antes; inverter `touched`; não repassar o valor do campo. **Commit:** `test: cartão Comparar cidades (componente)`.

## Como o Tester valida (recalcular sem importar `econ.js`)

1. **Cenário (a) do dossiê §4** (barra e couro por cidade; taxa 500 → 216; RRR da cidade de bônus 33/133 = 0,248120 (fator `0,751880`), demais 18/118 = 0,152542 (fator `0,847458`)): Lymhurst 6.848 × 0,751880 = **5.148,87** → **5.364,87**; Fort Sterling 6.072 × 0,847458 = **5.145,76** → **5.361,76**; Thetford 6.664 → **5.863,46**; Martlock 6.984 → **6.134,64**; Bridgewatch 7.720 → **6.758,37**; Caerleon incompleta (sem preço de couro). Diferença FS × Lymhurst **3,11**; erro máximo de quem presume "Lymhurst sempre": **1.396,61** (Bridgewatch × FS).
2. **Cenário (b):** bruto 6.072 (FS): Lymhurst **4.781,41**; as outras **5.361,76**; vantagem **580,35** (= 6.072 × (0,248120 − 0,152542)). Brecilien entra só aqui.
3. **Dados ao vivo:** consultar a API no dia (`T4_METALBAR`, `T4_LEATHER`, `T4_MAIN_SWORD`) e conferir ordenação e valores com script próprio; os preços do dossiê são de 2026-11-18 e vão mudar.
4. **Taxa por cidade:** FS com 1.000 → 5.577,76 e a vencedora vira Lymhurst; campo vazio usa a geral; 5000 vira 1.000 com aviso; sem nenhuma preenchida e com 400 padrão o aviso "valor padrão" aparece.
5. **Regra de bônus (038) e diário (041):** item de Brecilien (bolsa) tem RRR 33/133 em Brecilien; item Royal sem cidade de bônus; foco e diário somam em todas as cidades; interruptor "bônus de especialização" e RRR manual da tela **não** afetam a tabela.
6. **Regressão:** o resto do Craft idêntico (diferencial com `master`: nenhum número fora do cartão novo muda; `craftPlan.js` byte a byte igual).
7. **O que um jogador experiente estranharia:** cidade sem preço com custo 0 ou na frente da tabela; todas as cidades com o mesmo RRR; Brecilien com preços no cenário (a); a cidade de bônus marcada em cidade errada (038); taxa por cidade que "vaza" para a taxa geral; comparação mudando só por trocar a cidade escolhida na tela; o aviso de taxa padrão ausente.

## Riscos

1. **Preços esparsos e idade de até 8 h** (dossiê §7): a tabela herda a idade dos preços (o Craft já mostra); cidade com preço velho pode parecer a melhor por acaso.
2. **Brecilien sem preços** (fora de `SELL_CITIES`): limitação declarada na tela; resolve com a IDEIA-025.
3. **Custo de CPU:** 7 chamadas a `computeCraft` por renderização (cada uma refaz as rotas de refino); aceitável (milissegundos), medir no Tester; memoização só se medir lento.
4. **A taxa por cidade continua sendo input do usuário** (D-008): se o usuário não preencher, a tabela compara RRR e material com a mesma taxa, o que o aviso diz.
5. Conflito textual com a 048 em `Crafting.jsx`: regiões distintas.

## Critério de pronto

`npm run check` verde; todos os casos do dossiê §4 em teste; nenhuma fórmula de RRR/taxa/custo em `cityCompare.js` (`grep` por `rrr(`, `0.1125`, `stationFee`, `1 - `: só chamadas a `computeCraft`); cartão visível e correto; só os arquivos listados alterados.

## PERGUNTAS PARA O GERENTE

1. **Taxa por cidade "obrigatória":** o plano **avisa** (não bloqueia) quando só há a taxa geral, coerente com a política da 060. O dossiê diz "obrigatório para a comparação valer". Aceita o aviso forte, ou quer a tabela escondida até haver pelo menos uma taxa por cidade preenchida?
2. **Brecilien nos preços:** só o cenário (b) cobre Brecilien. Quer abrir antes a IDEIA-025 (consultar Brecilien no AODP) ou aceita a limitação?
3. **Lucro por cidade:** a tabela compara **custo**, como o dossiê. O destino de venda não depende da cidade de craft; aceita deixar lucro fora?
4. A comparação ignora o interruptor de especialização e o RRR manual da tela (explicado no cartão). Confirma?
