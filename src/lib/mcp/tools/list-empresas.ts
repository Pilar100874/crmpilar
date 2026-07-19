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
  title: "Listar empresas (com filtros)",
  description:
    "Lista empresas do CRM Pilar visíveis para o usuário autenticado. Permite filtrar por UF (estado), cidade, segmento (por id ou nome), e exigir presença de e-mail e/ou WhatsApp. Retorna nome, nome fantasia, CNPJ, e-mail(s), telefone, WhatsApp(s), cidade, UF e segmento — pronto para o assistente montar tabela.",
  inputSchema: {
    search: z.string().optional().describe("Texto livre em nome, nome fantasia ou CNPJ."),
    uf: z.string().length(2).optional().describe("UF (2 letras), ex: SP, RJ, MG."),
    cidade: z.string().optional().describe("Cidade (busca parcial, case-insensitive)."),
    segmento_id: z.string().uuid().optional().describe("ID do segmento (use list_segmentos para descobrir)."),
    segmento_nome: z.string().optional().describe("Nome do segmento (busca parcial). Alternativa a segmento_id."),
    com_email: z.boolean().optional().describe("Se true, retorna somente empresas com e-mail cadastrado."),
    com_whatsapp: z.boolean().optional().describe("Se true, retorna somente empresas com WhatsApp/telefone cadastrado."),
    limit: z.number().int().positive().max(500).optional().describe("Máximo de registros (padrão 50, máx 500)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (
    { search, uf, cidade, segmento_id, segmento_nome, com_email, com_whatsapp, limit },
    ctx,
  ) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const sb = supabaseForUser(ctx);

    // Resolver segmento por nome, se necessário
    let segIds: string[] | null = null;
    if (segmento_id) {
      segIds = [segmento_id];
    } else if (segmento_nome && segmento_nome.trim()) {
      const { data: segs, error: segErr } = await sb
        .from("segmentos")
        .select("id, nome")
        .ilike("nome", `%${segmento_nome.trim()}%`);
      if (segErr) return { content: [{ type: "text", text: segErr.message }], isError: true };
      if (!segs || segs.length === 0) {
        return {
          content: [{ type: "text", text: `Nenhum segmento encontrado com nome "${segmento_nome}".` }],
          structuredContent: { empresas: [], count: 0 },
        };
      }
      segIds = segs.map((s) => s.id);
    }

    let q = sb
      .from("empresas")
      .select(
        "id, nome, nome_fantasia, cnpj, email, emails_vinculados, telefone, whatsapps_vinculados, cidade, estado, segmento_id, segmentos(nome)",
      )
      .order("nome")
      .limit(limit ?? 50);

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      q = q.or(`nome.ilike.${s},nome_fantasia.ilike.${s},cnpj.ilike.${s}`);
    }
    if (uf) q = q.ilike("estado", uf.trim());
    if (cidade && cidade.trim()) q = q.ilike("cidade", `%${cidade.trim()}%`);
    if (segIds) q = q.in("segmento_id", segIds);
    if (com_email) q = q.not("email", "is", null).neq("email", "");
    if (com_whatsapp) q = q.not("telefone", "is", null).neq("telefone", "");

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = (data ?? []).map((r: any) => ({
      id: r.id,
      nome: r.nome,
      nome_fantasia: r.nome_fantasia,
      cnpj: r.cnpj,
      email: r.email,
      emails_extras: r.emails_vinculados ?? [],
      whatsapp: r.telefone,
      whatsapps_extras: r.whatsapps_vinculados ?? [],
      cidade: r.cidade,
      uf: r.estado,
      segmento: r.segmentos?.nome ?? null,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
      structuredContent: { empresas: rows, count: rows.length },
    };
  },
});
