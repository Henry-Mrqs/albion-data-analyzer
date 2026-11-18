# QA IDEIA-060 — Validação das entradas pelas faixas do jogo

**Veredito: APROVADO (com 3 ressalvas não bloqueantes, seção 10).** Branch `feat/IDEIA-060` (a8d7a82), base de comparação = merge-base com master (ae61c3e).

## 1. Funcional
- `npm run check` na worktree: lint 0 erros, **177 testes passam (8 arquivos)**, build ok.

## 2. Escopo
- `git diff --stat master...feat/IDEIA-060`: 15 arquivos, todos do plano (Crafting, FeeField, InputIssues, Refining, RrrCalculator, TargetPrice, craftPlan(+test), inputRules(+test), rrrCalc(+test), settings, targetPrice(+test)).
- NÃO tocados: `econ.js`, `market.js`, `catalog*`, `docs/*`. Nenhuma fórmula de cálculo mudou; só saneamento de entradas.

## 3. Oráculo independente (escrito antes de ler o código)
- 9.693 chamadas de `validateInputs` (6 campos, ctx craft/refine, premium sim/não, teto 1000/5000; bordas + aleatórias) + 3.000 chamadas de adaptadores (`cleanCraftCfg`/`cleanRefineCfg`) + teste de idempotência em cada chamada.
- **Divergências: 46, todas no mesmo ponto**: `mode` vazio/`null`/`undefined`/espaços. Oráculo (leitura literal do plano, "diferente de order/instant → null (error)") esperava `error`; a branch devolve `null` **sem aviso**. Dúvida de especificação, benigna (campo ausente não deve gritar; a tela usa 'order').
- Zero divergência em taxa, taxa vazia, RRR (craft/refine), diário, crafts, relistagens e adaptadores. Zero violação de idempotência.

## 4. Consistência RRR
Regra especificada (plano, regras de `validateInputs`): `<0` ou `>=100` → automático (erro, V4 impossível); `>máximo` (2 casas) → clamp ao máximo (warn). Dossiê V3/V4 concorda. Implementada numa única função com `kind`; Craft usa `kind:craft` (52,83), Refino `kind:refine` (57,81); aba RRR e Preço-alvo não têm campo de RRR manual. 3.000 entradas aleatórias: Craft e Refino coincidem com o oráculo. Craft: 150→auto 24,81% (erro), 100→auto (erro), 55 e 60→52,83% (aviso).

## 5. Diferencial master × branch (entradas válidas)
9.500 combinações (3.000 computeCraft com rotas buy/all/best, premium sim/não, taxas 0–1000, crafts 1–10.000, diário 0/10/20, RRR manual válido, preços aleatórios/ausentes; 3.000 Refino via evaluateTier/lotFee/compareRoutes; 2.500 preço-alvo; 1.000 recipeReturn): **0 diferenças bit a bit (JSON), 0 avisos emitidos.**

## 6. Achados (a)–(d): master × branch (lib; item T6_MAIN_SWORD, crafts=1)
| Entrada | master | branch |
|---|---|---|
| RRR manual `' '` | RRR 0, custo 5.091 | automático 24,81%, custo 3.999,27 (sem aviso: vazio) |
| RRR 150 | RRR 150%, qtd −8, custo −1.509 | automático, qtd 6,01, aviso erro |
| RRR 100 | qtd 0 | automático, aviso erro |
| crafts Infinity | fee/custo/unidades ∞ | 1e9, custo 4e12 finito, aviso |
| taxa −400 | taxa −691 | 0, aviso erro |
| taxa vazia | taxa 0 | 400 (691), info (mudança deliberada D-021) |
| Aba RRR N=1e308 | gross ∞, net NaN | 1,6e10 finito (limite 1e9) |
| N 0 / '' / −5 / 'abc' | 1 silencioso | 1 (aviso na tela) |
| N 2,7 e 2,5 | floor→2 | floor→2 |
| Preço-alvo relistagens −3 | 4.480 | null (tela corrige para 0 e avisa) |
| relistagens 2,7 | 5.216 | null (tela: 2 + aviso) |
| modo `foo`/undefined | 4.713 (instantâneo) | null |
| relistagens 38 / 37 | null / 452.428 | null / 452.428 |

## 7. Mutações (34 mutantes na lib, rodando `vitest run src/lib`)
Mortos: todos, exceto 2 **equivalentes** (não são lacunas): `toNum` sem `trim` (`Number(' 12 ')` já tolera espaço) e `maxRelists` com `>=` (o líquido nunca é exatamente 0 em ponto flutuante). Cobertos: `>`↔`>=` (teto, RRR máx., qty, relistagens), 57,81→58, 52,83→53, ≥100→>100, diário 15/sem 20, `isEmpty` sem trim, `MAX_QTY`+1, floor→round (crafts e relistagens), `maxRelists` ±1, clamp da taxa, taxa vazia=0, sem aviso, aviso sem correção, correção sem aviso, modo, targetPrice (3 checagens), rrrCalc sem teto, computeCraft sem limpeza. Camada de componentes (Craft/Refino/TargetPrice usando `vcfg.*`) não tem teste unitário: validada só na UI (seção 9).

