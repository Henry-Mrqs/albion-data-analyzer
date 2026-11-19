# Deploy 15: IDEIA-058 (comparar cidades de craft)

**Status final: VERIFICADO**

- SHA do merge/publicado: `451f5b162f567e39b521ba0d9d5cdc327c199623` (merge limpo de feat/IDEIA-058; 069 não incluída).
- Deploy: `dpl_Hpe3oXF4uAaatpiTNrode3WmDYWY`, READY, production; status do commit success. Gate: docs/qa/IDEIA-058.md APROVADO.
- `npm run check`: lint ok, 27 arquivos, 822 testes, build ok, código 0.
- 200 raiz e catálogo; bundle `index-BKLxn1eM.js` (antes index-C_bJ9bGa.js); catálogo inalterado `c0f66cb0bd` (igual ao id no bundle); 1 requisição `?v=c0f66cb0bd`.

## Verificação (aba nova só produção)
- Craft T4_MAIN_SWORD: cartão "Comparar cidades de craft" com 7 linhas (Lymhurst bônus, Martlock, Thetford, Fort Sterling, Bridgewatch, Caerleon, Brecilien), seletor "Comprar na própria cidade / Comprar na mais barata", aviso "Usando 400 do app em todas as cidades: informe a taxa de cada bancada; sem isso a comparação não vale". Valores: Lymhurst RRR 24,8% custo total 3.198; demais 15,3% e 3.583 (+385 sobre a cidade de bônus); nota de que não inclui transporte/peso/risco.
- Reordenação ao digitar taxa por cidade: Lymhurst com 900 mantém a ordem (diferença 169); Martlock com 0 passa ao topo (Melhor: Martlock, diferença 173).
- 375 px: sem rolagem horizontal da página (scrollWidth 375); a tabela (626 px) rola dentro do contêiner (overflow auto, cartão 343 px).
- Estado antigo salvo (craft:cfg e refine:cfg pré-070, sem _v): abre sem erro nem NaN, com o aviso de migração da 070, cartão de comparação com 7 linhas. Refino, Mercado, RRR (PB 18/15,25%) e Flipper (81 oportunidades) funcionam. Console sem erros.
- localStorage de produção: 6 chaves restauradas byte a byte, sem chave extra; sessionStorage igual. Env vars: nenhuma.

## Observações
Sem anomalias; sem rollback. O aviso da taxa 400 deixou de aparecer depois de digitar taxas por cidade (comportamento esperado do cartão).
