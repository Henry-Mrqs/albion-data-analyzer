# IDEIA-060 — Validação das entradas pelas faixas do jogo: plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-060`. Comandos `npm` em `client/`. **Pré-requisito:** IDEIA-001, 019, 023 e 030 mescladas (o plano usa `FeeField`, `lotFee`, `rrrCalc.js`, `RrrCalculator.jsx`, `targetPrice.js`, `TargetPrice.jsx` como estão nas branches aprovadas). Se a 041 já estiver mesclada, `craftDaily` também é validado (ver Task 2); se não, o código ignora a chave ausente.

**Objetivo:** nenhum campo livre produz resultado absurdo calado. Valor fora da faixa do jogo gera **aviso visível**, e o cálculo usa o **valor corrigido que a tela mostra** (nunca o número digitado quando ele é impossível). Uma função pura única de validação, usada por Craft, Refino, aba RRR e preço-alvo.

**Arquitetura:** `lib/inputRules.js` exporta `validateInputs(input, ctx)` (regras V1 a V6 do dossiê) e dois adaptadores finos, `cleanCraftCfg` e `cleanRefineCfg`, que só mapeiam a configuração das telas para essa função e devolvem uma cópia **limpa** da configuração (mesmos nomes de chave, valores corrigidos). `computeCraft` limpa a configuração na entrada (a lib se defende sozinha) e devolve `issues`; as telas mostram os avisos com um componente `InputIssues`. `targetPrice` passa a recusar `mode` e `relists` inválidos na própria lib (retorna `null`).

**Spec:** `docs/research/IDEIA-060.md` (§2 V1 a V8, §4 tabela, §5 encaixe) mais os achados dos Testers: `docs/manager/decisoes.md` D-015 (RRR manual vazio/`' '`, 150%, `crafts=Infinity`, taxa negativa), D-019 item 2 (relistagens negativas/decimais, modo inválido), D-020 itens 1 e 4 (N=1e308, N≤0/vazio silencioso, mutação `floor`×`round`) e `docs/qa/IDEIA-023.md` observações A e B, `docs/qa/IDEIA-030.md` §6 e observação 2.

## Arquivos: exclusivos, compartilhados, ordem

**Exclusivos da 060:** `client/src/lib/inputRules.js`, `client/src/lib/inputRules.test.js`, `client/src/components/InputIssues.jsx` (novos); `client/src/lib/rrrCalc.js` e `rrrCalc.test.js`; `client/src/components/RrrCalculator.jsx`; `client/src/lib/targetPrice.js` e `targetPrice.test.js`; `client/src/components/FeeField.jsx`; `client/src/lib/settings.js` (um campo novo em `DEFAULTS`).
**Compartilhados com a 066:** `client/src/components/TargetPrice.jsx` (060 mexe no **topo**: `relists`/`mode`/`profit`/`margin`; 066 troca o bloco de **referência de mercado** no fim: regiões distintas) e `client/src/components/Crafting.jsx` (060: campos de entrada e avisos; 066: tabela "Onde vender" e cartão "melhor destino": regiões distintas).
**Compartilhados com o grupo ECON (019 → 041):** `client/src/lib/craftPlan.js` (060 só acrescenta a limpeza no início de `computeCraft` e `issues` no retorno; 041 mexe em `craftRates` e `waitSavings`) e `craftPlan.test.js`. **Se a 041 ainda não estiver mesclada, não há conflito; se estiver, rebase simples.**
**Compartilhado com a 038 (catálogo):** `rrrCalc.js`/`RrrCalculator.jsx` (a 038 altera `isSpecialty`/seletor de categoria; 060 altera só `recipeReturn` e o campo "Nº de crafts"): regiões distintas.
**NÃO toca:** `econ.js` (o `resolveRRR` continua; a limpeza acontece antes dele), `catalog.js`, `build-catalog.mjs`, fixture, `refinePlan.js`, `market.js`, `Flipper.jsx`.
**Ordem recomendada 060 × 066:** 060 primeiro (muda contratos de entrada de `computeCraft` e `targetPrice`; a 066 só lê opções e preços), mas **podem rodar em paralelo** sem conflito de lógica; os dois pontos de contato textual são os componentes acima.

