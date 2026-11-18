# Deploy 2: IDEIA-023 (aba RRR) + IDEIA-030 (Preço-alvo)

**Status final: VERIFICADO**

- URL: https://albion-data-iota.vercel.app
- Merges: `e77c47b` (IDEIA-023, branch feat/IDEIA-023) e `8178467` (IDEIA-030, branch feat/IDEIA-030); SHA publicado `817846763a7a7b124cffa55f8fab605bf72cf19d`. Sem conflitos. IDEIA-019 não incluída.
- Deploy Vercel: `dpl_HcABLsjk8dVT7tdQkgjpHk5g9EWB`, READY, production. Status do commit: success.
- Gate: docs/qa/IDEIA-023.md e IDEIA-030.md com veredito APROVADO.
- `npm run check`: lint ok, 7 arquivos, 110 testes passando, build ok, código 0.

## Verificação
- HTTP 200: `/`, `/data/catalog.json`, `/assets/index-Ct0l7Pu8.js`. Hash do bundle mudou (deploy 1: index-BZUETQHF.js).
- (a) RRR: Craft/Lymhurst/sem foco PB 33, 24,81%; com foco PB 92, 47,92%; Refino/Fort Sterling/madeira PB 58, 36,71%. Tabela de referência com 24 linhas, valores batem com o esperado.
- (b) Craft (Espada Larga do Mestre T6): cartão "Preço-alvo" presente. Alterações: modo venda->compra mudou "Liste a" de 56.328 para 54.861; margem alvo 20% -> 66.310 (ordem de venda); relistagens 0->2 -> 70.056. Rótulo "Relistagens (estimativa)".
- (c) Refino (Tábua): cartão Preço-alvo presente (Liste a 243, aviso de alvo acima do mercado).
- (d) Mercado abre com o item padrão e consulta a API; Flipper "Varrer mercado": 942 itens, 56 oportunidades. Console sem erros. API de preços respondendo (dados carregados), sem 429.
- Env vars: nenhuma necessária (app estático).

## Observações
- Item padrão do Mercado só tem preço no Mercado Negro (dado de jogadores, não falha).
- Sem anomalias; sem rollback.
