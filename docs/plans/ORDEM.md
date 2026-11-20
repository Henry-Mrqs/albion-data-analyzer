# ORDEM de execução do lote (D-070): 28 planos, uma branch de integração, 1 commit por ideia

> Premissa: a **005 já está mesclada** (`src/lib/audit` existe). Regras gerais para todos os planos: teste visto falhar antes; campo salvo novo em `persistSchemas.js` + `test/savedStates.js` + Var no auditor (contrato `registerScreen`) no mesmo commit; nenhum `.test.jsx` com `usePersisted('chave'` literal (use `seed()` de `src/test/ui.js`); textos honestos; constante de produto sem fonte = nomeada e rotulada "regra do app"; `npm run check` verde a cada commit.

## Sequência recomendada (dependências e conflitos resolvidos na ordem)

| # | Ideia | Por que nesta posição | Depende de | Arquivos quentes que toca |
|---|---|---|---|---|
| 1 | **085** flake de `App.errors` | portão de testes confiável para tudo o que vem depois (D-066) | — | só testes e `vitest.config.js` |
| 2 | **089** divisor do `windowStats` | possível erro de dado; a 011 e a 013 leem `windowStats` | — | `liquidity.js`, `Giro.jsx` |
| 3 | **086** Premium no auditor + contrato de abas/chaves | toda ideia com aba/chave nova passa a depender do contrato | 005 | `audit/registry.js`, `audit/tabs.js` (novo), `contract.test.js`, `Premium.jsx` |
| 4 | **074** testes de ligação do Crafting + varredura sem `.test.jsx` | mexe em `persistSchemas.test.js` (1 linha) antes das ideias de chave nova | — | só testes, README |
| 5 | **088** Mercado Negro: duas leituras | possível erro de dado em produção; antes de 059/065 (mesmo bloco de opções) | 005 | `craftPlan.js`, `exits.js`, `flip.js`, `Crafting.jsx`, `Flipper.jsx`, `Market.jsx`, `audit/craft.js` |
| 6 | **072** foco: pendências da 002 | antes da 007 (`catalogLoad.js`) | — | `Crafting.jsx`/`Refining.jsx` (1 linha), `catalogLoad.js`, `FocusCard.jsx` |
| 7 | **073** Comparar cidades + `fmt` sem "-0" | antes da 080 e da grade; `fmt` é global | — | `CityCompare.jsx`, `econ.js` (só `fmt`), `ui.jsx` (`Money`), `index.css` |
| 8 | **082** Preço-alvo: acabamento | antes da 083 e da 059 (mesmo cartão) | 075 (master), 088 | `TargetPrice.jsx`, `exitLabel.js` |
| 9 | **083** Preço-alvo no auditor + valores vivos | antes da 059 (a 059 precisa manter `onLive`) | 082, 005 | `TargetPrice.jsx`, `Crafting.jsx`, `Refining.jsx`, `audit/core.js` |
| 10 | **059** ciclo de vida da ordem | D-060 (005 → 059 → 065 → 012) | 005, 083 | `craftPlan.js`, `refinePlan.js`, `stress.js`, `Crafting.jsx`, `Refining.jsx`, `persistSchemas.js` |
| 11 | **065** preço de saída realista | depois da 059 (mesmo bloco) | 059, 010 | `craftPlan.js`, `focus.js`, `Crafting.jsx`, `persistSchemas.js` |
| 12 | **012** confiança do preço | depois da 065 | 065 | `market.js`, `liquidity.js` (`export median`), `PriceMatrix.jsx`, `Crafting.jsx` |
| 13 | **062** checagem de oferta do material | D-069 | 010 | `Crafting.jsx`, `audit/craft.js`, `audit/core.js` |
| 14 | **053** confiança da rota por histórico | D-069 | 010 | `history.js`, `Flipper.jsx` |
| 15 | **051** dimensionar o lote | D-069 | 002, 010 | `Crafting.jsx`, `persistSchemas.js`, `audit/craft.js` |
| 16 | **064** perfil do crafter (filtro da busca) | D-069 | 038 | `catalog.js`, `ui.jsx`, `ItemSelector.jsx`, `Crafting.jsx`, `persistSchemas.js` (`settings.profile`) |
| 17 | **003** diários (journals) | catálogo: antes da 009 e da 007 | — | `scripts/build-catalog.mjs`, `catalog.json` e fixture **regerados**, `Crafting.jsx`, `persistSchemas.js` |
| 18 | **009** encantar | catálogo: depois da 003 | 003 | idem (regerar de novo), `Crafting.jsx`, `persistSchemas.js` |
| 19 | **061** ordem × compra instantânea de material | D-069 | — | `Crafting.jsx`, `audit/craft.js`, `audit/core.js` |
| 20 | **007** lucro por hora (tempo) | catálogo: por último dos 3 (003, 009, 007); depois da 072 | 003, 009, 072 | `scripts/build-catalog.mjs`, catálogo/fixture regerados, `catalogLoad.js`, `Crafting.jsx`, `persistSchemas.js` |
| 21 | **011** tendência (janelas 14/29) | precisa do divisor correto; antes da 036 (`Market.jsx`) | 089, 012 (`median`) | `liquidity.js`, `Market.jsx`, `persistSchemas.js` |
| 22 | **036** Mercado Negro: filtros por tier/encanto/qualidade/giro | precisa das duas leituras e do cartão de tendência já no Mercado | 088, 089, 011 | `history.js`, `Market.jsx`, `persistSchemas.js` |
| 23 | **013** ranking "o que craftar hoje" | aba nova; precisa do contrato (086), do preço correto (088), do giro (089/011) e da coluna de tempo (007) | 086, 088, 089, 011, 007 | `App.jsx` (aba), `persistSchemas.js`, `audit/tabs.js` |
| 24 | **080** grade de estresse | depois da 073 (`fmt`, `.sticky-col`) e da 059 (estresse) | 073, 059 | `StressTest.jsx`, `index.css` |
| 25 | **079** textos longos | baixa prioridade; antes da 084 (CSS) | — | `index.css`, `inputRules.js`, `ui.jsx` (`NumberInput`) |
| 26 | **077** acabamento do limite de erro | depois da 085 (mesmo arquivo de teste) e da 013 (`App.jsx`) | 085, 013 | `App.jsx`, `migrationNotes.js`, `noticeStore.js` |
| 27 | **084** Premium e barra de abas | depois da 013 (7 abas definem o breakpoint) e da 086 | 013, 086 | `premium.js`, `Premium.jsx`, `App.jsx`, `index.css` |
| 28 | **087** acabamento do auditor | **por último**: endurece o teste de sensibilidade de **todas** as Vars acrescentadas pelo lote | 086, 083 e todas as que acrescentam Var | `audit/*`, `VarAuditCard.jsx`, `test/auditKit.js` |

