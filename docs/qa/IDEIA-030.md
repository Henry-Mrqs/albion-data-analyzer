# QA IDEIA-030: Preço-alvo reverso

**Veredito: APROVADO** (com observações não bloqueantes, ver "Observações")

Branch `feat/IDEIA-030`, worktree `.claude/worktrees/agent-a4e2aefb88da03779`. Nada foi editado na branch; mutações em cópia fora do repositório.

## 1. Funcional
- `npm run check`: lint ok, **91 testes passam (6 arquivos)**, build ok (chunk TargetPrice 5,24 kB).
- `npm test` duas vezes seguidas: 91/91 nas duas.

## 2. Escopo
- `git diff --stat master...feat/IDEIA-030`: 5 arquivos, 192 inserções: `Crafting.jsx` (+3), `Refining.jsx` (+3), `TargetPrice.jsx` (novo), `targetPrice.js` (novo), `targetPrice.test.js` (novo). Exatamente os do plano.
- `econ.js`, `catalog.json`, `market.js`, `settings.js`, `docs/*`: não alterados.
- Busca por `0.04`, `0.08`, `0.025`, `0.0425`, `4%`, `8%` em `targetPrice.js` e `TargetPrice.jsx`: nenhuma ocorrência. O fator vem de `netSale(1, mode, premium)` e `SETUP_FEE` (econ.js). O texto de UI "2,5%" no hint de relistagem é só rótulo, não cálculo.

## 3. Recálculo independente (álgebra do dossiê §2, sem importar lib para o esperado)
C = 4400 × 100/133 + 216 = 3.524,2707.

| Caso | Dossiê | Meu cálculo | Branch (`targetPrice`) |
|---|---|---|---|
| Equilíbrio ordem (premium) | 3.770 | 3.770 | 3.770 |
| Lucro 1.000 ordem | 4.839 | 4.839 | 4.839 |
| Lucro 1.000 instantâneo | 4.713 | 4.713 | 4.713 |
| Margem 20% ordem | 4.524 | 4.524 | 4.524 |
| Equilíbrio instantâneo | 3.672 | 3.672 | 3.672 |
| Sem premium, lucro 1.000 ordem | 5.056 | 5.056 | 5.056 |
| Verificação reversa (4839 × 0,935 − C) | 1.000,19 | 1.000,1943 | (netSale, teste afirma 1000,1943) |
| 1 relistagem, lucro 1.000 | 4.972 (derivado, plano) | 4.972 | 4.972 |

Os testes da branch afirmam exatamente estes valores. Dossiê e plano concordam (o 4.972 é derivado pelo plano, não publicado no dossiê; a conta (3524,2707+1000)/0,91 = 4971,73 confere).

## 4. Propriedades
**24.000 combinações** (6.000 sorteios de custo/lucro/margem/premium/relistagens 0-5, x modo ordem e instantâneo, x alvo por lucro e por margem; custos de 1 a 2.000.000), nas quais foram checadas:

| Propriedade | Violações |
|---|---|
| (a) líquido real (definição própria e `netSale`) >= custo + alvo | 0 |
| (b) preço-alvo - 1 não atinge o alvo | 0 |
| (c) instantâneo <= ordem | 0 |
| (d) sem premium >= premium | 0 |
| (e) margem 0% == equilíbrio | 0 |
| (f) crescente em custo e em lucro | 0 |
| (g) relistagens só aumentam (ordem) e são ignoradas (instantâneo) | 0 |
| extra: preço < custo com lucro >= 0 | 0 |

## 5. Integração com o custo do app
- Craft: `unitCost = totalCost / (rec.amount × crafts)` (craftPlan.js l.101-102), passado a `<TargetPrice cost={unitCost} ...>`.
- Teste na UI com `T4_POTION_HEAL` (amount 5): "5 unidades de produto", custo total 7.938, custo exibido 1.588 por unidade (7.938/5 = 1.587,6); cartão usa custo 1.588 por unidade. Lucro 1.000, 2 relistagens: (1.587,6+1.000)/0,885 = 2.923,8 -> 2.924, igual ao cartão.
- Refino (Tábuas de Pinho T4): custo líquido 174 (`cur.unit.cost`), cartão usa o mesmo. Margem 15% ordem com 2 relistagens: 226; instantâneo 209; equilíbrio instantâneo 181. Todos conferem com a fórmula a partir do custo exibido.
- Craft T6_MAIN_SWORD (custo 51.666): lucro 1.000 ordem = 56.328 = (51.666+1.000)/0,935; margem 20% = 66.310; instantâneo 64.583; equilíbrio 55.258. Confere.

