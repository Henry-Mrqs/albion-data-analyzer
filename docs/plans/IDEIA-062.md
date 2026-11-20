# IDEIA-062 — Checagem de oferta do material: o plano de compra cabe no mercado?: plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-062`. Comandos `npm` em `client/`. **Pré-requisitos (já na `master`):** 010 (`history.js`, `liquidity.js`), 060, 069 (projects `logic` e `ui`, `src/test/ui.js`), 070 (`persistSchemas.js`), 005 (auditor `lib/audit`, `registerScreen`). **Regras do briefing:** cada teste é escrito, **executado e visto falhar** antes de implementar; os de componente em `*.test.jsx`. **Nenhum `*.test.jsx` pode conter `usePersisted('chave'` literal** (`persistSchemas.test.js` varre `src/components/`); use `seed()` de `src/test/ui.js`. Fonte: `docs/research/IDEIA-062.md`.

**Problema:** o plano de compra multiplica quantidade × **menor preço de venda** da cidade, que vale para **1 unidade** (o AODP não informa profundidade de ordens). Para material raro (artefato, barra T8 encantada) o lote pode ser maior que o que o mercado vende em dias e o preço real sobe conforme se compra. O jogador não olha o volume.

**Objetivo:** um cartão **"Oferta dos materiais"** abaixo do "Plano de compra e produção" (Craft) que, **sob clique**, busca o histórico dos materiais do plano e mostra, por material e cidade do plano, **dias de volume = quantidade ÷ volume médio diário de 14 dias**, com aviso (≥ 0,25) e crítico (≥ 1,0) e a cidade de maior volume como sugestão.

**Arquitetura:** `lib/supply.js` (puro: razão, nível, linhas por material; **reusa** `windowStats`/`loadedStats` de `liquidity.js` com `days: 14`, nenhuma estatística é reescrita). `components/SupplyCard.jsx` só desenha. `Crafting.jsx` chama `useHistory(ids, { cities: CITIES, enabled })` com `enabled` num `useState` local (não salvo) ligado pelo botão **Verificar oferta**: **nenhum pedido novo ao abrir a tela**. **Cartão separado, sem coluna nova na tabela do plano**: evita conflito com a 061 e a tabela larga a 375 px.

## O que o cartão considera e o que NÃO considera (dito na tela, no auditor e aqui)
Considera: unidades **negociadas** por dia (`item_count`) nos 14 últimos dias **completos** (UTC, hoje fica de fora), na cidade onde o plano compra cada material. **Não considera:** a oferta **disponível agora** (volume negociado é só aproximação: dado colaborativo, pode estar sub-registrado; S4); a **profundidade de ordens** (o AODP não tem; S1); quanto o preço sobe ao comprar o lote; o que outros compradores fazem no mesmo dia. Os limiares **0,25 e 1,0 são decisão de produto sem fonte** (S3), exibidos como "regra do app". Material **de refino intermediário** só entra se o plano o **compra** (linha `kind:'buy'`); matéria-prima dentro de uma cadeia refinada entra como o plano a lista.

## Arquivos: exclusivos, compartilhados, ordem
**Criados:** `client/src/lib/supply.js`, `supply.test.js`, `client/src/components/SupplyCard.jsx`, `SupplyCard.test.jsx`, `client/src/components/Crafting.supply.test.jsx`.
**Alterados:** `client/src/components/Crafting.jsx` (estado `checkSupply`, hook, cartão após o plano; ~12 linhas), `client/src/lib/audit/craft.js` (2 Vars + `ctx.supply` em `auditCraft`), `client/src/lib/audit/core.js` (**só** a chave `depth` em `NOT_CONSIDERED`), `client/src/lib/audit/craft.test.js` (contagens de linhas, se fixadas).
**NÃO toca:** `persistSchemas.js` (**nenhum campo salvo novo**: limiares são constantes; botão é estado de tela), `craftPlan.js`, `econ.js`, `market.js`, `history.js`, `liquidity.js`, `Refining.jsx` (Refino fora; D-060), `Flipper.jsx`, catálogo.
**Compartilhados:** `Crafting.jsx` (fim do arquivo) e `core.js`/`craft.js` com a **061** (mesmo padrão: cartão novo + chave em `NOT_CONSIDERED`); **ordem: 062 antes da 061**; a 061 reaproveita a chave `depth`. `Crafting.jsx` também é editado por 012/059/065 (blocos de venda): conflito só textual.

