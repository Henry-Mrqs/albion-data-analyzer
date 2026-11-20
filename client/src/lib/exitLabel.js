// Rótulo da saída de venda (IDEIA-082). O Mercado Negro só tem ordens de compra: nunca "ordem de venda".
export function exitLabel(city, mode) {
  if (city === 'Black Market') return 'ordem de compra do Mercado Negro';
  return mode === 'order' ? 'ordem de venda' : 'ordem de compra';
}
