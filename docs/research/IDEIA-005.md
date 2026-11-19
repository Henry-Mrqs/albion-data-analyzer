# IDEIA-005 — Auditor de variáveis: painel que lista tudo que entrou (e o que ficou de fora) em cada cálculo

## 1. O que faz e por que o jogador usa
A dor central: o usuário **esquece variáveis** (foco, bônus de cidade, bônus diário, taxa de bancada, imposto, taxa de criação de ordem, despesas, venda sem imposto, itens que não retornam, Premium) e confia num lucro que não considerou algo. Hoje o app aplica quase tudo, mas **não mostra o conjunto**: a pessoa vê o resultado e não sabe que a taxa de bancada é o padrão 400 (não confirmado), que o bônus diário expirou e virou 0, que a receita escolhida foi a mais barata, ou que o preço de venda tem 2 dias.

Funcionalidade: um cartão **"Variáveis deste cálculo"** em cada tela (Craft, Refino, RRR, Comparar cidades, Preço-alvo, Estresse) com uma linha por variável: **nome, valor usado, origem, estado**. Origens: `jogo` (regra/dado do jogo, com fonte), `padrão do app` (valor nosso, não confirmado), `digitado` (o usuário), `API` (preço do AODP com idade), `derivado` (calculado a partir de outras). Estados: `aplicada`, `padrão não confirmado`, `velha/expirada`, `NÃO considerada` (existe no jogo e o app não modela) e `fora do cálculo` (informativa). O cartão nunca recalcula nada: lê dos mesmos objetos que o cálculo usou.

Competidores: a Albion Free Market separa "Daily Bonus and Extra Expenses", "Consumables" e "No Sales Tax" por craft (IDEIA-048 X2, consulta 2026-11-18) e a AlbionUtil tem "Extra Costs" (048 X1); **nenhuma das duas** (que eu tenha visto) lista as variáveis ignoradas nem a origem de cada valor. NÃO VERIFICADO além dessas duas descrições.

## 2. Regras de negócio

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| V1 | O auditor é **só leitura**: valor exibido = valor realmente usado pela função de cálculo (depois da limpeza da IDEIA-060), nunca recomputado por fórmula própria | decisão de produto (evita um segundo cálculo que diverge) | — |
| V2 | Toda linha tem `origem` e `estado` obrigatórios; linha sem origem é erro de teste | decisão de produto | — |
| V3 | Variável **não modelada** é listada mesmo sem valor ("não considerada"), porque o problema é justamente o que o usuário não vê | decisão de produto | — |
| V4 | Constantes do jogo exibem a fonte curta (AUDITORIA-001): RRR `PB/(100+PB)`, base 18, +40 refino, +15 craft, +59 foco, +10/+20 diário, 0,1125 de nutrição, imposto 4%/8%, setup 2,5% | AUDITORIA-001 §1 a §3 (dump `craftingmodifiers.xml`, wiki trecho de busca, AFM 2026) | ALTA (fórmula, 18, 40, 15); MÉDIA-ALTA (59, diário, imposto) |
| V5 | O foco (+59) **não está no dump** (regra do servidor): origem "jogo", confiança média-alta | AUDITORIA-001 §1 | MÉDIA-ALTA |
| V6 | Itens `unverified` e o valor do artefato na taxa de bancada seguem marcados NÃO VERIFICADO | AUDITORIA-001 §2; `recipeAlt.js` (`FEE_DEPENDENCE_WARNING`, `returnBadge`) | — |

## 3. Inventário do código atual: que variável existe em cada tela e qual função a aplica
Lido em `client/src/lib` e `client/src/components` (master, commit `b0a216f`). Onde o Planejador deve **ler** o valor: coluna "ler de".

