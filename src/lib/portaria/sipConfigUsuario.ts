import { supabase } from "@/integrations/supabase/client";
import type { PortariaSipConfig } from "./sipConfig";

/**
 * Configuração de telefonia do usuário logado.
 * Servidor, porta, servidor alternativo, porta alternativa e ramal da TV/portaria
 * vêm da configuração de telefonia do ESTABELECIMENTO (PABX/UCM).
 * Ramal, usuário e senha SIP continuam no cadastro do usuário.
 */
export type ConfigSipUsuario = Partial<
  Pick<
    PortariaSipConfig,
    "servidor" | "servidorRemoto" | "porta" | "portaRemota" | "ramal" | "usuarioSip" | "senha" | "nome" | "ramalPortaria"
  >
>;

export async function lerConfigSipDoUsuario(): Promise<ConfigSipUsuario | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("usuarios")
    .select("nome, ramal, senha_sip, usuario_sip")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();
  if (!data) return null;
  const registro = data as Record<string, string | number | null>;

  const { data: telefonia } = await supabase.rpc("get_telefonia_estabelecimento");
  const estab = (Array.isArray(telefonia) ? telefonia[0] : telefonia) as
    | Record<string, string | number | boolean | null>
    | undefined;

  const config: ConfigSipUsuario = {};
  if (estab?.servidor) config.servidor = String(estab.servidor);
  if (estab?.servidor_alternativo) config.servidorRemoto = String(estab.servidor_alternativo);
  config.porta = estab?.porta ? String(estab.porta) : "8089";
  config.portaRemota = estab?.porta_alternativa ? String(estab.porta_alternativa) : "8089";
  if (estab?.ramal_portaria) config.ramalPortaria = String(estab.ramal_portaria);
  // O número do ramal identifica a linha; o usuário SIP (quando existir) serve só para autenticar.
  if (registro.ramal || registro.usuario_sip) config.ramal = String(registro.ramal || registro.usuario_sip || "");
  if (registro.usuario_sip) config.usuarioSip = String(registro.usuario_sip);
  if (registro.senha_sip) config.senha = String(registro.senha_sip);
  if (registro.nome) config.nome = String(registro.nome);
  return config;
}
