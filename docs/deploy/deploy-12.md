# Deploy 12: IDEIA-049 (receitas alternativas)

**Status final: CONFLITO (merge abortado; nada foi mesclado, enviado nem implantado)**

- Branch: `feat/IDEIA-049`. Gate: docs/qa/IDEIA-049.md APROVADO. Master em `ac911ce` (inclui a 010, merge 666f6fe) (origin/master em 666f6fe; os commits locais à frente são só de docs).
- `git merge --no-ff feat/IDEIA-049` -> `CONFLICT (content): Merge conflict in client/src/components/Crafting.jsx` (único arquivo em conflito; os demais, inclusive catalog.json e fixture, mesclaram automaticamente).
- Hunk único, nas linhas 3 a 23 (bloco de imports no topo):
  - HEAD (master, 010+041+060): importa `recipeOf`, `SELL_CITIES`, `illusoryHint`, `useHistory`, `loadedStats`, `validateInputs`, `GiroCard, GiroCell` (além de `waitSavings`, `effectiveDaily/showDailyNote/DAILY_NOTE`, `pickExit`).
  - feat/IDEIA-049: troca `recipeOf` por `recipeVariants`, remove `SELL_CITIES` e `illusoryHint`, e acrescenta `pickCheapest, resolveVariant, returnBadge` (de `../lib/recipeAlt`) e `RecipePicker`.
  - Resolução esperada (a cargo do Executor): união dos imports; o restante do corpo do arquivo foi mesclado sem marcadores, mas precisa de revisão (uso de `recipeOf` x `recipeVariants`, `GiroCard/GiroCell` convivendo com `RecipePicker`, e os usos de `illusoryHint`/`SELL_CITIES`).
- Aborto confirmado: `git merge --abort` ok, árvore sem alterações (só arquivos não rastreados de terceiros), HEAD = ac911ce.
- Sem push, sem deploy, sem verificação em produção; localStorage de produção não foi tocado.
