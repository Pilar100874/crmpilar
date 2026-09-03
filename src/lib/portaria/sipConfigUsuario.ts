import { supabase } from "@/integrations/supabase/client";
import type { PortariaSipConfig } from "./sipConfig";

/**
 * Configuração de telefonia definida pelo administrador no cadastro do usuário.
 * É a fonte oficial: servidor, servidor alternativo, ramal, senha e ramal da TV/portaria.
 */
export type ConfigSipUsuario = Partial<
  Pick<PortariaSipConfig, "servidor" | "servidorRemoto" | "ramal" | "senha" | "nome" | "ramalPortaria">
>;

export async function lerConfigSipDoUsuario(): Promise<ConfigSipUsuario | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("usuarios")
    .select("nome, ramal, senha_sip, usuario_sip, sip_servidor, sip_servidor_alternativo, ramal_portaria")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();
  if (!data) return null;
  const registro = data as Record<string, string | null>;
  const config: ConfigSipUsuario = {};
  if (registro.sip_servidor) config.servidor = registro.sip_servidor;
  if (registro.sip_servidor_alternativo) config.servidorRemoto = registro.sip_servidor_alternativo;
  if (registro.usuario_sip || registro.ramal) config.ramal = registro.usuario_sip || registro.ramal || "";
  if (registro.senha_sip) config.senha = registro.senha_sip;
  if (registro.nome) config.nome = registro.nome;
  if (registro.ramal_portaria) config.ramalPortaria = registro.ramal_portaria;
  return config;
}