### 3.1 Craft (`Crafting.jsx` -> `craftPlan.js::computeCraft`)
| Variável | Origem hoje | Quem aplica | Ler de |
|---|---|---|---|
| Receita (variante artefato/ficha/Base SET) | `cfg.recipeVariant` ou "auto" (mais barata) | `recipeAlt.js::resolveVariant`/`pickCheapest`; `catalog.recipeVariants` | `idx`, `variants[idx]` (na tela) |
| Quantidade de crafts | digitado `cfg.crafts` (limpo por `cleanCraftCfg`) | `computeCraft` (`rates.crafts`) | `c.rates.crafts` |
| Cidade de craft e especialização (+15) | `cfg.craftCity`; `cfg.specialty ?? bonusCity===craftCity`; cidade de bônus vem de `catalog.cityOf` (dump) | `craftRates` | `c.rates.specialty`, `bonusCity` |
| Foco do craft (+59) | digitado `cfg.focus` | `econ.rrr` | `cfg.focus` |
| Bônus diário do craft (0/10/20) | digitado `cfg.craftDaily` + `craftDailyAt`; expira no reset | `dailyBonus.js::effectiveDaily`, `econ.rrr` | `daily` (`{value, stale, future}`), `cfgEff.craftDaily` |
| RRR automático / manual | calculado / `cfg.customRRR` (%) | `econ.rrr`, `resolveRRR`, `validateInputs` (teto `maxRRR`) | `c.rates.autoRRR`, `c.rates.craftRRR` |
| RRR do refino dos materiais (por tipo) | cidade `cfg.refineCity` ('auto' = cada recurso na sua cidade), `cfg.refineFocus`, `cfg.refineDaily[tipo]` | `craftRates::refineRRRFor` | `c.rates.refineRRRFor(tipo)`; `line.rr` |
| Ingrediente que não retorna | dump (`maxreturnamount=0`) -> 3º campo da receita; "não verificado" quando só o token barra | `computeCraft` (`r.returnable ? 1-RRR : 1`); `returnBadge` | `line.returnable`, `line.unverified` |
| Taxa de bancada (prata por 100 de nutrição) | digitado, **padrão 400 (do app, não do jogo)**; `cfg.feeSet` marca que o usuário mexeu; teto `feeCeiling` (1.000, post de desenvolvedor, média) | `econ.stationFee`, `roundFee` (arredonda no total do lote) | `cfg.feePer100`, `feeIsUnconfirmedDefault(value, feeSet)` |
| Valor do item para a taxa | `recipeValue(rec)` = soma dos ingredientes **incluindo o artefato** (NÃO VERIFICADO) | `catalog.recipeValue` | `c.fee` |
| Taxa de bancada do refino dos materiais | `cfg.refineFee` (padrão 400) | `refineUnit` (`ctx.feePer100`) | `cfg.refineFee` |
| Rota por material (comprar/produzir/melhor) | `cfg.refine[chave]` | `modeOf`, `refineUnit` (`route`) | `line.mode`, `line.useRefine`, `line.cmp` |
| Cidade de compra e ordem de compra | `cfg.matCity`, `cfg.useOrders` | `econ.buyQuote` (+2,5% se ordem de compra) | `line.city`, `line.date`, `cfg.useOrders` |
| Preço de cada material e idade | API `sell_price_min`/`buy_price_max` + data | `market.quote` -> `buyQuote` | `line.unit`, `line.date`, `line.city` |
| Premium | `settings.premium` | `econ.salesTax`, `netSale` | `useSettings().premium` |
| Imposto (4%/8%) e setup 2,5% na venda | constante do jogo | `econ.netSale` (modos `order`/`instant`/`none`) | `option.mode`, `premium` |
| Saída (cidade, modo, preço, idade, "ilusória", "velha") | API + `exits.js` (limite 24 h = decisão de produto, `DEFAULT_MAX_AGE_H`) | `craftPlan` (options), `exits.js::annotateOptions` | `c.best`, `option.stale/illusory/buyer` |
| Venda sem imposto | digitado `cfg.noTax['Cidade|modo']` | `computeCraft` -> `netSale(...,'none')` | `option.noTax` |
| Despesas extras (por craft/por lote) | digitado `cfg.extras` | `extras.js::extrasTotal` | `c.extras`, `c.extrasList` |
| Foco como custo em pontos / orçamento | digitado `focusEff`, `focusPoints`, `focusBudget`, `focusRef` | `focus.js::craftFocusSummary` | `fs` (informativo: **não muda o lucro**; só o interruptor `focus` muda) |
| Giro (liquidez) | API history, 7 dias completos | `liquidity.js::windowStats` | `loadedStats(...)` (informativo) |
| Servidor | `settings.server` | `market.fetchPrices` | `useSettings().server` |

