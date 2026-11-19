# QA IDEIA-048 (despesas extras e "venda sem imposto de mercado") — laudo do Tester

Branch `feat/IDEIA-048` (5 commits, HEAD `1973ad8`, sobre `830fab7`). O código de `client/` da master não mudou desde `830fab7` (só docs): o rebase é trivial. Worktrees próprios (branch e master) fora do repositório; nada foi editado na branch. Um Tester anterior foi interrompido: este laudo recomeçou do zero.

## Veredito: APROVADO (com 5 defeitos não bloqueantes; nenhum erro de cálculo)

Nenhuma diferença numérica: diferencial bit-idêntico contra a master (3.500 cenários de Craft e 1.500 de Refino) e oráculo independente sem falhas (0 em ~46.000 comparações). Os defeitos são de apresentação, aviso e cobertura de testes. A limitação do Preço-alvo é classificada em D1.

## 1. Escopo, check, bundle
- `git diff --name-status master...feat/IDEIA-048`: 17 arquivos. Novos: `extras.js`, `ExtrasCard.jsx` e 7 arquivos de teste (`extras.test.js`, `craftPlan.extras.test.js`, `refinePlan.extras.test.js`, `inputRules.extras.test.js`, `ExtrasCard.test.jsx`, `Crafting.extras.test.jsx`, `Refining.extras.test.jsx`). Alterados: `econ.js`, `craftPlan.js`, `refinePlan.js`, `inputRules.js`, `persistSchemas.js`, `Crafting.jsx`, `Refining.jsx` e, de teste existente, **só `econ.test.js`** (+14 linhas, só acréscimos). Os testes novos foram para arquivos novos em vez de acrescentar aos existentes (desvio do plano, vantagem: nada existente muda).
- `persistSchemas.js` não estava na lista do plano, mas é necessário (contrato "todo campo gravado existe no esquema", que os mutantes 33 a 35 comprovam): `craft:cfg` e `refine:cfg` ganham `extras: 'passthrough'` (validado por `validateExtras`; só o craft tem o comentário dizendo isso, o refino também usa) e `noTax: { map: 'bool' }`. OK.
- Não tocados, conforme o plano: `catalog*`, `market.js`, `exits.js`, `targetPrice.js`, `TargetPrice.jsx`, `flip.js`, `Flipper.jsx`, `vite.config.js`, `vercel.json`.
- Nenhum `.test.jsx` com `usePersisted('chave'` literal. Nenhum valor padrão de despesa em código (só `placeholder="Valor"` e `"Nome (opcional)"`; a lista começa vazia).
- `npm run check` 2x (lint limpo, build ok): **39 arquivos / 971 testes passando**, nas duas execuções.
- Bundle (vite build, branch vs master): `Crafting` 28,50 -> 29,62 kB (+1,12), `Refining` 15,07 -> 15,69 kB (+0,62), `index` 229,84 -> 229,93 kB (+0,09). Sem dependência nova.

## 2. Oráculo e diferencial
Método: dump determinístico (semente fixa) de `computeCraft`, `waitSavings`, `compareCraftCities` e `evaluateTier` nas duas árvores (master e branch), comparado por um script próprio (`oracle.mjs`, fórmulas reescritas à parte, sem importar `econ.js`).

- **Cenários do dossiê §4** (testes da branch, conferidos à mão): custo base 3.524,27 e lucro 683,23; com 230 por craft: 3.754,27 e 453,23; sem imposto: líquido 4.500 e lucro 745,73; lote de 10 com 230 por lote: 23 por craft, custo/un 3.547,27, lucro/un 660,23, total 6.602,29; Refino A: 72,9266 / 62,9266 / 78,5266 / 68,5266. Todos passam. Confirmados também na tela real (3.754, +453, "Despesas: 230 por craft (230 no lote de 1)"; lote de 10 com 150 por craft + 80 por lote: 1.580 no lote).
- **Diferencial sem despesas e sem marca: 0 diferenças** em 3.500 cenários de Craft (10 itens de receitas diferentes, foco, diário, RRR manual, premium, ordens, refino buy/all/best, bônus de cidade, 1 a 100 crafts, preços faltando) para `computeCraft` (JSON inteiro, menos os campos novos `extras`, `extrasList`, `options[].noTax`), `waitSavings` e `compareCraftCities`; e 0 diferenças em 1.500 cenários de `evaluateTier` (Refino).
- **Oráculo com despesas e marcas** (2.321 cenários com despesa > 0; 2.614 linhas "por lote" e 2.619 "por craft"; 13.791 saídas marcadas "sem imposto"; valores `0`, `10`, `150`, `80`, `230`, `1234.5`, `'55'`, `''`):
  - `totalCost = base + Σ extras` (por craft × crafts, por lote 1 vez); `unitCost = totalCost / unidades`.
  - Inalterados com despesas: `rates` (RRR e foco), `fee` (taxa de bancada), `matCost`, `lines`, `plan`, `used`, `units`, `missing`.
  - Cada saída: líquido = preço × k × unidades, com k = 1 (marcada), 1 - imposto - 2,5% (ordem de venda) ou 1 - imposto (instantânea); lucro e margem sobre o custo com despesas; ordenação por lucro e `best = options[0]`.
  - `waitSavings`: economia igual à sem despesas (a despesa cancela) e base + despesas. `compareCraftCities`: 12.901 linhas completas com `totalCost = material + taxa + despesas` (ranking inalterado).
  - Refino (1.500): custo de produção e rota inalterados; líquido = preço (marcada) ou o de antes; lucro = líquido - (custo + despesa/un); margem sobre o custo com despesa.
