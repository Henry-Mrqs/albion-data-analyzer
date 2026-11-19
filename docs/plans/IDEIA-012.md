# IDEIA-012 — Confiança do preço: outlier, dado velho e preço isolado, com selo por célula: plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-012`, a partir da `master` atual (**depois da 065**, ver ordem). Comandos `npm` em `client/`. **Pré-requisitos (já na `master`):** 010 (`history.js`, `liquidity.js`), `exits.js` (`isFresh` lógica, `annotateOptions`, `DEFAULT_MAX_AGE_H`), 060, 069, 070. **Regras do briefing:** teste escrito, **executado e visto falhar** antes de implementar; **nenhum `*.test.jsx` pode conter `usePersisted('chave'` literal** (use `seed()` de `src/test/ui.js`); o selo **não grava estado** (limiares são constantes: nenhum campo novo em `persistSchemas.js`); todo teste de tela tem caso "estado antigo salvo" e "estado corrompido"; todo texto diz o que está e o que não está considerado.

**Dossiê:** `docs/research/IDEIA-012.md`. **Limiares APROVADOS pelo Gerente (D-059), constantes nomeadas de produto, exibidos na tela como "regra do app", nunca como dado do jogo:** 24 h (já existe) e **72 h**, janela de **7 dias**, **−50%** (lado barato), **MAD/mediana 0,25**, **piso 5%**, **corte z 3,5**, e **selo sem histórico nunca acima de "média"**. Também reaproveitados: **+20%** (`PRICE_ABOVE_MEDIAN_WARN`) e 3 pontos mínimos (`MIN_POINTS_IN_WINDOW`). Fundamento do z modificado (`z = 0,6745 × (P − med)/max(MAD, 0,05 × med)`, corte 3,5): literatura citada **de memória** no dossiê (MÉDIA); não é citada na tela. **A 012 só marca; nenhum número muda** (a 065 decide ancorar).

**Inconsistências do dossiê resolvidas aqui como decisão (listadas nas perguntas):** (1) a tabela de níveis diz `baixa` só para S4 acima de +100%, mas o Caso 1 (+90,2%) conclui `baixa`: regra adotada = S4 acima entre +20% e +100% dá `media`, e **S4 acima + histórico instável (S6)** dá `baixa` (reproduz o veredito do Caso 1); (2) S8 (histórico velho) não está na tabela de `baixa`, mas o Caso 2 diz que cai para `baixa`: adotado `baixa`; (3) S2 isolado, S3 isolado, S6 isolado e S7 não têm nível na tabela: adotado `media`.

**Problema:** o app tem peças soltas (idade colorida, "velha", "ilusória", mediana do giro) mas nenhum selo único por célula que junte as razões em português.

**Objetivo:** `priceConfidence` puro + selo ("preço confiável" / "confira" / "desconfie" / "sem preço") com as razões no tooltip e em texto, na tabela "Onde vender" do Craft e na `PriceMatrix` (Craft e Refino). Sem histórico carregado o selo **nunca passa de "confira"** e a tela diz "histórico não carregado: sem verificação de outlier".

**Arquitetura:** `lib/confidence.js` (puro, constantes nomeadas num bloco só) usando `windowStats`/`median`/`windowOf` de `liquidity.js` (mesma janela e mesmo `MIN_POINTS_IN_WINDOW`; o MAD é calculado aqui sobre os mesmos pontos, sem alterar `windowStats`) e `DEFAULT_MAX_AGE_H` de `exits.js`. `market.js` passa a guardar `sell_price_max` (`sM`) que hoje descarta. Componente `ConfidenceSeal.jsx` só apresenta.