## Constantes e faixas (somente as do dossiê)

| Regra | Valor | Origem |
|---|---|---|
| V1 teto da taxa de bancada | **1.000** por 100 de nutrição, **configurável** (`settings.feeCeiling`, padrão 1.000) | dossiê V1 (MÉDIA) |
| V2 bônus diário | **0, 10 ou 20** | dossiê V2 (MÉDIA) |
| V3 RRR máximo manual | refino **57,81%** e craft **52,83%**, **calculados** por `rrr({specialty:true, focus:true, daily:20})`, nunca escritos | dossiê V3 / AUDITORIA §1 |
| V4 RRR impossível | `< 0` ou `>= 100` (%) | dossiê V4 (álgebra) |
| V5 taxa 0 | válida, sem aviso | dossiê V5 |
| V6 crafts | inteiro `>= 1` | dossiê V6 |
| V8 padrão do app | `DEFAULT_FEE_PER_100 = 400` (já existente nas telas; não é dado do jogo) | dossiê V8 / IDEIA-019 |
| máx. de relistagens | **derivado**: maior `n` com `netSale(1,'order',premium) − n × SETUP_FEE > 0` (37 com premium, 35 sem) | `econ.js`, sem constante nova |
| teto técnico de quantidade | `MAX_QTY = 1e9` (**não é regra do jogo**; evita `∞`/`NaN`, sugerido pelo Tester da 023) | **depende de aprovação**, pergunta 1 |

## Interface (`inputRules.js`)

```js
validateInputs(input, ctx = {}) -> { values, issues }
// input (todos opcionais): { feePer100, customRRR /* % */, daily, crafts, relists, mode }
// ctx: { kind: 'craft'|'refine' (padrão 'craft', o teto mais baixo), premium, feeCeiling = 1000, maxQty = MAX_QTY }
// values: { feePer100: número em [0, teto]; customRRR: fração em [0, máx] ou null (= usar o automático);
//           daily: 0|10|20; crafts: inteiro em [1, maxQty]; relists: inteiro em [0, máxRelists]; mode: 'order'|'instant'|null }
// issues: [{ field, level: 'info'|'warn'|'error', code, msg, raw, used }]   // msg em português, já com o valor usado

cleanCraftCfg(cfg, ctx)  -> { cfg, issues }   // corrige feePer100, refineFee, crafts, customRRR (string em %, '' = automático), refineDaily[tipo], craftDaily (se existir)
cleanRefineCfg(cfg, ctx) -> { cfg, issues }   // corrige feePer100, customRRR, daily, qty
```
Regras de `validateInputs` (todas testadas): vazio = `null`, `undefined` ou string só com espaços; texto é convertido com `Number(String(raw).trim())`; **idempotente** (validar os `values` de novo não gera aviso, exceto o informativo).
- **taxa:** vazio → 400 (`info` "campo vazio: usando 400, padrão do app"); não numérico → 400 (`error`); `< 0` → 0 (`error`); `> teto` → teto (`warn`); `0` válido sem aviso; `Infinity` → teto (`warn`).
- **RRR manual (%):** vazio/espaços/`null` → `null` sem aviso; não numérico → `null` (`warn`); `< 0` ou `>= 100` → `null` (`error`, V4: usa o automático); `> máximo` (comparado em 2 casas: 57,81 e 52,83 passam; 57,82 e 52,84 não) → o máximo (`warn`); `0` é aceito (manual explícito).
- **diário:** vazio → 0; fora de {0,10,20} → 0 (`error`).
- **crafts / qty:** vazio → 1 (`warn`, "campo vazio: usando 1"); `<= 0` ou não numérico → 1 (`error`); decimal → `floor` (`error`: 2,5 → 2); `> maxQty` ou `Infinity` → `maxQty` (`warn`).
- **relistagens:** vazio → 0; negativa ou não numérica → 0 (`error`); decimal → `floor` (`warn`); acima do máximo derivado → o máximo (`warn`).
- **modo:** diferente de `'order'`/`'instant'` → `null` (`error`).

## Onde aparece e UI