**Não consideradas hoje no Craft** (para a linha "NÃO considerada"): relistagens da ordem de venda (só o Preço-alvo tem `relists`); transporte/teleporte entre cidades (só aviso no Refino; no Craft só via despesa extra); qualidade do item produzido e do material (a API é consultada com `qualities=1`); ganho do "diário de ofício" (journal) — **atenção ao termo**: o app chama de "bônus diário" o bônus de produção de +10/+20 (AUDITORIA-001 §1); o **diário de ofício** (journal que enche e vende) é outro conceito e **não existe no app** (NÃO VERIFICADO; perguntar ao usuário qual ele quer dizer); custo de foco em prata (a referência é digitada); estoque que o usuário já tem (custo de oportunidade); mudança de preço durante a produção; moeda de facção/ficha (IDEIA-068).

### 3.2 Refino (`Refining.jsx` -> `refinePlan.js::evaluateTier` + `econ.refineUnit`)
| Variável | Origem | Quem aplica | Ler de |
|---|---|---|---|
| Tipo, tier, encanto | digitado (`STONEBLOCK` sem encanto) | `uniqOf` na tela, `catalog.recipeOf` | `cfg.type/tier/ench` |
| Cidade de refino e especialização (+40) | `cfg.refineCity` (padrão Fort Sterling) vs `REFINING[tipo].city` (dump) | `calcRRR({kind:'refine'})` na tela | `specialty`, `autoRRR` |
| Foco, diário (0/10/20), RRR manual | digitado | `econ.rrr`, `resolveRRR`, `cleanRefineCfg` | `rrrValue` (usado em `ctx.rrr`) |
| Taxa de bancada (padrão 400 não confirmado) | digitado, `feeSet` | `econ.refineUnit` (`stationFee(itemvalue refinado)`), `lotFee` | `vcfg.feePer100` |
| Cidade de compra / ordens de compra / rota | digitado | `buyQuote`, `refineUnit.route` | `ctx` |
| Saída (cidade, modo) e Mercado Negro | digitado + API | `evaluateTier` (`netSale`) | `cur.sell`, `cur.mode` |
| Despesas por unidade e venda sem imposto | digitado | `evaluateTier` (`extrasPerUnit`, `noTax`) | `perUnitExtras`, `noTax` |
| Quantidade do lote | digitado `qty` | `lotFee`, totais | `vcfg.qty` |
| Premium | settings | `netSale` | `premium` |
| **Não consideradas** | receita alternativa com coração de facção (IDEIA-068); transporte compra->refino (só banner quando `buyCity != refineCity`); relistagens; qualidade; receitas em lote do bloco de pedra com rocha encantada (IDEIA-068 §4) | — | — |

Observação de inconsistência para o Planejador conferir: o Craft trata refino de materiais com `refineCity==='auto'` (especialização sempre ligada, `craftRates`), enquanto o Refino usa `info.city === cfg.refineCity`. São decisões diferentes e legítimas, mas o auditor deve **mostrar qual regra valeu** ("refina na cidade de bônus de cada recurso: +40 aplicado").

### 3.3 Calculadora de RRR (`RrrCalculator.jsx` -> `rrrCalc.js::rrrFor`)
Variáveis: tipo (craft/refino), cidade, categoria ou recurso, foco, diário (validado por `validateInputs`), nº de crafts (para a tabela de retorno), item. Aplica `econ.rrr`; decomposição em `parts` (base/especialização/foco/diário). **Não considera**: taxa, preços, imposto (nem deve). Dica do auditor: mostrar que a categoria do item vem de `item.cc` (dump) e que o diário só vale para a categoria que o jogo mostra (`DAILY_NOTE`, IDEIA-041 D8, confiança MÉDIA).

