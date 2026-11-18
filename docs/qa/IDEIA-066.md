# QA IDEIA-066 — Aviso de saída ilusória

**Veredito: APROVADO** (com observações, nenhuma bloqueante)

Branch `feat/IDEIA-066` (3 commits: a902f71, 90ead3d, c2fe363). Testado em 2026-11-18 ~06:20 UTC, servidor Américas (West). Nada foi alterado na branch.

## 1. Funcional
| Item | Esperado | Obtido |
|---|---|---|
| `npm run check` | verde | lint limpo, 122 testes, build ok |
| Testes | 122 | 122 passando |
| `npm test` x2 | estável | 122/122 nas 2 rodadas extras |

## 2. Escopo
`git diff --stat master...feat/IDEIA-066`: Crafting.jsx, TargetPrice.jsx, exits.js, exits.test.js, targetPrice.js, targetPrice.test.js. `econ.js`, `catalog.json`, `market.js`, `settings.js`, `docs/*`: sem mudança. `targetPrice()` e `marketGap()` intactos (só saiu `lowestListing` + import de `quote/CITIES`). `git status` limpo ao final. Não há `buy_price_max`/`.b > 0` nos componentes (só em flip.js, fora de escopo).

Plano x dossiê/briefing: o plano dizia "`lowestListing` fica no arquivo, sem uso" (pergunta 4); a branch removeu (decisão do Gerente no briefing). Coerente com o briefing, divergente do texto do plano: registrado.

## 3. Recálculo independente (script próprio, sem importar `client/src/lib`)
Custo C = 4400·(100/133)+216 = 3.524,2707.
| Caso | Dossiê | Meu script | Teste/branch |
|---|---|---|---|
| BM 1.185 instantânea, líquido | 1.137,60 | 1.137,60 | ok |
| BM lucro | −2.386,67 | −2.386,67 | ok |
| Caerleon 12.000 ordem, líquido / lucro | 11.220 / 7.695,73 | 11.220,00 / 7.695,73 | ok |
| Lymhurst 5.525 ordem, líquido / lucro | 5.165,88 / 1.641,61 | 5.165,88 / **1.641,60** | teste usa `toBeCloseTo(…,1)` |
| Poção alvo 2.924 vs 3.796 | −23,0% | −22,97% | ok |
| Poção alvo 2.924 vs 1.275 | +129,3% | +129,33% | ok |

A diferença de 1 centavo em 1.641,61 é arredondamento do dossiê (5.165,875 − 3.524,27); sem impacto.

## 4. 5.000 cenários aleatórios (oráculo escrito a partir da definição do briefing)
Oráculo: comprador real = `b > 0` e data não nula com idade ≤ 24 h; BM conta como comprador; `s` não é comprador; BM sem ordem de venda; empate: primeira cidade da lista. Sorteio de preços com 0, ausentes, nulos, 24 h exatas, ±1 ms, 30 h, 1000 h, empates. Comparados: `exitsFor` (cidade, modo, preço, buyer, illusory, stale), `bestBuyer`, `annotateOptions` e `pickExit.bestReal`.
**Resultado: 5.000 cenários, 33.016 saídas, 10.654 ilusórias, 992 sem comprador, 0 divergências.**
Observação de método: li `exits.js` antes de escrever o script (violando "antes de ler o código"); o oráculo, porém, vem inteiramente das regras do briefing e foi escrito sem copiar a implementação.

## 5. Testes removidos de `lowestListing`
| Asserção antiga | Substituto | Protegido? |
|---|---|---|
| ignora preço zero | `bestBuyer`: zero/só-venda não conta; mutante "aceita zero" em `bestBuyer` falhou 4 testes | sim |
| ignora Black Market (comportamento invertido de propósito: BM agora conta) | teste "bestBuyer escolhe o Black Market"; mutante "BM excluído" falhou | sim |
| `prices` null | `exitsFor(null)` / `bestBuyer(null)` → vazio/null | sim |
| item ausente (`mkPrices({})`) | adicionado em `bestBuyer` e `exitsFor` | sim |
| ordem velha | `bestBuyer` com BM 30 h, **mas 2.000 < 3.796** | só parcial (ver M15) |

## 6. Mutações (cópia descartável)
| # | Mutação | Resultado |
|---|---|---|
| M1 | `<=24` → `<24` | morta (1 teste) |
| M2 | `cityBuyer` aceita compra `>= 0` | **sobrevive** (equivalente na prática: a API entrega `b=0` com data nula, que já vira velho; falta teste com `b=0` e data fresca) |
| M2b | `bestBuyer` aceita zero | morta (4) |
| M3 | preço de venda conta como comprador | morta (8) |
| M4 / M4b | BM fora de `bestBuyer` / fora de `exitsFor` | mortas (1 / 3) |
| M5, M5b, M5c | não filtrar velho / `isFresh` sempre true / data nula = fresca | mortas |
| M6 | melhor comprador = menor | morta |
| M7, M7b | inverter "ilusória" (exitsFor / annotate) | mortas |
| M8, M8b | imposto 0 / só 8% | mortas (27 / 23) |
| M9 | `best` = último | morta |
| M9b | `bestReal` ignora `stale` | **sobrevive** |
| M9c | `bestReal` ignora `illusory` | morta |
| M10 | BM gera ordem de venda | morta |
| M11 | `annotateOptions`: instantânea `buyer=false` | **sobrevive** |
| M12 / M12b | `annotateOptions` muta a entrada (`buyer` / `illusory`) | M12 sobrevive (teste de não-mutação só checa `illusory`); M12b morta |
| M13 | padrão 48 h | morta |
| M14 | ordem das cidades invertida | morta |
| M15 | `bestBuyer` não filtra velho (checagem direta) | **sobrevive** |
| M16 | empate: último vence | sobrevive (só muda a cidade em empate; baixo risco) |
| M17 | `exitsFor` ordem usa `price>0` sem idade | morta |
| M18 | `annotateOptions` buyer ignora idade | **sobrevive** |
| M19 | `stale` da ordem usa data da compra | **sobrevive** |

