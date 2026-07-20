import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, (process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY)!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_produtos",
  title: "Listar produtos",
  description: "Lista produtos do estabelecimento do usuário autenticado. Suporta busca por nome/código.",
  inputSchema: {
    search: z.string().optional().describe("Texto a buscar em nome, código ou marca."),
    limit: z.number().int().positive().max(100).optional().describe("Número máximo (padrão 25, máx 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("produtos")
      .select("id, nome, codigo, marca, estoque, preco_tabela, preco_minimo, ativo")
      .order("nome")
      .limit(limit ?? 25);
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      q = q.or(`nome.ilike.${s},codigo.ilike.${s},marca.ilike.${s}`);
    }
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { produtos: data ?? [], count: data?.length ?? 0 },
    };
  },
});
