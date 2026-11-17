# Albion Data

Calculadoras de **refino**, **craft** e **flip** para Albion Online, com preços do
[Albion Online Data Project](https://www.albion-online-data.com) (alimentado pelo Albion Data Client dos jogadores).

App 100% estático (Vite + React): os preços são consultados direto do navegador, sem backend.

## Desenvolvimento

```bash
cd client
npm install --legacy-peer-deps
npm run dev      # http://localhost:5173
npm run build
```

## Catálogo de itens

`client/public/data/catalog.json` (IDs, nomes em PT-BR e receitas) é gerado a partir dos dumps oficiais do jogo:

```bash
node scripts/build-catalog.mjs
```

Rode de novo quando sair patch novo do jogo.

## Deploy

Vercel, com *Root Directory* = `client`. Não há variáveis de ambiente nem servidor.

## Dados desatualizados?

Os preços só existem para itens que alguém consultou no mercado do jogo com o Albion Data Client ligado
**no mesmo servidor** (seletor no topo do site: Américas, Europa ou Ásia).