## Interfaces
```js
// supply.js (puro)
export const SUPPLY_DAYS = 14, SUPPLY_WARN = 0.25, SUPPLY_CRIT = 1.0;   // constantes de produto
supplyRatio(qty, volumePerDay): number|null     // qty/vol; null se qty<=0, vol<=0 ou algum não finito
supplyLevel(ratio): 'ok'|'warn'|'crit'|null     // null->null; >=1 crit; >=0.25 warn; senão ok
supplyRows({ plan, history, prices, now, cities = CITIES }): Row[]
// Row = { mid, city, qty, state, volumePerDay, days, ratio, level, better }
//   plan: linhas de computeCraft().plan; usa só kind==='buy' com mid string, city string e qty finita > 0; soma qty por `mid|city`
//   state: 'unloaded' (sem série) | 'nodata' (nodata, idle ou sparse: SEM razão) | 'ok'|'low'|'none' (volume usável)
//   better: null | { city, volumePerDay, ratio, price } = cidade de MAIOR volume usável (≠ city), só se level !== 'ok' e ratio_other < ratio
supplyIds(plan): string[]                       // mids únicos dos buy válidos (para o hook)
```
`windowStats(series, { now, days: 14 })` já devolve `volumePerDay = soma(n)/days` (dia sem registro conta 0) e `state`. Aqui `idle`/`sparse`/`nodata` viram `'nodata'` (nunca "razão infinita").

## Mensagens (texto final)
Título **"Oferta dos materiais"**. Dica: "Compara a quantidade do plano com as unidades negociadas por dia (média dos últimos 14 dias completos) na cidade do plano. O app não vê a profundidade das ordens: o preço da tabela vale para 1 unidade e o real sobe conforme você compra. Limiares (regra do app, sem fonte): aviso a partir de 0,25 dia de volume; crítico a partir de 1,0." Botão **Verificar oferta** (desabilitado enquanto carrega; texto "Carregando…"). Por linha: aviso `warn` "O plano equivale a N dias de todo o volume de {cidade}: o preço real será maior"; `crit` "…o preço real será bem maior; reconsidere o lote"; `better`: "{Cidade} negocia {V}/dia (preço de tabela {P}, confira): o mesmo lote seria {R} dias". `nodata`: "sem histórico suficiente (dados insuficientes ou sem venda registrada): sem veredito". Erro do histórico: `Banner warn` "Oferta indisponível: {mensagem}". Cidade/material sem série: "—".

## Tasks (1 commit cada; teste primeiro e visto falhar)

### Task 1: razão e nível (puro, project `logic`)
**Files:** Create `supply.test.js`, `supply.js` (só `supplyRatio`, `supplyLevel` e as constantes).
- [ ] **Step 1: testes falhando** (números recalculados com `node -e` a partir do dossiê §4):
```js
it('supplyRatio: caso 2 do dossiê (Broadsword T8.3 x5, 80 barras, RRR 33/133)', () => {
  const liq = 80 * (1 - 33 / 133);                     // 60,150376
  expect(supplyRatio(liq, 509 / 14)).toBeCloseTo(1.6544, 3);   // Martlock
  expect(supplyRatio(liq, 626 / 14)).toBeCloseTo(1.3452, 3);   // Lymhurst
});
it('caso 1 (comum) 1.203 barras / (927.424/7) = 0,009', () => expect(supplyRatio(1203, 927424 / 7)).toBeCloseTo(0.00908, 4));
it('caso 3: 20 artefatos', () => { expect(supplyRatio(20, 60 / 14)).toBeCloseTo(4.6667, 3); expect(supplyRatio(20, 839 / 14)).toBeCloseTo(0.3337, 3); });
it.each([[0, 10], [-5, 10], [10, 0], [10, -1], [NaN, 10], [10, NaN], [Infinity, 10], [10, Infinity], [null, 10], ['12', 10]])('supplyRatio(%s, %s) = null', (q, v) => expect(supplyRatio(q, v)).toBeNull());
it('supplyLevel: limites exatos 0,25 e 1,0 são aviso e crítico; abaixo é ok; null segue null', () => {
  expect([0.2499, 0.25, 0.9999, 1, 4.67, null].map(supplyLevel)).toEqual(['ok', 'warn', 'warn', 'crit', 'crit', null]);
});
```
- [ ] **Step 2:** `npm run test:logic -- src/lib/supply.test.js` → FAIL (`supply.js` não existe).
- [ ] **Step 3:** implementar `supplyRatio` (aceita só `typeof number` finito > 0; `'12'` e `null` → `null`) e `supplyLevel`.
- [ ] **Step 4:** PASS. **Mutações (cópia fora do repo):** `>=` → `>` em 0,25 ou 1; trocar `qty/vol` por `vol/qty`; aceitar string; todas derrubadas.
- [ ] **Step 5: Commit** `feat: razão e nível da oferta do material (IDEIA-062)`.