## Arquivos: exclusivos, compartilhados, ordem
**Criados:** `client/src/lib/confidence.js`, `confidence.test.js`, `market.sellmax.test.js`, `client/src/components/ConfidenceSeal.jsx`, `ConfidenceSeal.test.jsx`, `PriceMatrix.confidence.test.jsx`, `Crafting.confidence.test.jsx`.
**Alterados:** `client/src/lib/market.js` (`normalize`: +`sM: r.sell_price_max || 0`), `client/src/lib/liquidity.js` (**só** `export` de `median`), `client/src/test/helpers.js` (`mkPrices` aceita `sM` opcional: só entra na célula se informado, para não mudar `toEqual` existentes), `client/src/components/PriceMatrix.jsx` (props opcionais `history`, `now`), `client/src/components/Crafting.jsx` (coluna "Confiança" em "Onde vender"; passa `history` e `now` ao `PriceMatrix`).
**NÃO toca:** `Refining.jsx` (o `PriceMatrix` do Refino ganha o selo sem mudar o arquivo: sem histórico, no máximo "confira"), `Flipper.jsx`, `Giro.jsx`, `exits.js`, `econ.js`, `craftPlan.js`, `persistSchemas.js`.
**Conflitos:** `Crafting.jsx` (a tabela "Onde vender" e a chamada do `PriceMatrix`) com **059** (nota do líquido) e **065** (célula do preço); `market.js` com ninguém em voo. **Ordem: 005 → 059 → 065 → 012** (a 012 lê `o.listed ?? o.price`, então funciona antes e depois da 065, mas o merge é mais simples por último).

## Interfaces
```js
// confidence.js (puro)
export const STALE_H = DEFAULT_MAX_AGE_H /*24*/, VERY_STALE_H = 72, HISTORY_STALE_DAYS = 7, BELOW_MEDIAN = -0.5, ABOVE_MEDIAN = PRICE_ABOVE_MEDIAN_WARN /*0.2*/,
  VERY_ABOVE_MEDIAN = 1.0, UNSTABLE_MAD = 0.25, Z_CUT = 3.5, MAD_FLOOR = 0.05, Z_SCALE = 0.6745     // decisão de produto, salvo as indicadas
seriesStats(series, { now, days = HISTORY_DAYS }) -> { state, median, mad, points, lastRecord }   // state de windowStats ('unloaded' se series undefined); mad = mediana dos |p − mediana| dos pontos da janela (só dias com dado)
priceConfidence({ price, date, sellMax = null, buyer = null, side = 'exit' }, stats, { now, maxAgeH = STALE_H, zCut = Z_CUT })
  -> { level: 'alta'|'media'|'baixa'|'nenhuma', reasons: [{ code, text }], z: number|null, vsMedian: number|null }
  // side 'exit' avalia S2/S3 (comprador, nível único); side 'cost' (material que você compra) só S1, S1b, S1c, S4, S5, S6, S7, S8
// códigos: nodate, stale, verystale, nobuyer, single-level, above, above-high, below, outlier, unstable, sparse, nohistory, hist-old, unloaded
sealVisible(conf) -> boolean      // false se reasons só tem 'unloaded' (evita um "confira" em toda célula)
sealLabel(level) -> 'preço confiável' | 'confira' | 'desconfie' | 'sem preço'
```
**Níveis:** `nenhuma` se não há preço. `baixa` se: `nodate` (preço sem data), `verystale`, `nobuyer`+`single-level`, `above-high` (> +100%), `below` (< −50%), `outlier` (|z| > 3,5), `hist-old` (último ponto do histórico > 7 dias), ou `above`+`unstable`. `media` se não é baixa e houver: `stale`, `nobuyer` ou `single-level` isolado, `above` (+20% a +100%), `unstable`, `sparse`/`nohistory`, `unloaded`. `alta` só com histórico carregado, ≥ 3 dias na janela e nenhuma razão. **Sem histórico carregado: máximo `media`.** Bordas: `>` e `<` estritos (24 h exatas = fresco; MAD/mediana exata 0,25 = não instável).

## Mensagens (texto final, em português)
**Rótulos:** "preço confiável", "confira", "desconfie", "sem preço". **Razões:** "dado com mais de {maxAgeH} h"; "dado com mais de 72 h"; "sem data de registro"; "sem ordem de compra visível"; "nível de preço único (menor = maior) e sem comprador visível" (**nunca** "uma única oferta": a API não informa o nº de ordens); "{n}% acima da mediana de 7 dias"; "{n}% abaixo da mediana de 7 dias"; "fora do padrão da série (z {z})"; "histórico instável (desvio {n}% da mediana)"; "histórico com poucos dias ({p} de 7)"; "sem histórico registrado"; "último registro do histórico há {d} dias"; "histórico não carregado: sem verificação de outlier". **Rodapé do selo (tooltip e dica da tabela):** "Regra do app, não dado do jogo (limiares de produto: 24 h, 72 h, 7 dias, +20%, −50%, desvio 25%, z 3,5, piso 5%). O selo só marca: nenhum número muda. Os dados do AODP são colaborativos e podem ter lixo (ordens de 1 prata, preços fantasma)."