Observações da ordem: (a) D-060/D-069 ficam respeitadas: 005 → 059 → 065 → 012 e 062 → 053 → 051 → 064 → 003 → 009 → 061, **depois** de 085/086/088/089 (alta). As pequenas 082/083 entram antes da 059 só porque tocam o mesmo cartão e a 059 pede para manter o `onLive`. (b) As ideias de baixa prioridade (080, 079, 077, 084, 087) vão ao fim para não atrasar dado; a 087 vai por último de propósito.

## Conflitos de arquivo (quem toca o quê)

| Arquivo | Ideias (na ordem de execução) | Cuidado |
|---|---|---|
| `client/src/components/Crafting.jsx` | 088, 072, 083, 059, 065, 012, 062, 051, 064, 003, 009, 061, 007 | arquivo mais quente; cada ideia acrescenta um cartão/bloco; o mais frágil é o bloco de opções de venda (088 → 059 → 065) e a linha do `TargetPrice` (083). Rodar `Crafting.test.jsx` (limite de 12 renderizações) a cada passo |
| `client/src/lib/craftPlan.js` | 088, 059, 065 | bloco "opções de venda": cada uma herda a anterior (o líquido da 059 vale também para a leitura `list` da 088; a 065 troca `o.price`) |
| `client/src/lib/persistSchemas.js` + `test/savedStates.js` | 059, 065, 051, 064, 003, 009, 007, 011, 036, 013 (+ `trend:cfg`, `bm:cfg`, `rank:cfg`) | linhas distintas; o teste de 8→N chaves e o de estados salvos devem ser atualizados em cada commit |
| `client/src/lib/audit/craft.js` / `core.js` / `registry.js` | 086, 088, 083, 062, 051, 003, 009, 061, 007, 013, 087 | cada uma acrescenta Var/`NOT_CONSIDERED`; a contagem de linhas em `craft.test.js` muda a cada ideia; **087 por último** |
| `client/src/components/TargetPrice.jsx` | 082, 083, 059 | nessa ordem |
| `client/src/components/Market.jsx` | 088, 011, 036 | nessa ordem |
| `client/src/lib/liquidity.js` | 089, 012, 011 | `export median` idempotente |
| `client/src/lib/history.js` | 053, 036 | funções distintas |
| `client/src/lib/catalogLoad.js` | 072, 007 | `itemProblems` |
| `scripts/build-catalog.mjs`, `catalog.json`, `catalog.fixture.json` | 003, 009, 007 | **regerar com os scripts, nunca à mão**; conferir que o diff só **acrescenta** o campo da ideia; id de versão do catálogo muda a cada uma (esperado) |
| `client/src/App.jsx` | 013, 077, 084 | aba nova → avisos → `aria-current` |
| `client/src/index.css` | 073, 080, 079, 084 | só acrescentam regras; `.sticky-col` nasce na 073 e a 080 reusa |
| `client/src/lib/econ.js` | 073 (`fmt`), 059/065 (`netSaleWithRelists`) | funções distintas |
| `client/src/lib/inputRules.js` | 059/065 (`export` de `br`/`echoValue`), 079 | linhas distintas |
| `Flipper.jsx` / `flip.js` | 088, 053 | 088 só acrescenta campos `alt*` |
| `client/src/App.errors.test.jsx` | 085, 077 | 085 primeiro |