- **Craft, Refino, aba RRR e Preço-alvo:** sob o campo corrigido aparece uma linha curta (amarela para `warn`, vermelha para `error`, cinza para `info`) com o valor realmente usado, ex.: "Taxa 5.000 acima do teto de 1.000: usando 1.000." ou "Nº de crafts −5 é inválido: usando 1.". O campo continua mostrando o que o usuário digitou (para não brigar com a digitação), mas a linha diz o valor em uso.
- Na taxa acima do teto, a linha traz o botão **"Aceitar 5.000 como novo teto"** (grava `feeCeiling`; cobre a mudança do jogo prevista na dossiê §7).
- No cabeçalho do resultado (Craft e Refino) um selo "N valores corrigidos" some quando não há correção. Nenhum número `∞` ou `NaN` aparece em tela.

## Tasks (1 commit cada; testes primeiro)

### Task 1: `validateInputs` (tabela do dossiê §4 e achados dos Testers)
**Files:** Create `inputRules.test.js`, `inputRules.js`; Modify `settings.js` (`DEFAULTS.feeCeiling = 1000`).
- [ ] **Step 1: testes falhando** (módulo inexistente). Casos (todos com `validateInputs`; `lvl`/`used` conferem o primeiro `issue`):

```js
const v = (input, ctx) => validateInputs(input, ctx);
describe('dossiê §4', () => {
  it('taxa 5.000 → aviso, usa 1.000 (efeito: valor 384 → 2.160 sem correção, 432 com)', () => {
    const r = v({ feePer100: 5000 }); expect(r.values.feePer100).toBe(1000); expect(r.issues[0]).toMatchObject({ field: 'feePer100', level: 'warn' });
    expect(stationFee(384, r.values.feePer100)).toBeCloseTo(432, 6); expect(stationFee(384, 5000)).toBeCloseTo(2160, 6); });
  it('taxa 0 válida, sem aviso', () => { const r = v({ feePer100: 0 }); expect(r.values.feePer100).toBe(0); expect(r.issues).toEqual([]); });
  it('RRR 60 no craft → aviso, usa 52,83%', () => { const r = v({ customRRR: 60 }, { kind: 'craft' }); expect(r.values.customRRR).toBeCloseTo(0.5283, 4); expect(r.issues[0].level).toBe('warn'); });
  it('RRR 55 no refino → aceito', () => { const r = v({ customRRR: 55 }, { kind: 'refine' }); expect(r.values.customRRR).toBeCloseTo(0.55, 9); expect(r.issues).toEqual([]); });
  it('máximos vêm de rrr(): 57,81 refino e 52,83 craft passam; +0,01 não', () => {
    expect(v({ customRRR: 57.81 }, { kind: 'refine' }).issues).toEqual([]); expect(v({ customRRR: 57.82 }, { kind: 'refine' }).issues[0].level).toBe('warn');
    expect(v({ customRRR: 52.83 }, { kind: 'craft' }).issues).toEqual([]); expect(v({ customRRR: 52.84 }, { kind: 'craft' }).issues[0].level).toBe('warn'); });
  it.each([100, -5, 150])('RRR %s → erro e usa o automático (null)', (x) => { const r = v({ customRRR: x }, { kind: 'craft' }); expect(r.values.customRRR).toBeNull(); expect(r.issues[0].level).toBe('error'); });
  it('diário 15 → erro, usa 0; 0/10/20 aceitos', () => { expect(v({ daily: 15 }).values.daily).toBe(0); expect(v({ daily: 15 }).issues[0].level).toBe('error'); for (const d of [0, 10, 20]) expect(v({ daily: d }).issues).toEqual([]); });
  it('crafts 0 → 1; 2,5 → 2; ambos erro', () => { expect(v({ crafts: 0 }).values.crafts).toBe(1); expect(v({ crafts: 2.5 }).values.crafts).toBe(2); expect(v({ crafts: 2.5 }).issues[0].level).toBe('error'); });
  it('taxa vazia → 400 informativo (V8)', () => { const r = v({ feePer100: '' }); expect(r.values.feePer100).toBe(400); expect(r.issues[0].level).toBe('info'); });
});
describe('achados dos Testers', () => {
  it('RRR manual "  " ou null vira automático (antes: 0)', () => { for (const x of ['', ' ', '   ', null, undefined]) expect(v({ customRRR: x }).values.customRRR).toBeNull(); });
  it('crafts Infinity e 1e308 → teto técnico, sem ∞', () => { for (const x of [Infinity, 1e308, '1e308']) { const r = v({ crafts: x }); expect(r.values.crafts).toBe(1e9); expect(r.issues[0].level).toBe('warn'); } });
  it('taxa −400 → 0 (antes: taxa negativa)', () => { const r = v({ feePer100: -400 }); expect(r.values.feePer100).toBe(0); expect(r.issues[0].level).toBe('error'); });
  it('N: vazio, 0, −5, texto → 1 com aviso; 2,7 → 2 e 2,5 → 2 (floor, não round)', () => { for (const x of ['', 0, -5, 'abc']) expect(v({ crafts: x }).values.crafts).toBe(1); expect(v({ crafts: 2.7 }).values.crafts).toBe(2); expect(v({ crafts: 2.5 }).values.crafts).toBe(2); });
  it('relistagens: −3 → 0 (erro); 2,7 → 2 (aviso); limite derivado 37 premium e 35 sem', () => {
    expect(v({ relists: -3 }, { premium: true }).values.relists).toBe(0); expect(v({ relists: 2.7 }, { premium: true }).values.relists).toBe(2);
    expect(v({ relists: 99 }, { premium: true }).values.relists).toBe(37); expect(v({ relists: 99 }, { premium: false }).values.relists).toBe(35); });
  it('modo inválido → null (erro)', () => { expect(v({ mode: 'foo' }).values.mode).toBeNull(); expect(v({ mode: 'order' }).values.mode).toBe('order'); });
  it('idempotência: validar os valores já corrigidos não gera aviso (exceto info)', () => { /* 200 entradas sorteadas com semente fixa */ });
  it('teto configurável', () => expect(v({ feePer100: 5000 }, { feeCeiling: 10000 }).values.feePer100).toBe(5000));
});
```
  Contas do dossiê (§4): máximo craft PB 18+15+59+20 = 112 → 112/212 = 0,52830; refino 18+40+59+20 = 137 → 137/237 = 0,57806; taxa 5.000 sobre valor 384: 384 × 0,1125 × 50 = **2.160** (contra 216 a taxa 500). Limite de relistagens: 0,935 − 37 × 0,025 = 0,010 > 0 e 0,935 − 38 × 0,025 < 0; sem premium 0,895 − 35 × 0,025 = 0,020 > 0 e 36 não.
