# IDEIA-086 — Registrar a aba Premium no auditor + contrato que reprova aba/chave sem `registerScreen`: plano

> **Para o Executor:** `superpowers:executing-plans` ou `subagent-driven-development`. Branch de integração (D-070). `npm` em `client/`. Teste visto falhar antes de implementar; nenhum `*.test.jsx` com `usePersisted('chave'` literal (use `seed()`). **Pré-requisito:** 005 (`src/lib/audit`, contrato `registerScreen`). **Vai cedo:** as ideias com aba ou chave nova (013, 036, 011, 064...) passam a depender do contrato novo. Origem: D-066/D6 do laudo 005 ("contrato não pega aba/chave nova sem `registerScreen`, ex.: 054"); prioridade alta (a dor central é a variável esquecida).

**Problema.** (1) A aba Premium (054) tem variáveis de cálculo que o auditor não lista: preço do ouro, custo do Premium em ouro (padrão 3.750 **não verificado**), prata vendida por mês, prata por foco, foco por dia (padrão 10.000 **não confirmado**), os 30 dias, os 4 pontos de imposto. (2) O contrato (`contract.test.js`) só vigia as chaves de `SET_FILES` (`craft:cfg`, `refine:cfg`, `rrr:cfg`, `target:cfg`); uma aba nova ou uma chave salva nova passa sem nenhuma linha no auditor, e foi assim que a 054 entrou.

## Arquivos
**Cria:** `client/src/lib/audit/premium.js` + `premium.test.js`, `client/src/lib/audit/tabs.js` + `tabs.test.js`, `client/src/lib/audit/sensitivity.premium.test.js`, `client/src/components/Premium.audit.test.jsx`.
**Altera:** `client/src/lib/audit/registry.js` (+`'balance'` em `AFFECTS`; +`uncoveredKeys`, `uncoveredTabs` puras), `client/src/lib/audit/contract.test.js` (lista de telas, `SET_FILES['premium:cfg']`, contrato das chaves e das abas), `client/src/lib/audit/core.js` (nada além de reuso), `client/src/components/Premium.jsx` (`VarAuditCard`, 2 linhas), `client/src/lib/audit/registry.test.js` (`'balance'` válido).
**Conflitos:** `contract.test.js`/`registry.js` com 013/036/011/064/051/062/061/003/009/007 (**todas** acrescentam tela/Var/chave: **086 antes de todas**; elas só acrescentam entradas em `tabs.js`); `Premium.jsx` com ninguém.

## Interfaces
```js
// registry.js
export const AFFECTS = ['cost','profit','rrr','balance','none'];    // 'balance' = saldo de 30 dias da aba Premium
uncoveredKeys(persistedKeys: string[], screens: {cfgKeys:string[]}[], unaudited: {[key]: string}) -> string[]
//   chave salva que NENHUMA tela cobre em cfgKeys e que não está em `unaudited` com motivo (string não vazia)
uncoveredTabs(tabIds: string[], tabAudit: {[tab]: {screen: string|null, reason?: string}}, screenIds: string[]) -> string[]
//   aba ausente do mapa; ou screen que não está registrada; ou screen null sem reason
// tabs.js
export const TAB_AUDIT = {
  market: { screen: null, reason: 'consulta de preços e giro; sem cálculo de lucro (o Mercado Negro e a tendência têm linhas no Craft/IDEIA-088)' },
  refining: { screen: 'refine' }, crafting: { screen: 'craft' },
  flipper: { screen: null, reason: 'Flipper fora da v1 do auditor (D-059); dívida declarada' },
  rrr: { screen: 'rrr' }, premium: { screen: 'premium' },
};
export const UNAUDITED = {
  'craft:item': 'item escolhido: aparece na linha "Receita" do Craft',
  'market:item': 'item da consulta do Mercado (sem cálculo de lucro)', 'market:quality': 'qualidade da consulta do Mercado (sem cálculo de lucro)',
  'flip:cfg': 'Flipper fora da v1 do auditor (D-059); dívida declarada',
  settings: 'servidor, Premium e teto de taxa aparecem nas linhas "Servidor", "Premium" e "Taxa de bancada" do Craft e do Refino',
};
// audit/premium.js
auditPremium({ cfg, values, issues, res, gold, now }) -> { screen:'premium', rows, counts }     // gold = { price, t } | null (API); nunca lança
```