### Task 2: linhas por material com histórico de 14 dias (puro)
**Files:** Modify `supply.test.js`, `supply.js` (`supplyRows`, `supplyIds`).
**Interfaces — Consumes:** `loadedStats(data, mid, city, { now, days })`, `CITIES` de `market.js`, `quote(prices, mid, city, 'sell')`.
- [ ] **Step 1: testes falhando.** Séries sintéticas para `now = Date.UTC(2026, 10, 18, 12)` (janela = 04/11 a 17/11 UTC, 14 dias); helper `serie(total)` cria 14 pontos `{t, n, p}` na janela (13 com `floor(total/14)` e o último com o resto: a soma bate `total`, logo `volumePerDay = total/14`):
```js
const MB = 'T8_METALBAR_LEVEL3@3';
const hist = { [MB]: { Martlock: serie(509), Lymhurst: serie(626) } };
const plan = [{ kind: 'buy', mid: MB, city: 'Martlock', qty: 80 * (1 - 33 / 133) }];   // 60,150376
it('caso 2 do dossiê: Martlock 1,65 dias (crítico); melhor cidade Lymhurst com 1,35', () => {
  const [r] = supplyRows({ plan, history: hist, prices, now });   // prices: s de Lymhurst = 660000 (valor do teste)
  expect(r).toMatchObject({ mid: MB, city: 'Martlock', state: 'ok', level: 'crit' });   // 36,36/dia >= 15 => 'ok'
  expect(r.volumePerDay).toBeCloseTo(36.357, 3);
  expect(r.ratio).toBeCloseTo(1.6544, 3);
  expect(r.better).toMatchObject({ city: 'Lymhurst', price: 660000 });
  expect(r.better.volumePerDay).toBeCloseTo(44.714, 3);
  expect(r.better.ratio).toBeCloseTo(1.3452, 3);
});
// caso 3: 20 artefatos em Caerleon, serie(60) (4,29/dia => state 'none' MAS com razão): ratio 4.6667, level 'crit';
//   better = Lymhurst, serie(839): volumePerDay 59.929, ratio 0.3337
// caso 1: 1.203 barras T4 em Fort Sterling com serie(132489 * 14): ratio 0.0091, level 'ok', better null
```
Casos de borda, cada um um `it`: série ausente → `state:'unloaded'`, sem razão; série `[]` → `'nodata'`; só 2 pontos na janela (`sparse`) → `'nodata'`; série só fora da janela (`idle`) → `'nodata'`; mesma `mid|city` em duas linhas do plano soma as quantidades; linha `kind:'make'`, sem `city`, `qty` 0/NaN/negativa/`Infinity`, `mid` não string são ignoradas **sem lançar**; `plan`/`history`/`prices` `undefined` ou `null` → `[]`; `better` só aparece se `level !== 'ok'`; cidade com série `nodata` nunca vira `better`; `better` nunca é a própria `city`; empate de volume → a primeira em `CITIES`.
- [ ] **Step 2:** FAIL. **Step 3:** implementar (um laço; nenhuma média própria). **Step 4:** PASS. Mutações: janela 7 em vez de 14; incluir `make`; `better` com ratio maior; somar errado: derrubadas. **Step 5: Commit** `feat: oferta por material com histórico de 14 dias (IDEIA-062)`.

