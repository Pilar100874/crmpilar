import { supabase } from "@/integrations/supabase/client";

/**
 * Presença dos ramais conectados pelo próprio sistema (navegador ou aplicativo).
 * Serve para o Pilar Fone mostrar quem está online mesmo quando o PABX não
 * pode ser consultado de fora da rede da empresa.
 */

export type OrigemPresenca = "web" | "apk";

/** Um ramal é considerado online enquanto mandar sinal de vida neste intervalo. */
export const JANELA_PRESENCA_MS = 2 * 60 * 1000;

export function origemAtual(): OrigemPresenca {
  try {
    const agente = navigator.userAgent || "";
    if (/Pilar(Fone|Automacao|Controle|App|Coletor)/i.test(agente)) return "apk";
    if (sessionStorage.getItem("pilar_modo_app") === "1") return "apk";
  } catch {
    /* ambiente sem navigator/sessionStorage */
  }
  return "web";
}

async function contexto(): Promise<{ usuarioId: string; estabelecimentoId: string } | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const { data } = await supabase
    .from("usuarios")
    .select("id, estabelecimento_id")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();
  if (!data?.id || !data?.estabelecimento_id) return null;
  return { usuarioId: data.id as string, estabelecimentoId: data.estabelecimento_id as string };
}

/** Informa que o ramal está registrado por este aparelho. */
export async function registrarPresencaSip(ramal: string, emChamada: boolean): Promise<void> {
  if (!ramal?.trim()) return;
  const ctx = await contexto();
  if (!ctx) return;
  await supabase
    .from("sip_presenca")
    .upsert(
      {
        estabelecimento_id: ctx.estabelecimentoId,
        usuario_id: ctx.usuarioId,
        ramal: ramal.trim(),
        origem: origemAtual(),
        em_chamada: emChamada,
        dispositivo: (navigator.userAgent || "").slice(0, 200),
        ultimo_ping: new Date().toISOString(),
      },
      { onConflict: "estabelecimento_id,ramal,origem" },
    );
}

/** Remove a presença ao desconectar o ramal. */
export async function removerPresencaSip(ramal: string): Promise<void> {
  if (!ramal?.trim()) return;
  const ctx = await contexto();
  if (!ctx) return;
  await supabase
    .from("sip_presenca")
    .delete()
    .eq("estabelecimento_id", ctx.estabelecimentoId)
    .eq("ramal", ramal.trim())
    .eq("origem", origemAtual());
}