## Task 1: contrato que reprova chave e aba sem tela (project `logic`)
**Files:** Create `tabs.js`, `tabs.test.js`; Modify `registry.js`, `registry.test.js`, `contract.test.js`.
- [ ] **Step 1: testes falhando.**
```js
// tabs.test.js / contract.test.js
it('uncoveredKeys: chave nova sem tela e sem motivo REPROVA nomeando a chave', () => {
  expect(uncoveredKeys(['craft:cfg','campo:novo'], [{ cfgKeys: ['craft:cfg'] }], {})).toEqual(['campo:novo']); });
it('chave em unaudited com motivo passa; com motivo vazio ("" ou "  ") reprova', () => {
  expect(uncoveredKeys(['x'], [], { x: 'motivo' })).toEqual([]); expect(uncoveredKeys(['x'], [], { x: '  ' })).toEqual(['x']); });
it('uncoveredTabs: aba ausente do mapa reprova; screen inexistente reprova; screen null sem reason reprova; com reason passa', () => {
  expect(uncoveredTabs(['a','b'], { a: { screen: 'craft' } }, ['craft'])).toEqual(['b']);
  expect(uncoveredTabs(['a'], { a: { screen: 'fantasma' } }, ['craft'])).toEqual(['a']);
  expect(uncoveredTabs(['a'], { a: { screen: null } }, [])).toEqual(['a']);
  expect(uncoveredTabs(['a'], { a: { screen: null, reason: 'ok' } }, [])).toEqual([]); });
it('CONTRATO REAL: toda chave de PERSISTED está numa tela registrada ou em UNAUDITED', () => {
  const miss = uncoveredKeys(Object.keys(PERSISTED), screenIds().map(getScreen), UNAUDITED);
  expect(miss, `chave salva sem tela no auditor: ${miss.join(', ')}. Registre a tela (registerScreen) ou acrescente em UNAUDITED com motivo em lib/audit/tabs.js`).toEqual([]); });
it('CONTRATO REAL: toda aba de App.jsx (TABS) está em TAB_AUDIT; o teste lê os ids do texto de App.jsx', () => {
  const ids = [...read('../App.jsx').matchAll(/\{ id: '([a-z]+)', label:/g)].map((m) => m[1]);
  expect(ids).toEqual(['market','refining','crafting','flipper','rrr','premium']);   // se a lista mudar, este teste obriga a revisar o auditor
  const miss = uncoveredTabs(ids, TAB_AUDIT, screenIds()); expect(miss, `aba sem tela no auditor: ${miss.join(', ')}`).toEqual([]); });
it('mutação: se TAB_AUDIT perde "premium", o contrato real reprova nomeando premium', () => {});
it('as telas registradas passam a ser craft, premium, refine, rrr (ordem alfabética)', () => { expect(screenIds().sort()).toEqual(['craft','premium','refine','rrr']); });
```
  `registry.test.js`: `'balance'` é `affects` aceito; `'saldo'` continua inválido (`TypeError`). O teste existente "as 3 telas v1 estão registradas" é **substituído** pelo acima (a lista cresce).
- [ ] **Step 2:** `npx vitest run --project logic src/lib/audit` → FAIL (`Failed to resolve import "./tabs"`). **Step 3:** implementar as duas funções puras e o mapa. O contrato real da aba `premium` só passa depois da Task 2 (deixar o teste "contrato real das abas" **comentado como `it.todo` na Task 1** e habilitá-lo na Task 2, para o commit da Task 1 ficar verde). **Step 4:** PASS. **Step 5: Commit** `test: contrato do auditor reprova chave salva e aba sem tela (IDEIA-086)`.
- Mutações: `uncoveredKeys` ignorando `unaudited`; motivo vazio aceito; `uncoveredTabs` aceitando `screen` não registrada; regex de abas desatualizada (ids diferentes) sem reprovar.

