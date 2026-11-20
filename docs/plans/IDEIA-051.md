# IDEIA-051 — Dimensionar o lote: quantos crafts fazer (foco, demanda, materiais em mãos e prata): plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-051`. Comandos `npm` em `client/`. **Pré-requisitos (já na `master`):** 002 (`focus.js`: `craftFocusSummary`, `craftsWithBudget`, campos `focusBudget`...), 010 (`history.js`, `liquidity.js`: `loadedStats`, campo `share`), 060, 069, 070, 005 (auditor). **Regras do briefing:** teste escrito, **executado e visto falhar** antes de implementar; os de componente em `*.test.jsx`; **nenhum `*.test.jsx` com `usePersisted('chave'` literal** (use `seed()`/`craftCfg()` de `src/test/ui.js`). Fonte: `docs/research/IDEIA-051.md`.

**Problema:** o lucro por craft não diz quantos crafts fazer: o lote é limitado por **foco do dia**, **demanda** do destino, **materiais em mãos** e **prata**. Sem isso o jogador craftea 200 de um item que vende 10 por dia.

**Objetivo:** um cartão **"Quantos crafts fazer?"** no Craft que calcula `n = min(n_foco, n_demanda, n_materiais, n_prata)`, diz **qual limite manda** (ou quais, em empate) e tem o botão **Aplicar ao Nº de crafts**. Limite sem dado fica **fora do mínimo e dito na tela** (nunca vira 0 por falta de dado).

**Arquitetura:** `lib/runs.js` puro: `suggestRuns` (o mínimo e o rótulo), `readRunsInputs(cfg)` (lê e valida os 3 campos salvos) e `buildRunsInput(...)` (monta as entradas **lendo** o que a tela já calculou: `computeCraft().lines/totalCost/rates`, `craftFocusSummary`, `loadedStats`; nenhuma fórmula de RRR, foco ou volume é reescrita). `RunsCard.jsx` desenha. `Crafting.jsx` liga e guarda os campos (`set({...})` fica nele, para o contrato do auditor enxergar).

## Regras (dossiê §2; padrões de produto marcados)
- **L2 foco:** `n_foco = floor(orçamento_foco / foco_por_craft)`; ambos do cartão Foco (002: `fs.pointsPerCraft` e `focusBudget`); **só entra com "Usar foco" ligado e orçamento > 0**.
- **L4 demanda:** `n_demanda = floor(volume_dia × (fatia/100) × dias / unidades_por_craft)`; `volume_dia` = `loadedStats` (7 dias completos) **da cidade da melhor saída** exibida; estados `ok`/`low`/`none` valem; `sparse`/`nodata`/`idle`/`unloaded` ⇒ sem limite de demanda e a tela diz "sem histórico suficiente". `fatia` = campo `share` **já existente** (padrão 10 %, `DEFAULT_SHARE_PCT`); `dias` = **novo** `runDays` (padrão 3, **escolha de produto sem fonte**; o dossiê sugere 20 %/3 dias: aqui reusa-se a fatia do Giro, para um só "% do mercado" na tela).
- **L5 materiais:** consumo esperado por craft = `l.qty / crafts` de cada linha de `computeCraft().lines` (já é `qtd × (1 − RRR)` nos retornáveis e `qtd` nos não retornáveis); `n_mat = min(floor(em_mãos / consumo))` **só dos materiais com "em mãos" preenchido** (campo vazio = não informado; `0` informado ⇒ limite 0). O jogo sorteia o retorno: é esperança (AFM usa o mesmo), dito na tela.
- **L6 prata:** `n_prata = floor(orçamento / custo_por_craft)`, `custo_por_craft = totalCost / crafts` (aproximação: despesa extra de lote e arredondamento da taxa não são lineares).
- `floor(x + 1e-9)` em todos (evita `0,3/0,1 = 2,9999…`).
**NÃO considera (dito na tela e no auditor):** peso e montaria (L7, IDEIA-017); tempo de craft e regeneração de foco; o material em mãos **continua custando** no lucro (todo material é tratado como comprado; `nc-stock`); matéria-prima dentro de uma cadeia refinada (o limite é por **ingrediente da receita**, o item refinado comprado ou feito); concorrência e queda de preço ao vender `n` unidades.

