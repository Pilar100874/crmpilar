import { addDays, isWeekend } from "date-fns";

export interface AnaliseDestino {
  ocupados: { data: Date; titulo?: string }[];
  proximoDiaUtil: Date;
  sugerida: Date | null;
}

// Prévia somente de leitura: nenhuma data é aplicada sem a escolha do usuário.
export async function analisarDestino(
  origem: Date,
  verificar: (data: Date) => Promise<{ hasTask: boolean; taskTitle?: string }>,
): Promise<AnaliseDestino> {
  let data = addDays(origem, 1);
  while (isWeekend(data)) data = addDays(data, 1);
  const proximoDiaUtil = data;
  const ocupados: AnaliseDestino["ocupados"] = [];
  for (let i = 0; i < 366; i++) {
    const conflito = await verificar(data);
    if (!conflito.hasTask) return { ocupados, proximoDiaUtil, sugerida: data };
    ocupados.push({ data, titulo: conflito.taskTitle });
    data = addDays(data, 1);
    while (isWeekend(data)) data = addDays(data, 1);
  }
  return { ocupados, proximoDiaUtil, sugerida: null };
}