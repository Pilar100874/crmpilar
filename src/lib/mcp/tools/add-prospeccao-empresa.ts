import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const EmpresaSchema = z.object({
  nome: z.string().min(1).describe("Razão social ou nome da empresa (obrigatório)."),
  nome_fantasia: z.string().optional(),
  cnpj: z.string().optional(),
  email: z.string().optional(),
  telefone: z.string().optional().describe("Telefone geral."),
  whatsapp: z.string().optional().describe("Número WhatsApp com DDD."),
  site: z.string().optional(),
  endereco: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional().describe("UF (2 letras)."),
  cep: z.string().optional(),
  cnae_principal: z.string().optional(),
  cnae_descricao: z.string().optional(),
  segmento_nome: z.string().optional().describe("Segmento (texto livre)."),
  descricao: z.string().optional().describe("Descrição / resumo da empresa."),
  redes_sociais: z
    .object({
      instagram: z.string().optional(),
      facebook: z.string().optional(),
      linkedin: z.string().optional(),
      youtube: z.string().optional(),
      tiktok: z.string().optional(),
    })
    .partial()
    .optional(),
  fontes: z.array(z.string().url()).optional().describe("URLs das fontes usadas na pesquisa."),
  extras: z.record(z.any()).optional().describe("Qualquer dado extra relevante em JSON."),
});

export default defineTool({
  name: "add_prospeccao_empresa",
  title: "Adicionar empresa à Prospecção",
  description:
    "Insere uma empresa pesquisada na web na tela 'Prospecção Empresas' do Listas. Use para trazer leads pesquisados de fontes externas (site, Google, LinkedIn, etc.) para dentro do CRM Pilar. Depois o usuário revisa e importa para o cadastro definitivo de Empresas. Use `add_prospeccao_empresas_bulk` para vários de uma vez.",
  inputSchema: EmpresaSchema.shape,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("prospeccao_empresas")
      .insert({
        user_id: ctx.getUserId(),
        nome: input.nome,
        nome_fantasia: input.nome_fantasia ?? null,
        cnpj: input.cnpj ?? null,
        email: input.email ?? null,
        telefone: input.telefone ?? null,
        whatsapp: input.whatsapp ?? null,
        site: input.site ?? null,
        endereco: input.endereco ?? null,
        bairro: input.bairro ?? null,
        cidade: input.cidade ?? null,
        estado: input.estado ?? null,
        cep: input.cep ?? null,
        cnae_principal: input.cnae_principal ?? null,
        cnae_descricao: input.cnae_descricao ?? null,
        segmento_nome: input.segmento_nome ?? null,
        descricao: input.descricao ?? null,
        redes_sociais: input.redes_sociais ?? {},
        fontes: input.fontes ?? [],
        extras: input.extras ?? {},
        origem: "claude-code",
        status: "novo",
      })
      .select("id, nome")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Adicionada: ${data.nome} (id ${data.id})` }],
      structuredContent: { id: data.id, nome: data.nome },
    };
  },
});
