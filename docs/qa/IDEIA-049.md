# QA IDEIA-049 (receitas alternativas)

**Veredito: APROVADO** (com observações; nenhuma bloqueia)

Branch `feat/IDEIA-049` (HEAD 9a51463), base de comparação = merge-base 1c22818 (a `master` avançou depois: 041/010 foram mescladas).

## Esperado × obtido

| Item | Esperado | Obtido |
|---|---|---|
| `npm run check` | 368 testes, lint, build | 368 verdes (15 arquivos), lint limpo, build ok; `npm test` 2x: 368/368 |
| Escopo (`git diff --stat`) | só arquivos do plano | 14 arquivos, todos do plano; `econ/market/settings/inputRules/vite.config/vercel.json/docs` intocados |
| Testes alterados | só acréscimos | só acréscimos; única linha removida é a lista de imports de `catalog.test.js` (reformatada, mesmos nomes + novos) |
| Itens com `alt` (oráculo próprio sobre o dump 0483dd97) | 605 = 560 + 45 | 605 (560 com 1 substituto, 45 Royal com 2) |
| Receitas do dump comparadas com `alt` (todos os níveis .0 a .4) | 0 divergências | **6.275 receitas comparadas, 0 divergências** (ids, quantidades, flag `nr` conservador, nº de variantes, posição `at`); 0 duplicadas; r + alt cobre todas |
| Excluídos | 30 | 30: 25 refinados (5 tipos x T4-T8) + 5 `T4..T8_CAPEITEM_DEMON_BP` (o "2º requisito" é troca por FAVOR, não receita). Nenhum tem `alt`. Obs.: o plano chama os 30 de "refinados"; na verdade são 25 + 5 |
| Catálogo master × branch | só `alt` novo | 2.292 itens, ids/nomes/r/er/f/cc/tm/cityOf/encNames/extra iguais; 0 campos diferentes além de `alt` |
| `vals` | +110, antigos idênticos | 1.209 → 1.319; 0 valores antigos alterados; 110 novas chaves, todas vindas de `alt.v`; nenhuma receita antiga (r/er) usa chave nova; 20 fichas = itemvalue do dump (FAVOR_2 = 896); 90 SET2/SET3 = 0 (o dump não tem `itemvalue`, igual ao SET1 de hoje) |
| `extra` | +0 | 127 = 127 |
| Tamanho | +37 KB | 591.016 → 628.165 bytes (+37.149, +6,3%); gzip 53.576 → 57.473 (+3,9 KB, +7,3%). Efeito: um download único de ~4 KB a mais comprimido, cache por `?v=` |
| Reprodutibilidade | build 2x iguais e = commitado | b1 == b2 == `catalog.json` commitado (byte a byte) |

## validateCatalog / catalogLoad (DT-007)
Passam: catálogo novo e o catálogo da master (sem `alt`). Rejeitados: item `null`, sem `i`, `i` numérico, `alt` texto/`at` texto/`v` não lista/`v[0]` vazio/`v` vazio/`alt:null`/qtd texto; `null`, `[]`, `{}`. Mensagens: HTML, JSON truncado e corpo vazio dão "A resposta do catálogo não é um JSON válido... Ctrl+F5" (sem `JSON.parse` cru); 404/500 "Catálogo indisponível (HTTP n)"; item inválido aponta `items[0]`; resposta velha seguida de boa passa no retry. Nenhuma exceção não tratada. Obs. menores: `alt.at` fora do tamanho de `r` (ex. 99) é aceito; falha de rede mostra o `TypeError: Failed to fetch` cru (já era assim).

