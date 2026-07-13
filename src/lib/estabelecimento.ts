import { supabase } from "@/integrations/supabase/client";

let cached: string | null = null;

export async function getEstabelecimentoId(): Promise<string | null> {
  if (cached) return cached;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("usuarios")
    .select("estabelecimento_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  cached = data?.estabelecimento_id ?? null;
  return cached;
}