## Arquivos
**Criados:** `client/src/lib/runs.js`, `runs.test.js`, `client/src/components/RunsCard.jsx`, `RunsCard.test.jsx`, `client/src/components/Crafting.runs.test.jsx`.
**Alterados:** `client/src/components/Crafting.jsx` (cartão após o `FocusCard`; `set({ runDays | runBudget | runHave | crafts })`), `client/src/lib/persistSchemas.js` (3 campos em `craft:cfg`), `client/src/lib/audit/craft.js` (Vars `runs`; `auditCraft` repassa `runs`), `client/src/lib/audit/core.js` (texto de `stock` e chave `runsWeight`; nota do Var `share` em `craft.js`), `client/src/lib/audit/craft.test.js`, `client/src/test/savedStates.js` (**só** se `CURRENT_DEFAULTS` precisar; os campos são "só por set": **não** entram nos padrões).
**NÃO toca:** `craftPlan.js`, `focus.js`, `liquidity.js`, `econ.js`, `inputRules.js`, `Refining.jsx` (Refino fora), catálogo.
**Compartilhados:** `persistSchemas.js` (+ `persistSchemas.test.js`: o teste de contrato exige o campo no esquema no mesmo commit) e `Crafting.jsx`/`audit/craft.js` com 062/061/003/009 (cada uma acrescenta um cartão/Var; conflito textual; ordem sugerida 062 → 053 → 051 → 064 → 003 → 009 → 061); `core.js` (`NOT_CONSIDERED`) com 062/061/003/009.

## Campos salvos novos (`persistSchemas.js`, `craft:cfg`)
`runDays: 'numText'`, `runBudget: 'numText'`, `runHave: { map: 'numText' }` (chave = `mid` do ingrediente). **Auditor:** Var `runs` com `fields: ['runDays','runBudget','runHave']`, `kind:'info-only'`, `affects:'none'`, `probe: { cfg: { runDays: '5', runBudget: '20000', runHave: { T4_METALBAR: '100' } } }` (o teste de sensibilidade exige custo e lucro **iguais**). Linhas (todas `info-only`, exceto onde dito): `runs-days` ("Dias de venda do lote": padrão 3 ⇒ origem `app-default`, status `unconfirmed`/"padrão não confirmado"; digitado ⇒ `user`), `runs-budget` ("Prata disponível": "não informada" ou valor), `runs-have` ("Materiais em mãos": "N de M informados"), `runs-result` ("Nº de crafts sugerido": valor, limite que manda). `NOT_CONSIDERED.stock` passa a dizer: "O material em mãos só limita o nº de crafts sugerido; no custo, todo material continua tratado como comprado." Nova `NOT_CONSIDERED.runsWeight = ['Peso e capacidade de transporte do lote', 'O nº de crafts sugerido não considera peso nem montaria (IDEIA-017).']` usada via `notConsideredRows`. A nota do Var `share` ganha "e o limite de demanda do nº de crafts sugerido".

## Interfaces
```js
// runs.js (puro)
export const RUN_DAYS_DEFAULT = 3, RUN_DAYS_MAX = 365;
suggestRuns({ focus, demand, materials, silver }): { n: number|null, limits: { focus, demand, materials, silver }, limitedBy: ('focus'|'demand'|'materials'|'silver')[], limitingMaterials: string[] }
  // focus: { budget, perCraft } | null    demand: { volumePerDay, sharePct, days, unitsPerCraft } | null
  // materials: [{ mid, name, perCraft, have: number|null }]    silver: { budget, costPerCraft } | null
  // cada limit = inteiro >= 0 ou null (sem dado/sem entrada). n = min dos não nulos; nenhum ⇒ n null e limitedBy []. Empate ⇒ todos os que empatam.
readRunsInputs(cfg): { days: number, silverBudget: number|null, have: { [mid]: number }, issues: { field, msg }[] }
buildRunsInput({ result, fs, focusOn, stats, sharePct, unitsPerCraft, read }): argumento de suggestRuns
  // result = retorno de computeCraft; fs = craftFocusSummary|null; stats = loadedStats da melhor saída|null; read = readRunsInputs(cfg)
```
`readRunsInputs`: `runDays` vazio ⇒ 3 sem aviso; inválido (texto, ≤ 0, `NaN`) ⇒ 3 **com** aviso; > 365 ⇒ 365 com aviso; `runBudget` vazio ⇒ `null`; inválido/≤ 0 ⇒ `null` com aviso; `runHave` não objeto (corrompido) ⇒ `{}` sem lançar; por material: vazio ⇒ ausente; `'0'` ⇒ 0; negativo/NaN/texto ⇒ ausente com aviso; valor enorme (`1e300`) ⇒ aceito como número finito.