## recipeOf (passo 6)
- Variante 0 x `recipeOf` da master: **10.830 pares item x encanto 0..4 idênticos** (JSON igual), 0 diferenças; `recipeOf(id,n)` == `recipeOf(id,n,0)`.
- Variantes 0..k contra o dump em todos os níveis existentes: 6.275 receitas, 0 diferenças (ingredientes, quantidades, `returnable` conservador). A alternativa existe em .1 a .4 (o dump tem 2 receitas em todos os níveis; a ficha não é encantada, o artefato também não).
- Fora de faixa: -1, 2, 99, Infinity retornam `null`; texto, NaN, null, undefined, `{}` caem na variante 0; `'1'`/`true` viram variante 1; **1.5 lança TypeError** (só alcançável por chamada direta; a UI usa índices inteiros). Baixo risco.

## Escolha da mais barata (D-034)
Oráculo escrito a partir da especificação (custo total = material líquido com retorno conforme `returnable` + taxa arredondada uma vez no total; só entre receitas com todos os preços). **6.000 cenários aleatórios** (605 itens, níveis .0 a .4, crafts 1/7/1000/aleatório, taxa 0/400/800/aleatória, especialização, foco, RRR manual, premium sim/não, 12-25% de preços ausentes, preços repetidos para empate): **0 divergências** em matCost, fee, totalCost, índice da vencedora e do aviso. Cobertura: 1.797 cenários sem nenhuma completa; 1.151 em que uma receita incompleta teria sido mais barata e NÃO foi escolhida; 210 com aviso; 142 empates (vence a primeira, determinístico). Premium não muda a escolha.
Casos à mão:
- Cajado Hell artefato 1.840 x ficha 18.498: taxa 403 e 634, diferença total 16.889, material comum 3.308,27: bate com o dossiê. 12.408 x 21.163: artefato vence, sem aviso. 12.408 x 12.100: ficha vence nos dois critérios, sem aviso. 1.000 x 900: sem taxa vence a ficha, com taxa o artefato: **aviso aparece**; com taxa 0 o aviso some e a ficha vence.
- Royal 3.000/2.500/3.200 + token 500: custos 5.000/4.500/5.200 (nada retorna), vence Base 2; empate SET1=SET2=SET3: Base 1.
- **Opção sem preço: nunca é a mais barata** (mesmo quando o total parcial seria o menor), nunca marca o aviso. Todas sem preço: `pickCheapest` devolve 0 só como índice de exibição, o `RecipePicker` não marca nenhuma ("mais barata agora" só com `results.some(isComplete)`), mostra "sem preço" no material e no total.
- Item sem `alt`: `RecipePicker` retorna null (sem seletor); números idênticos aos da master.

## Diferencial de comportamento (passo 8)
`computeCraft` com variante 0 x master em **4.000 combinações aleatórias** (item, encanto, preços multi-cidade, ordens, refino 'all/buy/best', foco, crafts 1/7/1000/3, RRR manual, bônus de cidade, premium): 0 diferenças no objeto inteiro (linhas, plano, opções). `craftBonusCity` igual em todos os itens. `ingredientValue` difere só nos 20 ids de ficha/base que agora têm valor (esperado). Refino, RRR, preço-alvo e Flipper: arquivos sem alteração no diff e catálogo idêntico nos campos que usam.

