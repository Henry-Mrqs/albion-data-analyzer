# IDEIA-041 — Bônus diário no RRR do craft final + alerta "vale esperar": plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-041`. Comandos `npm` em `client/`. **GRUPO ECON (2º de 2): 019 → 041. Este plano ASSUME QUE O PLANO 019 JÁ FOI MESCLADO** (`stationFee` exata, `roundFee`, `FeeField`, testes de `craftPlan` com os valores novos). Pré-requisito: IDEIA-001.

**Objetivo:** (1) o craft final aceita o bônus diário (+10/+20) no RRR (hoje só o refino dos materiais aceita; a AUDITORIA §1 "Lacuna" e o dossiê D1 mostram que o diário também vale para o craft); (2) um cartão responde "vale esperar o bônus do dia?": quanto o lote economizaria se o bônus do item fosse +10% ou +20%, reaproveitando o padrão `d10`/`d20` que o Craft já tem para o refino dos materiais.

**Arquitetura:** `craftPlan.js`: `craftRates(cfg, bonusCity)` passa a repassar `daily: +cfg.craftDaily || 0` a `rrr()` (sem mexer em `econ.js`, que já aceita `daily`); nova `waitSavings(args)` chama `computeCraft` com `craftDaily = 10` e `= 20` e compara custos. Um módulo puro `dailyBonus.js` decide se o bônus informado ficou velho (passou do reset diário). `DailyWait.jsx` apresenta o cartão. Nenhuma constante de PB é escrita: tudo passa por `rrr()`.

**Spec:** `docs/research/IDEIA-041.md` (§2 D1 a D8, fórmula, §4 tabela e economias, §5 encaixe) e `docs/research/AUDITORIA-001.md` §1. Confiança do dossiê: **MÉDIA**; ver "O que o usuário precisa confirmar".

## Grupos, arquivos exclusivos e compartilhados

**Exclusivos do grupo ECON (019/041):** `client/src/lib/craftPlan.js`, `craftPlan.test.js`, `client/src/lib/dailyBonus.js` e `dailyBonus.test.js` (novos), `client/src/components/DailyWait.jsx` (novo).
**Compartilhados com o grupo CATÁLOGO (038/057/039):** `client/src/components/Crafting.jsx` (038: seletor "Craftar em" e `bonusCity`; 019: campos de taxa; 041: select do bônus diário e cartão; regiões distintas) e `craftPlan.test.js` (038 altera uma linha de `bonusCity`; **041 não chama `craftBonusCity`**: usa `specialty: true` e `bonusCity: null`). **`econ.js`, catálogo, build e fixture: não alterados.**
**Impacto em planos aprovados:** nenhum nos testes da IDEIA-001 (a 019 já os reescreveu). `craftRates` ganha um campo de entrada (`craftDaily`) sem quebrar chamadas existentes (ausente = 0).

## Fórmulas (dossiê §2 D1 e regra de produto)

```
PB_craft  = base + (cidade especialista ? especialização : 0) + (foco ? 59 : 0) + diário_item      // via rrr({kind:'craft', specialty, focus, daily})
RRR       = PB / (100 + PB)                                                                         // existente
cenário d = computeCraft com cfg.craftDaily = d  (d ∈ {10, 20}; o diário SUBSTITUI o atual: é um único valor por item)
economia_lote(d)  = max(0, totalCost(cfg atual) − totalCost(cenário d))        // taxa de bancada igual nos dois (não depende do RRR)
economia_craft(d) = economia_lote(d) / crafts
recomenda esperar(d) = economia_lote(d) > custoDeEsperar    // custoDeEsperar: campo do usuário, padrão 0 (dossiê §2)
```
Interpretação declarada: o dossiê escreve "`PB + d`", mas o diário é um único valor por categoria (0, 10 ou 20); a tabela do dossiê §4 parte de 0. O plano compara **valor absoluto** (10 ou 20) contra o atual; se o atual já é ≥ d, a economia é 0 ("sem ganho"). Ver pergunta 1.

## Onde aparece e UI

Aba **Craft**.
- Cartão "Produção": ao lado de "Usar foco", novo select **"Bônus diário do item"** (Nenhum / +10% / +20%) com a dica "RRR atual: X%" (o RRR do cabeçalho do resultado já reflete o bônus). Se o bônus informado é de antes do último reset do servidor, aparece um aviso amarelo "Bônus de ontem? passou o reset (10:00 UTC)" e o cálculo usa **0** até o usuário confirmar de novo.
- Novo cartão **"Vale esperar o bônus do dia?"** (abaixo de "Comparar rotas dos materiais refinados"): duas linhas, +10% e +20%, com custo total do lote, economia por craft, economia do lote e selo "vale esperar" ou "sem ganho"; um campo **"Custo de esperar (prata)"** (padrão 0). Texto fixo: "O bônus diário vale para uma categoria por 24 h; informe o do dia (o app não consegue buscá-lo)."
- Nada muda no refino dos materiais (`Bônus diário · recurso` continua independente).