## Tasks (1 commit cada; teste primeiro e visto falhar)

### Task 1: `suggestRuns` (puro, project `logic`)
**Files:** Create `runs.test.js`, `runs.js`.
- [ ] **Step 1: testes falhando** (números do dossiê §4 recalculados com `node -e`; Broadsword T4, RRR 33/133 = 24,8120 %):
```js
const rrr = 33 / 133;
const base = {
  focus: { budget: 10000, perCraft: 1286 * 0.5 ** 3.1 },                 // 149,985; 10000/149,985 = 66,67
  demand: { volumePerDay: 76 / 7, sharePct: 25, days: 3, unitsPerCraft: 1 }, // 10,857 x 0,25 x 3 = 8,14
  materials: [{ mid: 'T4_METALBAR', name: 'Barra', perCraft: 16 * (1 - rrr), have: 100 },   // 12,030 -> 8,31
              { mid: 'T4_LEATHER', name: 'Couro', perCraft: 8 * (1 - rrr), have: 60 }],    //  6,015 -> 9,975
  silver: { budget: 20000, costPerCraft: 3524.27 },                       // 5,67
};
it('caso do dossiê: limites 66, 8, 8, 5 => n = 5, limitado por prata', () => {
  const r = suggestRuns(base);
  expect(r.limits).toEqual({ focus: 66, demand: 8, materials: 8, silver: 5 });
  expect(r).toMatchObject({ n: 5, limitedBy: ['silver'], limitingMaterials: [] });
});
it('orçamento 40.000: prata 11 => n = 8, limitado por demanda E materiais (empate); material que limita: a barra', () => {
  const r = suggestRuns({ ...base, silver: { budget: 40000, costPerCraft: 3524.27 } });
  expect(r.limits.silver).toBe(11);
  expect(r).toMatchObject({ n: 8, limitedBy: ['demand', 'materials'], limitingMaterials: ['T4_METALBAR'] });
});
```
Mais testes: sem foco (`focus: null`) ⇒ `limits.focus` null e n continua 5; **todas** as entradas null/`[]` ⇒ `n: null`, `limitedBy: []`; só um limite informado ⇒ ele manda; `have: 0` ⇒ `materials: 0`, `n: 0`, `limitingMaterials` com o mid; material com `have: null` é **ignorado** (não vira 0); `perCraft` 0/negativo/`NaN` e `costPerCraft` 0 ⇒ aquele limite `null` (sem divisão por zero, nunca `Infinity`); `budget` ≤ 0 ou `NaN` ⇒ `null`; `volumePerDay` 0 ⇒ demanda 0 (mercado sem venda registrada **com** estado usável é tratado fora: ver Task 2); **ponto flutuante:** `perCraft: 0.1, have: 0.3` ⇒ 3 (não 2) e `silver: { budget: 0.3, costPerCraft: 0.1 }` ⇒ 3; números enormes (`budget: 1e300, costPerCraft: 1`) ⇒ inteiro finito (`Number.isFinite`), sem lançar; entrada `undefined`/`null` na raiz ⇒ `n: null`.
- [ ] **Step 2:** `npm run test:logic -- src/lib/runs.test.js` → FAIL. **Step 3:** implementar `suggestRuns` (helper interno `lim = (a, b) => (a > 0 && b > 0 ? Math.floor(a / b + 1e-9) : null)`; para a demanda, multiplicar antes de dividir; `budget` 0 com `perCraft` > 0 em `have` informado ⇒ 0, só para materiais). **Step 4:** PASS.
- [ ] **Mutações:** `min` → `max`; sem `+1e-9`; tratar `have: null` como 0; escolher só **um** limitante no empate; `floor` → `round`: derrubadas. **Step 5: Commit** `feat: sugestão de nº de crafts (IDEIA-051)`.

