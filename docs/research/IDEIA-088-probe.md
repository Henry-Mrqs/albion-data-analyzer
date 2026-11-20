# IDEIA-088: sonda do preço do Mercado Negro (API real)

Gerado em 2026-11-20T03:47:57.802Z por `scripts/probe-black-market.mjs`. Servidores: west, east, europe. Janela: 7 dias completos UTC (2026-11-13 a 2026-11-19), linhas com pelo menos 3 dias.
Dado colaborativo da API: observação, NÃO prova do que o jogador recebe. Limiares 15% / 80% / 70% = decisão de produto, sem fonte.

## Contagens
- Mercado Negro (52 linhas): nenhuma: 17; lista bate: 18; ambas batem: 13; compra bate: 4
- Cidades de controle, Caerleon e Lymhurst (38 linhas): nenhuma: 28; lista bate: 9; ambas batem: 1
- Mercado Negro com "lista bate" e buy < 70% do realizado: 15 de 52; "compra bate": 4 de 52.

## Mercado Negro
| servidor | cidade | item | q | buy_price_max | sell_price_min | mediana 7d | média pond. | vol/dia | dias | classe |
|---|---|---|---|---|---|---|---|---|---|---|
| west | Black Market | T4_2H_CLAYMORE | 1 | 0 | 0 | 11.508 | 11.515 | 239.9 | 6 | nenhuma |
| west | Black Market | T4_2H_CLAYMORE | 2 | 1.896 | 11.494 | 11.484 | 11.475 | 318.6 | 7 | lista bate |
| west | Black Market | T4_ARMOR_PLATE_SET1 | 1 | 6.004 | 6.190 | 6.204 | 6.194 | 1032.0 | 7 | ambas batem |
| west | Black Market | T4_ARMOR_PLATE_SET1 | 2 | 6.004 | 6.147 | 6.220 | 6.215 | 1327.6 | 7 | ambas batem |
| west | Black Market | T4_ARMOR_PLATE_SET1 | 3 | 0 | 6.150 | 6.231 | 6.228 | 523.7 | 5 | lista bate |
| west | Black Market | T4_BAG | 1 | 1.896 | 0 | 4.647 | 4.702 | 1559.9 | 6 | nenhuma |
| west | Black Market | T4_BAG | 2 | 2.686 | 0 | 4.633 | 4.773 | 3069.1 | 7 | nenhuma |
| west | Black Market | T4_BAG | 3 | 1.106 | 4.746 | 4.659 | 4.724 | 1022.9 | 6 | lista bate |
| west | Black Market | T4_CAPE | 1 | 2.370 | 2.372 | 2.292 | 2.285 | 2143.3 | 7 | ambas batem |
| west | Black Market | T4_CAPE | 2 | 711 | 2.409 | 2.306 | 2.308 | 5865.9 | 7 | lista bate |
| west | Black Market | T4_CAPE | 3 | 0 | 2.415 | 2.343 | 2.333 | 2315.0 | 6 | lista bate |
| west | Black Market | T4_CAPE | 4 | 0 | 0 | 2.670 | 2.667 | 90.1 | 6 | nenhuma |
| west | Black Market | T4_MAIN_SWORD | 1 | 10.665 | 10.854 | 10.717 | 10.402 | 274.0 | 7 | ambas batem |
| west | Black Market | T4_MAIN_SWORD | 2 | 4.029 | 10.841 | 10.819 | 10.433 | 213.4 | 7 | lista bate |
| west | Black Market | T4_MAIN_SWORD@1 | 1 | 0 | 0 | 15.302 | 15.310 | 44.6 | 6 | nenhuma |
| west | Black Market | T4_MAIN_SWORD@1 | 2 | 14.220 | 15.263 | 15.349 | 15.361 | 86.6 | 7 | ambas batem |
| west | Black Market | T5_MAIN_SWORD | 1 | 0 | 0 | 18.077 | 18.165 | 227.6 | 6 | nenhuma |
| west | Black Market | T5_MAIN_SWORD | 2 | 4.266 | 18.620 | 18.474 | 17.959 | 577.1 | 7 | lista bate |
| west | Black Market | T6_MAIN_SWORD | 1 | 0 | 0 | 51.809 | 52.007 | 79.7 | 6 | nenhuma |
| west | Black Market | T6_MAIN_SWORD | 2 | 1.894 | 50.948 | 51.750 | 52.426 | 409.9 | 7 | lista bate |
| east | Black Market | T4_2H_CLAYMORE | 2 | 8.532 | 0 | 9.905 | 9.848 | 98.4 | 4 | compra bate |
| east | Black Market | T4_ARMOR_PLATE_SET1 | 2 | 7.584 | 0 | 7.365 | 7.374 | 572.6 | 4 | compra bate |
| east | Black Market | T4_BAG | 1 | 0 | 0 | 4.786 | 4.675 | 1004.7 | 4 | nenhuma |
| east | Black Market | T4_BAG | 2 | 0 | 0 | 4.810 | 4.739 | 1639.0 | 5 | nenhuma |
| east | Black Market | T4_BAG | 3 | 0 | 0 | 4.930 | 4.829 | 344.7 | 4 | nenhuma |
| east | Black Market | T4_CAPE | 2 | 2.923 | 2.971 | 2.842 | 2.829 | 3408.6 | 7 | ambas batem |
| east | Black Market | T4_CAPE | 3 | 0 | 2.976 | 2.824 | 2.829 | 1169.0 | 5 | lista bate |
| east | Black Market | T4_MAIN_SWORD | 2 | 0 | 0 | 8.803 | 8.811 | 89.0 | 4 | nenhuma |
| east | Black Market | T6_MAIN_SWORD | 2 | 34.164 | 43.600 | 43.689 | 43.467 | 376.0 | 7 | lista bate |
| east | Black Market | T6_MAIN_SWORD | 3 | 0 | 43.604 | 43.625 | 43.488 | 120.0 | 4 | lista bate |
| europe | Black Market | T4_2H_CLAYMORE | 1 | 9.480 | 9.792 | 9.769 | 9.725 | 453.9 | 7 | ambas batem |
| europe | Black Market | T4_2H_CLAYMORE | 2 | 9.480 | 9.793 | 9.779 | 9.809 | 302.1 | 7 | ambas batem |
| europe | Black Market | T4_ARMOR_PLATE_SET1 | 1 | 158 | 0 | 3.934 | 3.930 | 728.6 | 4 | nenhuma |
| europe | Black Market | T4_ARMOR_PLATE_SET1 | 2 | 4.266 | 4.399 | 3.938 | 3.932 | 1602.6 | 4 | ambas batem |
| europe | Black Market | T4_ARMOR_PLATE_SET1 | 3 | 158 | 4.592 | 3.977 | 4.092 | 877.3 | 7 | nenhuma |
| europe | Black Market | T4_BAG | 1 | 4.898 | 4.943 | 4.935 | 4.990 | 1698.3 | 7 | ambas batem |
| europe | Black Market | T4_BAG | 2 | 4.108 | 4.943 | 4.912 | 5.058 | 3112.0 | 7 | lista bate |
| europe | Black Market | T4_BAG | 3 | 1.264 | 4.944 | 4.997 | 5.106 | 654.0 | 6 | lista bate |
| europe | Black Market | T4_BAG | 4 | 474 | 4.999 | 5.454 | 5.433 | 75.4 | 6 | lista bate |
| europe | Black Market | T4_CAPE | 1 | 3.081 | 3.567 | 3.087 | 3.126 | 1656.0 | 7 | compra bate |
| europe | Black Market | T4_CAPE | 2 | 2.449 | 3.100 | 3.117 | 3.154 | 2903.0 | 5 | lista bate |
| europe | Black Market | T4_CAPE | 3 | 395 | 3.100 | 3.113 | 3.103 | 1213.3 | 3 | lista bate |
| europe | Black Market | T4_CAPE | 4 | 3.792 | 3.800 | 3.799 | 3.691 | 112.3 | 7 | ambas batem |
| europe | Black Market | T4_MAIN_SWORD | 1 | 0 | 0 | 7.814 | 7.808 | 299.1 | 6 | nenhuma |
| europe | Black Market | T4_MAIN_SWORD | 2 | 7.584 | 7.790 | 7.797 | 7.797 | 303.0 | 7 | ambas batem |
| europe | Black Market | T4_MAIN_SWORD | 3 | 0 | 7.699 | 7.928 | 7.901 | 34.7 | 6 | lista bate |
| europe | Black Market | T4_MAIN_SWORD | 4 | 0 | 7.699 | 9.386 | 9.182 | 5.0 | 5 | nenhuma |
| europe | Black Market | T4_MAIN_SWORD@1 | 1 | 6.162 | 0 | 12.602 | 12.518 | 54.1 | 6 | nenhuma |
| europe | Black Market | T4_MAIN_SWORD@1 | 2 | 0 | 0 | 12.742 | 12.501 | 104.7 | 6 | nenhuma |
| europe | Black Market | T5_MAIN_SWORD | 3 | 0 | 22.266 | 20.328 | 20.335 | 87.3 | 5 | lista bate |
| europe | Black Market | T6_MAIN_SWORD | 1 | 55.873 | 0 | 60.477 | 60.320 | 124.1 | 3 | compra bate |
| europe | Black Market | T6_MAIN_SWORD | 2 | 55.873 | 56.497 | 58.290 | 58.599 | 387.4 | 7 | ambas batem |

