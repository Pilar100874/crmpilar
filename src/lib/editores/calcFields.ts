/**
 * Avalia fórmulas de campos com tipo="calculo".
 * Substitui {{chave}} pelos valores numéricos do `data` e avalia com Function segura.
 * Retorna um novo objeto de dados com as chaves calculadas populadas.
 */
export interface CampoCalc {
  chave: string;
  tipo: string;
  formato?: string | null;
}

const ALLOWED = /^[\s0-9.+\-*/()MathrounminaxbslogpEqrt,]*$/;

function evalFormula(expr: string, data: Record<string, any>): number | null {
  // Substitui {{chave}} por valores numéricos (0 se ausente)
  const substituted = expr.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key: string) => {
    const raw = data[key.trim()];
    const num = typeof raw === "number" ? raw : parseFloat(String(raw ?? "0").replace(",", "."));
    return Number.isFinite(num) ? String(num) : "0";
  });
  // Validação sanity check
  if (!ALLOWED.test(substituted)) {
    // Permite Math.* — validação mais frouxa
    if (!/^[\sA-Za-z0-9._+\-*/(),]*$/.test(substituted)) return null;
  }
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`"use strict"; return (${substituted});`);
    const v = fn();
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

export function applyCalculatedFields(
  data: Record<string, any>,
  campos: CampoCalc[],
): Record<string, any> {
  const result = { ...data };
  // Duas passadas para permitir cálculos que dependem de outros cálculos
  for (let pass = 0; pass < 2; pass++) {
    for (const c of campos) {
      if (c.tipo !== "calculo" || !c.formato) continue;
      const v = evalFormula(c.formato, result);
      if (v !== null) result[c.chave] = v;
    }
  }
  return result;
}