- [ ] **Step 2:** `npx vitest run src/lib/inputRules.test.js` → FAIL (`Failed to resolve import "./inputRules"`).
- [ ] **Step 3:** implementar `validateInputs` (RRR máximo por `rrr()` de `econ.js`, relistagens por `netSale`/`SETUP_FEE`; comparação do máximo em 2 casas). **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: validateInputs com as faixas do jogo (taxa, RRR manual, diário, crafts, relistagens)`.

### Task 2: adaptadores e `computeCraft` blindado
**Files:** Modify `inputRules.js`, `inputRules.test.js`, `craftPlan.js`, `craftPlan.test.js`.
- [ ] **Step 1: testes falhando** (`craftCfg`/`base` como nos testes da 019; item `T6_MAIN_SWORD`, `specialty: true`, refino em modo `buy`):

```js
it('cleanCraftCfg: corrige sem mutar a original', () => {
  const raw = craftCfg({ feePer100: -400, refineFee: 5000, crafts: Infinity, customRRR: ' ', refineDaily: { PLANKS: 15 } });
  const { cfg, issues } = cleanCraftCfg(raw, {}); expect(cfg).toMatchObject({ feePer100: 0, refineFee: 1000, crafts: 1e9, customRRR: '', refineDaily: { PLANKS: 0 } });
  expect(raw.feePer100).toBe(-400); expect(issues.map((i) => i.field).sort()).toEqual(['crafts', 'feePer100', 'refineDaily.PLANKS', 'refineFee']); });
