/**
 * Evento local para avisar outras telas (ex.: abas do Atendimento)
 * de que as tarefas da agenda mudaram — atualização imediata.
 */
export const EVENTO_TAREFAS_ALTERADAS = "calendario:tarefas-alteradas";

export function notificarTarefasAlteradas() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENTO_TAREFAS_ALTERADAS));
}

export function ouvirTarefasAlteradas(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(EVENTO_TAREFAS_ALTERADAS, handler);
  return () => window.removeEventListener(EVENTO_TAREFAS_ALTERADAS, handler);
}
