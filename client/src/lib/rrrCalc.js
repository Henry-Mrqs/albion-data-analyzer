// Calculadora de RRR: apresenta o que rrr() (econ.js) já calcula. Nenhuma constante de PB é copiada aqui.
import { rrr } from './econ';
import { validateInputs } from './inputRules';
import { REFINING, craftBonusCity } from './catalog';

// Inverso de RRR = PB / (100 + PB): devolve o PB (em pontos) que gerou o RRR.
const pbOf = (r) => (100 * r) / (1 - r);

/** Este local + categoria/recurso tem bônus de especialização? (único ponto que depende da tabela de cidades) */
export function isSpecialty({ kind, city, category, resource }) {
  if (kind === 'refine') {
    // aceita o refinado (PLANKS) ou o recurso bruto (WOOD)
    const entry = REFINING[resource] ?? Object.values(REFINING).find((e) => e.raw === resource);
    return !!entry && entry.city === city;
  }
  const bonus = category ? craftBonusCity(category) : null;
  return bonus != null && bonus === city;
}

/** RRR, PB e decomposição do PB (derivada de rrr(), por diferença). */
export function rrrFor({ kind, city, category, resource, focus, daily = 0 }) {
  const specialty = isSpecialty({ kind, city, category, resource });
  const d = +daily || 0;
  const r = rrr({ kind, specialty, focus: !!focus, daily: d });
  const pb0 = pbOf(rrr({ kind, specialty: false, focus: false }));
  const pb1 = pbOf(rrr({ kind, specialty, focus: false }));
  const pb2 = pbOf(rrr({ kind, specialty, focus: !!focus }));
  const pb3 = pbOf(r);
  return {
    rrr: r,
    pb: pb3,
    specialty,
    parts: { base: pb0, specialty: pb1 - pb0, focus: pb2 - pb1, daily: pb3 - pb2 },
  };
}

/** Todos os cenários: 2 tipos x 2 especialização x 2 foco x 3 bônus diários = 24 linhas. */
export function referenceTable() {
  const rows = [];
  for (const kind of ['refine', 'craft'])
    for (const specialty of [false, true])
      for (const focus of [false, true])
        for (const daily of [0, 10, 20]) {
          const r = rrr({ kind, specialty, focus, daily });
          rows.push({ key: `${kind}:${specialty}:${focus}:${daily}`, kind, specialty, focus, daily, pb: pbOf(r), rrr: r, per100: r * 100 });
        }
  return rows;
}

/** Retorno esperado de uma receita em `crafts` crafts. Ingredientes que não retornam ficam com retorno 0. */
export function recipeReturn(rec, crafts, rrrValue) {
  const n = validateInputs({ crafts }).values.crafts; // faixa única (1 a MAX_QTY, inteiro); a tela mostra o aviso
  return rec.res.map((r) => {
    const gross = r.count * n;
    const returned = r.returnable ? gross * rrrValue : 0;
    return { uniq: r.uniq, name: r.name, gross, returned, net: gross - returned, returnable: r.returnable };
  });
}
