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
  name: "list_segmentos",
  title: "Listar segmentos",
  description:
    "Lista os segmentos de empresa cadastrados no Pilar. Use para descobrir o id/nome de um segmento antes de filtrar em list_empresas.",
  inputSchema: {
    search: z.string().optional().describe("Filtro parcial pelo nome do segmento."),
    limit: z.number().int().positive().max(200).optional().describe("Máximo (padrão 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    let q = sb.from("segmentos").select("id, nome").order("nome").limit(limit ?? 100);
    if (search && search.trim()) q = q.ilike("nome", `%${search.trim()}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { segmentos: data ?? [], count: data?.length ?? 0 },
    };
  },
});