### 3.4 Comparar cidades (`cityCompare.js::compareCraftCities`)
Chama `computeCraft` uma vez por cidade com `specialty: null` (vem da regra do item), `customRRR: ''` (**RRR manual é desligado**: o auditor deve avisar se o usuário tem RRR manual na tela principal), `matCity` = própria cidade ou melhor, taxa por cidade (`feeByCity`) ou a geral (`feeSource: 'general'|'city'`). Foco, diário, refino, ordens e extras valem para todas. **Não considera**: venda (compara só custo), transporte entre cidades, preço da bancada em cada cidade a menos que digitado (padrão 400 em todas = igual, e isso esconde a diferença real).

### 3.5 Preço-alvo (`targetPrice.js::targetPrice`, `TargetPrice.jsx`)
Recebe só `cost` (por unidade) da tela que o chamou: **herda todas as variáveis do Craft/Refino**, mas o cartão não diz quais. Próprias: meta (lucro ou margem), `mode` (`order`/`instant`), `relists` (cada relistagem soma 2,5%), `premium`. **Não considera**: `noTax` (a tela de Craft tem a opção; o alvo ignora, então o alvo pode ficar 4% a 10,5% acima do necessário numa venda sem imposto), idade do preço atual usado na comparação (`marketGap`), liquidez.

### 3.6 Teste de estresse (`stress.js`, `StressTest.jsx`)
Entrada `{variable, fixed, price, k}` montada por `craftStressInput`/`refineStressInput`: `variable` = compras líquidas de RRR; `fixed` = taxa de bancada + taxas das etapas de refino + despesas; `k` = `netSale(1, modo, premium)` (inclui `noTax`). Variáveis próprias: passos de ±5% a ±20% (`STEPS`), limiar de margem fina 5% (`THIN_MARGIN`, decisão de produto). **Não varia**: RRR, taxa de bancada, despesas (fixos por desenho, D-031), volume, e **não** a cidade de saída (usa a melhor).

## 4. Desenho mínimo proposto

### 4.1 Função pura por tela
```
auditVars(cfg, result, ctx) -> { rows: Row[], counts: {not_considered, unconfirmed, stale, ...} }
Row = { id, label, value, unit, origin, status, source?, date?, note? }
origin  in 'game' | 'app-default' | 'user' | 'api' | 'derived'
status  in 'applied' | 'unconfirmed' | 'stale' | 'not-considered' | 'info-only'
```
Arquivos sugeridos (todos em `client/src/lib/audit/`): `core.js` (construtores de linha, `apiRow(price, date, {now, maxAgeH})`, constantes de origem), `craft.js`, `refine.js`, `rrr.js`, `compare.js`, `target.js`, `stress.js`. `ctx` = `{ premium, server, now, feeCeiling, issues }` (as `issues` da 060 já dizem o que foi corrigido: virar linha "corrigido de X para Y").

Regras de montagem (a fonte única de cada estado):
- `unconfirmed`: `feeIsUnconfirmedDefault(cfg.feePer100, cfg.feeSet)`; `line.unverified`; valor do artefato na taxa de bancada; lista de categorias do bônus diário (`DAILY_NOTE`).
- `stale`: `effectiveDaily(...).stale`; `option.stale` de `exits.js`; preço de material mais velho que `maxAgeH`.
- `not-considered`: lista estática por tela (o inventário acima), com ligação à ideia que a cobre quando existir (048, 068, 044).
- Um **cartão compartilhado** `VarAuditCard({ audit })` (colapsado por padrão, com selo "n não confirmadas, n não consideradas" no cabeçalho para a pessoa ver sem abrir). Reusa `ui.jsx` (`Banner`, `Money`).

### 4.2 Invariante de teste (a garantia de que não mente)
Teste de **sensibilidade**: para cada linha `applied` numérica, alterar o campo correspondente em `cfg` e verificar que `computeCraft(...).totalCost` ou `best.profit` **muda**; para cada linha `info-only`/`not-considered`, alterar e verificar que **não muda**. Isso pega o auditor listando como "aplicada" uma variável que o cálculo ignora (o oposto do problema que ele resolve).

