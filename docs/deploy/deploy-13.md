# Deploy 13: IDEIA-070 (estado salvo antigo ou incompleto: mesclar, validar, versionar)

**Status final: VERIFICADO**

- SHA do merge/publicado: `4252aa22540c948af6f68e37a773b016d035ed76` (merge limpo de feat/IDEIA-070; 002 não incluída).
- Deploy: `dpl_8mnbzHZuqibmiTDnTMH3d8kpXKAt`, READY, production; status do commit success. Gate: docs/qa/IDEIA-070.md APROVADO.
- `npm run check`: lint ok, 25 arquivos, 705 testes, build ok, código 0.
- HTTP 200 raiz e catálogo; bundle `index-DMd1HYW3.js` (antes index-m72LB_k8.js); catálogo SHA-1 `3e1eabcf6d` (inalterado, igual ao id no bundle); 1 requisição ao catálogo `?v=3e1eabcf6d`.

## Verificação em produção (aba nova só de produção)
- Estado salvo atual (craft:cfg com `refineCity:'auto'`): sem aviso de migração; nada reescrito no carregamento.
- Estado antigo injetado em `albion:craft:cfg` (sem `refineCity`, sem `_v`, formato de antes da 7fe574e): após recarregar, 1 aviso (Banner): "Sua configuração antiga foi atualizada: o refino agora usa a cidade especializada de cada recurso (RRR +40)." com botão "Entendi"; o campo de cidade do refino ficou em "Mais barata (automático)". "Entendi" dispensou o aviso e criou `albion:notice:craft-refine-city`; depois de recarregar, o aviso não volta.
- Abas: Mercado, Refino (Melhor rota/Custo líquido), Craft (MATERIAIS, RRR 15,3%), RRR (PB 18/15,25%) abrem; Flipper "Varrer mercado": 136 oportunidades. Console sem erros.
- Observação (já registrada no QA, O2): o texto "(RRR +40)" mistura bônus de produção (PB) com RRR em %.
- localStorage de produção: 6 chaves restauradas byte a byte; a chave `albion:notice:craft-refine-city` criada pelo teste foi removida; sessionStorage igual. Aba fechada.
- Env vars: nenhuma.

## Observações
Sem anomalias; sem rollback.