it('cleanRefineCfg: qty, daily, customRRR e taxa', () => { /* qty '', daily 15, customRRR 150, feePer100 -1 → qty 1, daily 0, customRRR '', taxa 0 */ });
it('computeCraft: RRR manual 150% usa o automático e nenhuma quantidade fica negativa', () => {
  const c = computeCraft({ ...base, cfg: craftCfg({ customRRR: 150 }) });
  expect(c.rates.craftRRR).toBeCloseTo(33 / 133, 6); expect(c.lines.every((l) => l.qty >= 0)).toBe(true); expect(c.issues[0]).toMatchObject({ field: 'customRRR', level: 'error' }); });
it('computeCraft: customRRR " " não vira 0', () => expect(computeCraft({ ...base, cfg: craftCfg({ customRRR: ' ' }) }).rates.craftRRR).toBeCloseTo(33 / 133, 6));
it('computeCraft: crafts Infinity dá custo finito', () => { const c = computeCraft({ ...base, cfg: craftCfg({ crafts: Infinity }) }); expect(Number.isFinite(c.totalCost)).toBe(true); expect(c.units).toBe(1e9); });
it('computeCraft: taxa −400 não gera taxa negativa', () => expect(computeCraft({ ...base, cfg: craftCfg({ feePer100: -400 }) }).fee).toBe(0));
it('computeCraft: crafts 2,5 usa 2 (units = amount × 2)', () => expect(computeCraft({ ...base, cfg: craftCfg({ crafts: 2.5 }) }).units).toBe(2));
it('configuração válida: nenhum aviso e números idênticos aos de antes', () => { /* C1 da 019: fee 230.400, totalCost 3.117.618,0451 (arco T4, 1000 crafts); c.issues toEqual([]) exceto o info de taxa vazia, se houver */ });
```
- [ ] **Step 2:** FAIL (adaptadores inexistentes; `computeCraft` aceita tudo). **Step 3:** implementar `cleanCraftCfg`/`cleanRefineCfg` (chamam `validateInputs`; `customRRR` volta como string em % ou `''`; `craftDaily` só se a chave existir) e, no início de `computeCraft`, `const { cfg, issues } = cleanCraftCfg(args.cfg, { premium: args.premium, feeCeiling })` usando `cfg` limpa no resto; devolver `issues`. O teto vem de `getSettings().feeCeiling` com fallback 1000, lido na tela e passado por `ctx` (a lib não lê `localStorage`).
- [ ] **Step 4:** `npm test` inteiro verde (se algum teste existente passava `crafts` decimal a `computeCraft`, ajustar o valor esperado para `floor` e **registrar a lista** no commit). **Step 5: Commit:** `fix: computeCraft e adaptadores corrigem entradas fora da faixa e devolvem issues`.

### Task 3: telas Craft e Refino (avisos visíveis)
**Files:** Create `components/InputIssues.jsx`; Modify `FeeField.jsx`, `Crafting.jsx`, `Refining.jsx`.
- [ ] **Step 1:** `InputIssues({ issues, field })` renderiza as linhas de `issues` cujo `field` bate (ou todas, sem `field`), com a classe de cor por `level`. `FeeField` ganha a prop `issues` e o botão "Aceitar N como novo teto" (`setSettings({ feeCeiling })`).
- [ ] **Step 2: `Crafting.jsx`:** ler `feeCeiling` de `useSettings()`, passar em `computeCraft`; `<InputIssues issues={c.issues} field="crafts" />` etc. sob "Nº de crafts", "RRR manual", `FeeField`s e selects de diário; selo "N valores corrigidos" no cabeçalho do resultado.
- [ ] **Step 3: `Refining.jsx`:** `const { cfg: vcfg, issues } = cleanRefineCfg(cfg, { premium, feeCeiling })` e trocar, **só nas linhas de cálculo**, `cfg.daily`, `cfg.customRRR`, `cfg.feePer100`, `cfg.qty` por `vcfg.*` (autoRRR, `resolveRRR`, `ctx`, `lotFee`, lucro total); avisos sob cada campo.
- [ ] **Step 4:** `npm run check` → 0. Smoke (`npm run dev`): em Craft digitar taxa 5000, RRR 150, crafts 0 e `-3`: avisos aparecem e os números do resultado batem com os valores usados; em Refino: quantidade vazia, RRR ' ' (colar espaço), diário via console não é possível (select); sem `∞`/`NaN` em lugar nenhum. **Step 5: Commit:** `feat: avisos de entrada fora da faixa nas telas de Craft e Refino`.

### Task 4: aba RRR (D-020)
**Files:** Modify `rrrCalc.test.js`, `rrrCalc.js`, `RrrCalculator.jsx`.
- [ ] **Step 1: testes falhando** (acrescentar; `recipeReturn` agora limpa N com `validateInputs`):

```js
it('N=1e308 não gera ∞ nem NaN', () => { const rows = recipeReturn(recipeOf('T6_MAIN_SWORD'), 1e308, 33 / 133); for (const r of rows) for (const x of [r.gross, r.returned, r.net]) expect(Number.isFinite(x)).toBe(true); expect(rows[0].gross).toBe(16 * 1e9); });
it.each(['', 0, -5, 'abc'])('N=%j usa 1 (e a tela avisa)', (n) => expect(recipeReturn(recipeOf('T6_MAIN_SWORD'), n, 33 / 133)[0].gross).toBe(16));
it('N decimal usa floor: 2,7 → 2 e 2,5 → 2 (mata a mutação floor→round)', () => { for (const n of [2.7, 2.5]) expect(recipeReturn(recipeOf('T6_MAIN_SWORD'), n, 33 / 133)[0].gross).toBe(32); });
it('N=100 continua dando o caso do dossiê: 1.600 / 396,99 / 1.203,01', () => { const r = recipeReturn(recipeOf('T6_MAIN_SWORD'), 100, 33 / 133)[0]; expect([r.gross, +r.returned.toFixed(2), +r.net.toFixed(2)]).toEqual([1600, 396.99, 1203.01]); });
```
- [ ] **Step 2:** FAIL (1e308 → ∞). **Step 3:** em `recipeReturn`, `n = validateInputs({ crafts }).values.crafts`; em `RrrCalculator.jsx`, mostrar `<InputIssues>` sob "Nº de crafts" com `validateInputs({ crafts: cfg.crafts }).issues` (a tela e a função usam a mesma chamada). **Step 4:** PASS; smoke na aba RRR com `-5`, vazio, `1e308`, `2.7`. **Step 5: Commit:** `fix: aba RRR limita e avisa o nº de crafts (sem ∞/NaN, sem correção silenciosa)`.

### Task 5: preço-alvo (D-019)
**Files:** Modify `targetPrice.test.js`, `targetPrice.js`, `TargetPrice.jsx`.
- [ ] **Step 1: testes falhando** (acrescentar a `targetPrice.test.js`; `C = 3524,2707` do plano da 030):

```js
it('relistagens negativa ou decimal: a lib recusa', () => { for (const relists of [-3, 2.7]) expect(targetPrice({ cost: C, premium: true, mode: 'order', profit: 1000, relists })).toBeNull(); });
it('modo inválido: null (antes tratava como instantâneo)', () => { for (const mode of ['foo', undefined, null]) expect(targetPrice({ cost: C, premium: true, mode, profit: 1000 })).toBeNull(); });
it('relistagens acima do derivado: null (já era); no limite continua válido', () => { expect(targetPrice({ cost: C, premium: true, mode: 'order', profit: 1000, relists: 38 })).toBeNull(); expect(targetPrice({ cost: C, premium: true, mode: 'order', profit: 1000, relists: 37 })).not.toBeNull(); });
it('os casos do dossiê 030 continuam: 3.770 / 4.839 / 4.713 / 4.524 / 3.672 / 5.056 / 4.972', () => { /* mesma tabela dos testes existentes, sem alteração */ });
```
- [ ] **Step 2:** FAIL. **Step 3:** em `targetPrice`, rejeitar `mode` fora de `order|instant` e `relists` que não seja inteiro ≥ 0 (retorna `null`; o `TypeError` de lucro+margem permanece). Em `TargetPrice.jsx`, trocar `Math.max(0, Math.floor(+cfg.relists || 0))` e o `mode` por `validateInputs({ relists: cfg.relists, mode: cfg.mode }, { premium })`, usando os `values` e mostrando `<InputIssues>` sob o campo "Relistagens". **Step 4:** PASS; `npm run check`; smoke com relistagens −3, 2,7, 99. **Step 5: Commit:** `fix: preço-alvo recusa modo e relistagens inválidos na lib e avisa na tela`.

## Como o Tester valida

1. **Tabela do dossiê §4:** taxa 5.000 → aviso (usa 1.000; 2.160 sem correção, 432 com, valor 384); taxa 0 → aceita sem aviso; RRR 60% no craft → aviso (máx. 52,83%); RRR 55% no refino → aceito; RRR 100 e −5 → erro; diário 15 → erro; crafts 0 e 2,5 → erro; taxa vazia → informativo "usando 400". Recalcular os máximos: refino 137/237 = 0,57806; craft 112/212 = 0,52830.
2. **Cada achado dos Testers reproduzido e fechado:** RRR manual `' '` (antes 0), 150% (antes quantidade negativa), `crafts=Infinity` (antes custo infinito), taxa −400 (antes taxa negativa); aba RRR com N=1e308/0/vazio/−5/2,7/2,5; preço-alvo com relistagens −3 e 2,7 e modo inválido. Para cada um: aviso visível e número finito.
3. **Sem regressão:** 20 entradas válidas aleatórias em Craft e Refino produzem **exatamente** os mesmos números de antes (comparar com `master`); `c.issues` vazio (exceto o informativo da taxa padrão).
4. **Mutações a rodar:** `floor`→`round` em N; `>`→`>=` no teto e nos máximos; remover o `trim`; `maxRelists` ±1; clamp da taxa removido. Todas devem derrubar teste.
5. **O que um jogador experiente estranharia:** um valor corrigido que a tela não mostra; resultado calculado com o número digitado em vez do corrigido; "RRR 55%" no refino bloqueado; taxa 0 tratada como vazio; teto de 1.000 impedindo um valor real maior (o botão de novo teto resolve); aviso permanente em campos válidos; `∞`/`NaN` em qualquer tela; quantidade líquida negativa.

## Riscos

1. **Mudança deliberada:** taxa vazia passa de 0 para 400 (dossiê V8); alinhar com a 019 (o `FeeField` já avisa o padrão 400).
2. O teto de 1.000 é MÉDIA e vem de trecho de busca: por isso é configurável.
3. `Crafting.jsx`/`Refining.jsx` têm vários pontos de contato (019, 038, 041, 060, 066): fazer rebase por região.
4. Testes antigos que passavam `crafts` decimal ou RRR inválido a `computeCraft` mudam de valor; registrar na mensagem do commit.
5. `MAX_QTY = 1e9` não vem do dossiê (pergunta 1).

## Critério de pronto

`npm run check` verde; todos os casos do dossiê §4 e os quatro achados de D-015/D-019/D-020 em teste; uma única função de validação (`grep` por `Math.max(1, +` e `Math.floor(+` nos componentes e libs de cálculo não deve achar validação paralela); avisos visíveis nas quatro telas; só os arquivos listados alterados.

## PERGUNTAS PARA O GERENTE

1. **Teto técnico de quantidade (`MAX_QTY = 1e9`):** o dossiê não dá faixa superior para crafts/N; sem ele `1e308` vira `∞`. Aprova o 1e9 como limite técnico (não regra do jogo)?
2. **Erro bloqueia ou corrige?** O dossiê (§2) diz que V4 e V6 "bloqueiam o cálculo"; a sua regra diz que o cálculo usa o valor corrigido que a tela mostra. O plano segue a sua regra (corrige e avisa, `level: 'error'` só muda a cor). Confirma?
3. **Taxa acima do teto:** o plano usa 1.000 (corrigido), não o valor digitado, e oferece "Aceitar N como novo teto". O dossiê chama isso de "aviso (calcula, mas marca)". Confirma o clamp?
4. **Taxa vazia → 400** (dossiê V8) em vez de 0 de hoje: aceita a mudança?
5. 041 mesclada antes ou depois da 060? O plano funciona nos dois casos (valida `craftDaily` só se existir).
