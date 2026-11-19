# Deploy 18: IDEIA-071 (limite de erro, restaurar configurações, novo aviso de migração)

**Status final: VERIFICADO (sem rollback)**

- SHA do merge/publicado: `6c9c9e01fe0d2c4652759f795c025b981da8a5f8` (merge --no-ff limpo de feat/IDEIA-071 sobre a master com a 048; sem conflito).
- Deploy: `dpl_7n5ArNR8JEZFyGxGTxNBPaXhokiH`, READY, production. Gate: docs/qa/IDEIA-071.md APROVADO.
- `npm run check`: código 0. `npm test`: 1038 testes (45 arquivos; a branch sozinha tinha 959). Numa primeira execução 1 teste falhou (arquivo não identificado), nas duas seguintes 1038/1038 passaram: possível teste instável, vale investigar.
- Bundle novo `index-Tkuarln4.js` (antes `index-fm5oOycB.js`); catálogo `c0f66cb0bd` inalterado, 1 requisição `?v=`; console sem erros nem avisos.
- 5 abas (Mercado, Refino, Craft, RRR, Flipper) abrem sem NaN nem tela de erro.
- "Restaurar configurações" (rodapé): confirmação com contagem ("... 2 itens ..."); Cancelar não apagou nada; "Apagar e recarregar" removeu só `albion:*` (semeados albion:x, albionx, outra:coisa -> sobraram albionx e outra:coisa).
- Aviso de migração: craft:cfg antigo sem refineCity + T4_MAIN_SWORD (usa refino) mostra "Configuração antiga atualizada ... bônus de produção da cidade especializada ... (+40) ... RRR do refino sobe de cerca de 15% para 37%" (sem "RRR +40"); com Poção de Cura T4 (sem refino) nenhum aviso.
- `albion:craft:cfg` = `null`: Craft abre normalmente, sem tela branca, sem erro no console.
- localStorage de produção: estava vazio no início; esvaziado ao final (igual ao original). Env vars: nenhuma.

## Observações
Sem rollback.
