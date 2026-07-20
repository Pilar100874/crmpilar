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
  name: "consultar_tabela",
  title: "Consultar uma tabela liberada",
  description:
    "Consulta uma tabela do sistema Pilar que foi previamente liberada pelo administrador na tela 'Disponibilizar dados para Cloud Code / Cursor / ChatGPT'. Use 'listar_tabelas_disponiveis' primeiro para saber quais tabelas estão disponíveis. Retorna os registros (respeitando RLS do usuário autenticado).",
  inputSchema: {
    tabela: z.string().describe("Nome exato da tabela (ex.: empresas, produtos, orcamentos). Precisa estar na lista de tabelas liberadas."),
    colunas: z.string().optional().describe("Colunas separadas por vírgula (padrão: *)."),
    limit: z.number().int().positive().max(500).optional().describe("Máximo de registros (padrão 50, máx 500)."),
    order_by: z.string().optional().describe("Coluna para ordenar."),
    ordem: z.enum(["asc", "desc"]).optional().describe("Direção da ordenação (padrão asc)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ tabela, colunas, limit, order_by, ordem }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const sb = supabaseForUser(ctx);

    const { data: allowed, error: errAllowed } = await sb
      .from("mcp_tabelas_expostas")
      .select("tabela")
      .eq("tabela", tabela)
      .maybeSingle();
    if (errAllowed) return { content: [{ type: "text", text: errAllowed.message }], isError: true };
    if (!allowed) {
      return {
        content: [
          {
            type: "text",
            text: `Tabela "${tabela}" não está liberada. Peça ao administrador para adicioná-la em Listas → Disponibilizar dados para Cloud Code / Cursor / ChatGPT.`,
          },
        ],
        isError: true,
      };
    }

    let q = sb.from(tabela).select(colunas && colunas.trim() ? colunas : "*").limit(limit ?? 50);
    if (order_by) q = q.order(order_by, { ascending: (ordem ?? "asc") === "asc" });

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { tabela, registros: data ?? [], count: (data ?? []).length },
    };
  },
});
