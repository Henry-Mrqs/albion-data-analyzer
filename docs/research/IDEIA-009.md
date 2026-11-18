# IDEIA-009 — Encantar: comprar/craftar .0 e encantar × craftar já encantado

## 1. O que faz e por que o jogador usa
Itens .1 a .3 valem bem mais que o .0, e há **duas rotas** para obtê-los:
- **Rota A (craft direto):** craftar o item já encantado, com recursos refinados encantados (`T4_METALBAR_LEVEL1@1` etc.). Esses recursos retornam com o RRR normal.
- **Rota B (craftar .0 e encantar):** craftar (ou comprar) o .0 com recursos comuns e depois gastar runas (.0->.1), almas (.1->.2) e relíquias (.2->.3). Runas/almas/relíquias **não retornam**.
A ferramenta deve comparar A x B (e "comprar .0 pronto + encantar") e dizer qual é mais barata para o nível desejado.

## 2. Regras de negócio e fórmulas

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| E1 | Passos: **Runa** .0->.1, **Alma** .1->.2, **Relíquia** .2->.3. .3->.4 **não** é possível por encantamento (.4 só por craft direto ou drop) | Wiki "Enchanting" (trecho de busca); coerente com `items.json`: entradas de encanto 1, 2, 3 têm `upgraderequirements` (RUNE, SOUL, RELIC) e a de nível 4 não tem | MÉDIA-ALTA |
| E2 | A runa/alma/relíquia tem o **mesmo tier** do item (T4_RUNE para T4) | Wiki (trecho); dump (T4..T8 usam `T{n}_RUNE`) | ALTA |
| E3 | **Quantidade por passo, por tipo de item:** 96 (elmo, botas, secundária/off-hand, capa), 192 (armadura, bolsa), 288 (arma 1 mão), 384 (arma 2 mãos). Igual nos 3 passos e **igual em T4 a T8** | Wiki "Rune" (trecho de busca) e `items.json` (T4_MAIN_SWORD 288; T4_2H_CLAYMORE 384; T4_ARMOR_PLATE_SET1 192; T4_HEAD_PLATE_SET1 96; T4_BAG 192; T5/T6/T8_MAIN_SWORD 288) | ALTA |
| E4 | Regra interna: quantidade = 12 × (nº de recursos da receita do .0) (espada 24 -> 288; claymore 32 -> 384; armadura 16 -> 192; elmo 8 -> 96; bolsa 16 -> 192; cajado arcano 2H 32 -> 384). Observação minha a partir do dump, não de fonte de jogo | `items.json` | MÉDIA (padrão confere em 8 itens) |
| E5 | **Runa, alma, relíquia, fragmento não retornam e não têm RRR** (são consumidos no encantamento) | wiki (trecho de busca); inferência do mecanismo | MÉDIA |
| E6 | Receita do item encantado craftado direto: mesmas quantidades, ingredientes `*_LEVEL{n}` (T4_MAIN_SWORD .1: 16 `T4_METALBAR_LEVEL1` + 8 `T4_LEATHER_LEVEL1`; foco 2251 .1, 3939 .2, 6893 .3, 12064 .4) | `items.json` | ALTA |
| E7 | Valor de item dos recursos encantados dobra por nível (T4 barra 16, LEVEL1 32, LEVEL3 128), logo a taxa de bancada do craft encantado dobra por nível | `items.json`; patch 2021-11-24 ("double with each Tier or Enchantment") | ALTA |
| E8 | **Taxa de encantamento (silver/bancada) NÃO ENCONTRADA.** Um guia diz que o encantamento é feito num "Artifact Foundry/ Forja de artefato" mas nenhuma fonte dá a taxa. Se existir cobrança, a fórmula é desconhecida | albiononlinegrind (guia) | **BAIXA** |
| E9 | O ganho de fama/foco do encantar não foi levantado | — | sem dado |

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| Qtd de runa/alma/relíquia por item | dump (`enchantments/enchantment[n]/upgraderequirements`) -> catálogo |
| Receita encantada (`er` no catálogo) | já existe em `catalog.js` (`it.er?.[ench]`) |
| Preços: recursos .0, recursos .n, runa/alma/relíquia, item .0, item .n | API AODP (ids `T4_RUNE`, `T4_SOUL`, `T4_RELIC`, `T4_MAIN_SWORD@1`, `T4_METALBAR_LEVEL1@1`) |
| RRR, taxa de bancada, imposto | AUDITORIA-001 |
| Taxa de encantamento | **input do usuário** (campo opcional, padrão 0, marcado "não verificado") |

