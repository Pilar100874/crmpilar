import { supabase } from "@/integrations/supabase/client";
import type { PortariaSipConfig } from "./sipConfig";

/**
 * Configuração de telefonia do usuário logado.
 * Servidor, porta, servidor alternativo, porta alternativa e ramal da TV/portaria
 * vêm do cadastro da UNIDADE vinculada ao usuário.
 * Ramal, usuário e senha SIP continuam no cadastro do usuário.
 */
export type ConfigSipUsuario = Partial<
  Pick<PortariaSipConfig, "servidor" | "servidorRemoto" | "porta" | "portaRemota" | "ramal" | "senha" | "nome" | "ramalPortaria">
>;

export async function lerConfigSipDoUsuario(): Promise<ConfigSipUsuario | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("usuarios")
    .select("nome, ramal, senha_sip, usuario_sip, unidade_id")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();
  if (!data) return null;
  const registro = data as Record<string, string | number | null>;

  let unidade: Record<string, string | number | null> | null = null;
  if (registro.unidade_id) {
    const { data: dadosUnidade } = await supabase
      .from("unidades")
      .select("sip_servidor, sip_porta, sip_servidor_alternativo, sip_porta_alternativa, ramal_portaria")
      .eq("id", String(registro.unidade_id))
      .maybeSingle();
    unidade = (dadosUnidade as Record<string, string | number | null> | null) ?? null;
  }

  const config: ConfigSipUsuario = {};
  if (unidade?.sip_servidor) config.servidor = String(unidade.sip_servidor);
  if (unidade?.sip_servidor_alternativo) config.servidorRemoto = String(unidade.sip_servidor_alternativo);
  config.porta = unidade?.sip_porta ? String(unidade.sip_porta) : "8089";
  config.portaRemota = unidade?.sip_porta_alternativa ? String(unidade.sip_porta_alternativa) : "8089";
  if (unidade?.ramal_portaria) config.ramalPortaria = String(unidade.ramal_portaria);
  if (registro.usuario_sip || registro.ramal) config.ramal = String(registro.usuario_sip || registro.ramal || "");
  if (registro.senha_sip) config.senha = String(registro.senha_sip);
  if (registro.nome) config.nome = String(registro.nome);
  return config;
}
