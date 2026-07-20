import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, (process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY)!, {
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
  contato_nome: z.string().optional(),
  contato_cargo: z.string().optional(),
  contato_email: z.string().optional(),
  contato_telefone: z.string().optional(),
  porte: z.string().optional(),
  faturamento_estimado: z.string().optional(),
  funcionarios_estimado: z.string().optional(),
  data_fundacao: z.string().optional(),
  situacao_cadastral: z.string().optional(),
  score: z.number().int().min(0).max(100).optional(),
  score_motivo: z.string().optional(),
  produtos_interesse: z.array(z.string()).optional(),
  prioridade: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  tags: z.array(z.string()).optional(),
  observacoes_internas: z.string().optional(),
  origem: z.string().optional(),
  extras: z.record(z.any()).optional(),
});

export default defineTool({
  name: "salvar_empresas_prospectadas",
  title: "Salvar várias empresas prospectadas",
  description:
    "Insere um LOTE de empresas pesquisadas na web em 'Prospecção Empresas' do Pilar CRM. Use quando o assistente já compilou uma lista (ex.: 20 indústrias em SP) — envia todas de uma vez, muito mais rápido que chamar `salvar_empresa_prospectada` várias vezes. Máximo 100 por chamada.",
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
      contato_nome: e.contato_nome ?? null,
      contato_cargo: e.contato_cargo ?? null,
      contato_email: e.contato_email ?? null,
      contato_telefone: e.contato_telefone ?? null,
      porte: e.porte ?? null,
      faturamento_estimado: e.faturamento_estimado ?? null,
      funcionarios_estimado: e.funcionarios_estimado ?? null,
      data_fundacao: e.data_fundacao ?? null,
      situacao_cadastral: e.situacao_cadastral ?? null,
      score: e.score ?? null,
      score_motivo: e.score_motivo ?? null,
      produtos_interesse: e.produtos_interesse ?? [],
      prioridade: e.prioridade ?? null,
      latitude: e.latitude ?? null,
      longitude: e.longitude ?? null,
      tags: e.tags ?? [],
      observacoes_internas: e.observacoes_internas ?? null,
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
