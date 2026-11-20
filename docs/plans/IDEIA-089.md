# IDEIA-089 — Divisor de dias do `windowStats`: usar os dias que a série realmente cobre: plano

> **Para o Executor:** `superpowers:executing-plans` ou `subagent-driven-development`. Branch de integração (D-070), 1 commit por ideia. `npm` em `client/`. Teste escrito, executado e **visto falhar** antes de implementar. Nenhum `*.test.jsx` com `usePersisted('chave'` literal (use `seed()` de `src/test/ui.js`). **Esta ideia vai ANTES da 011** (a 011 chama `windowStats` para duas janelas).

**Problema (D-068, dossiê 011 H2/risco 1):** a API `history` devolve ~29 dias, não 30 (`T4_MAIN_SWORD`, Black Market, q1: 29 pontos, 21/10 a 18/11). `windowStats` divide a soma por `days`; com janela de 30 dias o volume sai **3,4% menor** (8.986/30 = 299,53 contra 8.986/29 = 309,86). Hoje o app só usa `days = 7` (`HISTORY_DAYS`), onde há dados de sobra, então o erro é **latente**: aparece para (a) qualquer janela maior que a série (a 011 vai oferecê-las) e (b) item novo, cuja série começa dentro da janela (divide por 7 mesmo com 3 dias de existência). **Regra (produto, sem fonte de jogo):** o divisor é o número de dias **da janela que a série cobre**, contado do primeiro registro da série até o fim da janela, no máximo `days`. Dentro desse intervalo, dia sem registro continua contando 0 (D-034 mantido; H3 do dossiê 011). **Não** é "dias com registro" (isso inflaria itens esparsos).

## Arquivos
**Altera:** `client/src/lib/liquidity.js` (só `windowStats`, `coverageLabel`, constante nova), `client/src/lib/liquidity.test.js` (casos novos, nenhum existente muda), `client/src/components/Giro.jsx` (texto do cartão). **Não toca:** `history.js`, `market.js`, `persistSchemas.js` (nenhum campo salvo), auditor (o Giro não tem linha no auditor; a 011 acrescenta a sua).
**Conflitos:** `liquidity.js` com 011 (export de `median`, `trendStats`) e 053/062 (só leem `windowOf`): esta vai primeiro.

## Interfaces
```js
// liquidity.js
export const HISTORY_API_DAYS = 29;   // observado em 2026-11-19 (dossiê 011 H2); NÃO VERIFICADO se é fixo da API
windowStats(series, { now, days }) -> { state, volumePerDay, points, windowDays, requestedDays, medianPrice, lastRecord }
//   windowDays   = dias cobertos = clamp(1 .. days)  ← divisor do volume (e o "M" de "N de M dias com dados")
//   requestedDays = days pedido
//   coveredDays = min(days, floor((toMs − max(fromMs, primeiroRegistro)) / DAY_MS)), mínimo 1; série sem registro na janela: state idle/nodata como hoje (windowDays = days)
```

