export type StatusEnvio = 'aguardando' | 'processando' | 'registrado' | 'encaminhado' | 'erro' | 'cancelado';
export interface ResultadoEnvio { status: StatusEnvio; detalhe?: string }
export interface ItemEnvio extends ResultadoEnvio { id: string; nome: string; destino?: string }

/** Cancellation stops the next recipient, never interrupts an operation already accepted. */
export async function executarSequencial<T>(
  contatos: T[],
  cancelado: () => boolean,
  processar: (contato: T, indice: number) => Promise<ResultadoEnvio>,
  atualizar: (indice: number, resultado: ResultadoEnvio) => void,
) {
  for (let indice = 0; indice < contatos.length; indice++) {
    if (cancelado()) {
      for (let restante = indice; restante < contatos.length; restante++) {
        atualizar(restante, { status: 'cancelado', detalhe: 'Não processado' });
      }
      return;
    }
    atualizar(indice, { status: 'processando' });
    try {
      atualizar(indice, await processar(contatos[indice], indice));
    } catch (erro) {
      atualizar(indice, { status: 'erro', detalhe: erro instanceof Error ? erro.message : 'Falha ao processar contato' });
    }
  }
}