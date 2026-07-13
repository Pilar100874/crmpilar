import { supabase } from "@/integrations/supabase/client";

/**
 * Retorna a rota inicial do usuário. Se ele tiver uma tela customizada
 * vinculada, devolve `/tela-customizada/{id}`; caso contrário `/dashboard`.
 */
export async function getInitialRouteForUsuario(usuarioId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from("usuario_telas_customizadas")
      .select("tela_id")
      .eq("usuario_id", usuarioId)
      .limit(1)
      .maybeSingle();
    if (data?.tela_id) return `/tela-customizada/${data.tela_id}`;
  } catch (e) {
    console.error("Erro ao verificar tela customizada:", e);
  }
  return "/dashboard";
}
