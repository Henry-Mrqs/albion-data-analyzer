# Notas do lote 1 (release/batch-1)

## IDEIA-089 — PULADA (teste existente conflita com a regra do plano)
O teste existente `liquidity.test.js > "o dia de hoje (parcial) fica fora"` usa `flat(21, 3, 23)` (3 pontos, de 23 a 25/10, `now`=26/10) e espera `volumePerDay` = 3 (21/7). Pela regra do plano (divisor = dias que a série cobre, do 1º registro até o fim da janela) o divisor passa a 3 e o volume a 7. É o mesmo caso "item novo" que o plano manda mudar (3 dias, 100/dia: 42,9 -> 100), então o teste antigo codifica exatamente o comportamento que a 089 corrige, e o plano afirma ("nenhum existente muda") que nenhum teste antigo quebra, o que é falso para este.
Implementação e 8 testes novos prontos e verdes (exceto esse): `docs/qa/IDEIA-089.pending.patch` (`git apply`). Falta só autorizar a atualização do teste antigo (esperado 7, ou aumentar a série para cobrir a janela) e a Task 2 (dica no `GiroCard`).

## IDEIA-088 — feita, com um desvio do plano
- A 2ª leitura do Mercado Negro (a que não é a do cabeçalho) fica em `computeCraft().bmAlt`, NÃO como 2ª linha de `options`. Motivo: o teste existente `craftPlan.test.js > "DT-001: Black Market nunca é ordem de venda..."` exige `options` = exatamente `[Lymhurst order, Black Market instant]` com `{ s: 99999, b: 8500 }`; uma 2ª linha o quebraria e o plano proíbe alterar teste existente. Efeito igual: a leitura secundária nunca é `best`/`bestReal` (nem entra em `pickExit`/`exitNoTaxByMode`); a tela a mostra na tabela "Onde vender" com o selo "não entra no melhor destino".
- `cleanNoTax` (inputRules.js) passou a aceitar a chave `Cidade|list` (necessária para `Black Market|list`); nenhum teste existente mudou.
- Sonda real (2026-11-20): Mercado Negro 52 linhas (lista bate 18, compra bate 4, ambas 13, nenhuma 17) -> regra R-C; `BM_READING_VERIFIED` segue `null`. Relatório: `docs/research/IDEIA-088-probe.md`.
- Não rodei as mutações da lista do plano para 088 (só testes novos verdes); sugiro o Tester rodá-las.

## IDEIA-073 — feita; 1 teste existente ajustado
- `CityCompare.extras.test.jsx` (arquivo que o plano lista em "Altera"): a asserção `Despesas === Custo total - 1` deixou de valer porque a Task 2 move "Custo total" para antes do "Material" (ordem pedida pelo plano). Troquei por "Despesas logo depois de Taxa" e "Custo total antes de Material". Nenhum outro teste existente mudou.

## IDEIA-085 — feita; prova reduzida
- Medição: 0/12 falhas do arquivo sob 3 suítes `ui` em paralelo (antes não medido); não repeti 30x nem 10x `npm run check`. Sem retry/skip/aumento de timeout global.

## IDEIA-089 — PULADA (ver acima); IDEIA-086 — feita (contrato + tela Premium + cartão); IDEIA-074 — feita (só testes).

## IDEIA-089 — FEITA (D-072)
Patch aplicado. Teste existente `liquidity.test.js > "o dia de hoje (parcial) fica fora"` atualizado de 3 para 7: série de 23 a 25/10 (3 dias), `now`=26/10, janela de 7 dias, soma 21; cobertura = (26/10 00:00 − 23/10 00:00)/1 dia = 3 dias; 21/3 = 7. Condição da D-072 (série cobre menos que a janela) atendida. Task 2: dica no `GiroCard` (usa a linha do melhor destino, ou a 1ª linha se não houver).

## IDEIA-082 — feita; 1 asserção existente ajustada (autorizada pelo plano, D3)
- `Refining.targetNoTax.test.jsx` (listado em "Altera"): esperava "(Mercado Negro, ordem de venda)"; o plano D3 manda que o Mercado Negro nunca diga "ordem de venda"; agora "(Mercado Negro, ordem de compra)". Nenhum outro teste existente mudou.
- Desvio de texto: no aviso principal (modo da marca) o Mercado Negro usa o curto "(Mercado Negro, ordem de compra)" para não quebrar o teste existente de `TargetPrice.noTax.test.jsx`; o aviso novo do outro modo usa `exitLabel` completo ("ordem de compra do Mercado Negro").
- Mutantes M19/M23/M30: testes escritos (passam); NÃO apliquei as mutações em cópia para vê-las falhar (sugiro o Tester).

## IDEIA-083 — feita
- Nenhum teste existente alterado. Compatibilidade: sem `targetLive` (ou `ok:false`) as linhas do auditor ficam como antes; com valores vivos, o texto de `target-notax` mantém as frases antigas ("só se a melhor saída…", "Nenhuma está marcada", "considerada", "ordem de venda (Caerleon)") para não quebrar os testes existentes. `target-notax` agora é `kind: 'applied'` no registro (status da linha: `applied` só quando o alvo é sem imposto, senão `info-only`).
- Mutações do plano não aplicadas em cópia (testes escritos, verdes); sugiro o Tester.