## Task 1: `windowStats` com divisor pelos dias cobertos (project `logic`)
**Files:** Test `client/src/lib/liquidity.test.js`; Modify `liquidity.js`.
- [ ] **Step 1: testes falhando.** Série sintética de 29 pontos diários de 2026-10-21 a 2026-11-18 (UTC), `n` = 310 nos 28 primeiros e 306 no último (soma **8.986**, a do dossiê), `now = Date.parse('2026-11-19T12:00:00Z')`:
```js
const D = 86400000, t0 = Date.UTC(2026, 9, 21), now = Date.parse('2026-11-19T12:00:00Z');
const s29 = Array.from({ length: 29 }, (_, i) => ({ t: t0 + i * D, n: i < 28 ? 310 : 306, p: 8000 }));
it('janela de 30 dias sobre série de 29: divide por 29 (309,862), não por 30 (299,533)', () => {
  const r = windowStats(s29, { now, days: 30 });
  expect(r.volumePerDay).toBeCloseTo(8986 / 29, 6);            // 309,86207
  expect(r.volumePerDay).not.toBeCloseTo(8986 / 30, 3);
  expect([r.windowDays, r.requestedDays, r.points]).toEqual([29, 30, 29]);
});
it('janela de 7 dias com série longa: continua 7 (2166/7 = 309,4286), nada muda', () => { /* days:7 → windowDays 7, volumePerDay 2166/7 */ });
it('item novo: 10 pontos (soma 3.096), days 30 → divide por 10 (309,6); windowDays 10, points 10', () => {});
it('3 dias de existência, 100/dia, days 7 → 100 por dia (antes 300/7 = 42,857); points 3', () => {});
it('buraco DENTRO do que a série cobre continua contando 0: 1 ponto antigo (−20 d) + 4 pontos de 100 na janela de 7 → 400/7 = 57,14; windowDays 7', () => {});
it('série vazia/ausente: nodata com windowDays = days; só dados fora da janela: idle com windowDays = days', () => {});
it('estado (sparse/none/low/ok) continua decidido por points e volumePerDay com o novo divisor: 2 pontos → sparse', () => {});
it('coverageLabel: "29 de 29 dias com dados" para s29 com days 30 (usa windowDays)', () => {});
```
- [ ] **Step 2:** `npx vitest run --project logic src/lib/liquidity.test.js` → os 4 primeiros novos FALHAM (divisor antigo). **Step 3:** implementar em `windowStats` o cálculo de `coveredDays` (primeiro registro = `min t` de toda a série, não só da janela) e usá-lo como divisor e como `windowDays`; `base` (nodata/idle) mantém `windowDays: days`; acrescentar `requestedDays`. **Step 4:** mesmo comando → PASS; `npm run test:logic` (os testes antigos de `liquidity`, `Giro`, `Flipper` seguem verdes: a série deles cobre a janela). **Step 5: Commit** `fix: divisor do windowStats = dias que a série cobre (IDEIA-089)`.
- Mutações a derrubar: divisor fixo `days`; divisor = nº de pontos (`points`); primeiro registro tomado só da janela (série de 29 com `days:7` passaria a 7: ok, mas `s10` com buraco antigo falharia); `max(fromMs, …)` sem `max` (divisor > days); sem o mínimo 1.

## Task 2: texto honesto no cartão Giro
**Files:** Test `client/src/components/Giro.test.jsx` (criar, project `ui`); Modify `Giro.jsx`.
- [ ] **Step 1: teste falhando:** `GiroCard` com `rows=[{ city:'Caerleon', stats: windowStats(s10, { now, days: 7 }) }]` mostra "Vendas registradas por dia nos últimos 7 dias completos" e, quando `windowDays < requestedDays`, a dica "a série cobre só N dias (item novo ou histórico curto da API)". Com `windowDays === requestedDays` a dica não aparece.
- [ ] **Step 2–4:** FAIL → implementar a dica em `GiroCard` (usa `stats.windowDays`/`requestedDays` da melhor linha) → PASS; `npm run check`. **Step 5: Commit** `feat: Giro avisa quando a série cobre menos dias que a janela`.

## Como o Tester valida
1. Os 8 casos acima, com os números 309,862 / 299,533 / 309,4286 / 309,6 / 100 / 57,14 recalculados à mão. 2. Diferencial: para as séries reais de `T4_MAIN_SWORD` (API West, Black Market) `days:7` idêntico ao anterior; `days:30` +3,4%. 3. Mutações listadas. 4. Nenhuma tela mostra `NaN`/`Infinity` (série de 1 ponto, `windowDays` 1).

## Riscos
Item novo passa a mostrar volume/dia **maior** (menos dias no divisor): é o correto, mas muda números já vistos; o estado `sparse` (< 3 pontos) segue protegendo o veredito. O limite de 29 dias é observação de uma chamada (`HISTORY_API_DAYS`), não regra confirmada.

## PERGUNTAS PARA O GERENTE
1. Confirma "dias cobertos desde o primeiro registro" (e não "dias com registro")? Esta é a leitura de D-068 que não infla item esparso.
2. Item novo com 3 dias e 100/dia passa de 42,9 para 100/dia: aceita a mudança de número?
