/**
 * Utilitário de agendamento (cron de 5 campos) usado pelas Rotinas de IA.
 * Campos: minuto hora dia-do-mês mês dia-da-semana
 */

export interface CronCampos {
  minutos: number[];
  horas: number[];
  dias: number[];
  meses: number[];
  semanas: number[];
}

function expandir(campo: string, min: number, max: number): number[] {
  const saida = new Set<number>();
  for (const parte of campo.split(",")) {
    const [faixa, passoTxt] = parte.split("/");
    const passo = passoTxt ? Number(passoTxt) : 1;
    if (!Number.isFinite(passo) || passo <= 0) throw new Error(`Passo inválido em "${campo}"`);
    let inicio = min;
    let fim = max;
    if (faixa !== "*" && faixa !== "") {
      if (faixa.includes("-")) {
        const [a, b] = faixa.split("-").map(Number);
        inicio = a;
        fim = b;
      } else {
        inicio = Number(faixa);
        fim = passoTxt ? max : inicio;
      }
    }
    if (!Number.isFinite(inicio) || !Number.isFinite(fim) || inicio < min || fim > max || inicio > fim) {
      throw new Error(`Valor inválido em "${campo}"`);
    }
    for (let v = inicio; v <= fim; v += passo) saida.add(v);
  }
  return [...saida].sort((a, b) => a - b);
}

export function parseCron(expressao: string): CronCampos {
  const partes = String(expressao ?? "").trim().split(/\s+/);
  if (partes.length !== 5) throw new Error("A expressão deve ter 5 campos (min hora dia mês semana)");
  return {
    minutos: expandir(partes[0], 0, 59),
    horas: expandir(partes[1], 0, 23),
    dias: expandir(partes[2], 1, 31),
    meses: expandir(partes[3], 1, 12),
    semanas: expandir(partes[4], 0, 7).map((d) => (d === 7 ? 0 : d)),
  };
}

export function cronValido(expressao: string): boolean {
  try {
    parseCron(expressao);
    return true;
  } catch {
    return false;
  }
}

/** Deslocamento (ms) do fuso informado em relação ao UTC, no instante dado. */
export function offsetFuso(fuso: string, referencia: Date): number {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: fuso,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const p: Record<string, string> = {};
    for (const parte of fmt.formatToParts(referencia)) p[parte.type] = parte.value;
    const local = Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour) % 24,
      Number(p.minute),
      Number(p.second),
    );
    return local - referencia.getTime();
  } catch {
    return 0;
  }
}

/**
 * Próxima data/hora (UTC) em que a expressão dispara, considerando o fuso.
 * Retorna null se nada casar dentro de ~2 anos.
 */
export function proximaExecucao(
  expressao: string,
  fuso = "America/Sao_Paulo",
  depois: Date = new Date(),
): Date | null {
  const campos = parseCron(expressao);
  const offset = offsetFuso(fuso, depois);
  const base = new Date(depois.getTime() + offset);
  base.setUTCSeconds(0, 0);
  base.setUTCMinutes(base.getUTCMinutes() + 1);

  const limite = 60 * 24 * 366 * 2; // ~2 anos em minutos
  const cursor = new Date(base.getTime());
  for (let n = 0; n < limite; n++) {
    const mes = cursor.getUTCMonth() + 1;
    if (!campos.meses.includes(mes)) {
      cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
      cursor.setUTCHours(0, 0, 0, 0);
      continue;
    }
    const dia = cursor.getUTCDate();
    const semana = cursor.getUTCDay();
    if (!campos.dias.includes(dia) || !campos.semanas.includes(semana)) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      cursor.setUTCHours(0, 0, 0, 0);
      continue;
    }
    if (!campos.horas.includes(cursor.getUTCHours())) {
      cursor.setUTCHours(cursor.getUTCHours() + 1, 0, 0, 0);
      continue;
    }
    if (!campos.minutos.includes(cursor.getUTCMinutes())) {
      cursor.setUTCMinutes(cursor.getUTCMinutes() + 1, 0, 0);
      continue;
    }
    const utc = new Date(cursor.getTime() - offsetFuso(fuso, new Date(cursor.getTime() - offset)));
    return utc;
  }
  return null;
}

/** Descrição amigável em português de expressões comuns. */
export function descreverCron(expressao: string, fuso = "America/Sao_Paulo"): string {
  if (!cronValido(expressao)) return "Expressão inválida";
  const [min, hora, dia, mes, semana] = expressao.trim().split(/\s+/);
  const hhmm = (h: string, m: string) => `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
  const dias = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  if (min.startsWith("*/") && hora === "*") return `A cada ${min.slice(2)} minutos (${fuso})`;
  if (hora.startsWith("*/") && min !== "*") return `A cada ${hora.slice(2)} horas, no minuto ${min} (${fuso})`;
  if (dia === "*" && mes === "*" && semana === "*") return `Todos os dias às ${hhmm(hora, min)} (${fuso})`;
  if (dia === "*" && mes === "*" && semana !== "*") {
    const lista = semana
      .split(",")
      .map((d) => dias[Number(d) % 7] ?? d)
      .join(", ");
    return `Toda ${lista} às ${hhmm(hora, min)} (${fuso})`;
  }
  if (mes === "*" && semana === "*") return `Todo dia ${dia} do mês às ${hhmm(hora, min)} (${fuso})`;
  return `Expressão personalizada: ${expressao} (${fuso})`;
}

export const PRESETS_CRON: { label: string; valor: string }[] = [
  { label: "A cada 15 minutos", valor: "*/15 * * * *" },
  { label: "A cada hora", valor: "0 * * * *" },
  { label: "Todo dia às 08:00", valor: "0 8 * * *" },
  { label: "Todo dia às 18:00", valor: "0 18 * * *" },
  { label: "Dias úteis às 09:00", valor: "0 9 * * 1-5" },
  { label: "Segunda-feira às 08:00", valor: "0 8 * * 1" },
  { label: "Todo dia 1º às 07:00", valor: "0 7 1 * *" },
];

export const FUSOS = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Belem",
  "America/Cuiaba",
  "America/Fortaleza",
  "UTC",
];
