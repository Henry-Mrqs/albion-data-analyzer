# IDEIA-060 — Validação das entradas pelas faixas do jogo (taxa de bancada, RRR manual, bônus diário)

## 1. O que faz e por que o jogador usa
Os campos livres do app aceitam qualquer número: taxa de bancada (`feePer100`, padrão 400 do app), "RRR manual (%)" e bônus diário. Um dígito a mais (taxa 4000, RRR 80) produz um lucro absurdo e silencioso, que é exatamente o erro de "esqueci/errei uma variável". O jogo tem **faixas conhecidas** para esses valores; o app pode avisar quando a entrada está fora delas. É uma checagem barata e totalmente derivada de constantes já auditadas.

## 2. Regras de negócio (faixas)

| # | Faixa | Fonte | Confiança |
|---|---|---|---|
| V1 | Taxa de bancada: **0 a 1.000** de prata por 100 de nutrição. Uma declaração de desenvolvedor reduziu o teto de 10.000 para 1.000 (post "Upcoming Changes to Crafting Fee Limit", 958 dias antes da consulta, aprox. abr/2024); a página albiondatabase.com e uma calculadora de terceiros listam o máximo 1.000 | forum.albiononline.com/Thread/194320 (trecho de busca; 403 no fetch); albiondatabase.com (trecho) | MÉDIA |
| V2 | Bônus diário só assume **0, 10 ou 20** pontos | AFM 2026-11-03 | MÉDIA |
| V3 | RRR máximo teórico com os bônus conhecidos: refino em cidade de bônus + foco + dia +20: PB 137 -> **57,81%**; craft em cidade de bônus + foco + dia +20: PB 112 -> **52,83%**; hideout nível 9 especialista, zona Q6, foco, dia +20: PB 161 -> **61,69%** (IDEIA-055, composição com confiança média) | AUDITORIA-001 §1; IDEIA-055 | MÉDIA-ALTA (cidades); MÉDIA (hideout) |
| V4 | RRR < 0 ou ≥ 100% é impossível pela fórmula `PB/(100+PB)` | álgebra | ALTA |
| V5 | Taxa de 0 é **válida** (bancada própria ou sem cobrança); o app não deve tratá-la como "vazio" | AFM/albiondatabase (faixa 0-1.000) | MÉDIA |
| V6 | Número de crafts inteiro ≥ 1; quantidade de unidades por craft vem do catálogo (`a`) | dump | ALTA |
| V7 | Tier/encanto válidos: T3-T8, .0-.4 (já no `searchItems`) | catálogo | ALTA |
| V8 | O padrão `feePer100 = 400` do app **não é valor do jogo**: deve vir marcado como "padrão do app, informe o da sua bancada" | IDEIA-019 (T5, presets rejeitados) | ALTA |

Níveis de aviso (decisão de produto): **erro** (bloqueia o cálculo) para V4 e V6; **aviso** (calcula, mas marca em destaque) para V1 e V3; **informativo** para V8.

## 3. Variáveis e origem
Todas são entradas do usuário já existentes; as faixas vêm de constantes (V1-V3).

## 4. Exemplo numérico (caso de teste)
| Entrada | Regra | Resultado esperado |
|---|---|---|
| Taxa 5.000 | V1 | **aviso**: acima de 1.000 (provável erro de digitação). Efeito: Broadsword (valor 384): 384 × 0,1125 × 50 = 2.160 por craft contra 216 com taxa 500 (10×) |
| Taxa 0 | V5 | aceita; taxa = 0 por craft; sem aviso |
| RRR manual 60% numa cidade real (craft) | V3 | **aviso**: o máximo conhecido para craft é 52,83% (PB 112) |
| RRR manual 55% no refino | V3 | aceito (≤ 57,81%) |
| RRR manual 100% ou −5 | V4 | **erro** |
| Bônus diário 15 | V2 | **erro/aviso**: use 0, 10 ou 20 |
| Crafts 0 ou 2,5 | V6 | **erro** |
| Taxa não preenchida (padrão do app 400) | V8 | informativo: "usando 400 do app" |

Cálculo do V3 (revisor refaz): refino cidade de bônus + foco + dia +20: PB = 18 + 40 + 59 + 20 = 137; RRR = 137/237 = 0,57806. Craft: PB = 18 + 15 + 59 + 20 = 112; 112/212 = 0,52830.

## 5. Encaixe no projeto
- `econ.js`: `validateInputs({feePer100, customRRR, daily, crafts, kind})` devolve `[{level, field, msg}]`; teste de unidade com a tabela acima.
- `Crafting.jsx`/`Refining.jsx`: mensagens junto do campo e no painel "Auditor" (IDEIA-005). Esforço baixo.
- Verificação de fatos do app nesta rodada (sem ação): o cache de preços usa a chave `server|quality|id` (não mistura servidores) e as datas do AODP (sem `Z`) são lidas como UTC (`parseDate`), conforme a API devolve.

## 6. Fontes
- https://forum.albiononline.com/index.php/Thread/194320-Upcoming-Changes-to-Crafting-Fee-Limit/ (trecho de busca)
- https://albionfreemarket.com/articles/view/albion-online-crafting-and-refining-city-bonuses (diário)
- AUDITORIA-001, IDEIA-055, IDEIA-019

## 7. Confiança
**MÉDIA.** O teto de 1.000 vem de um trecho de post de desenvolvedor e de duas ferramentas; se o jogo mudar o teto, o aviso deve ser configurável. Os demais limites são consequência algébrica das constantes auditadas. Sem pendência de medição, exceto confirmar o teto atual olhando uma bancada.
