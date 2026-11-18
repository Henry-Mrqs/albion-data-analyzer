# Deploy 10: IDEIA-041 (bônus diário no RRR do craft final)

**Status final: VERIFICADO**

- SHA: `f4915f595e73dfe7b9757f6fba2ac5ed07c497b1` (feat/IDEIA-041, sem conflito; 010 e 049 não incluídas). Gate: docs/qa/IDEIA-041.md APROVADO (com re-teste).
- Deploy: `dpl_CkhGbYHhjpshgDwmG6VZcYLQvk11`, READY, production. check: 15 arquivos, 371 testes, build ok, código 0.
## (a) 200 raiz e catálogo; SHA-1 do catálogo `707148ff5c` (inalterado); bundle index-C3BDXpkf.js (antes index-Cm3ouxS_.js); 1 requisição ao catálogo `?v=707148ff5c` -> 200; sem Banner.
## (b) Craft T4_MAIN_SWORD, Lymhurst (bônus), seletor "Bônus diário do item" (é um select 0/10/20)
- Sem foco: +0 -> RRR 24,8%; +10 -> 30,1%; +20 -> 34,6%.
- Com foco: +0 -> 47,9%; +10 -> 50,5%; +20 -> 52,8%.
- Cartão "Vale esperar o bônus do dia?" com +0 (sem foco): +10% custo 3.136, economia 223 por craft; +20% custo 2.943, economia 417; ambos "vale esperar". Com +10 já escolhido: +10% "sem ganho", +20% economia 194. Com +20: ambos "sem ganho". Com foco e +0: economias 109 e 208.
- NOTA "A lista de categorias ainda não foi confirmada em fonte oficial..." aparece no campo (data-testid daily-note) e no cartão.
## (c) Validação
- craftDaily=15 injetado: aviso "Bônus diário 15 inválido (use 0, 10 ou 20): usando 0." (1 ocorrência), RRR 24,8%.
- craftDaily=20 com craftDailyAt +3 dias: "Data do bônus no futuro (relógio alterado ou data errada): usando 0. Escolha o bônus de hoje de novo para confirmar."; RRR 24,8%.
## (d) Bônus diário 0 (padrão): nada mudou
- T6_MAIN_SWORD, 100 crafts: taxa 400 -> taxa da bancada 69.120; taxa 100 -> 17.280; taxa -400 -> "negativa: usando 0", taxa da bancada 0.
- T4_MAIN_SWORD: coluna "Comprador" e "ilusória" presentes. T4_BAG: Brecilien (bônus). T4_ARMOR_PLATE_ROYAL: base e Selo Real "não retorna", custo 127.933 (sem cidade de bônus).
- Refino Tábua T4: custo líquido 211, lucro +159, Melhor rota e Preço-alvo presentes. Aba RRR abre (PB 18, 15,25% no estado salvo; o caso PB 58/36,71% Refino/Fort Sterling não foi reexecutado neste deploy para não regravar localStorage). Mercado abre. Flipper "Varrer mercado": 137 oportunidades. Console sem erros. Env vars: nenhuma.
## localStorage de produção
As 6 chaves (target:cfg, craft:item, refine:cfg, rrr:cfg, craft:cfg, market:item) foram restauradas byte a byte e nenhuma chave extra restou (albion:settings não foi criada). Chave temporária de sessionStorage removida. Aba fechada.
## Observações
Sem anomalias; sem rollback.
