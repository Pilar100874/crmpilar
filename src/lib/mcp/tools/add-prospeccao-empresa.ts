import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

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
        contato_nome: input.contato_nome ?? null,
        contato_cargo: input.contato_cargo ?? null,
        contato_email: input.contato_email ?? null,
        contato_telefone: input.contato_telefone ?? null,
        porte: input.porte ?? null,
        faturamento_estimado: input.faturamento_estimado ?? null,
        funcionarios_estimado: input.funcionarios_estimado ?? null,
        data_fundacao: input.data_fundacao ?? null,
        situacao_cadastral: input.situacao_cadastral ?? null,
        score: input.score ?? null,
        score_motivo: input.score_motivo ?? null,
        produtos_interesse: input.produtos_interesse ?? [],
        prioridade: input.prioridade ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        tags: input.tags ?? [],
        observacoes_internas: input.observacoes_internas ?? null,
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
