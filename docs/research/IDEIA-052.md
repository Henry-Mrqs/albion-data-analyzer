# IDEIA-052 — Flip de encantamento no Flipper (comprar .n, encantar, vender .n+1)

## 1. O que faz e por que o jogador usa
Alguns jogadores não craftam: compram o item .0 (ou .1, .2) pronto, gastam runas/almas/relíquias e vendem o item encantado, arbitrando o spread entre níveis. Ferramentas da comunidade têm isso como módulo próprio: a aba **Upgrades/upgrade flips** do Flipper da Albion Free Market (rastreia a quantidade de runas, almas e relíquias que sobraram), "enchant flips" no Albion Online Hub (segundo o diretório do AODP) e **Enchant-Up Comparison** no Albion Profit Forge. O Flipper do app só compara **o mesmo id** entre cidades; nunca cruza `T4_X` com `T4_X@1`. A IDEIA-009 trata a decisão no Craft (craftar encantado vs craftar .0 e encantar); esta ideia é a varredura **no Flipper** (muitos itens, todas as cidades), usando os mesmos dados de quantidade.

## 2. Regras de negócio

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| F1 | Passos .0->.1 runa, .1->.2 alma, .2->.3 relíquia; tier da runa = tier do item; sem passo .3->.4 | IDEIA-009 (dump + wiki trecho) | MÉDIA-ALTA |
| F2 | Quantidade por passo: 96 (elmo, botas, off-hand, capa), 192 (armadura, bolsa), 288 (arma 1 mão), 384 (arma 2 mãos), igual em T4-T8 | IDEIA-009 (dump `upgraderequirements`; wiki Rune trecho) | ALTA |
| F3 | Runas/almas/relíquias não retornam e não há RRR no encantamento | IDEIA-009 E5 | MÉDIA |
| F4 | **Taxa de encantamento: sem fonte** (a AFM permite "Upgrade Cost" manual por flip) | IDEIA-009 E8; albionfreemarket.com/flipper (campo "Upgrade Cost") | BAIXA |
| F5 | O Flipper da AFM também tem "Smuggler Fee" (taxa de contrabandista no transporte entre zonas) e "Add Setup Fee" (desligado por padrão, 2,5% do preço final) como campos editáveis; a "janela de dados" é 180 min para ordens de venda e 45 min para ordens de compra | albionfreemarket.com/flipper (2026-11-18) | MÉDIA (comportamento da ferramenta) |
| F6 | Id de mercado do item encantado: `T4_BAG@1`; recurso encantado: `T4_METALBAR_LEVEL1@1` | catálogo / AODP | ALTA |

Fórmula de produto:
```
custo(.n -> .n+1)   = preço(item .n) + qtd × preço(fragmento do tier) + taxa_encantar (input)
lucro               = netSale(preço(item .n+1), modo, premium) - custo
```
Para vários passos (.0 -> .2): somar os fragmentos de cada passo (runa e alma) e ler o preço do .0 e do .2.

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| Preços do item em dois níveis, do fragmento | AODP (`stats/prices`, ids com `@n`) |
| Quantidade de fragmentos por item | dump (IDEIA-009) |
| Taxa de encantar | input (padrão 0, marcado "não verificado") |
| Cidades de compra e venda | input (já existe no Flipper) |

## 4. Exemplo numérico (caso de teste)
Dados reais da API West, `sell_price_min`, qualidade 1, consulta 2026-11-18; Martlock; premium; venda por ordem (k = 0,935); taxa de encantar 0.

**Bolsa T4 (192 runas):**
- `T4_BAG` .0: 4.293 (01:20 UTC); `T4_BAG@1`: 9.033 (01:20 UTC); `T4_RUNE`: 8 (00:00 UTC).
- Custo = 4.293 + 192 × 8 = 4.293 + 1.536 = **5.829**.
- Receita líquida = 9.033 × 0,935 = **8.445,86**. Lucro = **2.616,86** (margem 44,9% sobre o custo).

**Elmo de placa T4 (96 runas):**
- `T4_HEAD_PLATE_SET1` .0: 1.177 (00:55); `T4_HEAD_PLATE_SET1@1`: 1.396 (2026-11-17 15:00, **dado de 10 h atrás**).
- Custo = 1.177 + 96 × 8 = 1.177 + 768 = **1.945**. Receita = 1.396 × 0,935 = **1.305,26**. Lucro = **−639,74** (o app deve filtrar e mostrar a idade do `@1`).

Teste de contagem: para `T4_BAG` a quantidade é 192 e para `T4_2H_CLAYMORE` é 384 (dump).

## 5. Encaixe no projeto
- `Flipper.jsx`: nova aba/filtro "Encantar" que, para cada item com `x` (encantamentos), monta pares (.n, .n+1) e usa `netSale`, `buyQuote`; reaproveita `fresh()` (já existe) e a coluna de idade.
- Requer o catálogo com `upgraderequirements` (mesma exigência da IDEIA-009) e `marketId(uniq, ench)`.
- Interage com IDEIA-012 (confiança do preço): preços de .1 a .3 são muito esparsos na API.

## 6. Fontes
- https://albionfreemarket.com/flipper (Upgrades, "Upgrade Cost", Smuggler Fee, Add Setup Fee)
- https://albionprofitforge.com/ ("Enchant-Up Comparison")
- https://www.albion-online-data.com/3rd-party-tools (Albion Online Hub: "enchant flips")
- IDEIA-009 (dump, wiki)
- AODP: `https://west.albion-online-data.com/api/v2/stats/prices/T4_BAG,T4_BAG@1,T4_RUNE,T4_HEAD_PLATE_SET1,T4_HEAD_PLATE_SET1@1?...` (2026-11-18)

## 7. Confiança
**MÉDIA.** Quantidades e ids são ALTA; a taxa de encantar é BAIXA (sem fonte); preços de itens encantados são esparsos e envelhecem rápido. Não duplica a IDEIA-009 (decisão de craft); é a varredura do Flipper.