### Task 3: cartão (jsdom)
**Files:** Create `SupplyCard.test.jsx`, `SupplyCard.jsx`. Props: `{ rows, loading, error, loaded, onCheck }`.
- [ ] **Step 1: testes falhando:** sem `loaded`: só o botão e a dica (**sem tabela**); clique chama `onCheck` uma vez; `loading` desabilita e troca o texto; com as linhas do caso 2: "1,65" na linha de Martlock, texto crítico "bem maior", sugestão "Lymhurst negocia 44,7/dia"; linha `nodata` mostra "sem histórico suficiente" e **nenhum** número de razão; linha `ok` sem aviso e razão "0,01"; `error` mostra o Banner; a dica contém "profundidade" e "0,25". Formatação pt-BR (vírgula).
- [ ] **Steps 2–4:** FAIL → implementar (usa `Banner`, `fmt` de `ui`/`econ`; nada calculado aqui) → PASS. **Step 5: Commit** `feat: cartão Oferta dos materiais (IDEIA-062)`.

### Task 4: ligar no Craft (jsdom, mocks de `usePrices`/`useHistory` como `Crafting.targetNoTax.test.jsx`)
**Files:** Create `Crafting.supply.test.jsx`; Modify `Crafting.jsx`.
- [ ] **Step 1: testes falhando.** `useHistory` mockado: a chamada **sem** clique recebe `enabled:false` (o mock registra os argumentos) e a tela **não** pede histórico dos materiais; após clicar **Verificar oferta**, `enabled:true` e `ids` = `supplyIds(plan)` (ordenados), `cities` = `CITIES`; o cartão só existe com `rec && prices && plan.length`; item sem preços de material → sem cartão; trocar de item volta `checkSupply` para `false` (efeito ou `key`); estado antigo: `seed('craft:cfg', craftCfg())` **sem** nenhum campo novo → cartão aparece normalmente (não há campo salvo novo; o teste afirma `localStorage` **inalterado** depois do clique).
- [ ] **Steps 2–4:** implementar: `const [checkSupply, setCheckSupply] = useState(false)`; `const sup = useHistory(supplyIds(plan), { cities: CITIES, enabled: checkSupply && !!rec && !!prices && plan.length > 0 })`; `rows = supplyRows({ plan, history: sup.history, prices, now })`. **Atenção:** o `useHistory` existente (só `targetMid`) **não muda**. PASS; `npm run test:ui` verde.
- [ ] **Step 5: Commit** `feat: Oferta dos materiais no Craft (IDEIA-062)`.

### Task 5: auditor (contrato `registerScreen`)
**Linhas que este plano registra** (nenhum campo salvo novo ⇒ o contrato `contract.test.js` **não muda**; as linhas existem porque a tela mostra um número novo e deve dizer o que ele não é):
| Var (tela `craft`) | `fields` | kind / affects | Linha |
|---|---|---|---|
| `supply` | `[]` | `info-only` / `none` | "Oferta dos materiais (dias de volume)": valor "não verificada" (sem `ctx.supply`) ou "N material(is) verificado(s), K com aviso"; origem `derived`; nota "Não muda o lucro. Limiares 0,25 e 1,0: regra do app, sem fonte." |
| `nc-depth` (via `notConsideredRows(['depth'])`) | `[]` | `not-considered` / `none` | `NOT_CONSIDERED.depth = ['Profundidade do mercado', 'O AODP não informa a profundidade das ordens: o preço do plano vale para 1 unidade e sobe conforme se compra; a checagem de oferta usa só unidades negociadas.']` |
**Files:** Modify `audit/craft.js` (`auditCraft` repassa `supply: i.supply` — objeto `{ rows }` ou `null`), `core.js`, `Crafting.jsx` (passa `supply: checkSupply ? { rows } : null`), `craft.test.js`.
- [ ] **Step 1: testes falhando** em `craft.test.js`: sem `supply` → linha `supply` com valor "não verificada" e `status:'info-only'`; com 2 linhas (1 `crit`) → "2 material(is) verificado(s), 1 com aviso"; `nc-depth` presente; `ctx.supply` lixo (`{rows: 5}`, `'x'`) → linha "não foi possível ler" sem lançar (o `auditScreen` já protege; o teste prova). `sensitivity.test.js`: `supply` não tem `probe` (sem campo): continua verde. Mutação: marcar `supply` como `applied` → `registry` exige probe ⇒ reprova.
- [ ] **Steps 2–4:** FAIL → implementar → `npm test` (logic + ui) verde; **se `craft.test.js` fixa contagens de linhas, atualizar só as contagens e declarar no relatório**. **Step 5: Commit** `feat: auditor lê a oferta dos materiais (IDEIA-062)`.

