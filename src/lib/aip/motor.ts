/**
 * Motor de execução da Plataforma de Agentes IA.
 *
 * Hoje existe um único motor: o servidor Claude Agent SDK (Railway), acessado
 * pela Edge Function `aip-run-proxy`, que guarda URL e chave do servidor.
 */

export type MotorExecucao = "remoto";

export const MOTORES: { valor: MotorExecucao; nome: string; descricao: string }[] = [
  {
    valor: "remoto",
    nome: "Servidor Claude Agent SDK (Railway)",
    descricao:
      "Envia agente, skills, tools e MCPs para um servidor Node com o Claude Agent SDK. Suporta execuções longas, arquivos, navegador e devolve o resultado em streaming para o Lovable.",
  },
];

export function getMotor(): MotorExecucao {
  return "remoto";
}

export function setMotor(_motor: MotorExecucao) {
  /* Motor único: mantido apenas para compatibilidade das telas. */
}
