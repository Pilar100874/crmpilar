/** Notas antigas permanecem históricas; nunca migrar seu motor durante edição. */
export function notaSomenteHistorica(motor: string | null | undefined) {
  return motor !== 'proprio';
}