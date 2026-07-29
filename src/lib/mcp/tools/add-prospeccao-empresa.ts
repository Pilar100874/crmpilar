import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { enrichWithCnpj } from "./_cnpjEnrich";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, (process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY)!, {
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
  // ===== Qualificação / enriquecimento =====
  contato_nome: z.string().optional().describe("Nome do decisor/contato principal."),
  contato_cargo: z.string().optional().describe("Cargo do contato (ex.: Sócio, Diretor Comercial)."),
  contato_email: z.string().optional(),
  contato_telefone: z.string().optional(),
  porte: z.string().optional().describe("MEI, ME, EPP, Médio, Grande."),
  faturamento_estimado: z.string().optional().describe("Faixa de faturamento anual estimado."),
  funcionarios_estimado: z.string().optional().describe("Faixa de nº de funcionários (ex.: 1-9, 10-49)."),
  data_fundacao: z.string().optional().describe("Data de fundação em YYYY-MM-DD."),
  situacao_cadastral: z.string().optional().describe("ATIVA, BAIXADA, SUSPENSA, INAPTA."),
  score: z.number().int().min(0).max(100).optional().describe("Score de qualificação 0-100."),
  score_motivo: z.string().optional().describe("Justificativa curta do score."),
  produtos_interesse: z.array(z.string()).optional().describe("Produtos/serviços de interesse."),
  prioridade: z.string().optional().describe("alta, media, baixa."),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  tags: z.array(z.string()).optional(),
  observacoes_internas: z.string().optional(),
  origem: z.string().optional().describe("Origem do lead. Use 'vendedor' para representantes comerciais, 'claude-code' (default) para empresas."),
  extras: z.record(z.any()).optional().describe("Qualquer dado extra relevante em JSON."),
});

export default defineTool({
  name: "salvar_empresa_prospectada",
  title: "Salvar empresa prospectada",
  description:
    "Insere UMA empresa pesquisada na web na tela 'Prospecção Empresas' do Listas do Pilar CRM. Use para trazer leads pesquisados de fontes externas (site, Google, LinkedIn, etc.) para dentro do Pilar. Depois o usuário revisa e importa para o cadastro definitivo de Empresas. Para vários leads de uma vez, use `salvar_empresas_prospectadas`.",
  inputSchema: EmpresaSchema.shape,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const enriched = await enrichWithCnpj(input as any);
    const { data, error } = await sb
      .from("prospeccao_empresas")
      .insert({
        user_id: ctx.getUserId(),
        nome: enriched.nome,
        nome_fantasia: enriched.nome_fantasia ?? null,
        cnpj: enriched.cnpj ?? null,
        email: enriched.email ?? null,
        telefone: enriched.telefone ?? null,
        whatsapp: enriched.whatsapp ?? null,
        site: enriched.site ?? null,
        endereco: enriched.endereco ?? null,
        bairro: enriched.bairro ?? null,
        cidade: enriched.cidade ?? null,
        estado: enriched.estado ?? null,
        cep: enriched.cep ?? null,
        cnae_principal: enriched.cnae_principal ?? null,
        cnae_descricao: enriched.cnae_descricao ?? null,
        segmento_nome: enriched.segmento_nome ?? null,
        descricao: enriched.descricao ?? null,
        redes_sociais: enriched.redes_sociais ?? {},
        fontes: enriched.fontes ?? [],
        contato_nome: enriched.contato_nome ?? null,
        contato_cargo: enriched.contato_cargo ?? null,
        contato_email: enriched.contato_email ?? null,
        contato_telefone: enriched.contato_telefone ?? null,
        porte: enriched.porte ?? null,
        faturamento_estimado: enriched.faturamento_estimado ?? null,
        funcionarios_estimado: enriched.funcionarios_estimado ?? null,
        data_fundacao: enriched.data_fundacao ?? null,
        situacao_cadastral: enriched.situacao_cadastral ?? null,
        score: enriched.score ?? null,
        score_motivo: enriched.score_motivo ?? null,
        produtos_interesse: enriched.produtos_interesse ?? [],
        prioridade: enriched.prioridade ?? null,
        latitude: enriched.latitude ?? null,
        longitude: enriched.longitude ?? null,
        tags: enriched.tags ?? [],
        observacoes_internas: enriched.observacoes_internas ?? null,
        extras: enriched.extras ?? {},
        origem: enriched.origem ?? "claude-code",
        status: "novo",
      })
      .select("id, nome")
      .single();
    if (error || !data) return { content: [{ type: "text", text: error?.message || "erro" }], isError: true };
    return {
      content: [{ type: "text", text: `Adicionada: ${data.nome} (id ${data.id})` }],
      structuredContent: { id: data.id, nome: data.nome },
    };
  },
});
