# IDEIA-058 — Comparar cidades de craft (qual cidade dá o menor custo para este item)

## 1. O que faz e por que o jogador usa
A cidade de craft muda o RRR (24,8% na cidade de bônus do item, 15,3% nas outras) e o preço dos materiais é diferente em cada cidade. O jogador **assume** que a cidade de bônus é sempre a melhor e esquece que o material lá pode custar mais. Hoje o Craft calcula uma cidade por vez (campo "Cidade de craft") e o usuário precisa trocar manualmente. A funcionalidade: tabela "se eu craftar em cada cidade", com RRR, custo de materiais (comprados na própria cidade ou na mais barata), taxa de bancada e custo total, ordenada pelo menor custo, com a diferença para a cidade de bônus. Não é uma regra de jogo nova; recombina AUDITORIA-001/IDEIA-038. A AFM, o Albion Online Builds (modo multi-cidade) e o Albion Profit Forge (cross-city) têm algo equivalente (FERRAMENTAS-001).

## 2. Regras de negócio

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| K1 | RRR por cidade: `PB = 18 + (15 se a cidade é a da categoria do item) + 59 (foco) + diário`; `RRR = PB/(100+PB)` | AUDITORIA-001 §1; IDEIA-038 | ALTA |
| K2 | A cidade correta da categoria vem de `@craftingcategory` (IDEIA-038), inclusive Brecilien | IDEIA-038 | ALTA |
| K3 | A taxa de bancada depende do dono de cada bancada: o usuário informa **uma taxa por cidade** (não existem valores públicos; IDEIA-019 rejeitou presets). Se o usuário só informar uma taxa, ela vale para todas | IDEIA-019 | ALTA |
| K4 | Dois cenários de compra: (a) materiais comprados **na cidade de craft** (sem transporte); (b) materiais comprados na cidade mais barata de cada material (já existe como `matCity: 'best'`); o cenário (b) ignora peso/transporte/risco (IDEIA-017/018/044) | código atual | ALTA |
| K5 | Cidade sem preço para algum material fica "incompleta", nunca com custo 0 | decisão de produto | — |

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| Preço dos materiais por cidade | AODP (já buscado para a tabela de preços do Craft) |
| RRR por cidade | `rrr()` + `craftingcategory` |
| Taxa por cidade | input |
| Foco, bônus diário | input |

## 4. Exemplo numérico (caso de teste)
Broadsword T4 (`T4_MAIN_SWORD`, 16 `T4_METALBAR` + 8 `T4_LEATHER`; cidade de bônus: Lymhurst; taxa de bancada 500 em todas = **216**; sem foco). **Preços reais** (API West, `sell_price_min`, qualidade 1, consulta 2026-11-18; todas as leituras entre 2026-11-17 19:25 e 2026-11-18 01:10 UTC):

| Cidade | Barra | Couro | Bruto = 16×barra + 8×couro |
|---|---|---|---|
| Lymhurst | 267 | 322 | 4.272 + 2.576 = **6.848** |
| Fort Sterling | 220 | 319 | 3.520 + 2.552 = **6.072** |
| Martlock | 267 | 339 | 4.272 + 2.712 = **6.984** |
| Thetford | 248 | 337 | 3.968 + 2.696 = **6.664** |
| Bridgewatch | 301 | 363 | 4.816 + 2.904 = **7.720** |
| Caerleon | 410 | (sem preço) | incompleto |

RRR: Lymhurst 33/133 = 24,8120% (fator 0,751880); demais 18/118 = 15,2542% (fator 0,847458).

**Cenário (a), materiais comprados na própria cidade de craft:**
| Craft em | Líquido de material | + taxa 216 |
|---|---|---|
| Lymhurst | 6.848 × 0,751880 = 5.148,87 | **5.364,87** |
| Fort Sterling | 6.072 × 0,847458 = 5.145,76 | **5.361,76** |
| Thetford | 6.664 × 0,847458 = 5.647,46 | **5.863,46** |
| Martlock | 6.984 × 0,847458 = 5.918,64 | **6.134,64** |
| Bridgewatch | 7.720 × 0,847458 = 6.542,37 | **6.758,37** |

Resultado: a cidade **sem** bônus (Fort Sterling) empata com a de bônus (diferença de 3,11 por craft) porque a barra lá é 17% mais barata. Quem presume "Lymhurst sempre" erra o custo em até 1.396,61 (Bridgewatch contra Fort Sterling) ao comparar.

**Cenário (b), materiais comprados em Fort Sterling (a mais barata, bruto 6.072) e craft em cada cidade:** Lymhurst: 6.072 × 0,751880 + 216 = **4.781,41**; outra cidade: 6.072 × 0,847458 + 216 = **5.361,76**. Vantagem da cidade de bônus: **580,35** por craft (= 6.072 × (0,248120 − 0,152542)), sem contar o transporte de 6.072 de material.

## 5. Encaixe no projeto
- `Crafting.jsx`: nova seção "Comparar cidades" que reutiliza `refineUnit`/`buyQuote` e `craftBonusCity` para cada cidade de `CITIES` (+ Brecilien após IDEIA-038). Os preços já estão no estado (tabela de preços por cidade existe).
- `econ.js`: função pura `compareCraftCities({recipe, prices, rates, focus, daily})`.
- Depende de IDEIA-038 (cidade correta) e IDEIA-019 (taxa por cidade informada). Relaciona-se a 013/016, sem duplicar.

## 6. Fontes
- AODP preços: `https://west.albion-online-data.com/api/v2/stats/prices/T4_METALBAR,T4_LEATHER,T4_MAIN_SWORD?locations=...&qualities=1` (2026-11-18)
- AUDITORIA-001, IDEIA-038, IDEIA-019 (esta pasta)
- https://www.albiononlinebuilds.com/tools/craft-calculator (modo multi-cidade), https://albionprofitforge.com/ (Cross-City Shopping)

## 7. Confiança
**ALTA** na conta; **MÉDIA** nos preços (esparsos e com idade de até 8 h). Uma taxa de bancada diferente por cidade pode inverter o empate; por isso o campo por cidade é obrigatório para a comparação valer.