## 4. Exemplo numérico (caso de teste)
Item: Adept's Broadsword `T4_MAIN_SWORD` (16 barras + 8 couro). Cidade de craft Lymhurst (bônus de sword: RRR 33/133 = 24,8120%), sem foco. **Preços reais** da API West, Lymhurst, qualidade 1, consultados em 2026-11-18 (~01:10 UTC), tratados como constantes do teste:
- `T4_METALBAR` 267; `T4_LEATHER` 322; `T4_METALBAR_LEVEL1@1` 571; `T4_LEATHER_LEVEL1@1` 461; `T4_RUNE` 10 (todos `sell_price_min`).
- Taxa de bancada: 500 por 100 nutrição. Taxa de encantamento: 0 (desconhecida).

**Rota A (craft direto .1):**
1. Bruto = 16×571 + 8×461 = 9.136 + 3.688 = **12.824**.
2. Líquido de material = 12.824 × (1 − 0,248120) = **9.642,11**.
3. Taxa de bancada: valor = 16×32 + 8×32 = 768 -> 768 × 0,1125 × 5 = **432**.
4. Custo A = 9.642,11 + 432 = **10.074,11**.

**Rota B (craft .0 + 288 runas):**
1. Bruto .0 = 16×267 + 8×322 = 4.272 + 2.576 = **6.848**.
2. Líquido = 6.848 × 0,751880 = **5.148,87**.
3. Taxa de bancada .0: valor 384 × 0,1125 × 5 = **216**.
4. Runas: 288 × 10 = **2.880** (sem retorno).
5. Custo B = 5.148,87 + 216 + 2.880 = **8.244,87** (+ taxa de encantamento desconhecida).

Diferença A − B = **1.829,24**: neste snapshot a rota B vence enquanto a taxa de encantamento for menor que isso. Para .3 (3 passos): 3 × 288 = 864 runas/almas/relíquias de preços distintos.

Teste de sinal: inverter os preços (runa a 100) -> runas = 28.800 e a rota A passa a vencer (custo B = 34.164,87 > 10.074,11).

## 5. Encaixe no projeto
- `catalog.js`: já tem `recipeOf(base, ench)` e `marketId` com `_LEVEL{n}@{n}`; falta exportar `upgraderequirements` (tipo e qtd) no `build-catalog.mjs`.
- Calculadora **Craft**: novo bloco "Encantar" ao escolher encanto .1 a .3, mostrando rota A, B e C (comprar .0). Reutiliza `refineUnit`, `buyQuote`, `stationFee`, `rrr`.
- **Mercado/Flipper**: opção de arbitragem ".0 + runas vs .n à venda" (IDEIA-013).
- Hoje: o Craft já aceita encanto na receita (rota A); falta B.

## 6. Fontes
- ao-bin-dumps `items.json` (2026-11-02): https://github.com/ao-data/ao-bin-dumps
- Wiki Rune: https://wiki.albiononline.com/wiki/Rune (403 no fetch; trecho de busca, ~928 dias de idade)
- Wiki Enchanting: https://wiki.albiononline.com/wiki/Enchanting (403; trecho)
- https://albiononlinegrind.com/guides/item-enchanting-guide
- https://www.gamepressure.com/newsroom/albion-online-enchanting-explained/z552e9 (antigo)
- Patch 24/11/2021: https://devtrackers.gg/albion/p/510446ae-usage-fee-and-crafting-changes-lands-awakened-update
- AODP preços: `https://west.albion-online-data.com/api/v2/stats/prices/...` (consulta 2026-11-18)

## 7. Confiança
**ALTA** para quantidades por passo e IDs (dump + wiki concordam). **MÉDIA** para a ausência do passo .3->.4. **BAIXA** para qualquer taxa/foco do ato de encantar: não encontrei fonte. Pedir ao usuário uma observação em jogo (custo em prata ao encantar um item T4) antes de implementar a fórmula de taxa.