## Arquivos afetados (exatos)

**Criados:** `client/src/lib/dailyBonus.js`, `client/src/lib/dailyBonus.test.js`, `client/src/components/DailyWait.jsx`.
**Alterados:** `client/src/lib/craftPlan.js`, `client/src/lib/craftPlan.test.js`, `client/src/components/Crafting.jsx`.
**NÃO toca:** `econ.js`, `catalog.js`, `build-catalog.mjs`, fixture, `refinePlan.js`, `Refining.jsx`, `market.js`.
**Modelo de dados:** `localStorage` `albion:craft:cfg` ganha `craftDaily` (0/10/20), `craftDailyAt` (ms epoch de quando foi informado) e `waitCost` (número). Ausentes = 0.

## Interfaces

```js
// craftPlan.js
craftRates(cfg, bonusCity)  // agora lê +cfg.craftDaily || 0; mesmas chaves de retorno
waitSavings({ rec, targetMid, prices, cfg, premium, bonusCity, levels = [10, 20] }):
  { base: number, rows: Array<{ daily, totalCost, perCraft, lot, gain: boolean }> } | null   // null se base não está pronto (faltam preços) ou rec nulo
// dailyBonus.js
RESET_UTC_HOUR = { west: 10, europe: 10, east: 23 }        // dossiê D5 (MÉDIA); chaves = servidores de settings.js
lastReset(now: number, server: string): number            // ms do reset mais recente ≤ now
effectiveDaily({ value, setAt, now, server }): { value: number, stale: boolean }   // stale: setAt < lastReset → value 0
```

## Tasks (1 commit cada; testes primeiro)

### Task 1: `craftRates` repassa o bônus diário (tabela do dossiê §4)
**Files:** Modify `craftPlan.test.js`, `craftPlan.js`.
- [ ] **Step 1: testes falhando** (acrescentar ao `describe('craftRates')`; `craftCfg` da IDEIA-001 com `specialty: true` para não depender da tabela de cidades; `bonusCity: null`):

```js
it.each([ // [focus, craftDaily, PB, RRR]   (dossiê §4: espada em cidade de bônus)
  [false, 0, 33, 0.248120], [false, 10, 43, 0.300699], [false, 20, 53, 0.346405],
  [true, 0, 92, 0.479167], [true, 10, 102, 0.504950], [true, 20, 112, 0.528302],   // 52,8302% = exemplo da AFM
])('foco=%s diário=%s → PB %s', (focus, craftDaily, pb, esperado) => {
  const r = craftRates(craftCfg({ specialty: true, focus, craftDaily }), null);
  expect(r.autoRRR).toBeCloseTo(esperado, 6); expect(r.craftRRR).toBeCloseTo(esperado, 6); });
it('craftDaily ausente, vazio ou inválido = 0; strings numéricas valem', () => {
  for (const v of [undefined, '', 'x', null]) expect(craftRates(craftCfg({ specialty: true, craftDaily: v }), null).autoRRR).toBeCloseTo(33 / 133, 6);
  expect(craftRates(craftCfg({ specialty: true, craftDaily: '20' }), null).autoRRR).toBeCloseTo(53 / 153, 6); });
it('RRR manual continua vencendo o diário', () => expect(craftRates(craftCfg({ specialty: true, craftDaily: 20, customRRR: '30' }), null).craftRRR).toBeCloseTo(0.3, 6));
it('diário do craft e diário do recurso são independentes', () => {
  const r = craftRates(craftCfg({ specialty: true, craftDaily: 20, refineDaily: { PLANKS: 10 } }), null);
  expect(r.autoRRR).toBeCloseTo(53 / 153, 6);                 // craft: 18+15+20
  expect(r.refineRRRFor('PLANKS')).toBeCloseTo(68 / 168, 6);  // refino: 18+40+10 (cidade 'auto')
});
```
  Valores do dossiê §4: 24,8120; 30,0699; 34,6405; 47,9167; 50,4950; 52,8302. (`53/153` e `68/168` são contas derivadas das mesmas regras.)