## Tasks (1 commit cada; teste primeiro e visto falhar; cada passo tem comando e saída esperada)

### Task 1: `confidence.js` (puro, project `logic`)
**Files:** Create `confidence.test.js`, `confidence.js`; Modify `liquidity.js` (export de `median`).
- [ ] **Step 1: testes falhando** (todos os números recalculados com `node -e`; séries diárias `{ t, n, p }` em dias UTC; `fresco = now − 1 h`, comprador `buyer: true`, salvo indicação):
```js
it('Caso 1 (Broadsword T4, p = 8.431, 5.381, 2.009, 5.498, 8.316, 10.999, 6.309; 19 a 25/10; now 26/10 12:00Z): mediana 6.309, MAD 2.007; preço 12.000 -> vsMedian +90,2%, z 1,91 (< 3,5: NÃO é outlier), MAD/mediana 31,8% -> razões [above, unstable] e nível baixa', () => {});
it('Caso 1 com preço 7.000 (+10,9%): só unstable -> media; com 6.309 (z 0) -> media (instável)', () => {});
it('Caso 2 (602, 603, 603, 603, 603, 1.508, 603, datas frescas): mediana 603, MAD 0 -> piso 30,15; preço 1.840: z 27,67 -> razões [above-high (+205,1%), outlier] e baixa', () => {});
it('Caso 2 real: mesma série terminando em 04/11 e now 19/11 12:00Z (nenhum ponto na janela): state idle, sem z nem vsMedian, razão hist-old ("último registro há 15 dias") e baixa', () => {});
it('Caso 3 (14 dias, 31/10 a 13/11: 8.752, 10.144, 9.811, 8.728, 10.562, 9.022, 10.190, 6.636, 7.862, 9.601, 3.014, 6.263, 1.500, 6.262; days 14): mediana 8.740, MAD 1.427; preço 1.500: z −3,42 -> NÃO outlier com corte 3,5 (mas vsMedian −82,8% -> below, baixa); com zCut 3 passa a ter também outlier; preço 3.014: z −2,71', () => {});
it('Caso 4 (token T1_FACTION_MOUNTAIN_TOKEN_1 Lymhurst): sell 35.890, sellMax 35.890, buyer false, sem histórico -> razões [nobuyer, single-level, unloaded] e baixa; Fort Sterling (28.000, buyer true, sellMax 30.000, fresco, sem histórico) -> só unloaded e media', () => {});
it('Caso 5: preço 1 com mediana 4.000: vsMedian −99,98% -> below e baixa; side "cost" também', () => {});
it('Caso 6: stats unloaded (série ausente) -> teto media e razão unloaded; série [] (nodata) -> media com nohistory; 2 dias na janela (sparse) -> media com "2 de 7"; célula limpa com histórico de 7 dias constante em 1.000 e preço 1.050 (MAD 0, piso 50, z 0,67, +5%) -> alta, razões []', () => {});
it('Caso 7 (idade, maxAgeH 24): 23 h 59 -> sem razão de idade; 24 h exatas -> fresco; 24 h 01 -> stale (media); 72 h exatas -> só stale; 72 h 01 -> verystale (baixa); data null ou 0001 com preço > 0 -> nodate (baixa); maxAgeH 0 desliga stale mas NÃO verystale', () => {});
it('preço 0, negativo, NaN, texto, null: level nenhuma, sem lançar; stats null/undefined: tratado como unloaded', () => {});
it('MAD/mediana exatamente 0,25 -> não instável; 0,26 -> instável; |z| exatamente 3,5 -> não outlier; vsMedian exatamente +20% -> não above; −50% exato -> não below; +100% exato -> above (não above-high)', () => {});
it('side "cost": nunca gera nobuyer nem single-level; sealVisible: false só com reasons [unloaded]; true com qualquer outra', () => {});
it('as constantes: STALE_H === DEFAULT_MAX_AGE_H e ABOVE_MEDIAN === PRICE_ABOVE_MEDIAN_WARN (uma fonte); sealLabel dos 4 níveis', () => {});
it('série embaralhada e com pontos fora da janela: mesmo resultado (só os dias completos da janela entram; hoje fica de fora)', () => {});
```
- [ ] **Step 2:** `npx vitest run --project logic src/lib/confidence.test.js` → FAIL. **Step 3:** implementar; `seriesStats` chama `windowStats` (estado, mediana, pontos, `lastRecord`) e calcula o `mad` com `median` exportado; estado `unloaded` quando `series === undefined`. **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: confidence.js, selo de confiança do preço (IDEIA-012)`.
- Mutações: `>=` nas bordas; piso ausente (divisão por zero no Caso 2); `Z_CUT` 3; média no lugar de mediana; `unloaded` chegando a `alta`; `side "cost"` avaliando comprador; 72 h desligado por `maxAgeH 0`; `above`+`unstable` não dando `baixa`.

### Task 2: `sell_price_max` na API e nos helpers
**Files:** Create `market.sellmax.test.js`; Modify `market.js`, `test/helpers.js`.
- [ ] **Step 1: testes falhando:** `fetchPrices` com `fetch` simulado (`vi.stubGlobal`) devolve, para a linha `T1_FACTION_MOUNTAIN_TOKEN_1`/Lymhurst com `sell_price_min` = `sell_price_max` = 35.890, `buy_price_max` 0: célula `{ s: 35890, sM: 35890, b: 0, … }`; linha sem `sell_price_max` -> `sM: 0`; `mkPrices` **sem** `sM` produz a mesma célula de hoje (`toEqual` com as chaves antigas) e com `sM: 30000` inclui `sM`; **nenhum teste existente muda** (`npm run test:logic`). **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: guarda sell_price_max do AODP (IDEIA-012)`.
- Mutações: `sM` lido de `sell_price_min`; `mkPrices` sempre incluindo `sM: 0`.

