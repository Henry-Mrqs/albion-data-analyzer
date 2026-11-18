# Deploy 1: IDEIA-001 fundação de testes

**Status final: VERIFICADO**

- URL: https://albion-data-iota.vercel.app
- SHA do merge: `74e1cfd44904cdda8e4ae385eeb4e087f4b7edaf` (merge --no-ff de `feat/IDEIA-001`, sem conflito)
- Deploy Vercel: `dpl_C2KWaoZxggfV2DbPNi6EpXv5TEiy`, estado READY, target production. Status do commit no GitHub: success. Deploy anterior (rollback candidate): `dpl_FUdn7CnUF62EXaFNXJxWvYp71v7G` (7fe574e).
- Laudo QA: docs/qa/IDEIA-001.md, veredito APROVADO.

## O que subiu
IDEIA-001: Vitest + refatoração sem mudar números (Crafting/Refining/Flipper usam lib/craftPlan.js, refinePlan.js, flip.js). Sem mudança visível esperada.

## Pré-push
`npm run check` na raiz: lint limpo, 5 arquivos / 76 testes passando, build Vite ok, código 0. Observação: node_modules da raiz estava incompleto (sem vitest) e `npm ci` falhou com EISDIR em node_modules/.bin; `npm install --prefer-offline` resolveu (package-lock sem alterações no git).

## Verificação pós-deploy
- HTTP 200: `/`, `/data/catalog.json`, `/assets/index-BZUETQHF.js`, `/assets/index-BnlDO6oX.css`. O bundle servido é o mesmo do build local.
- Título: "Albion Data · Mercado, Refino, Craft e Flipper".
- Mercado: abre com Espada Larga do Mestre T6.0; consulta à API respondeu, item sem dados recentes ("Sem preços para este item/qualidade"), estado esperado de dados de jogadores, não falha.
- Refino (Tábua T4, rota Melhor combinação): "Melhor rota", "Passo a passo (melhor combinação)", Comparar tiers e tabela de preços por cidade presentes; custo líquido 197, lucro +174/un.
- Craft (Espada Larga do Mestre T6): Materiais, Plano de compra e produção, Comparar rotas dos materiais refinados e tabela por cidade renderizam; custo total 51.568/un. Item sem preço de venda em nenhuma cidade (dado, não bug).
- Flipper: "Varrer mercado" com padrões: 942 itens, ~16 consultas, 67 oportunidades listadas; sem aviso de limite.
- Console do navegador: sem mensagens/erros. Rede: o filtro não capturou requisições (rastreio iniciado após o carregamento), mas as telas mostram preços carregados da API (west.albion-online-data.com), sem 429.
- Vercel get_runtime_errors (1 h): nenhum erro.
- Variáveis de ambiente: nenhuma necessária (app estático Vite).

## Observações
Nenhuma anomalia. Nenhum rollback.