## Mutações (cópia descartável; nome do teste que falha)
Todas mortas, exceto 3 sobreviventes.
- SHARD removido: `catalog.test.js > ... DT-009: ingrediente *_SHARD* sem flag continua NÃO retornando`.
- `returnBadge` sempre null / "não verificado" removido / title: `recipeAlt.test.js > returnBadge (DT-009) ...` (4 testes).
- Sem checagem de `i`: `catalogLoad.test.js > validateCatalog: itens e alt ... item null, sem i ou com i não string`.
- `alt` malformado aceito (e `at`/`v` relaxados): `... alt malformado: at não inteiro, v não lista, v[0] sem id`.
- Erro cru de JSON.parse: `fetchCatalog DT-007: corpo que não é JSON ... mensagem clara`.
- `/data/` max-age=3600: `DT-006 ... vercel.json serve /data/ com revalidação sempre`. URL sem `?v=`: `catalogUrl com id` (+6).
- `alt` ignorado / variante errada / `swapped` errado / sem troca em .1 / `variants` fixo / sem variantes: testes de `IDEIA-049: recipeOf com variante e recipeVariants`.
- Sem preço vencendo (missing ignorado): `pickCheapest ... ignora a receita incompleta`. Taxa fora do total: `pickCheapest ... nenhuma completa... ` e `aviso da taxa`. Aviso sempre/nunca/comparação errada: `aviso da taxa de bancada (D-034/D-012) ...` (3 testes). Empate pela última, maior custo, nenhuma completa: `pickCheapest ...`. Label: `variantLabel rótulos`. Texto do aviso: `... texto do aviso`.
- `nr` invertido / ignorado: 30+ testes de `catalog.test.js` (039).
- Dados: `at` trocado, refinado com `alt`, flag da ficha removido, ficha 896 -> 0, Royal sem SET3: `catalog.real.test.js` (invariante, 605 itens, vals, contagem do parser).
**Sobreviventes:** (1) `typeof it?.i` no lugar de `!isObj(it)||...` (equivalente); (2) remover `cost>0` em `complete` (equivalente: sem preço vira `missing`); (3) variante **negativa** deixa de retornar null (cai na base): falta teste de `recipeOf(id, 0, -1)`; baixo risco. Mutantes só da camada React (`RecipePicker`/`Crafting`) não têm teste automatizado (node env): verificados na UI abaixo.

## UI (Vite na worktree, porta 5214, contexto isolado, servidor parado ao final)
- Catálogo carregado em `/data/catalog.json?v=3e1eabcf6d`; uma consulta de preços por item; console sem erros/avisos em Craft, Mercado, Refino, Flipper, RRR.
- Cajado Hell: seletor Automático/Artefato/Ficha; ao vivo, artefato 12.052 + 403 = 12.455 (mais barata), ficha 20.576 + 634 = 21.210; ao escolher a ficha o total do cartão e do plano = 21.210, "não retorna" na ficha e no artefato; escolha salva em `craft:cfg`.
- `T4_HEAD_CLOTH_KEEPER` (375 px): artefato 1.795 + 72 = 1.867, ficha 1.790 + 346 = 2.136; aviso "A escolha depende da taxa de bancada (valor do artefato na taxa não verificado)" aparece; some com taxa 0 (ficha passa a vencer) e volta com 400.
- Royal: Base 1 "sem preço" não marcada; Base 3 "mais barata agora" (130.319 contra 131.380).
- `T4_MAIN_SWORD`: sem seletor, mesmo com `recipeVariant:'2'` salvo de outro item (custo 3.422 normal). Variante salva `'abc'` e encanto .3: não quebra (usa variante 0). Página sem rolagem horizontal a 375 px (tabela rola dentro do próprio contêiner).
- Não subi a master em outra porta (preços ao vivo mudam); a igualdade vem do diferencial em código acima.

## Pontos para o Gerente
1. **Conflito de merge:** `master` atual (041/010) conflita com a branch em `client/src/components/Crafting.jsx` (`git merge-tree`). Precisa de resolução antes do deploy; reexecutar `npm run check` depois.
2. Plano diz "30 refinados"; são 25 refinados + 5 capas DEMON_BP (troca por favor). Exclusão correta, rótulo impreciso.
3. A comparação "mais barata" depende da taxa não verificada (D-012); o aviso cobre. SET2/SET3 têm valor 0 no dump (taxa igual entre bases Royal), ficha 896 x artefato 384.
4. Aviso não cita "D-012" (texto interno) nem diz "NÃO" em caixa alta; D-034 pedia "NÃO verificado, D-012": diferença de redação, não de lógica.
5. `at` fora de faixa em `validateCatalog` e `recipeOf` com variante 1.5 (TypeError): robustez menor, opcional.

Temporários em `%TEMP%\claude\...\scratchpad\qa` (fora do repositório).