### Task 3: `ConfidenceSeal`, `PriceMatrix` e Craft
**Files:** Create `ConfidenceSeal.jsx`, `ConfidenceSeal.test.jsx`, `PriceMatrix.confidence.test.jsx`, `Crafting.confidence.test.jsx`; Modify `PriceMatrix.jsx`, `Crafting.jsx`.
- [ ] **Step 1: testes falhando** (project `ui`; `beforeEach(resetApp)`; `freezeNow('2026-10-26T12:00:00Z')`; mocks de `usePrices`/`useHistory`; `seed(...)`):
```js
it('ConfidenceSeal isolado: 4 níveis com o rótulo e a cor certos; tooltip lista as razões e o rodapé "Regra do app, não dado do jogo"; nível alta sem razões; sem lançar com conf null', () => {});
it('PriceMatrix sem histórico (Refino): células com dado fresco NÃO ganham selo (só "histórico não carregado" na dica); célula de 30 h mostra "confira"; célula de 80 h mostra "desconfie"; a dica da tabela cita a regra do app', () => {});
it('Craft (espada T4, Caerleon 12.000, sellMax 12.000, sem comprador, histórico do Caso 1 em Caerleon): a linha da tabela "Onde vender" mostra "desconfie" com "nível de preço único… sem comprador visível", "90% acima da mediana de 7 dias" e "histórico instável (desvio 32% da mediana)"', () => {});
it('Craft: Martlock com histórico [] e preço fresco com comprador -> "confira · sem histórico registrado"; histórico null (carregando/erro) -> nenhum selo negativo inventado e a dica "histórico não carregado"', () => {});
it('o selo NÃO muda nenhum número: lucro, líquido e melhor destino iguais com e sem o selo (comparar o texto do quadro Melhor destino)', () => {});
it('com a 065 na master: o selo avalia o preço LISTADO (12.000), não o ancorado', () => {});
it('estado antigo (craftCfg() sem campos novos): tabela renderiza com o selo; corrompido (preços 0/negativos/NaN na célula, history com pontos lixo): sem exceção, sem selo, sem NaN na tela', () => {});
it('o alerta "acima da mediana" do cartão Giro continua igual (mesma constante +20%)', () => {});
```
- [ ] **Step 2:** `npx vitest run --project ui src/components/ConfidenceSeal.test.jsx src/components/PriceMatrix.confidence.test.jsx src/components/Crafting.confidence.test.jsx` → FAIL. **Step 3:** `PriceMatrix`: por célula chama `priceConfidence({ price: main, date, side: 'cost' }, seriesStats(history?.[mid]?.[city], { now }), { now })` e mostra o selo só se `sealVisible`; `Crafting.jsx`: coluna "Confiança" com `side: 'exit'`, `sellMax` de `prices?.[targetMid]?.[o.city]?.[1]?.sM`, `buyer` de `o.buyer`, preço `o.listed ?? o.price`; `PriceMatrix history={history} now={now}`. **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: selo de confiança do preço no Craft e na tabela de preços (IDEIA-012)`.
- Mutações: selo em toda célula sem histórico; selo alterando o preço; rótulo "uma única oferta"; rodapé sem "regra do app"; usar o preço ancorado em vez do listado.

### Task 4: conferência manual (sem commit)
- [ ] API real: Broadsword T4 em Caerleon (listagem isolada) e Cajado Oculto (histórico velho) mostram "desconfie" com as razões; 375 px sem rolagem horizontal na tabela (coluna nova). **Conferir `location.port` antes de gravar em `localStorage`.**

## Review Focus
1. Série constante (MAD 0): o piso evita divisão por zero (Task 1). 2. Histórico não carregado nunca vira "confiável" nem polui toda célula (Tasks 1 e 3). 3. Dia ausente tratado como 0 distorceria o MAD: só dias com dado (Task 1). 4. Preço bom com alta legítima (patch) é só marcado, nunca escondido (Task 3). 5. A API não diz o nº de ordens: o texto nunca afirma "uma única oferta" (Task 3).

## Como o Tester valida
1. Casos 1 a 7 do dossiê com as contas recalculadas (z 1,91; 27,67; −3,42; −2,71; MAD 2.007/0/1.427), com oráculo próprio de mediana/MAD/z em ≥ 2.000 séries. 2. Mutações das Tasks. 3. Diferencial: números das telas idênticos com e sem o selo. 4. API real conferida. 5. O que um usuário estranharia: "confira" em toda célula; selo "confiável" sem histórico; selo que muda o lucro; texto que apresenta os limiares como regra do jogo.

## Riscos
1. **Falso positivo em alta real de preço:** o selo marca, não corrige. 2. **Carga de histórico:** nenhuma requisição nova (só o histórico do item final que o Craft já pede). 3. **Constantes de produto:** ajustáveis num bloco só (`confidence.js`). 4. Conflito de `Crafting.jsx` (ordem acima).

## Critério de pronto
`npm run check` verde sem alterar teste existente; mutações derrubadas; só os arquivos listados; nenhum campo novo persistido; conferência registrada.

## PERGUNTAS PARA O GERENTE
1. **Níveis (decisão minha, sem fonte):** S4 de +20% a +100% = `media`, e "acima + histórico instável" = `baixa` (reproduz o Caso 1 do dossiê); S8, S2/S3 isolados e S6 isolado como no texto acima. Aprova?
2. **Selo escondido quando a única razão é "histórico não carregado"** (para não marcar toda célula do Refino): aprova?
3. **Escopo:** Craft ("Onde vender") e `PriceMatrix` (Craft e Refino). Flipper (linhas do topo-30) e a tabela do Mercado ficam de fora. Confirma?
4. `sell_price_max` passa a ser guardado em todas as células (um número a mais por célula, sem custo de rede): aceita?
5. Depois da 012, o auditor (005) ganha uma linha "confiança do preço" (origem API): o Executor da 012 a registra se a 005 já estiver na master?