- [ ] **Step 2:** `npx vitest run src/lib/craftPlan.test.js` → FAIL (RRR ignora `craftDaily`).
- [ ] **Step 3:** em `craftRates`, `calcRRR({ kind: 'craft', specialty, focus: cfg.focus, daily: +cfg.craftDaily || 0 })`. **Step 4:** PASS. **Step 5:** `npm run check`. **Step 6: Commit:** `fix: bônus diário entra no RRR do craft final`.

### Task 2: erro de hoje e economia de esperar (`waitSavings`)
**Files:** Modify `craftPlan.test.js`, `craftPlan.js`.
- [ ] **Step 1: testes falhando.** Item `T6_MAIN_SWORD` da fixture (16 barras + 8 couro, mesmo bruto do dossiê: 16×200 + 8×150 = **4.400**), cfg: `specialty: true`, `refine: { METALBAR: 'buy', LEATHER: 'buy' }`, `feePer100: 400`, 1 craft, preços `T6_METALBAR: 200, T6_LEATHER: 150`, `bonusCity: null`. A taxa de bancada é igual em todos os cenários, então as diferenças são só de material (iguais ao dossiê).

```js
const mat = (focus, craftDaily) => computeCraft({ ...base, cfg: craftCfg({ ...CFG, focus, craftDaily }) }).matCost;
it('material líquido por cenário (dossiê §4)', () => {
  expect(mat(false, 0)).toBeCloseTo(3308.27, 2);  expect(mat(false, 10)).toBeCloseTo(3076.92, 2);  expect(mat(false, 20)).toBeCloseTo(2875.82, 2);
  expect(mat(true, 0)).toBeCloseTo(2291.67, 2);   expect(mat(true, 10)).toBeCloseTo(2178.22, 2);   expect(mat(true, 20)).toBeCloseTo(2075.47, 2); });
it('erro de hoje: dia +20 com foco, o app sem o campo superestimava em 216,20 por craft', () => expect(mat(true, 0) - mat(true, 20)).toBeCloseTo(216.20, 1)   // exato 216,195; o dossiê arredonda os materiais antes de subtrair);
it('waitSavings com foco: +10 → 113,45; +20 → 216,20', () => {
  const w = waitSavings({ ...base, cfg: craftCfg({ ...CFG, focus: true }) });
  expect(w.rows.map((r) => r.daily)).toEqual([10, 20]);
  expect(w.rows[0].perCraft).toBeCloseTo(113.45, 2); expect(w.rows[1].perCraft).toBeCloseTo(216.20, 1); expect(w.rows.every((r) => r.gain)).toBe(true); });
it('waitSavings sem foco: +10 → 231,35; +20 → 432,45', () => { /* mesmos asserts */ });
it('lote de 100 crafts com foco: +20 → 21.620', () => expect(waitSavings({ ...base, cfg: craftCfg({ ...CFG, focus: true, crafts: 100 }) }).rows[1].lot).toBeCloseTo(21619.5, 1))   // dossiê: 21.620 = 216,20 × 100 arredondado;
it('já está em +20: nada a esperar; em +10: só o +20 ganha', () => {
  const w20 = waitSavings({ ...base, cfg: craftCfg({ ...CFG, focus: true, craftDaily: 20 }) }); expect(w20.rows.map((r) => r.gain)).toEqual([false, false]);
  const w10 = waitSavings({ ...base, cfg: craftCfg({ ...CFG, focus: true, craftDaily: 10 }) }); expect(w10.rows.map((r) => r.gain)).toEqual([false, true]);
  expect(w10.rows[1].lot).toBeCloseTo(2178.22 - 2075.47, 2); });          // 102,75
it('retorna null sem preços ou sem receita', () => { expect(waitSavings({ ...base, prices: null, cfg: craftCfg(CFG) })).toBeNull(); expect(waitSavings({ ...base, rec: null, cfg: craftCfg(CFG) })).toBeNull(); });
it('a taxa de bancada não entra na economia', () => { /* feePer100 400 e 0 dão a mesma economia por craft */ });
```
  Contas do dossiê §4: sem foco 3.308,27 − 2.875,82 = **432,45** (+20) e 3.308,27 − 3.076,92 = **231,35** (+10); com foco 2.291,67 − 2.075,47 = **216,20** e 2.291,67 − 2.178,22 = **113,45**; 100 crafts com foco +20: **21.620**. O erro de hoje, 216,20 (9,4% do custo de 2.291,67; 10,4% do custo correto de 2.075,47, como no dossiê), vale para qualquer item com 16 + 8 unidades de refinados a esses preços (a espada T6 da fixture tem o mesmo bruto de 4.400).
