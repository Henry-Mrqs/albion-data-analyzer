# Estado atual do projeto — diagnóstico da Fase 0

Autor: Gerente (Claude). Data: 2026-11-17. Base: leitura completa do código em `master` (commit `7fe574e`), sem executar sub agentes.

## 1. Stack e arquitetura

| Item | Estado |
|---|---|
| Front | Vite 8 + React 19, JS (sem TypeScript), `lucide-react`. ~2.364 linhas |
| Back | **Nenhum.** App 100% estático; chama a API pública do AODP direto do navegador |
| Dados de preço | AODP (`{server}.albion-online-data.com/api/v2/stats/prices`), servidores west/europe/east |
| Dados do jogo | `client/public/data/catalog.json` (~543 KB), gerado por `scripts/build-catalog.mjs` a partir de `ao-data/ao-bin-dumps` (items.json + nomes PT-BR) |
| Estado do usuário | `localStorage` (`albion:*`): servidor, premium, config de cada calculadora |
| Deploy | Vercel, projeto `albion-data`, Root Directory `client`, framework Vite, deploy automático em push na `master`. Produção: https://albion-data-iota.vercel.app (protegida por SSO da Vercel) |
| Testes | **Nenhum.** Sem runner, sem CI. Só `eslint` + `vite build` |
| Observabilidade | Nenhuma (sem logs de erro em produção) |

## 2. Funcionalidades existentes

1. **Mercado** — preço por cidade (venda mín., compra máx., idade do dado) de um item/encantamento/qualidade; melhor "transporte" (comprar na mais barata e vender em outra).
2. **Refino** — custo de 1 refinado, comparativo T4–T8, rota de produção (comprar pronto / produzir tudo / melhor combinação), botão "Marcar melhor rota", passo a passo, tabela de preços por cidade da cadeia.
3. **Craft** — receita oficial, RRR de craft, taxa de bancada, rota por material refinado (comprar pronto / produzir tudo / melhor), plano de compra e produção por tier com quantidades, comparação de rotas, bônus diário de refino por recurso, "quanto economiza esperando +10%/+20%", tabela de onde vender, tabela de preços por cidade.
4. **Flipper** — varredura sob demanda (até 3.000 ids), filtros de categoria/tier/encantamento/cidades/modo de compra e venda/lucro e margem mínimos/idade do dado, tabela ordenável.
5. Global: servidor, Premium, persistência local, hash por aba, tratamento de rate limit (HTTP 429), cache de 3 min.

## 3. Fórmulas hoje no código (`client/src/lib/econ.js`, `catalog.js`)

| Fórmula | Implementação | Fonte verificada? |
|---|---|---|
| RRR | `PB/(100+PB)`, PB = 18 base + 40 (refino em cidade especializada) ou +15 (craft em cidade especializada) + 59 (foco) + bônus diário | **Não.** Valores conferem com o que lembro da wiki (15,2% / 24,8% / 36,7% / 53,9%), mas nenhuma fonte foi citada no repositório |
| Taxa de bancada | `valorDoItem × 0,1125 × taxa/100`; no craft usa a soma `valor×qtd` dos ingredientes, no refino o `itemvalue` do refinado | **Não.** Ponto a auditar (qual "item value" o jogo usa de fato) |
| Imposto de venda | 4% premium / 8% sem premium | Não verificada |
| Setup fee de ordem | 2,5% na compra por ordem e na listagem de venda | Não verificada |
| Venda | `ordem de venda`: preço × (1 − imposto − 2,5%); `instantânea` (em ordem de compra): preço × (1 − imposto) | — |
| Cadeia de refino | recursiva até T2; rota "melhor" decide em cada nível entre comprar pronto e produzir | Lógica própria, validada manualmente em 2 exemplos |
| Retorno nos ingredientes | itens com `ARTEFACT/ARTIFACT/RUNE/SOUL/RELIC/SHARD` não retornam | Heurística por regex |
| Cidade de bônus de craft | tabela `CRAFT_CITY` por subcategoria | **De memória**, não verificada |
| Cidade de bônus de refino | madeira→Fort Sterling, minério→Thetford, couro→Martlock, fibra→Lymhurst, pedra→Bridgewatch | Não verificada |
| Quantidade produzida | `amountcrafted` do dump multiplica unidades | Do dump |