- **"Sem imposto" remove só o imposto de mercado e a taxa de criação de 2,5%?** Remove os dois e só eles (X3: sem imposto 4%/8% e sem setup fee, em ordem de venda; em ordem de compra instantânea remove o imposto). Bate com o plano e com a regra de produto do dossiê. O texto da tela é honesto: diz "venda fora do mercado... sem imposto nem taxa de criação; o preço continua sendo a referência do mercado e não garante comprador" (Craft) e "O preço continua sendo a referência do mercado" (Refino). A confiança X3 (média-alta, trecho de wiki) está declarada no plano.

## 3. Estado antigo e corrompido
Teste de renderização (jsdom) de `Crafting` (3 itens: T4_MAIN_SWORD, T6_MAIN_SWORD +3, T4_BAG) e `Refining` com os 6 formatos salvos de `craft:cfg` e os 4 de `refine:cfg` da 070 (git), cada um combinado com 39 variações: sem extras/noTax; `extras` não-array (`'abc'`, 5, null, `{}`, `true`); linhas `null`/número/texto/array; valor negativo, NaN, `'abc'`, `1e30`, `'1e30'`, `'Infinity'`, `'-Infinity'`, `'1e308'` x2, objeto, array, `'1.234,5'`, `' 12 '`, booleano; escopo inválido; nome não texto; 25 linhas com nome de 200 caracteres; só linhas em branco; `noTax` texto, número, null, array, valores `'yes'`/1/objeto, chave `__proto__`, `a|b`, `Caerleon|none`, `|order`. Resultado: **nenhum erro de renderização, nenhum `console.error`, nenhum `NaN`, `undefined` ou `Infinity` na tela** (exceto o eco do texto digitado em D3). Despesa negativa vira 0 com o aviso "Despesa 1: valor -50 é negativo: usando 0." sob a linha (visto na tela real) e conta no selo de valores corrigidos. Os demais 13 perfis de outras chaves da 070 não são tocados por esta ideia (suíte inteira verde).

## 4. UI real (Vite na porta 5251, parado ao fim; preços simulados no `fetch` porque a API pública devolveu 429)
- Craft de `T4_MAIN_SWORD` (especialização, taxa 500, materiais comprados): adicionar 2 despesas pela tela (150 e 80), custo 3.524 -> 3.754, lucro +683 -> +453, linha "Despesas extras 230" na tabela de materiais e no plano de compra (total 3.754, sem contar duas vezes), persistência em `albion:craft:cfg` (`extras` com valores texto). Trocar o escopo para "por lote" e 10 crafts: 1.580 no lote, custo/un 3.682. Remover despesa 1 removeu a linha certa. Negativo: aviso e valor 0.
- "Sem imposto" no Mercado Negro (ordem de compra, 4.300 -> líquido 4.300, +546) e em Caerleon (ordem de venda, 4.500 -> líquido 4.500, +746): chaves `Black Market|instant` e `Caerleon|order` gravadas; as outras linhas não mudam; o cartão Foco ("+1.562 / +546") acompanha a melhor saída.
- Craft de `T4_BAG` (bolsa) com 120 por craft + 60 por lote, 3 crafts: 420 no lote, custo 5.363, líquido 7.800 com Caerleon sem imposto: confere.
- Refino (tábua T4): interruptor "Venda sem imposto" (líquido 94 -> 100), despesa de 1.000 por lote com 100 un. = 10 por unidade (custo 197 -> 207, lucro -107 por unidade, -10.707 no total): confere.
- 375 px: sem rolagem horizontal da página (`scrollWidth` 375); o cartão de despesas cabe (16 a 359 px). Ver D2 (seletor de escopo truncado).
- Console limpo (só mensagens do Vite/React DevTools), antes e depois das interações.

## 5. Limitação conhecida: Preço-alvo e outros cartões
- **Preço-alvo (D1):** continua usando o custo COM despesas (correto) e o imposto de mercado do próprio seletor "Modo de venda", sem olhar as marcas "Sem imposto". Efeito: com a saída marcada, o cartão pede preço MAIOR do que o necessário (ex.: em Craft de espada, custo 3.754, "Liste a 5.085" para lucro 1.000 vendendo no mercado, enquanto a tabela mostra +746 sem imposto a 4.500). É conservador (erra para o lado seguro: nunca induz a vender com prejuízo), não contradiz a tabela porque o cartão responde a outra pergunta ("preço no mercado, no modo escolhido"), mas não diz isso. Gravidade **baixa/média**; não reprova. Recomendo ao menos uma linha de aviso no cartão quando houver alguma saída marcada (ou a IDEIA-075 já aberta). 
- **Giro, Comprador/saídas, "Melhor destino", plano de compra, Foco (Craft), "vale esperar", comparação de cidades:** consomem `computeCraft` ou o custo com despesas e ficam coerentes (verificado no oráculo e na tela). RRR e Flipper não usam custo de craft: não afetados. Foco do Refino mostra só diferença de custo (a despesa cancela).
- Observações menores sobre o mesmo tema (D4).