- [ ] **Step 2:** FAIL (`waitSavings` inexistente). **Step 3:** implementar em `craftPlan.js` chamando `computeCraft` para o cenário atual e para cada `d` (mesmos `prices`, `premium`, `bonusCity`, `rec`); `gain = lot > 0.5` (limiar de meia prata, o mesmo do `c.best - c.d10 > 0.5` que o Craft já usa no refino); `null` se `!rec`, `!prices` ou `base.missing.length`. **Step 4:** PASS. **Step 5:** `npm run check`. **Step 6: Commit:** `feat: economia de esperar o bônus diário do item (waitSavings)`.

### Task 3: bônus velho (`dailyBonus.js`)
**Files:** Create `dailyBonus.test.js`, `dailyBonus.js`.
- [ ] **Step 1: testes falhando** (D5: reset 10:00 UTC Américas/Europa, 23:00 UTC Ásia; MÉDIA; chaves de servidor de `settings.js`: `west`, `europe`, `east`):

```js
const T = (s) => Date.parse(s);
it('west: depois das 10:00Z o reset é o de hoje; antes, o de ontem', () => {
  expect(lastReset(T('2026-11-17T12:00:00Z'), 'west')).toBe(T('2026-11-17T10:00:00Z'));
  expect(lastReset(T('2026-11-17T09:59:00Z'), 'west')).toBe(T('2026-11-16T10:00:00Z')); });
it('east: reset às 23:00Z', () => {
  expect(lastReset(T('2026-11-17T22:00:00Z'), 'east')).toBe(T('2026-11-16T23:00:00Z'));
  expect(lastReset(T('2026-11-17T23:30:00Z'), 'east')).toBe(T('2026-11-17T23:00:00Z')); });
it('europe = west', () => expect(lastReset(T('2026-11-17T12:00:00Z'), 'europe')).toBe(lastReset(T('2026-11-17T12:00:00Z'), 'west')));
it('bônus informado antes do reset fica velho e vale 0', () => {
  expect(effectiveDaily({ value: 20, setAt: T('2026-11-17T09:00:00Z'), now: T('2026-11-17T12:00:00Z'), server: 'west' })).toEqual({ value: 0, stale: true });
  expect(effectiveDaily({ value: 20, setAt: T('2026-11-17T10:30:00Z'), now: T('2026-11-17T12:00:00Z'), server: 'west' })).toEqual({ value: 20, stale: false }); });
it('valor 0, sem data ou servidor desconhecido: sem aviso', () => {
  expect(effectiveDaily({ value: 0, setAt: 0, now: 1e12, server: 'west' })).toEqual({ value: 0, stale: false });
  expect(effectiveDaily({ value: 10, setAt: undefined, now: 1e12, server: 'west' }).stale).toBe(true);   // sem data = não confiável
  expect(() => lastReset(1e12, 'mars')).toThrow(); });
```
  Estes casos são **derivados** da regra D5 do dossiê (sem número publicado): o Tester os refaz com o relógio.
- [ ] **Step 2:** FAIL. **Step 3:** implementar com `Date.UTC`. **Step 4:** PASS. **Step 5:** `npm run check`. **Step 6: Commit:** `feat: detecta bônus diário informado antes do reset do servidor`.

### Task 4: Tela (select, aviso e cartão)
**Files:** Create `components/DailyWait.jsx`; Modify `Crafting.jsx`.
- [ ] **Step 1:** em `Crafting.jsx`: select "Bônus diário do item" (`set({ craftDaily: +v, craftDailyAt: Date.now() })` no evento, nunca durante o render); `const [now] = useState(Date.now)` e `effectiveDaily({ value: +cfg.craftDaily || 0, setAt: cfg.craftDailyAt, now, server })` (servidor de `useSettings()`), passando `cfgEff = { ...cfg, craftDaily: eff.value }` a `computeCraft`/`craftRates`; aviso quando `eff.stale`. Renderizar `<DailyWait savings={waitSavings({... cfg: cfgEff})} crafts={...} waitCost={+cfg.waitCost || 0} onWaitCost={(v) => set({ waitCost: v })} />` abaixo do cartão de rotas.
- [ ] **Step 2:** `DailyWait.jsx`: tabela `+10%`/`+20%` com custo total, economia por craft e do lote, selo "vale esperar" (`lot > waitCost` e `gain`) ou "sem ganho"; usa `Money`, `fmt`, `Field`, `NumberInput`, `Banner` de `ui.jsx`.
- [ ] **Step 3:** `npm run check` → 0 (se `react-hooks/purity` reclamar do `Date.now` no `useState`, usar `usePersisted`-style: guardar `now` em estado criado por inicializador, nunca chamar `Date.now()` no corpo). `npm run dev`: Craft de `T6_MAIN_SWORD`: ligar foco, escolher +20% → o RRR do cabeçalho sobe para 52,83% e o cartão "Vale esperar" mostra "sem ganho" nas duas linhas; voltar a "Nenhum" → +10% e +20% com economias (valores dependem dos preços ao vivo; a proporção do dossiê vale se os preços forem barra 200 e couro 150).
- [ ] **Step 4: Commit:** `feat: bônus diário do item no Craft e cartão "vale esperar"`.