## 4. Lacunas

### 4.1 Variáveis de jogo que podem estar faltando (ou incompletas)

Legenda: ✅ existe · 🟡 parcial · ❌ ausente.

| Variável | Estado | Observação |
|---|---|---|
| RRR base/cidade/foco/diário | ✅ | sem fonte citada |
| **Custo de foco** (pontos por craft/refino, eficiência por especialização) | ❌ | `focus` (foco do dump) já está no catálogo mas **nunca é usado**. Não há "prata por ponto de foco" |
| **Maestria/especialização** (nível do jogador reduz custo de foco) | ❌ | |
| Taxa de bancada | 🟡 | fórmula a auditar; sem valor padrão por cidade |
| Imposto de mercado / setup fee | ✅ | sem fonte |
| **Diário de trabalho (journals)** — silver/fama por craft | ❌ | grande fonte de lucro real de crafter |
| **Fama/XP** gerada pelo craft | ❌ | |
| Qualidade do item produzido (chance de Bom/Excelente…) | ❌ | craft assume qualidade 1; preços das outras qualidades existem na API |
| **Encantar** (runa/alma/relíquia) vs. craftar já encantado | ❌ | muito comum: comprar .0 e encantar |
| Durabilidade / item usado | ❌ | |
| **Volume / liquidez** (histórico de vendas, itens/dia) | ❌ | usa só o preço atual; Flipper pode listar armadilhas sem liquidez |
| **Tendência e preço médio** (API `history`) | ❌ | |
| Outliers / dados velhos | 🟡 | idade exibida e filtrada no Flipper; sem detecção de outlier |
| Peso / transporte / capacidade da montaria | 🟡 | peso aparece só no Mercado; não entra no lucro por kg |
| Risco de rota (zonas vermelhas/pretas) | ❌ | |
| Tempo de produção (fila, nutrição) | ❌ | lucro por hora ausente |
| **Lucro por foco** e **por hora** | ❌ | |
| Compra: ordem de compra com tempo de espera | 🟡 | só adiciona 2,5% |
| Vendas parciais / preço de listagem abaixo do mínimo atual | ❌ | |
| Bônus de Brecilien, Caerleon, ilhas/hideouts | ❌ | só 6 cidades |
| Premium ligado/desligado | ✅ | global |
| Equipamentos de cidade, capas, bolsas | 🟡 | catálogo as inclui |
| Itens fora do catálogo (montarias, ferramentas de coleta, mobília, comida de fazenda) | ❌ | `PRODUCT_CATS` exclui |
| Artefatos / ingredientes especiais com preço | ✅ | tratados como comprados, não retornáveis |

### 4.2 Lacunas de produto

Sem lista de compras exportável, sem favoritos/receitas salvas, sem comparação entre múltiplos itens lado a lado, sem "melhor item para craftar hoje" (ranking), sem alertas, sem histórico do que foi calculado, sem exportação CSV/compartilhar link, sem modo "só quero lucro por foco", sem auditoria de "o que eu esqueci" por cálculo.

### 4.3 Lacunas técnicas

Nenhum teste automatizado (risco máximo num app cuja razão de existir é o cálculo correto), nenhuma CI, fórmulas misturadas com React (`Crafting.jsx` 470 linhas, `Refining.jsx` 414), regex de categoria frágil, tabela de cidades sem fonte, sem monitoramento de erro em produção, SSO da Vercel impede teste público sem login.

## 5. Riscos conhecidos

1. Constantes e fórmulas não têm fonte → qualquer uma pode estar errada sem ninguém perceber.
2. Dados do AODP são esparsos e colaborativos: preço de 1 jogador pode ser outlier (já visto: Barra T2 a 10 vs 24 entre cidades).
3. Tudo mexe nos mesmos 2 arquivos grandes (`Crafting.jsx`, `Refining.jsx`) → paralelismo real é limitado até extrair a lógica.

## 6. Decisão de partida

Ver `decisoes.md` (D-001…D-008) e `backlog.md`.
