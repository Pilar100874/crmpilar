import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { limparChamadaDiscador, marcarChamadaDiscador } from "@/lib/telefonia/discadorMarker";
import { obterStatusRamalGlobal } from "@/lib/telefonia/statusRamalGlobal";

export interface RespostaClickToCall {
  success?: boolean;
  message?: string;
  error?: string;
  extension?: string;
  destination?: string;
  ucm?: { action: string; status: number };
}

/** Remove formatação do telefone e o DDI 55, deixando o número como se fosse discado do aparelho. */
export const somenteDigitosDiscagem = (valor: string) => prepararNumeroDiscagem(valor);

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

  // Sem ramal registrado no navegador o PABX até liga, mas o Pilar Fone não
  // recebe a chamada (não pisca e não mostra o botão Atender).
  const status = obterStatusRamalGlobal();
  if (!status.registrado) {
    toast.warning(
      status.conectando ? "O Pilar Fone ainda está conectando" : "O Pilar Fone está desconectado",
      {
        description:
          "Abra o Pilar Fone e aguarde a bolinha ficar verde: só assim a ligação toca aqui com o botão Atender.",
      },
    );
  }

  const aviso = toast.loading("Iniciando chamada...");
  // Marca ANTES de chamar o PABX: o UCM pode tocar o ramal antes da resposta
  // HTTP voltar, e o Pilar Fone precisa do destino para identificar o cliente
  // (sem o marcador, a origem da chamada é o próprio ramal).
  marcarChamadaDiscador(numero, nomeCliente);
  try {
    const { data, error } = await supabase.functions.invoke("ucm-dial", {
      body: { destination: numero },
    });
    const resposta = (data || {}) as RespostaClickToCall;
    if (error || resposta.error) {
      limparChamadaDiscador();
      const mensagem = resposta.error || "Não foi possível iniciar a chamada";
      toast.error(mensagem, { id: aviso });
      return { error: mensagem };
    }
    toast.success(resposta.message || "Chamada iniciada", { id: aviso });
    return resposta;
  } catch (erro) {
    limparChamadaDiscador();
    const mensagem = erro instanceof Error ? erro.message : "Não foi possível iniciar a chamada";
    toast.error(mensagem, { id: aviso });
    return { error: mensagem };
  }
}