### Task 6: conferência manual (Executor, na ordem) e README
- [ ] `npm run dev` com a API real: Craft de Broadsword T8.3 ×5, bancada 500, cidade de bônus: **Verificar oferta** mostra, para `T8_METALBAR_LEVEL3@3`, valores na ordem de grandeza do dossiê (36 a 45 un./dia; **valores mudam com o mercado, não são asserções**). Item comum (T4 ×100): sem aviso. Sem clique: aba Rede do navegador sem pedido `stats/history` dos materiais. **Commit:** `docs: conferência da 062`.

## Como o Tester valida
1. **Casos concretos** (existem, falham antes, passam depois): 1,654 / 1,345 / 0,0091 / 4,667 / 0,334; limites 0,25 e 1,0; `nodata` sem razão; soma por `mid|city`; `better` só com aviso e nunca a mesma cidade.
2. **Mutações** da Task 1 e 2; sobrevivente reprova.
3. **Estado antigo/corrompido:** `craft:cfg` antigo (9e1e4a2, sem campos novos) e `null`/lixo nas 8 chaves não aciona o `ErrorBoundary` (perfis do laudo 070); histórico com pontos `NaN`/negativos (o `parseHistory` descarta), cidade sem série, plano sem linhas `buy`: cartão some ou mostra "—", sem tela branca.
4. **Honestidade:** o texto cita "profundidade", "negociadas" e "regra do app"; nenhum lugar chama o resultado de "oferta disponível". Tester confere a 375 px (a tabela do cartão tem `table-wrap` rolável).
5. **Requisições:** sem clique, zero chamadas de histórico dos materiais; com clique, ≤ `HISTORY_MAX_REQUESTS` (5) e um 429 mostra o Banner, sem repetir.
6. **O que o usuário estranharia:** razão "∞" ou "NaN"; aviso em material comum; sugestão de cidade sem dizer que o preço pode ser maior; botão que busca sozinho.

## Riscos
1. **Janela de 14 dias contra a API:** `time-scale=24` costuma trazer mais de 14 dias; `windowStats` recorta. Se a API trouxer menos, o estado vira `sparse` ⇒ sem veredito (correto).
2. **`useHistory` por chave de ids:** mudar o plano (outro nº de crafts) muda `qty` mas **não** os ids ⇒ sem novo pedido (cache de 1 h).
3. **Preço da cidade `better` é de tabela** (1 unidade): a mensagem diz "confira".
4. **Conflito textual** em `Crafting.jsx`/`core.js` com 061/012/059/065; resolver na ordem de merge.

## Critério de pronto
`npm run check` verde; todas as mutações derrubadas; só os arquivos listados alterados; nenhum campo novo em `persistSchemas.js`; linhas `supply` e `nc-depth` no auditor; conferência manual registrada.

## PERGUNTAS PARA O GERENTE
1. **Limiares 0,25 e 1,0** (sem fonte; sugestão do dossiê). Aprova como constantes de produto, exibidas como "regra do app"?
2. **Sob clique** (botão) em vez de automático: aceita, para poupar a cota da API (180/min)? Alternativa: automático só para materiais T6+ ou encantados.
3. **Refino** (plano de compra do Refino) fica de fora desta ideia. Quer uma ideia separada?
4. **Sugestão de cidade** usa o maior volume e só mostra o preço de tabela; deve também comparar o **custo** do lote nas duas cidades?
5. Dossiê pede medição em jogo (preço da 1ª e da 20ª unidade de um material raro) para calibrar o limiar; fica na lista de conferências do usuário?
