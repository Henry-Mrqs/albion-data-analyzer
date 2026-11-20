// Pré-carga das abas lazy: o primeiro import() (transformação + avaliação) custa >1 s sob carga e estourava o findBy (IDEIA-085).
export const warmTabs = () =>
  Promise.all([
    import('../components/Refining'),
    import('../components/Crafting'),
    import('../components/Flipper'),
    import('../components/RrrCalculator'),
    import('../components/Premium'),
    import('../components/Market'),
  ]);