## Task 2: tela `premium` do auditor (`audit/premium.js`)
**Files:** Create `audit/premium.test.js`, `audit/premium.js`, `sensitivity.premium.test.js`; Modify `registry.js` (`'balance'`).
- [ ] **Step 1: testes falhando.** Cenário-base (todas as contas de `premiumBalance`, **recalculadas com `node -e`**): ouro 9.414, custo do Premium padrão 3.750 (vazio na cfg), volume 20.000.000, prata por foco 43, foco/dia padrão 10.000 (vazio): custo = 3.750 × 9.414 = **35.302.500**; imposto economizado = (0,08 − 0,04) × 20.000.000 = **800.000**; valor do foco = 10.000 × 30 × 43 = **12.900.000**; saldo = 800.000 + 12.900.000 − 35.302.500 = **−21.602.500**. (O Executor confere com `node -e` e `premiumBalance` real: se diferir, vale o código e o plano é corrigido no mesmo commit.) Linhas esperadas em `auditPremium`:
  | id | origem | status | observação |
  |---|---|---|---|
  | `gold` | `user` | `applied` | valor digitado; vazio = `not-considered` "informe o preço do ouro: o saldo não é calculado" |
  | `gold-api` | `api` | `applied`/`stale` (por `apiRow`, `maxAgeH` 24 h) | preço atual da API e idade; só informativo se `cfg.gold` difere |
  | `gold-cost` | `app-default` quando vazio | `unconfirmed` ("padrão não confirmado") | "3.750 ouro/30 dias, AO Refinery, 2026-11-18, fonte secundária, não verificado no wiki oficial"; digitado = `user`/`applied` |
  | `volume` | `user` | `applied` | vazio = 0 ("sem volume, só o foco conta") |
  | `silver-per-focus` | `user` | `applied` | vazio = 0 |
  | `focus-day` | `app-default` quando vazio | `unconfirmed` | "10.000 de foco por dia do Premium, fonte secundária, padrão do app não confirmado" |
  | `days` | `app-default` | `unconfirmed` | 30 dias (`PREMIUM.days`), "fonte secundária" |
  | `tax-saving` | `derived` | `applied` | 4 pontos = `TAX_SAVING` (de `econ.js`), fonte "wiki e AFM 2026 (média-alta)" |
  | `balance` | `derived` | `applied` | saldo em 30 dias, derivado de `premiumBalance` (lê `res`, **não recalcula**) |
  | `nc-premium` | `app-default` | `not-considered` | uma linha por item de `NOT_COUNTED` (+50% de prata e saque, fama extra, pontos de aprendizado, +50% de coleta, ilhas e animais) com a nota "a conta é só imposto + foco − custo; o app não recomenda a compra" |
  Testes: (a) `res.state==='nogold'` → só `gold` `not-considered`, sem `balance`; (b) `cfg.goldCost` digitado `'3000'` troca `gold-cost` para `user`/`applied`; (c) `focusPerDay` vazio → `unconfirmed`; digitado `'5000'` → `applied`; (d) correção da 060: `cfg.gold` `'abc'` → nota "corrigido" usando `correctionNote` (sem eco de lixo); (e) `gold` da API de 30 h → `stale`; (f) `cfg` corrompido (`null`, `[]`, `{gold:{}}`) → nunca lança, linha "não foi possível ler" no lugar; (g) contagens (`counts`) fecham com as linhas.
  **Sensibilidade** (`sensitivity.premium.test.js`, arquivo novo: **não** altera o harness do Craft): mede `premiumBalance(cleanPremiumInputs(cfg).values).balance` antes/depois; `gold`, `gold-cost`, `volume`, `silver-per-focus`, `focus-day` (**kind `applied`, `affects:'balance'`**) têm que **mudar** o saldo (probes: `gold:'10000'`; `goldCost:'3000'`; `volume:'30000000'`; `silverPerFocus:'60'`; `focusPerDay:'5000'`); `gold-api`, `nc-premium`, `days`, `tax-saving` (sem campo) não têm probe; mutação: marcar `volume` como `info-only` reprova ("não deveria mudar").
