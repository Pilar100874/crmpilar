import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const Empresa = z.object({
  nome: z.string().min(1),
  nome_fantasia: z.string().optional(),
  cnpj: z.string().optional(),
  email: z.string().optional(),
  telefone: z.string().optional(),
  whatsapp: z.string().optional(),
  site: z.string().optional(),
  endereco: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  cnae_principal: z.string().optional(),
  cnae_descricao: z.string().optional(),
  segmento_nome: z.string().optional(),
  descricao: z.string().optional(),
  redes_sociais: z.record(z.string()).optional(),
  fontes: z.array(z.string()).optional(),
  extras: z.record(z.any()).optional(),
});

export default defineTool({
  name: "add_prospeccao_empresas_bulk",
  title: "Adicionar várias empresas à Prospecção",
  description:
    "Insere um lote de empresas pesquisadas em 'Prospecção Empresas'. Use quando o assistente já compilou uma lista (ex.: 20 indústrias em SP). Máximo 100 por chamada.",
  inputSchema: {
    empresas: z.array(Empresa).min(1).max(100).describe("Lista de empresas a inserir."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ empresas }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    const rows = empresas.map((e) => ({
      user_id: userId,
      nome: e.nome,
      nome_fantasia: e.nome_fantasia ?? null,
      cnpj: e.cnpj ?? null,
      email: e.email ?? null,
      telefone: e.telefone ?? null,
      whatsapp: e.whatsapp ?? null,
      site: e.site ?? null,
      endereco: e.endereco ?? null,
      bairro: e.bairro ?? null,
      cidade: e.cidade ?? null,
      estado: e.estado ?? null,
      cep: e.cep ?? null,
      cnae_principal: e.cnae_principal ?? null,
      cnae_descricao: e.cnae_descricao ?? null,
      segmento_nome: e.segmento_nome ?? null,
      descricao: e.descricao ?? null,
      redes_sociais: e.redes_sociais ?? {},
      fontes: e.fontes ?? [],
      extras: e.extras ?? {},
      origem: "claude-code",
      status: "novo",
    }));
    const { data, error } = await sb.from("prospeccao_empresas").insert(rows).select("id");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Inseridas ${data?.length ?? 0} empresas na Prospecção.` }],
      structuredContent: { inseridas: data?.length ?? 0 },
    };
  },
});