## 5. Casos de teste (conferíveis à mão)
1. **RRR exibido** (AUDITORIA-001 §1): craft, cidade de bônus, sem foco, diário 0 -> PB = 18+15 = 33 -> RRR = 33/133 = **24,8120%**; com foco: PB 92 -> 92/192 = **47,9167%**; com foco e diário 20: PB 112 -> **52,8302%**. Linha "RRR final" mostra esse valor e as linhas de componentes somam PB 112.
2. **Taxa padrão não confirmada:** `cfg.feePer100 = 400`, sem `feeSet` -> linha `app-default` + `unconfirmed`. Com `feeSet = true` e 400 -> `user` + `applied`. Taxa 500 (sem `feeSet`) -> `user`. Fórmula: item de valor 384 -> 384 × 0,1125 × 400/100 = **172,8** (arredonda para 173 no total do lote, `roundFee`).
3. **Bônus diário expirado:** `craftDaily = 20`, `craftDailyAt` anterior ao último reset (10:00 UTC no `west`) -> valor usado **0**, `stale`, nota "digitado 20, expirou no reset". `craftDailyAt` > agora + 5 min -> `future`, usado 0.
4. **Imposto:** Premium, venda por ordem: k = 1 − 0,04 − 0,025 = **0,935**; sem Premium: **0,895**; venda instantânea Premium: **0,96**; `noTax` ligado: **1,0** e a linha de setup fee some do "aplicadas" e vira "não cobrada (venda sem imposto)".
5. **Preço-alvo herdando:** custo 3.524,27, Premium, ordem, `relists = 0` -> P = ceil(3.524,27 / 0,935) = **3.770** (k de `netSale`); `relists = 2` -> k = 0,935 − 0,05 = 0,885 -> P = ceil(3.524,27 / 0,885) = ceil(3.982,2) = **3.983**. Com `noTax` ligado no Craft o auditor do Preço-alvo mostra "venda sem imposto NÃO considerada neste alvo".
6. **Comparar cidades:** `customRRR = '30'` na tela principal -> linha "RRR manual **ignorado** nesta comparação" (`status: not-considered`) e `specialty` por cidade vem da regra do item.
7. **Não consideradas sempre presentes:** na tela Craft com cfg padrão, as linhas relistagens, transporte, qualidade, diário de ofício aparecem como `not-considered` mesmo sem nenhum aviso.

## 6. Encaixe e riscos
- Depende do formato de `issues` (IDEIA-060), `exits.js` (065/012), `dailyBonus.js` (041) e `recipeAlt.js` (049). Não muda nenhuma fórmula.
- Interage com 012 (selo de confiança do preço entra como linhas `api` com idade e selo), 048 (despesas/noTax), 068 (receita alternativa de refino) e 070 (campos novos precisam de esquema persistido: o auditor **não grava estado**).
- Risco principal: virar ruído (30 linhas). Mitigação: cabeçalho com contagens, linhas `applied` colapsadas, só `unconfirmed`/`stale`/`not-considered` abertas por padrão (decisão de produto).
- Risco de manutenção: a lista "não consideradas" é manual; sem teste, desatualiza quando uma ideia nova entra. Mitigação: o teste de sensibilidade (§4.2) mais um teste que reprova variável nova em `cfg` sem linha de auditor (mesmo padrão do contrato da 070).

## 7. Fontes
- Código lido: `client/src/lib/{econ,craftPlan,refinePlan,extras,stress,targetPrice,dailyBonus,cityCompare,inputRules,rrrCalc,exits,recipeAlt,focus,focusConsts,liquidity,market,settings}.js` e `components/{Crafting,Refining,RrrCalculator,TargetPrice}.jsx`.
- AUDITORIA-001 (constantes), IDEIA-041 (diário), IDEIA-048 (extras/noTax), IDEIA-049 (receitas), IDEIA-060 (validação).
- https://albionfreemarket.com/crafting e https://albionutil.com/en/calculator-crafting (descrição de campos, via IDEIA-048).

## 8. Confiança
**ALTA** para o inventário (lido do código) e para o desenho (não altera fórmulas). **MÉDIA-ALTA** para as constantes exibidas (ver AUDITORIA-001). **NÃO VERIFICADO**: o que o usuário chama de "diário"; se existe variável do jogo fora desta lista (ex.: bônus de "Rested"/cidade de facção em campanhas, redução de taxa por ilha própria): não encontrei fonte, não listei como regra.