- [ ] **Step 2:** FAIL. **Step 3:** `audit/premium.js`: `registerScreen('premium', { cfgKeys:['premium:cfg'], ignoredFields:{}, vars })` com `V(id,label,fields,kind,affects,build,extra)` no mesmo estilo de `rrr.js`; reusar `apiRow`, `correctionNote`, `joinNote`, `row` de `core.js` e `PREMIUM`/`TAX_SAVING`/`NOT_COUNTED` de `premium.js` (**nenhuma constante copiada**). **Step 4:** PASS; habilitar na `contract.test.js` o `it` das abas (era `it.todo`) e `SET_FILES['premium:cfg'] = ['Premium.jsx']` (`set({...})` do componente). **Step 5: Commit** `feat: tela Premium no auditor de variáveis (IDEIA-086)`.
- Mutações: `gold-cost` padrão como `applied` (esconde "não confirmado"); `focus-day` idem; `NOT_COUNTED` fora; `balance` recalculado em vez de lido; `volume` vazio mostrado como erro.

## Task 3: cartão na aba Premium
**Files:** Create `Premium.audit.test.jsx`; Modify `Premium.jsx`.
- [ ] **Step 1: testes falhando** (project `ui`; `useGold` mockado; `seed('premium:cfg', …)` **sem** literal `usePersisted('…'`): a aba mostra o cartão "Variáveis deste cálculo" **recolhido** (o mesmo `VarAuditCard` das outras abas); com a cfg vazia e ouro da API aparece `gold-cost` "padrão não confirmado" e `focus-day` "padrão não confirmado" e a contagem de "NÃO consideradas" = 5; digitar `goldCost` troca a linha para "digitado"; o cartão **não** muda o resultado (compara a tabela de saldo com e sem o cartão: iguais); `premium:cfg` corrompido não derruba a aba.
- [ ] **Step 2–4:** FAIL → montar `<VarAuditCard audit={audit} />` no fim do cartão "Resultado" com `auditPremium({ cfg, values, issues, res, gold: api, now })` → PASS; `npm run check`. **Step 5: Commit** `feat: Premium mostra o quadro de variáveis (IDEIA-086)`.

## Como o Tester valida
1. Cenário-base: −21.602.500 (35.302.500 / 800.000 / 12.900.000). 2. **Auditoria da verdade** (D-064): cada linha confere com o que a tela usou (digitar cada campo e ver a linha e o saldo mudarem; padrão vazio = `unconfirmed`, nunca "digitado"). 3. **Contrato:** (a) adicionar `'zz:nova'` a `PERSISTED` numa cópia → reprova nomeando; (b) adicionar `{ id: 'zz', … }` a `TABS` → reprova; (c) remover `premium` de `TAB_AUDIT` → reprova. 4. Sensibilidade e mutações. 5. Estado salvo antigo/corrompido de `premium:cfg` × aba. 6. A aba não calcula nada novo: diferencial do saldo master × branch idêntico.

## Riscos
1. `flip:cfg` e `market:*` ficam em `UNAUDITED` com motivo: **dívida declarada**, não esquecida (D-059: auditor v1 = Craft/Refino/RRR). 2. O regex que lê `TABS` de `App.jsx` quebra se a sintaxe mudar: o teste exige a lista exata e falha alto (não passa em silêncio). 3. `'balance'` é o primeiro `affects` fora de custo/lucro/RRR: o harness do Craft não o conhece (por isso o arquivo de sensibilidade próprio).

## PERGUNTAS PARA O GERENTE
1. `flip:cfg` e as chaves do Mercado ficam como "fora da v1" com motivo no contrato (em vez de ganhar telas agora). Aceita? (Auditar o Flipper seria uma ideia nova.)
