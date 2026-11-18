# IDEIA-002 — Foco (custo em pontos, prata por ponto, "vale usar foco?")

## 1. O que faz e por que o jogador usa
Foco é um recurso diário limitado. Gastá-lo num craft ou refino soma +59 ao bônus de produção (mais retorno de materiais). A decisão real do crafter é **em qual item gastar o foco** do dia. A ferramenta deve mostrar: pontos de foco gastos por craft/refino, economia em prata do foco (diferença de custo de materiais com e sem foco) e **prata economizada por ponto de foco**, para ranquear onde usar. Hoje o app só liga/desliga +59 e o campo `focus` do dump nunca é usado.

## 2. Regras e fórmulas (cada uma com fonte)

| # | Regra | Fonte |
|---|---|---|
| F1 | Foco soma +59 ao bônus de produção; RRR = PB/(100+PB) | AUDITORIA-001 §1 (AFM 2026-07-17; wiki trecho) |
| F2 | **Custo base de foco por item** = atributo `@craftingfocus` da receita no dump, por tier/encanto (T4 Broadsword .0 = 1286; .1 = 2251; .2 = 3939; .3 = 6893; .4 = 12064; T4 prancha = 54; T4 prancha .1 = 94) | `items.json` do ao-bin-dumps (2026-11-02) |
| F3 | **Custo real** = base × 0,5^(Eficiência/10000). Cada 10.000 de eficiência divide o custo ao meio | AFM 2026-07-21 (atualizado 09-19); Albion-Tools-Alternate (README); albionutil (undated) |
| F4 | **Eficiência** (exemplo Broadsword): nó "Sword Crafter" +30 por nível; especialização Broadsword +30 por nível (bônus compartilhado da espada) +250 por nível (específico) = 280 por nível; especialização de outro item da mesma linha (Claymore) +30 por nível (só a parte compartilhada). Máximo 100/100 = 31.000 (100×30 + 100×280) | AFM 2026-07-21 |
| F5 | Fontes divergentes: albionutil dá +280 por nível do item e +265 se artefato, irmãos +30 (+15 artefato), Master Crafter +30. O app "AO Refining App" (README, anterior à mudança de focus de 2021) usa `(eficiência/10000)^0,5` e base T4 = 48: **obsoleta** | albionutil; github Edison-Cabrera/AO-Refining-App |
| F6 | Oferta diária: Premium dá 10.000 foco por 24 h, teto de 30.000 acumulado | Cheatsheet 2017 (Tsurata); albion-8l9 (2023); AFM |
| F7 | Foco **não** reduz a taxa de bancada nem a nutrição | AFM 2026-09-10 (exemplo: 100 Broadswords custam 21.600 com ou sem foco) |
| F8 | Custos de foco de recursos refinados e equipamentos foram recalibrados ao novo Item Value em 24/11/2021 | Patch Lands Awakened |
| F9 | Foco de comida/poção é baseado na **nutrição** dos ingredientes (atenção: em comida o `@craftingfocus` do dump já considera isso) | Patch Lands Awakened |

Prata por ponto de foco (definição do produto, sem fonte de jogo): `economia_materiais(foco) / custo_real_de_foco`, onde `economia_materiais = Σ(qtd_i × preço_i) × (RRR_com_foco − RRR_sem_foco)`. Deve-se contar só ingredientes `returnable`.

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| `@craftingfocus` por receita/encanto | dump -> `build-catalog.mjs` (hoje exportado como `f` só no nível base; é preciso exportar por encanto: `er` já guarda receitas encantadas, mas não o foco) |
| Níveis de especialização do jogador | input do usuário (campos: nível do item, níveis dos itens irmãos, nível do nó mestre) |
| Preços dos ingredientes | API AODP |
| Bônus de cidade, diário | input / tabela (AUDITORIA-001) |
| Foco disponível no dia | input (padrão 10.000 premium) |

## 4. Exemplo numérico (caso de teste)
Item: Adept's Broadsword T4.0 (`T4_MAIN_SWORD`), receita 16 `T4_METALBAR` + 8 `T4_LEATHER`, foco base 1286 (dump). Craft em Lymhurst (bônus de sword: PB 33 sem foco, 92 com foco). Preços **hipotéticos para teste**: barra 200, couro 150.

1. Bruto: 16×200 + 8×150 = 3200 + 1200 = **4400**.
2. RRR sem foco = 33/133 = 24,8120%; com foco = 92/192 = 47,9167%.
3. Material líquido sem foco = 4400 × (1 − 0,248120) = **3308,27**; com foco = 4400 × (1 − 0,479167) = **2291,67**.
4. Economia do foco = 3308,27 − 2291,67 = **1016,60**.
5. Custo de foco: eficiência 31.000 (100/100) -> 1286 × 0,5^3,1 = **149,99**; eficiência 300 (nó 10, sem spec) -> 1286 × 0,5^0,03 = **1259,53**; eficiência 15.500 -> **439,18** (tabela AFM bate com esses valores).
6. Prata por foco: 1016,60/149,99 = **6,78** (spec 100/100); 1016,60/1259,53 = **0,81** (sem spec).
7. Orçamento: 9.000 foco/dia a 149,99 = 60 crafts (AFM: 60); a 1259,53 = 7 (AFM: 7).

Caso extra (taxa não muda): taxa de bancada 500 por 100 nutrição = 216 por craft com ou sem foco.

## 5. Encaixe no projeto
- `econ.js`: `focusCost(base, efficiency)`, `silverPerFocus(...)`; reutiliza `rrr()`.
- `catalog.js`/`build-catalog.mjs`: exportar `@craftingfocus` por encanto (já se lê `it.f` só no .0).
- Telas: **Craft** (card "Foco": pontos por craft, por lote, prata por ponto, aviso "orçamento diário esgota em N crafts"), **Refino** (mesmo para refino), **Flipper** (coluna opcional, ligada à IDEIA-013).
- Depende de AUDITORIA-001 (RRR) e conversa com IDEIA-005 (auditor de variáveis) e IDEIA-023.

## 6. Fontes
- https://albionfreemarket.com/articles/view/how-crafting-specialization-reduces-focus-costs-in-albion-online (2026-07-21, atualizado 2026-09-19)
- https://github.com/tleytek/Albion-Tools-Alternate (README, "Focus Reduction")
- https://albionutil.com/en/guide (sem data)
- https://github.com/Edison-Cabrera/AO-Refining-App (obsoleto, só para divergência)
- https://devtrackers.gg/albion/p/510446ae-usage-fee-and-crafting-changes-lands-awakened-update (2021-11-24)
- ao-bin-dumps `items.json`: https://github.com/ao-data/ao-bin-dumps
- Cheatsheet 2017: https://docs.google.com/document/d/1SISAVy-3JIIUqsR8sGViSdk1L1LnNnKREeku3-YvFL0

## 7. Confiança e divergências
- **MÉDIA-ALTA.** A fórmula exponencial (0,5^(E/10000)) aparece em 3 fontes independentes e os números da AFM batem com o dump (1286 base, 149,99 etc.). Os coeficientes por nível (30/250/280) vêm de **uma** fonte detalhada (AFM) e variam por item ("use o bônus real de cada nó"); albionutil cita 265 para artefatos, sem confirmação. O produto deve receber o **valor de foco mostrado na janela de craft do jogo** como override opcional.
- Divergência: sqrt (AO Refining App) vs exponencial. Vale o exponencial (mais recente, bate com o dump).
- Não verificado: eficiência específica de cada nó de refino; custo de foco do refino com especialização.
