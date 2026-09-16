import { supabase } from "@/integrations/supabase/client";
import type { PortariaSipConfig } from "./sipConfig";

/**
 * Configuração de telefonia definida pelo administrador no cadastro do usuário.
 * É a fonte oficial: servidor, servidor alternativo, porta, ramal, senha e ramal da TV/portaria.
 */
export type ConfigSipUsuario = Partial<
  Pick<PortariaSipConfig, "servidor" | "servidorRemoto" | "porta" | "portaRemota" | "ramal" | "senha" | "nome" | "ramalPortaria">
>;

export async function lerConfigSipDoUsuario(): Promise<ConfigSipUsuario | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("usuarios")
    .select("nome, ramal, senha_sip, usuario_sip, sip_servidor, sip_porta, sip_servidor_alternativo, sip_porta_alternativa, ramal_portaria")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();
  if (!data) return null;
  const registro = data as Record<string, string | number | null>;
  const config: ConfigSipUsuario = {};
  if (registro.sip_servidor) config.servidor = String(registro.sip_servidor);
  if (registro.sip_servidor_alternativo) config.servidorRemoto = String(registro.sip_servidor_alternativo);
  config.porta = registro.sip_porta ? String(registro.sip_porta) : "8089";
  config.portaRemota = registro.sip_porta_alternativa ? String(registro.sip_porta_alternativa) : "8089";
  if (registro.usuario_sip || registro.ramal) config.ramal = String(registro.usuario_sip || registro.ramal || "");
  if (registro.senha_sip) config.senha = String(registro.senha_sip);
  if (registro.nome) config.nome = String(registro.nome);
  if (registro.ramal_portaria) config.ramalPortaria = String(registro.ramal_portaria);
  return config;
}