## 6. Casos-limite (lib; a UI não lançou exceção em nenhum teste)
| Entrada | Resultado |
|---|---|
| custo 0, null, undefined, NaN, -5, Infinity, '100' (texto) | null (cartão mostra aviso, não número) |
| custo 1e-6 / 1e300 | 1 / 1,07e300 (finito) |
| lucro -500 (custo 1000) | 535 (alvo abaixo do custo, correto para prejuízo aceito; a UI mostra "lucro -499,86") |
| lucro NaN, Infinity, 'abc', -1e9 | null |
| lucro null | tratado como equilíbrio |
| margem -1, -2, NaN, Infinity | null; margem 0 = equilíbrio; 1000% = 11.765 |
| relistagens negativa (-3) na lib | 991 (diminui o preço; **a lib não clampa**; a UI clampa em 0 com `Math.max(0, floor)`) |
| relistagens 2,7 | 1.153 (lib aceita decimal, k mais folgado); UI faz floor e usa 2 |
| relistagens 'x', NaN, 40+, Infinity | null |
| premium undefined | tratado como sem premium (8%) |
| modo undefined ou inválido | tratado como instantâneo (cai no ramo `else` de `netSale`) |
| lowestListing(null) | null; marketGap com NaN/undefined/0 | null |
| Card sem preços de material (`missing`) | "Preencha os preços ausentes", sem número |
| Sem preço de venda atual | "Sem preço de venda atual deste item para comparar." |
| Lucro vazio na UI | vira 0 (equilíbrio); lucro 1e9 exibe 1.130.001.883 sem NaN |

Nenhum NaN/Infinity na UI (verificado por regex no texto da página).

## 7. Mutações (cópia descartável, `targetPrice.test.js`, 15 testes)
| Mutação | Testes falhando | Resultado |
|---|---|---|
| `ceil` -> `round` | 5 | morta |
| `ceil` -> `floor` | 10 | morta |
| remover tolerância `1e-9` | 1 | morta |
| remover imposto (k só com setup/instantâneo) | 7 | morta |
| ordem sem setup (igual instantâneo) | 7 | morta |
| remover termo de relistagem | 1 | morta |
| relistagem também no instantâneo | 1 | morta |
| inverter premium | 10 | morta |
| trocar modo | 10 | morta |
| margem sobre o preço (x2 no termo) | 1 | morta |
| margem ignorada | 1 | morta |
| lucro ignorado | 6 | morta |
| remover throw profit+margin | 1 | morta |
| sinal da relistagem invertido | 1 | morta |
| `lowestListing` pega o maior | 1 | morta |
| `lowestListing` inclui Black Market | 1 | morta |
| `marketGap` invertido | 1 | morta |
| remover guarda `cost <= 0` | 0 | **sobreviveu, equivalente**: o guarda final `p > 0` já devolve null para custo 0/negativo |

Sobrevivente efetivo: nenhum (único é mutante equivalente). Observação: várias mutações são mortas por 1 teste só (relistagem, margem), cobertura mínima mas suficiente.

## 8. Olhar de jogador experiente
- Preço-alvo < custo com lucro positivo: não ocorre (0 violações).
- Instantâneo <= ordem; sem premium >= premium: confirmado.
- Preço inteiro (ceil), sem casas decimais; margem é sobre o custo e o rótulo diz "Lucro ÷ custo, não ÷ preço de venda".
- Rótulo "(estimativa)" na relistagem presente.
- Margem 0% == equilíbrio: confirmado.
- Aviso "difícil de vender" dispara quando alvo > menor preço de venda atual (correto pelo plano). Ver observação 1.

## 9. UI (Vite na porta 5191 da worktree; servidor parado ao final)
Craft (espada T6 e poção T4), Refino (Tábuas de Pinho T4): lucro/margem/equilíbrio, ordem/instantâneo, relistagens (0, 2, -3, 2,7), lucro negativo e vazio: números batem com a fórmula. Console sem erros. Mercado e Flipper abrem normalmente. O campo de relistagens some no modo instantâneo.

## Observações (não bloqueantes)
1. A referência de mercado é o **menor** preço de venda entre cidades (conforme plano/dossiê). Na poção T4, o menor preço é 1.275 (Caerleon), mas a melhor cidade para vender paga 3.796; o aviso "difícil de vender" aparece mesmo com o alvo (2.924) abaixo do preço em Martlock. É literal ao plano, mas pode parecer alarme sem sentido; sugerir ao gerente comparar com a cidade escolhida em vez do mínimo global.
2. `targetPrice` não valida `mode` (valor desconhecido vira instantâneo) e aceita relistagens negativas/decimais; só a UI sanitiza. Sem impacto atual.
3. A tolerância `1e-9` do `ceil` é decisão do plano (risco 4); mutante coberto por teste.
4. Durante a UI, o navegador embutido foi redirecionado várias vezes para portas de outros servidores (5173, 5192) por uso concorrente; a verificação foi refeita sempre conferindo `location.port === 5191`.

## Evidências
Script de recálculo/propriedades: `...\scratchpad\qa.mjs` (temporário, fora do repositório). Mutações em `...\scratchpad\mut` (cópia descartável).
