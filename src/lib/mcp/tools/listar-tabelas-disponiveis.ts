import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "listar_tabelas_disponiveis",
  title: "Listar tabelas liberadas para consulta",
  description:
    "Retorna a lista de tabelas do Pilar que estão liberadas para consulta via MCP (configuradas na tela 'Disponibilizar dados para Cloud Code / Cursor / ChatGPT'). Use antes de 'consultar_tabela'.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("mcp_tabelas_expostas")
      .select("tabela, descricao")
      .order("tabela");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { tabelas: data ?? [], count: (data ?? []).length },
    };
  },
});
