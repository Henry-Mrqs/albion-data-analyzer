# IDEIA-064 — Perfil do crafter: especializações e tiers que sei fazer (uma entrada, usada em todo cálculo)

## 1. O que faz e por que o jogador usa
Hoje o crafter digita as mesmas coisas em cada tela: Premium, foco disponível, cidade, taxa de bancada, bônus diário. Quando entra a IDEIA-002 (foco) entram também os **níveis de especialização**, e um ranking (IDEIA-013) lista 2.186 itens craftáveis dos quais o jogador sabe fazer poucos. Esquecer de preencher um desses campos é a origem do "lucro que parecia bom". A funcionalidade: um **perfil** salvo localmente com (a) Premium e foco disponível por dia, (b) taxa de bancada por cidade, (c) níveis de especialização por categoria (nível do nó de mestre e da especialização do item), (d) lista de categorias e tiers que o jogador **produz**, usada como filtro padrão em Craft/Flipper/ranking, (e) cidade-base e hideout. As ferramentas da comunidade fazem isso: especializações e personagem na AFM ("Specs: personagem ou entrada manual; afetam custo de foco e qualidade"), "Masteries" salvas por login na AlbionUtil, "Use My Levels" no Albion Profit Forge, sincronização do Destiny Board no Albion Online Hub e Albion Codex (FERRAMENTAS-001).

## 2. Regras de negócio

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| P1 | Níveis de especialização reduzem o **custo de foco** (não o RRR): `custo = base × 0,5^(eficiência/10000)` com eficiência = soma de coeficientes por nível | IDEIA-002; AFM 2026-07-21 | MÉDIA-ALTA |
| P2 | Coeficientes por nível divergem entre ferramentas (30+250; 250/15/30; 280/265) | IDEIA-002 F5; FERRAMENTAS-001 | MÉDIA-BAIXA |
| P3 | A AFM diz que especialização afeta também a **qualidade** do item produzido (chances); fórmula não coberta aqui (IDEIA-008) | albionfreemarket.com/crafting | MÉDIA |
| P4 | **Regras de desbloqueio de crafting por tier** (o que o jogador precisa ter para craftar T6-T8): **NÃO ENCONTRADAS** em fonte. O guia diz que sem maestria o item sai de nível baixo; não há tabela | busca 2026-11-18 | **BAIXA** |
| P5 | Todos os dados do perfil são do usuário; **nenhuma API pública** devolve especializações do personagem (a AFM usa um cliente de dados próprio; o Hub, sincronização do Destiny Board com conta) | AFM; albiononlinehub.com | MÉDIA |

Por P4, o app **não** deve tentar inferir o que o jogador pode craftar; o filtro é uma lista marcada pelo usuário. Regra de produto: `item visível = (item.cc ∈ categorias do perfil) E (tier ∈ faixa marcada)`; "mostrar tudo" sempre disponível.

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| Premium, foco/dia, taxas por cidade, cidade-base, níveis de especialização | input do usuário (localStorage, exportar/importar JSON) |
| Categoria do item | `@craftingcategory` (IDEIA-038) |
| Faixa de tier | catálogo |

## 4. Exemplo numérico (caso de teste)
Perfil de exemplo: categorias e tiers marcados: **sword T4-T6** e **plate_armor T4-T5**; Premium; taxa Lymhurst 500; foco 10.000/dia.
Contagem no `catalog.json` atual (itens com receita, `c` = `weapons/sword` com tier 4 a 6, e `armors/plate_armor` com tier 4 a 5): espadas **24** (8 por tier); armaduras de placa **18** (9 por tier); total de **42** de 2.186 itens craftáveis (**1,9%**). Observação: as 9 armaduras de placa de T4 incluem `T4_ARMOR_PLATE_ROYAL`, que não tem `craftingcategory` (IDEIA-038): o filtro por `cc` a excluiria, e o filtro por `c` a incluiria; a decisão deve ser explícita.
Teste de persistência: salvar perfil, recarregar, ler os mesmos valores; teste de filtro: com o perfil acima, `T4_MAIN_SWORD` visível, `T7_MAIN_SWORD` oculto, `T4_ARMOR_CLOTH_SET1` oculto.
Uso do perfil no foco: com `Sword Crafter 100` e `Broadsword 100` (eficiência 31.000), `T4_MAIN_SWORD` custa 149,99 de foco (IDEIA-002): o campo "eficiência" do perfil alimenta essa conta; sem preenchê-lo o app deve avisar "foco sem especialização informada" (cruza com IDEIA-005).

**O que o usuário deve medir/informar:** (1) o custo de foco que a janela de craft mostra para 1 item (valida a eficiência e substitui os coeficientes divergentes); (2) a taxa de cada bancada que usa; (3) o bônus diário do dia, quando for usar.

## 5. Encaixe no projeto
- Novo `settings` de perfil (já existe `useSettings` e persistência `albion:*`); Craft/Refino/Flipper leem dele. Export/import em JSON para não perder o perfil.
- Reduz o esforço de IDEIA-002, 013, 015 e 051 (todas precisam desses campos). Não duplica IDEIA-015 (receitas salvas) nem IDEIA-026 (link compartilhável).

## 6. Fontes
- https://albionfreemarket.com/crafting (Specs, personagem ou manual)
- https://albionutil.com/en/calculator-crafting (masteries salvas)
- https://albionprofitforge.com/ ("Use My Levels")
- https://albiononlinehub.com/ (Destiny Board sync)
- IDEIA-002, IDEIA-038, FERRAMENTAS-001

## 7. Confiança
**MÉDIA** como funcionalidade de produto (padrão visto em 4 ferramentas); **BAIXA** para qualquer automação baseada em regras de desbloqueio (P4).
