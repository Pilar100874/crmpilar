import { supabase } from "@/integrations/supabase/client";

/**
 * Guarda a senha de uma conexão externa de forma cifrada (nunca em texto puro no banco).
 */
export async function salvarSenhaConexao(
  tabela: "database_connections" | "api_endpoints",
  id: string,
  senha: string,
): Promise<void> {
  if (!senha) return;
  const { data, error } = await supabase.functions.invoke("conexao-credencial", {
    body: { tabela, id, senha },
  });
  if (error || (data as any)?.error) {
    throw new Error((data as any)?.error || "Não foi possível salvar a senha com segurança");
  }
}

export const SENHA_PLACEHOLDER = "Deixe em branco para manter a senha atual";
