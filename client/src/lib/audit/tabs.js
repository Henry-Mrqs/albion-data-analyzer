// IDEIA-086: mapa de cobertura do auditor. Toda aba de App.jsx e toda chave salva (PERSISTED) tem uma tela registrada
// (registerScreen) OU uma entrada aqui com motivo. O contrato (contract.test.js) reprova a que faltar.
// REGRA para ideia nova com aba ou chave nova: registre a tela ou acrescente a entrada aqui, no mesmo commit.
export const TAB_AUDIT = {
  market: { screen: null, reason: 'consulta de preços e giro; sem cálculo de lucro (o Mercado Negro e a tendência têm linhas no Craft/IDEIA-088)' },
  refining: { screen: 'refine' },
  crafting: { screen: 'craft' },
  flipper: { screen: null, reason: 'Flipper fora da v1 do auditor (D-059); dívida declarada' },
  rrr: { screen: 'rrr' },
  premium: { screen: 'premium' },
};

export const UNAUDITED = {
  'craft:item': 'item escolhido: aparece na linha "Receita" do Craft',
  'market:item': 'item da consulta do Mercado (sem cálculo de lucro)',
  'market:quality': 'qualidade da consulta do Mercado (sem cálculo de lucro)',
  'flip:cfg': 'Flipper fora da v1 do auditor (D-059); dívida declarada',
  settings: 'servidor, Premium e teto de taxa aparecem nas linhas "Servidor", "Premium" e "Taxa de bancada" do Craft e do Refino',
};