### Task 2: leitura dos campos e montagem das entradas (puro)
**Files:** Modify `runs.test.js`, `runs.js` (`readRunsInputs`, `buildRunsInput`).
- [ ] **Step 1: testes falhando:** os casos de `readRunsInputs` listados em Interfaces (um `it` cada, incluindo `cfg` `undefined`/`null`/`'x'`/`[]`). `buildRunsInput` com um `result` de `computeCraft` real da espada T4 (catálogo da fixture, `loadFixtureCatalog`, preços metalbar 200/couro 150, bancada 500, `specialty: true`; **custo 3.524,27** = base do `auditKit`): `materials` = 2 linhas com `perCraft` 12,030 e 6,015 (= `l.qty / crafts`; com `crafts: 3` o `perCraft` **não muda**), `silver.costPerCraft` ≈ 3.524,27 (também com `crafts: 3`: `totalCost/3`); `focusOn: false` ⇒ `focus: null` mesmo com `fs`; `focusOn: true` e `fs.pointsPerCraft` 149,985 + orçamento > 0 ⇒ `focus` preenchido, sem orçamento ⇒ `null`; `stats` com `state: 'sparse'`/`'nodata'`/`'idle'`/`'unloaded'`/`null` ⇒ `demand: null`; `stats.state: 'none'` com volume 4,3 ⇒ `demand` preenchida (a razão **existe** mesmo "sem giro"); `result` sem linhas (item sem receita) ⇒ `materials: []`.
- [ ] **Steps 2–5:** FAIL → implementar → PASS → mutação (usar `qty` do lote em vez de `qty/crafts`: derrubada) → **Commit** `feat: entradas do nº de crafts a partir do cálculo da tela (IDEIA-051)`.

### Task 3: esquema salvo e contrato
**Files:** Modify `persistSchemas.js`, `persistSchemas.test.js` (se enumera campos), `audit/craft.js` (**só** o Var `runs` com linhas provisórias), `audit/core.js`.
- [ ] **Step 1: testes falhando:** `persistSchemas.test.js`: `craft:cfg` aceita `runDays: '3'`, `runBudget: ''`, `runHave: { T4_METALBAR: '100' }`; **corrompido**: `runDays: {}`, `runBudget: [1]`, `runHave: 'x'`, `runHave: { a: {} }` ⇒ descartados para o padrão (campo some, sem lançar; resto do estado preservado) — o teste é escrito com `loadPersisted` real; `contract.test.js` **reprova** (campo sem linha) antes do Var ⇒ prova que o contrato vigia.
- [ ] **Steps 2–5:** esquema + Var `runs` + `probe`; `npm run test:logic` verde (`sensitivity.test.js` com o probe: custo e lucro iguais). **Commit** `feat: campos salvos do nº de crafts e linhas do auditor (IDEIA-051)`.

### Task 4: cartão (jsdom)
**Files:** Create `RunsCard.test.jsx`, `RunsCard.jsx`. Props: `{ suggestion, read, materials, values, onChange(field, value), onApply(n) }`.
- [ ] **Step 1: testes falhando:** mostra "Sugestão: 5 crafts · limitado por prata" para o caso do dossiê (props prontas); empate ⇒ "limitado por demanda e materiais (a barra)"; cada linha de limite mostra o número ou "— (motivo)" ("foco desligado", "sem histórico suficiente", "não informado"); `n: null` ⇒ "Informe ao menos um limite"; **Aplicar** chama `onApply(5)` e fica **desabilitado** com `n` null ou 0 (texto "0 crafts: um dos limites é zero"); alterar "Dias de venda" chama `onChange('runDays', '5')`; avisos de `read.issues` aparecem; a dica cita "esperança", "peso" e "continua custando".
- [ ] **Steps 2–5:** FAIL → implementar (sem conta) → PASS. **Commit** `feat: cartão Quantos crafts fazer (IDEIA-051)`.

### Task 5: ligar no Craft (jsdom; `usePrices` e `useHistory` mockados como `Crafting.targetNoTax.test.jsx`; `freezeNow('2026-11-18T12:00:00Z')`)
**Files:** Create `Crafting.runs.test.jsx`; Modify `Crafting.jsx`.
- [ ] **Step 1: testes falhando.** Cenário: `T4_MAIN_SWORD`, `craftCfg({ specialty: true, feePer100: 500, refine: BUY, share: '25', runDays: '3', runBudget: '20000', runHave: { T4_METALBAR: '100', T4_LEATHER: '60' } })`, preços metalbar 200, couro 150, espada `{ Caerleon: { s: 4500 } }`, histórico da espada em Caerleon = 76 unidades nos 7 dias completos anteriores. Esperado na tela: "Sugestão: 5 crafts" e "prata"; com `runBudget: '40000'` ⇒ "8 crafts" e "demanda" e "materiais"; **Aplicar** grava `crafts` em `localStorage` (`albion:craft:cfg`, `crafts: '5'`) e o "Nº de crafts" da tela vira 5 (e o custo total da tabela muda); sem histórico (`history: null`) ⇒ linha de demanda "sem histórico suficiente" e a sugestão usa os outros; **estado antigo** (`seed('craft:cfg', craftCfg())` sem os 3 campos) ⇒ cartão renderiza com padrões (3 dias, sem orçamento, "Informe ao menos um limite"), `localStorage` inalterado até digitar; **corrompido** (`runHave: 'x'`, `runDays: {}`) ⇒ sem erro e sem tela branca; trocar de item **não** apaga os campos (são do cfg), mas `runHave` de outro `mid` é ignorado.
- [ ] **Steps 2–4:** implementar; `npm run test:ui` verde. **Step 5: Commit** `feat: Quantos crafts fazer no Craft (IDEIA-051)`.