## Dívidas declaradas (não esquecidas)
`flip:cfg` e `market:*` ficam como "fora da v1 do auditor" com motivo em `lib/audit/tabs.js` (086). Refino não ganha tempo (007) nem ranking (013). `BM_READING_VERIFIED` fica `null` até a conferência do usuário.

## Conferências em jogo pendentes (usuário; nenhuma bloqueia código)
1. Quanto o **Mercado Negro paga** por um T4 qualidade 1 (ordem de compra ~2.600 ou preço de lista ~10.800) e se aceita qualidade igual ou superior (088/036) → o Gerente muda `BM_READING_VERIFIED`.
2. Tempo de **1 Broadsword T4** e de **1 prancha T4** (007: fecha a unidade do `@time`).
3. Antigas: valor do artefato na taxa de bancada; foco +59; coração retornável (D-059); as 5 constantes do Premium (084).

## Perguntas ao Gerente consolidadas (as essenciais; o resto está em cada plano)
1. **088:** enquanto `BM_READING_VERIFIED = null`, o cabeçalho usa a leitura **menor** (lado seguro) com as duas à vista. Aceita?
2. **089:** o divisor passa a ser "dias que a série cobre" (item novo mostra volume maior). Aceita?
3. **013:** recorte obrigatório (categoria + tier + encanto), nunca o catálogo inteiro. Aceita?
4. **086:** `flip:cfg` e as chaves do Mercado ficam "fora da v1" com motivo (dívida declarada). Aceita?
5. **073:** `fmt(-0.5)` continua `'0'`. Aceita?