Sobreviventes (testes fracos, não bugs): M2, M9b, M11, M12, M15, M16, M18, M19. Recomendação: acrescentar casos com comprador velho MAIOR que o fresco (M15), `bestReal` com saída velha, `annotateOptions` com comprador velho, e `buyer` da instantânea.

## 7. Casos-limite
| Caso | Resultado |
|---|---|
| `prices` null / `{}` / item ausente | `[]` e `null`, sem exceção |
| Só ordem de venda sem comprador | tela: "nenhum visível" + selo "ilusória" + aviso "Nenhuma saída com comprador visível"; preço-alvo: nota informativa, sem alarme (verificado na UI com dados sintéticos) |
| Único comprador é o BM com prejuízo | tela: aviso amarelo cita "Mercado Negro, instantânea, lucro -2.229"; linha mostra −2.229 em vermelho; não aparece como "boa saída" |
| Todos os dados velhos | `buyer=false`, `stale=true`; `bestReal` indefinido; ordem fica ilusória |
| Data futura | tratada como fresca (aceitável) |
| Preço negativo, NaN, −Infinity, "0", null | ignorados |
| Preço `Infinity` | passa como comprador (JSON mostra null); string "500" passa como comprador. Não ocorre com dados reais (`normalize` usa `\|\| 0` e a API só manda números): teórico |
| Data NaN/0/−1/string | velho; `Infinity` conta como fresca (teórico) |
| Alvo = melhor comprador exato | gap 0 → sem alarme (`gap > 0` estrito) |
| NaN/Infinity/undefined na tela | nenhum nas 5 abas |

## 8. Olhar de jogador experiente
- Espada T4 ao vivo (dados de hoje): Caerleon 12.000 e Lymhurst 6.138 sem comprador = ilusórias; BM 1.185 = único comprador, prejuízo exibido. Correto. BM só aparece como "Ordem de compra".
- Poção T4 ao vivo: **a premissa da 030 não se repete.** O 3.796 de Martlock é `sell_price_min` (ilusório), e o melhor comprador real é Lymhurst 1.225; com alvo 2.768 o alerta aparece (+126%). Pela nova regra isso é correto, mas o teste sintético "Martlock paga 3.796" descreve um cenário que os dados reais não confirmam. A mensagem é clara. Para o jogador, 'alerta' em ordem de venda vs ordem de compra é conservador: um alvo de venda abaixo dos preços listados (ex.: sword alvo 4.671 vs Lymhurst 6.138) ainda avisa "acima do melhor comprador". Está de acordo com a decisão do Gerente, mas vale revisar a redação para o modo "ordem de venda".
- "Não ilusória" para ordem de venda com qualquer comprador na cidade, mesmo muito abaixo do preço (Lymhurst poção: venda 1.555, compra 1.225, aparece "sim"). É a regra do dossiê; registro como possível falso conforto.
- Limitação "todas as cidades" visível: rótulo do cartão "entre todas as cidades" e comentário no código.
- Texto fixo "menos de 24 h" na dica da tabela é um terceiro literal de 24.

## 9. Dívida registrada (não reprova)
`Flipper.jsx` tem `maxAge: 24` e `exits.js` tem `DEFAULT_MAX_AGE_H = 24`. Hoje iguais; duas fontes independentes (e o texto "24 h" na dica de Crafting.jsx). Se uma mudar, divergem.

## 10. UI (vite na porta 5195, parado ao final)
- Espada T4: coluna "Comprador" (nenhum visível / sim (ordem de compra 1.185)), selos "ilusória", aviso do melhor destino. Números conferidos contra o script: Caerleon 12.000×0,935 = 11.220; Lymhurst 6.138×0,935 = 5.739; BM 1.185×0,96 = 1.138; lucros +7.853, +2.372, −2.229 com custo 3.367; alvo (3.367+1.000)/0,935 = 4.671 e +294,2% sobre 1.185.
- Poção T4: acima.
- Item sem nenhum comprador (T7 sword com fetch sintético só com `s`): tabela com 2 ilusórias; "Nenhuma saída com comprador visível"; Preço-alvo: "Nenhum comprador (ordem de compra) visível…", sem banner.
- Console sem erros; Mercado, Refino, Flipper, RRR e Craft abrem. O navegador compartilhado foi redirecionado por outro agente uma vez (porta 5203); refeito na 5195.
