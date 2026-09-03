import { supabase } from "@/integrations/supabase/client";
import {
  CONFIG_SIP_PADRAO,
  lerConfigSip,
  salvarConfigSip,
  type PortariaSipConfig,
} from "./sipConfig";

/**
 * Backup das configurações do ramal SIP na nuvem, por usuário.
 * Garante que atualizar/reinstalar o APK não faça o usuário perder os dados.
 */

const TABELA = "sip_config_usuario";

async function identidadeUsuario() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();
  return usuario?.id ? { authId: auth.user.id, usuarioId: usuario.id } : null;
}

export async function salvarConfigNaNuvem(config: PortariaSipConfig): Promise<boolean> {
  const identidade = await identidadeUsuario();
  if (!identidade) return false;
  const { error } = await (supabase as any)
    .from(TABELA)
    .upsert(
      {
        user_id: identidade.authId,
        usuario_id: identidade.usuarioId,
        config,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  return !error;
}

export async function lerConfigDaNuvem(): Promise<PortariaSipConfig | null> {
  const identidade = await identidadeUsuario();
  if (!identidade) return null;
  const { data, error } = await (supabase as any)
    .from(TABELA)
    .select("config")
    .eq("usuario_id", identidade.usuarioId)
    .maybeSingle();
  if (error || !data?.config) return null;
  return { ...CONFIG_SIP_PADRAO, ...(data.config as Partial<PortariaSipConfig>) };
}

/**
 * Sincroniza na entrada do app:
 * - se o aparelho está sem configuração, restaura a da nuvem;
 * - se tem configuração local e a nuvem está vazia, envia o backup.
 * Retorna a configuração que deve ser usada.
 */
export async function sincronizarConfigSip(): Promise<PortariaSipConfig> {
  const local = lerConfigSip();
  const localValida = !!(local.servidor && local.ramal && local.senha);
  try {
    const nuvem = await lerConfigDaNuvem();
    if (!localValida && nuvem && nuvem.servidor && nuvem.ramal) {
      salvarConfigSip(nuvem);
      return nuvem;
    }
    if (localValida && !nuvem) await salvarConfigNaNuvem(local);
  } catch {
    // offline: segue com a configuração local
  }
  return local;
}
