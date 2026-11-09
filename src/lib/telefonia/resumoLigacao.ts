import { supabase } from "@/integrations/supabase/client";
import { salvarSugestaoLigacao } from "@/lib/atendimento/copilotoAtendimento";
import { toast } from "@/lib/toast-config";

const db = supabase as any;

/** Após a gravação: a IA resume a conversa, grava no histórico do cliente e pré-preenche a barra de finalização. */
export async function resumirLigacao(audio: Blob, numero: string, usuarioId: string) {
  try {
    const digitos = (numero || "").replace(/\D/g, "").slice(-8);
    if (digitos.length < 8) return;
    const fd = new FormData();
    fd.append("file", audio, "ligacao.webm");
    const { data, error } = await supabase.functions.invoke("resumo-ligacao", { body: fd });
    if (error || !data?.resumo) return;
    const { data: clientes } = await db.from("customers").select("id, nome").or(`tel.ilike.%${digitos},telefone.ilike.%${digitos}`).limit(1);
    const cli = clientes?.[0];
    if (!cli) return;
    const texto = `Resumo da ligação (IA): ${data.resumo}${data.objecao ? ` Objeção: ${data.objecao}.` : ""}`;
    await db.from("anotacoes_ligacao").insert({ customer_id: cli.id, usuario_id: usuarioId, texto });
    salvarSugestaoLigacao(cli.id, { resumo: data.resumo, dataRetorno: data.data_retorno, motivo: data.motivo });
    toast.success(`Resumo da ligação com ${cli.nome} pronto na finalização`);
  } catch (e) {
    console.error("Resumo da ligação:", e);
  }
}