### Task 6: linhas do auditor (verdade, não só cobertura) e conferência
- [ ] **Step 1: testes falhando** em `craft.test.js`: `runs-days` com `runDays` vazio ⇒ `app-default`/`unconfirmed`; digitado ⇒ `user`; `runs-result` mostra o mesmo `n` e o limitante do `suggestRuns` (monta pelo mesmo `buildRunsInput`, nunca recalcula); `nc-stock` com o texto novo e `nc-runsWeight` presentes; `ctx.runs` lixo ⇒ "não foi possível ler" sem lançar. `Crafting.audit.test.jsx`: o quadro mostra as 4 linhas. `npm run check` verde.
- [ ] **Manual (Executor registra):** Craft de espada T4 com os valores do dossiê; botão aplica; recarregar mantém `crafts`. **Commit** `feat: auditor lê o nº de crafts sugerido (IDEIA-051)`.

## Como o Tester valida
1. **Casos concretos:** 66 · 8 · 8 · 5 ⇒ 5 (prata); orçamento 40.000 ⇒ 8 (demanda e materiais); flutuante 0,3/0,1 ⇒ 3; `have: 0` ⇒ 0; todos vazios ⇒ nenhum n.
2. **Mutações** das Tasks 1 e 2 (cópia fora do repo): sobrevivente reprova.
3. **Contrato:** remover um campo do Var `runs` ⇒ `contract.test.js` reprova nomeando o campo; probe de sensibilidade: digitar os 3 campos não muda custo nem lucro.
4. **Estado antigo/corrompido:** 8 chaves e `settings` ruins (perfis do laudo 070) sem tela branca; `runHave` com `Infinity`/`NaN`/objetos; `crafts` aplicado maior que o limite do campo (a 060 já limita).
5. **Honestidade:** cartão e auditor dizem "esperança", "peso não considerado", "material em mãos continua custando", "padrão de 3 dias é do app". **O que o usuário estranharia:** limite sem dado virando 0; "limitado por foco" com foco desligado; botão que muda `crafts` sem avisar; número com casas decimais.

## Riscos
1. **Custo por craft linear:** despesa extra de escopo "lote" e arredondamento da taxa distorcem `n_prata` em ±1; dito na tela.
2. **Ingrediente refinado "em mãos":** o jogador pode ter a matéria-prima, não a barra; o limite é só do que a receita pede. Alternativa fora do plano: descer na cadeia.
3. **Demanda usa a cidade da melhor saída** (a exibida), não a de maior volume.
4. **Conflito textual** em `Crafting.jsx`, `audit/craft.js`, `core.js`, `persistSchemas.js` com 062/061/003/009/064.

## Critério de pronto
`npm run check` verde sem alterar teste existente (exceto contagens de linhas de `craft.test.js`, declaradas); mutações derrubadas; só os arquivos listados; 3 campos no esquema **e** no auditor no mesmo commit da Task 3; conferência manual registrada.

## PERGUNTAS PARA O GERENTE
1. **Fatia e dias:** reusar o campo `share` do Giro (padrão 10 %) e **dias de venda = 3** (sem fonte; o dossiê sugeriu 20 %/3 dias). Aprova, ou quer fatia própria de 20 %?
2. **Material em mãos** limita só o nº sugerido e **não** zera o custo do material (sem custo de oportunidade). Aceita? (IDEIA-032 trataria o estoque de verdade.)
3. **Empate** mostra todos os limitantes ("demanda e materiais"). Ok?
4. **Aplicar** grava `crafts`; n = 0 desabilita o botão. Ok?
5. Refino fica fora (sem `crafts` equivalente). Quer ideia separada?
