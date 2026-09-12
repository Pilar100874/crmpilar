import { createClient } from "npm:@supabase/supabase-js@2";

export const APPS_VALIDOS = ["automacao", "fone", "sms", "remotas"] as const;
export type AppChave = (typeof APPS_VALIDOS)[number];

export type ResultadoChave =
  | { ok: true; dados: Record<string, unknown> }
  | { ok: false; erro: string; status: number };

/** Valida uma chave de ativação e devolve a empresa (estabelecimento) dona dela. */
export async function validarChaveApp(
  chaveBruta: unknown,
  app: AppChave,
): Promise<ResultadoChave> {
  const chave = String(chaveBruta ?? "").trim().toUpperCase();
  if (!chave) return { ok: false, erro: "chave obrigatória", status: 400 };

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: registro, error } = await sb
    .from("automacao_app_chaves")
    .select("id, nome, bloqueado, estabelecimento_id, app")
    .eq("chave", chave)
    .maybeSingle();

  if (error) return { ok: false, erro: "falha ao validar a chave", status: 500 };
  if (!registro) return { ok: false, erro: "chave não encontrada", status: 404 };
  if (registro.bloqueado) return { ok: false, erro: "chave bloqueada", status: 403 };
  if (registro.app !== app) {
    return { ok: false, erro: "esta chave é de outro aplicativo", status: 403 };
  }

  const { data: estabelecimento } = await sb
    .from("estabelecimentos")
    .select("nome")
    .eq("id", registro.estabelecimento_id)
    .maybeSingle();

  await sb
    .from("automacao_app_chaves")
    .update({ ultima_comunicacao: new Date().toISOString() })
    .eq("id", registro.id);

  return {
    ok: true,
    dados: {
      chave_id: registro.id,
      chave_nome: registro.nome,
      app: registro.app,
      estabelecimento_id: registro.estabelecimento_id,
      empresa: estabelecimento?.nome ?? "",
    },
  };
}
