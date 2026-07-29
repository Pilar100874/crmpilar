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
  name: "list_prospeccao_empresas",
  title: "Listar empresas prospectadas",
  description:
    "Lista empresas atualmente na tela 'Prospecção Empresas' do Pilar CRM (leads pesquisados que ainda não foram importados para o cadastro definitivo). Filtre por status (novo/importado/descartado), UF, cidade, segmento, origem ou texto livre em nome/CNPJ. Use para a IA saber o que já foi coletado antes de sugerir novas buscas.",
  inputSchema: {
    search: z.string().optional().describe("Texto livre em nome, nome fantasia ou CNPJ."),
    status: z.string().optional().describe("novo | importado | descartado."),
    uf: z.string().length(2).optional(),
    cidade: z.string().optional(),
    segmento_nome: z.string().optional(),
    origem: z.string().optional().describe("Ex.: claude-code, chatgpt, csv, cursor."),
    limit: z.number().int().positive().max(500).optional().describe("Máximo (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, status, uf, cidade, segmento_nome, origem, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("prospeccao_empresas")
      .select(
        "id, nome, nome_fantasia, cnpj, email, telefone, whatsapp, site, cidade, estado, segmento_nome, origem, status, score, importado_em, empresa_id, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      q = q.or(`nome.ilike.${s},nome_fantasia.ilike.${s},cnpj.ilike.${s}`);
    }
    if (status) q = q.eq("status", status);
    if (uf) q = q.ilike("estado", uf.trim());
    if (cidade) q = q.ilike("cidade", `%${cidade.trim()}%`);
    if (segmento_nome) q = q.ilike("segmento_nome", `%${segmento_nome.trim()}%`);
    if (origem) q = q.ilike("origem", origem.trim());

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = data ?? [];
    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
      structuredContent: { prospects: rows, count: rows.length },
    };
  },
});
