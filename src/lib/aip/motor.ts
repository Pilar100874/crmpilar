/**
 * Motor de execução da Plataforma de Agentes IA.
 *
 * - `local`  → Edge Function `aip-execute-workflow` (roda dentro do Lovable Cloud).
 * - `remoto` → servidor Claude Agent SDK (Railway), acessado pela Edge Function
 *              `aip-run-proxy`, que guarda URL e chave do servidor.
 */

export type MotorExecucao = "local" | "remoto";

const CHAVE = "aip.motor_execucao";

export const MOTORES: { valor: MotorExecucao; nome: string; descricao: string }[] = [
  {
    valor: "local",
    nome: "Local (Lovable Cloud)",
    descricao:
      "Executa os workflows na Edge Function do próprio app. Não precisa de servidor externo, mas tem limite de tempo por etapa e não roda Claude Code / Playwright / Remotion.",
  },
  {
    valor: "remoto",
    nome: "Servidor Claude Agent SDK (Railway)",
    descricao:
      "Envia agente, skills, tools e MCPs para um servidor Node com o Claude Agent SDK. Suporta execuções longas, arquivos, navegador e devolve o resultado em streaming para o Lovable.",
  },
];

export function getMotor(): MotorExecucao {
  const v = typeof window !== "undefined" ? localStorage.getItem(CHAVE) : null;
  return v === "remoto" ? "remoto" : "local";
}

export function setMotor(motor: MotorExecucao) {
  localStorage.setItem(CHAVE, motor);
  window.dispatchEvent(new CustomEvent("aip-motor-alterado", { detail: motor }));
}
