import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { marcarChamadaDiscador } from "@/lib/telefonia/discadorMarker";

export interface RespostaClickToCall {
  success?: boolean;
  message?: string;
  error?: string;
  extension?: string;
  destination?: string;
  ucm?: { action: string; status: number };
}

/** Remove formatação do telefone (espaços, parênteses, traços) sem mexer em DDD/prefixos. */
export const somenteDigitosDiscagem = (valor: string) => (valor || "").replace(/[^\d*#]/g, "");

/**
 * Click-to-Call pelo PABX: o UCM toca o ramal do usuário e, ao atender,
 * disca o número do cliente pelas rotas de saída do próprio PABX.
 * Não envolve WebRTC — a chamada é originada no servidor.
 */
export async function ligarPeloPabx(destino: string, nomeCliente?: string): Promise<RespostaClickToCall> {
  const numero = somenteDigitosDiscagem(destino);
  if (!numero) {
    return { error: "Informe o número a ser discado" };
  }

  const aviso = toast.loading("Iniciando chamada...");
  try {
    const { data, error } = await supabase.functions.invoke("ucm-dial", {
      body: { destination: numero },
    });
    const resposta = (data || {}) as RespostaClickToCall;
    if (error || resposta.error) {
      const mensagem = resposta.error || "Não foi possível iniciar a chamada";
      toast.error(mensagem, { id: aviso });
      return { error: mensagem };
    }
    // Marca o disparo para o Pilar Fone reconhecer a chamada do discador,
    // tocar a campainha diferenciada e mostrar o resumo do cliente.
    marcarChamadaDiscador(numero, nomeCliente);
    toast.success(resposta.message || "Chamada iniciada", { id: aviso });
    return resposta;
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Não foi possível iniciar a chamada";
    toast.error(mensagem, { id: aviso });
    return { error: mensagem };
  }
}
