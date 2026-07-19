import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_empresas",
  title: "Listar empresas",
  description: "Lista empresas do CRM Pilar visíveis para o usuário autenticado. Suporta busca textual e limite.",
  inputSchema: {
    search: z.string().optional().describe("Texto a buscar em razão social, nome fantasia ou CNPJ/CPF."),
    limit: z.number().int().positive().max(100).optional().describe("Número máximo de registros (padrão 25, máx 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("empresas")
      .select("id, razao_social, nome_fantasia, cpf_cnpj, tipo_pessoa, email, telefone, cidade, uf")
      .order("razao_social")
      .limit(limit ?? 25);
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      q = q.or(`razao_social.ilike.${s},nome_fantasia.ilike.${s},cpf_cnpj.ilike.${s}`);
    }
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { empresas: data ?? [], count: data?.length ?? 0 },
    };
  },
});