## 6. Mutação (47 mutantes: 40 mortos, 7 sobreviventes)
Aplicados um a um na branch, suíte inteira (`vitest run --bail 1`), restaurando o arquivo depois. Mortos (40): `netSale` 'none' (2), `extrasTotal` (lote x crafts; por craft sem multiplicar), `extrasPerUnit` `>0`->`>=0`, `MAX_EXTRAS`, `REFINE_NO_TAX_KEY`, `extrasParts`, `totalCost` sem despesas, `extrasTotal(..., 1)`, 'none' trocado por 'order', chave `noTax` sem o modo (Craft e UI), lucro sem despesas, `unitCost` sem despesas, despesas somadas à taxa de bancada, `evaluateTier` (lucro, margem, 'instant', `-`), negativo `<=0`, teto `MAX_QTY`, nome 60/61 e sem `trim`, 20/21 linhas, escopo `lote` fora, `noTax` `=== true`, linha em branco, `cleanRefineCfg` sem `cleanNoTax`, issues não repassados, `persistSchemas` sem `extras`/`noTax` (3), `extrasPerUnit` do Refino com 1 craft, total do Refino sem despesa, interruptor do Refino com chave errada, ExtrasCard (limite, remover linha errada).

**Sobreviventes (todos de cobertura; a implementação está certa nos 7, confirmada pelo oráculo ou pela tela real):**
| # | Mutante | Sobrevive porque |
|---|---|---|
| 13 | `o.margin` do Craft sem as despesas (`matCost + fee`) | nenhum teste confere a margem (%) do Craft com despesas |
| 26 | regex de `cleanNoTax` aceitando `Cidade|none` | nenhum teste prova que `|none` é descartado (inofensivo: `o.mode` nunca é 'none') |
| 37 | total do plano de compra sem `+ extras` (Crafting.jsx) | nenhum teste de componente lê o "Total" do plano com despesas |
| 38 | `ExtrasCard crafts={1}` no Craft | os testes de tela só usam 1 craft com a linha do resumo, ou o resumo com lote de 10 não foi conferido pelo Crafting |
| 40 | `TargetPrice cost` do Refino sem as despesas | nenhum teste lê o Preço-alvo do Refino com despesa (o plano pedia que considerasse o custo com despesas) |
| 41 | tabela "Comparar rotas" do Refino sem `- perUnitExtras` | idem, coluna de lucro das rotas |
| 46 | `<select>` de escopo do ExtrasCard sempre exibindo 'craft' | o teste do componente não confere o valor exibido do select |

## 7. ERROS DE DADOS
**Nenhum.** Nenhum número de jogo novo foi introduzido; custos, RRR, foco, taxa de bancada, imposto (4%/8%) e taxa de criação (2,5%) não foram alterados; sem despesas e sem marca a branch é bit-idêntica à master.

## Defeitos (não bloqueantes)
- **D1 (baixa/média) Preço-alvo ignora "Sem imposto" no Craft e no Refino.** Pede preço mais alto que o necessário quando a saída está marcada; não induz erro de cálculo nem venda no prejuízo; falta um aviso no cartão. Decisão D-052: aceito, IDEIA-075 cobre. Sugestão: uma linha "o preço-alvo usa o imposto do mercado no modo escolhido; não considera 'Sem imposto'" quando `noTax` tiver alguma marca.
- **D2 (média/baixa, UI) A 375 px o seletor de escopo da despesa mostra só "por" (largura 62 px com 28 px de padding à direita)**: o jogador não vê se a linha é "por craft" ou "por lote", e um escopo errado muda o custo em até Nx. Sugestão: coluna do nome mais estreita, rótulos curtos ("craft"/"lote") ou a linha em duas filas no celular.
- **D3 (baixa, cosmético) O aviso ecoa o texto do estado corrompido**: "valor -Infinity é negativo" e "valor [object Object] não é um número". Só ocorre com `localStorage` editado à mão; sem `NaN` nos números.
- **D4 (baixa) Comparar cidades: "Custo total" inclui as despesas, sem coluna nem nota**: Material + Taxa não somam o total (ex.: 4.511 + 432 vs 5.363) e o texto diz "Compara só o custo de produzir; não inclui transporte...". Também: a marca "Sem imposto" vale para todos os itens (o mapa é global em `craft:cfg`, não por item) e o quadro "Melhor destino" não indica que a melhor saída está sem imposto (só a linha da tabela e o líquido = preço).
- **D5 (baixa) 7 mutantes sobreviventes** (tabela acima): faltam testes de margem do Craft com despesas, total do plano com despesas, resumo do Craft com vários crafts, Preço-alvo e comparação de rotas do Refino com despesa, valor exibido do select e `|none` no `cleanNoTax`.