## Controle (cidades normais)
| servidor | cidade | item | q | buy_price_max | sell_price_min | mediana 7d | média pond. | vol/dia | dias | classe |
|---|---|---|---|---|---|---|---|---|---|---|
| west | Lymhurst | T4_ARMOR_PLATE_SET1 | 1 | 0 | 0 | 2.415 | 2.455 | 51.6 | 4 | nenhuma |
| west | Lymhurst | T4_ARMOR_PLATE_SET1 | 2 | 0 | 0 | 2.400 | 2.521 | 136.4 | 7 | nenhuma |
| west | Caerleon | T4_BAG | 1 | 0 | 0 | 5.655 | 5.645 | 75.3 | 4 | nenhuma |
| west | Caerleon | T4_BAG | 2 | 0 | 0 | 5.757 | 5.635 | 41.4 | 3 | nenhuma |
| west | Lymhurst | T4_BAG | 1 | 0 | 3.995 | 5.235 | 4.777 | 741.4 | 7 | nenhuma |
| west | Lymhurst | T4_BAG | 2 | 0 | 4.000 | 5.507 | 5.380 | 908.6 | 5 | nenhuma |
| west | Lymhurst | T4_BAG | 3 | 0 | 5.654 | 6.326 | 5.866 | 296.9 | 5 | lista bate |
| west | Lymhurst | T4_BAG | 4 | 0 | 0 | 8.831 | 8.805 | 120.3 | 4 | nenhuma |
| west | Caerleon | T4_CAPE | 3 | 0 | 0 | 2.519 | 2.842 | 16.9 | 5 | nenhuma |
| west | Lymhurst | T4_CAPE | 1 | 1.344 | 0 | 1.738 | 1.663 | 726.1 | 7 | nenhuma |
| west | Lymhurst | T4_POTION_HEAL | 1 | 0 | 0 | 1.517 | 1.516 | 1192.0 | 4 | nenhuma |
| west | Lymhurst | T5_MAIN_SWORD | 2 | 0 | 0 | 8.579 | 8.912 | 38.6 | 4 | nenhuma |
| west | Lymhurst | T6_MAIN_SWORD | 1 | 0 | 0 | 32.494 | 32.874 | 6.7 | 4 | nenhuma |
| west | Lymhurst | T6_MAIN_SWORD | 2 | 0 | 0 | 31.417 | 31.786 | 20.4 | 4 | nenhuma |
| west | Lymhurst | T6_MAIN_SWORD | 3 | 0 | 0 | 31.953 | 32.337 | 3.6 | 4 | nenhuma |
| east | Caerleon | T4_2H_CLAYMORE | 1 | 0 | 18.999 | 19.000 | 18.085 | 1.6 | 4 | lista bate |
| east | Caerleon | T4_2H_CLAYMORE | 2 | 0 | 21.995 | 21.994 | 19.220 | 1.3 | 3 | lista bate |
| east | Lymhurst | T4_BAG | 1 | 0 | 0 | 4.411 | 4.545 | 436.3 | 5 | nenhuma |
| east | Lymhurst | T4_CAPE | 3 | 0 | 0 | 3.654 | 3.776 | 239.6 | 5 | nenhuma |
| europe | Caerleon | T4_2H_CLAYMORE | 1 | 0 | 0 | 10.236 | 10.736 | 1.6 | 3 | nenhuma |
| europe | Caerleon | T4_ARMOR_PLATE_SET1 | 2 | 0 | 0 | 5.355 | 5.232 | 8.0 | 3 | nenhuma |
| europe | Caerleon | T4_BAG | 1 | 0 | 0 | 5.916 | 5.814 | 28.6 | 3 | nenhuma |
| europe | Caerleon | T4_BAG | 2 | 0 | 0 | 5.871 | 5.870 | 75.1 | 5 | nenhuma |
| europe | Lymhurst | T4_BAG | 1 | 3.000 | 4.491 | 3.865 | 3.895 | 656.0 | 6 | nenhuma |
| europe | Lymhurst | T4_BAG | 2 | 2.520 | 4.100 | 4.066 | 4.079 | 1346.1 | 6 | lista bate |
| europe | Lymhurst | T4_BAG | 3 | 3.014 | 4.704 | 4.297 | 4.347 | 513.3 | 7 | lista bate |
| europe | Lymhurst | T4_BAG | 4 | 5.158 | 8.981 | 7.564 | 7.221 | 103.1 | 3 | nenhuma |
| europe | Caerleon | T4_CAPE | 2 | 0 | 0 | 3.710 | 3.828 | 19.4 | 3 | nenhuma |
| europe | Caerleon | T4_CAPE | 3 | 0 | 0 | 4.359 | 4.543 | 13.7 | 3 | nenhuma |
| europe | Lymhurst | T4_CAPE | 1 | 1.563 | 2.394 | 2.206 | 2.135 | 370.3 | 4 | lista bate |
| europe | Lymhurst | T4_CAPE | 2 | 1.628 | 2.394 | 2.299 | 2.387 | 1040.0 | 6 | lista bate |
| europe | Lymhurst | T4_CAPE | 4 | 0 | 0 | 5.499 | 5.723 | 48.4 | 3 | nenhuma |
| europe | Caerleon | T4_MAIN_SWORD | 1 | 0 | 0 | 8.693 | 8.499 | 3.1 | 5 | nenhuma |
| europe | Lymhurst | T4_MAIN_SWORD | 1 | 0 | 0 | 4.435 | 4.735 | 50.0 | 3 | nenhuma |
| europe | Lymhurst | T4_MAIN_SWORD | 2 | 0 | 0 | 2.628 | 3.380 | 29.1 | 6 | nenhuma |
| europe | Caerleon | T4_POTION_HEAL | 1 | 0 | 2.074 | 1.939 | 1.996 | 228.1 | 5 | lista bate |
| europe | Lymhurst | T4_POTION_HEAL | 1 | 1.140 | 1.670 | 1.668 | 1.657 | 2107.3 | 7 | lista bate |
| europe | Lymhurst | T6_MAIN_SWORD | 1 | 41.425 | 45.446 | 42.275 | 42.742 | 22.4 | 7 | ambas batem |

## Regra adotada
**R-C**. Em qualquer caso `BM_READING_VERIFIED` continua `null`: o app mostra as duas leituras rotuladas "NÃO VERIFICADO em jogo" e usa a menor no cálculo principal.