## Como o Tester valida (conta própria, sem importar `econ.js`)

Dossiê §4 (espada em cidade de bônus; bruto 16×200 + 8×150 = 4.400; taxa fora): sem foco, sem diário: PB 33 → 24,8120% → material **3.308,27**; +10: PB 43 → 30,0699% → **3.076,92**; +20: PB 53 → 34,6405% → **2.875,82**; com foco: PB 92 → 47,9167% → **2.291,67**; +10: PB 102 → 50,4950% → **2.178,22**; +20: PB 112 → **52,8302%** (igual ao exemplo da AFM) → **2.075,47**. Economia por craft de esperar: com foco **216,20** (+20) e **113,45** (+10); sem foco **432,45** e **231,35**; lote de 100 crafts com foco +20: **21.620**. Erro de hoje (dia de espada +20 com foco): o app mostrava 47,9167% (2.291,67) em vez de 52,8302% (2.075,47): custo superestimado em **216,20 por craft**.
**O que um jogador experiente estranharia:** RRR acima de ~58% no craft; bônus de +20% somando ao diário do refino (são independentes); diário reduzindo a taxa de bancada (não reduz); "vale esperar" indicando economia quando o bônus informado já é +20%; economia negativa; bônus de ontem ainda valendo sem aviso; foco desaparecendo ao mudar o diário; o cartão aparecendo com preços faltando (deve sumir).

## O que o usuário precisa confirmar (dossiê MÉDIA)

1. **Print do bônus do dia** na janela de produção de um item da categoria sorteada (D-014 já pede): confere o exemplo 112 → 52,83% (D1, MÉDIA-ALTA, 2 artigos AFM).
2. **Hora do reset por servidor** (D5, MÉDIA): o plano usa 10:00 UTC (Américas e Europa) e 23:00 UTC (Ásia) só para o aviso de "bônus velho"; se estiver errado, o aviso erra o horário mas o cálculo continua certo (o usuário confirma o valor).
3. **Quais categorias têm bônus e a chave** (D4 e D8, MÉDIA/BAIXA): **não são usadas**: o app não sabe qual item tem bônus; quem informa é o usuário no item escolhido.
4. Regras D2/D3 (2 bônus por dia, 9:1) e D6 (fama de estudo) não entram.

## Riscos

1. **Interpretação de "PB + d"** (substituição versus soma): ver pergunta 1.
2. O bônus diário persistido muda todo dia; o aviso de "velho" depende do horário de reset (MÉDIA).
3. `Crafting.jsx` é arquivo quente (019 e 038): regiões distintas; resolver por rebase.
4. `react-hooks/purity` pode reprovar `Date.now`; mitigação no Step 3 da Task 4.
5. O custo da rota "melhor" de refino dos materiais é recalculado em cada cenário; é o comportamento correto (a rota pode mudar).

## Critério de pronto

`npm run check` verde; todos os casos do dossiê §4 em teste; `craftRates` aceita `craftDaily` sem mudar `econ.js`; cartão visível só com preços completos; aviso de bônus velho funcionando; só os arquivos listados alterados.

## PERGUNTAS PARA O GERENTE

1. **"PB + d" do dossiê (§2, fórmula do alerta):** o dossiê escreve `custo(PB atual) − custo(PB + d)`. O plano trata `d` como o **valor do diário** (10 ou 20, em substituição ao atual), porque o jogo dá um único bônus por categoria. Confirma?
2. Selo "vale esperar" usa o campo "custo de esperar" (padrão 0), como no dossiê; com 0, qualquer economia > 0,5 prata marca "vale esperar". Aceita esse padrão?
3. O bônus velho vira **0** automaticamente (com aviso). Prefere manter o valor e só avisar?
