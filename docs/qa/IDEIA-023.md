VEREDITO: APROVADO (com 2 observações menores, nenhuma bloqueante)

# QA IDEIA-023 (aba RRR) — branch feat/IDEIA-023

## 1. Funcional
- `npm run check` na worktree: lint limpo, 6 arquivos / 95 testes passando, build OK (chunk RrrCalculator 6,18 kB). `npm test` rodado 2x: 95/95 nas duas.

## 2. Escopo
- `git diff --stat master...feat/IDEIA-023`: App.jsx (+4/-1), RrrCalculator.jsx (+171), rrrCalc.js (+57), rrrCalc.test.js (+104). Nada em econ.js, catalog.json, market.js, settings.js, docs/*.
- Literais 18/40/15/59/0.18 de PB: nenhum. Só `100` em `pbOf` (inversa de PB/(100+PB), legítimo), `r*100` (percentual) e `100 - per100` (texto "de cada 100"). Tudo deriva de `rrr()` (econ.js), `REFINING` e `craftBonusCity` (catalog.js).

## 3. Tabela de referência: esperado (script próprio, fórmula PB/(100+PB)) x módulo x tela
24 linhas = 2 tipos x 2 especialização x 2 foco x 3 diários, sem faltar nem sobrar, sem chave duplicada. Divergência máxima módulo x referência < 1e-12. A tela (get_page_text) mostra os mesmos valores.

| Caso | PB | Esperado | Módulo | Tela |
|---|---|---|---|---|
| sem bônus | 18 | 15,2542 | 15,2542 | 15,25 |
| craft especializado | 33 | 24,8120 | 24,8120 | 24,81 |
| refino especializado | 58 | 36,7089 | 36,7089 | 36,71 |
| foco sem esp. | 77 | 43,5028 | 43,5028 | 43,50 |
| craft esp.+foco | 92 | 47,9167 | 47,9167 | 47,92 |
| refino esp.+foco | 117 | 53,9171 | 53,9171 | 53,92 |
| craft esp.+foco+10 | 102 | 50,4950 | 50,4950 | 50,50 |
| craft esp.+foco+20 | 112 | 52,8302 | 52,8302 | 52,83 |
| refino esp.+10 | 68 | 40,4762 | 40,4762 | 40,48 |
| refino esp.+foco+20 (máx.) | 137 | 57,8059 | 57,8059 | 57,81 |

Lote (100 crafts, Lymhurst/espada, 16 barras + 8 couros): sem foco barras 1.600 / 396,99 / 1.203,01 e couro 800 / 198,50 / 601,50; com foco 766,67 / 383,33 (líquidos 833,33 / 416,67). Módulo e tela (T6_MAIN_SWORD real) idênticos ao cálculo à mão. Artefato (Sarcófago T6: 4 tábuas, 4 barras, 1 núcleo): tábuas e barras 400 / 99,25 / 300,75; núcleo 100 / 0,00 / 100,00, rotulado "não retorna".

## 4. Propriedades (5.000 entradas aleatórias, semente fixa; cidade, categoria, recurso, foco, diário, quantidade e ingredientes sorteados)
5.000 entradas, 0 violações em: RRR em [0,1) e finito; igual à fórmula independente (PB e RRR); partes do PB somam o PB; monotônico em foco e em diário; especializado >= não especializado; craft esp. < refino esp.; flag de especialização consistente com `craftBonusCity`/`REFINING`; líquido = bruto x (1-RRR); retorno + líquido = bruto; ingrediente que não retorna tem retorno 0; 0 <= retorno <= bruto.

## 5. Cidade de bônus
A aba chama `craftBonusCity` e `REFINING` do projeto (isSpecialty), sem tabela própria. A correção da IDEIA-038 se propaga. Até lá a aba herda o erro de produção (ex.: espada marcada como bônus de Lymhurst). Não é motivo de reprovação.

## 6. Casos-limite
- RRR máximo: refino 57,81% e craft 52,83% confirmados (módulo e tela).
- Receita sem ingredientes: lista vazia, sem erro. Item inexistente: banner "não tem receita". Item amount>1 (poção x5, ench .1): calcula por craft; ok.
- N = vazio, 0, -5, texto: tratado como 1 (a caixa continua mostrando 0/-5; ver observação). N = 2,7: usa 2 (floor). N = 1e15 e 1e20: números grandes sem erro. Sem NaN/Infinity em nenhum caso exceto o abaixo.
- **Observação A (menor):** N = 1e308 (digitado na caixa) mostra "∞" no bruto/retorno e "NaN" no líquido. Valor absurdo, sem exceção/queda, mas fere o requisito "sem NaN/Infinity na tela". Sugestão: limitar N (ex.: min(N, 1e9)).
- **Observação B (menor):** N <= 0 ou vazio cai silenciosamente em 1 sem aviso, enquanto o campo mostra o valor digitado.
- Observação C (design): a categoria do RRR é um seletor próprio; escolher outro item na receita não troca a categoria (escudo com categoria "Espada" usa a cidade da espada). Usuário precisa acertar manualmente.

## 7. Mutações (cópia descartável em scratchpad, nunca na branch)
Suíte completa (95 testes) por mutação: 40->41 (13 falham), 15->14 (17), 59->60 (16), `100+`->`99+` (31), diário em dobro (11), inverter 40/15 (25), arredondar retorno cedo (2), artefato passa a retornar (1), líquido=bruto (2), especialização sempre (2), refino ignora cidade (3), craft ignora a comparação de cidade (1), diário ignorado (5), foco ignorado (8), tabela sem +20 (2), per100 errado (1), pbOf errada (12). Todas mortas.
**Sobrevivente (1):** `Math.floor` -> `Math.round` em N (decimal): 95/95 passam. Nenhum teste cobre N decimal. Baixo risco.

## 8. Olho de jogador experiente
Nada fora do esperado: 15,25% base; 24,81% craft com bônus; 36,71% refino com bônus; 53,92% refino com foco; máximos 57,81 / 52,83. Sem linha impossível, sem retorno > bruto, rótulos refino/craft corretos. Detalhes: linhas de refino e craft sem especialização são idênticas (correto, só o bônus de cidade difere); nome cru "T1_ALCHEMY_EXTRACT .1" aparece na receita da poção (lacuna preexistente do catálogo); T6_WOOD aparece com receita (preexistente).

## 9. UI (vite porta 5192, navegador embutido; servidor encerrado)
Aba RRR abre; testadas combinações cidade x foco x diário em refino e craft (Martlock 15,25%; Fort Sterling refino 36,71 / foco 53,92 / foco+20 57,81; Lymhurst craft 24,81), decomposição em texto correta ("18 base + 40 especialização + 59 foco + 20 bônus diário = 137"), linha atual destacada na tabela. Mercado, Refino, Craft e Flipper abrem sem erro. Console: apenas avisos do Vite/React e um warn do input number ao receber "abc"; nenhuma falha de rede nem exceção.

## Evidências
Script de QA (vitest em cópia fora do repositório) com 5 testes: tabela, casos do dossiê, item real/artefato, 5.000 propriedades, limites. Plano e dossiê concordam entre si nos valores conferidos.