## 8. Achado ainda aberto: teto aceito (`feeCeiling`)
- `settings.feeCeiling` não é validado: via lib, `null`/`0`/`-5` como teto geram taxa usada `null`/0/−5; `NaN`/`'abc'`/`Infinity` desligam a validação (5.000 passa sem aviso).
- O botão "Aceitar N como novo teto" grava qualquer N finito; N=1e300 → computeCraft com taxa 1e300 dá fee e custo **Infinity**. Não há tela para ver ou redefinir o teto aceito (persistente em `albion:settings`).

## 9. UI (app da worktree em localhost:5197, aba nova; servidor parado ao final)
Entradas ruins injetadas em `albion:craft:cfg`, `albion:refine:cfg`, `albion:target:cfg`, `albion:rrr:cfg`, `albion:settings` e recarregadas. Nenhuma exceção causada pela branch; nenhum NaN/∞ (exceto a ressalva 1).
| Tela | Entrada | Obtido na tela | Oráculo |
|---|---|---|---|
| Craft | taxa −400 | aviso "usando 0"; "Taxa da bancada 0" no resultado | 0 |
| Craft | RRR 150 | aviso erro; RRR 24,8% | auto 24,8% |
| Craft | crafts −3 / taxa de refino 5.000 | "usando 1" / "usando 1.000"; selo "5 valores corrigidos" | ok |
| Craft | botão "Aceitar 5.000 como novo teto" | grava `albion:settings.feeCeiling=5000`; aviso some; selo cai para 4 | ok |
| Refino | diário 15, RRR 60, taxa 5.000, qty '' | 4 avisos; RRR 57,8% (clamp 57,81); "1 un."; selo "4 valores corrigidos" | ok |
| RRR | N=1e308 | "usando 1.000.000.000", tabela finita | ok |
| RRR | N=2,7 | "usando 2" | ok |
| Preço-alvo | modo "foo", relistagens −3 | avisos; "Liste a 56.760" calculado em modo ordem, 0 relistagens | ok |
Mercado e Flipper abrem. Erros de console vistos (`craftBonusCity ... split`) vieram de um `rrr:cfg` parcial que eu mesmo injetei (sem `category`); não há relação com a branch (config real salva sempre tem todas as chaves).

## 10. Ressalvas (não bloqueantes) e coerência com a 019
1. **Teto aceito sem validação nem reinício.** `feeCeiling` vem de `albion:settings` sem sanear; o botão aceita qualquer N finito. Reproduzido na tela: taxa 1e300 + Aceitar + crafts 1e9 mostra "∞" no custo e na taxa (viola "nenhum ∞ em tela"). `feeCeiling` null/0/negativo ou NaN corrompe/desliga a validação (seção 8). Não há lugar para ver ou desfazer o teto aceito: depois de aceitar 5.000, taxa 4.000 nunca mais avisa, sem o usuário saber. Sugestão: validar `feeCeiling` (finito, ≥1000, ≤ limite razoável) e mostrar "teto atual" com opção de voltar a 1.000.
2. **Selo "N valores corrigidos" conta correção invisível**: `refineDaily.PLANKS` inválido (tipo não usado pela receita) conta no selo, mas não aparece aviso na tela (selo 5, 4 linhas visíveis no Craft). Mensagem de modo inválido ("Modo de venda "foo" inválido.") não diz o valor usado (order); plano pedia a msg "já com o valor usado".
3. **Aba RRR**: `daily` salvo inválido (15) não é validado (só N é; escopo do plano). `mode` vazio sem aviso (dúvida de especificação, seção 3).
- **Coerência com a 019**: taxa 400 sem `feeSet` mantém só o aviso da 019 ("valor padrão do app"); taxa vazia ('') gera só o info da 060 (a 019 já exclui ''); sem duplicata nem contradição. Usuário com taxa 250 salva não recebe aviso (verificado no diferencial: 0 avisos em entradas válidas). Aviso informativo de taxa vazia não conta no selo.
- Pergunta ao Gerente já respondida (D-021): taxa vazia 0→400 é mudança deliberada, aparece como diferença master×branch somente nesse caso.

## 11. Evidências
Scripts e saídas em `C:\Users\henry\AppData\Local\Temp\claude\957f91f7a64c930e\6e1f11d4-084e-4248-9930-f6512436786e\scratchpad\` (oracle.mjs, oracle-out.json, gen.js, diff-master.json, diff-branch.json, ach-*.json, ceil.json, mut.mjs, mut-out.txt). Nenhum arquivo do repositório foi alterado por esta QA exceto este laudo.
