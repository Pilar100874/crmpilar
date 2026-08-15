import { getEstabelecimentoId } from "@/lib/estabelecimento";

/**
 * Garante que qualquer payload de criação/edição de câmera (cv_cameras)
 * carregue o estabelecimento (org) do usuário logado, evitando erros de RLS.
 *
 * Uso:
 *   const payload = await comEstabelecimento({ nome, host, ... });
 */
export async function comEstabelecimento<T extends Record<string, any>>(
  payload: T,
): Promise<T & { estabelecimento_id: string }> {
  const atual = (payload as any).estabelecimento_id;
  const estId = atual || (await getEstabelecimentoId());
  if (!estId) {
    throw new Error(
      "Não foi possível identificar o estabelecimento do seu usuário. Faça login novamente ou peça ao administrador para vincular seu usuário a um estabelecimento.",
    );
  }
  return { ...payload, estabelecimento_id: estId };
}
