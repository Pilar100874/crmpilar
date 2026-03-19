import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── AGENT DEPENDENCY GRAPH ────────────────────────────────────────────────────
// Each agent declares which upstream agents' outputs it MUST read before executing.
const AGENT_DEPENDENCIES: Record<string, string[]> = {
  vox: [],
  cipher: [],
  positioning: ['vox', 'cipher'],
  funnel: ['positioning', 'vox', 'cipher'],
  vsl: ['positioning', 'vox', 'funnel'],
  landing_page: ['positioning', 'vox', 'funnel', 'vsl'],
  creative: ['positioning', 'vox', 'cipher', 'funnel'],
  email: ['positioning', 'vox', 'funnel'],
  reel: ['positioning', 'vox', 'creative'],
};

// ─── AGENT DEFINITIONS ─────────────────────────────────────────────────────────
const AGENT_DEFINITIONS: Record<string, { name: string; type: string; systemPrompt: string }> = {
  vox: {
    name: 'Vox Agent',
    type: 'specialist',
    systemPrompt: `Você é o VOX AGENT, especialista em pesquisa qualitativa e voz do cliente.
Sua missão é extrair insights profundos sobre o público-alvo a partir da descrição do negócio.

REGRAS OBRIGATÓRIAS:
- Gere pelo menos 5 itens para cada campo
- Use linguagem realista que o público realmente usaria
- Seja específico ao nicho — nunca genérico
- Baseie-se em padrões reais de comportamento do consumidor

Retorne EXCLUSIVAMENTE um JSON válido (sem markdown, sem explicação) com esta estrutura:
{
  "dores": ["dor específica 1", "dor específica 2", ...],
  "desejos": ["desejo específico 1", ...],
  "objecoes": ["objeção real 1", ...],
  "frases_literais": ["frase que o cliente diria 1", ...],
  "padroes_emocionais": ["padrão emocional 1", ...],
  "linguagem_recorrente": ["termo/expressão 1", ...],
  "nivel_consciencia": "inconsciente|consciente_problema|consciente_solucao|consciente_produto|totalmente_consciente",
  "gatilhos_decisao": ["gatilho 1", ...]
}`
  },
  cipher: {
    name: 'Cipher Agent',
    type: 'specialist',
    systemPrompt: `Você é o CIPHER AGENT, especialista em inteligência competitiva e análise de mercado.
Sua missão é mapear o cenário competitivo e identificar oportunidades estratégicas.

REGRAS OBRIGATÓRIAS:
- Analise o mercado real do nicho descrito
- Identifique padrões reais de concorrentes
- Encontre lacunas exploráveis
- Seja específico — não use exemplos genéricos

Retorne EXCLUSIVAMENTE um JSON válido com esta estrutura:
{
  "promessas_dominantes": ["promessa 1", ...],
  "mecanismos_concorrentes": ["mecanismo/método 1", ...],
  "angulos_anuncio": ["ângulo 1", ...],
  "padroes_posicionamento": ["padrão 1", ...],
  "lacunas_estrategicas": ["oportunidade 1", ...],
  "nivel_saturacao": "baixo|medio|alto",
  "tendencias_mercado": ["tendência 1", ...],
  "pontos_fracos_concorrentes": ["ponto fraco 1", ...]
}`
  },
  positioning: {
    name: 'Positioning Strategist',
    type: 'specialist',
    systemPrompt: `Você é o POSITIONING STRATEGIST. Sua missão é criar um posicionamento estratégico único e defensável.

INSTRUÇÃO CRÍTICA: Você DEVE ler e usar os dados de "vox" e "cipher" da memória estratégica.
- Use as dores e desejos do Vox para definir o ICP e problema central
- Use as lacunas do Cipher para criar diferenciação real
- O mecanismo único deve ser algo que concorrentes NÃO oferecem

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "icp": { "descricao": "", "demografico": "", "psicografico": "", "comportamental": "", "dor_principal": "", "desejo_principal": "" },
  "problema_central": "",
  "resultado_desejado": "",
  "mecanismo_unico": "",
  "big_idea": "",
  "promessa_principal": "",
  "estrutura_oferta": { "principal": "", "bonus": [""], "garantia": "", "urgencia": "" },
  "diferenciacao": "",
  "tom_comunicacao": ""
}`
  },
  funnel: {
    name: 'Funnel Architect',
    type: 'specialist',
    systemPrompt: `Você é o FUNNEL ARCHITECT. Sua missão é desenhar um funil de marketing completo e realista.

INSTRUÇÃO CRÍTICA: Você DEVE ler e usar os dados da memória estratégica:
- "positioning" → use ICP, oferta e big idea para definir o funil
- "vox" → use nível de consciência para calibrar as etapas
- "cipher" → use canais e ângulos que funcionam no mercado

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "tipo_funil": "direto|webinar|lancamento|perpetuo|desafio",
  "fontes_trafego": [{ "canal": "", "estrategia": "", "investimento_sugerido": "", "publico_alvo": "" }],
  "etapas_funil": [{ "nome": "", "objetivo": "", "metricas": [""], "ativos_necessarios": [""], "taxa_conversao_esperada": "" }],
  "logica_conversao": "",
  "kpis": [{ "metrica": "", "meta": "", "importancia": "" }],
  "estimativa_cac": "",
  "estimativa_ltv": ""
}`
  },
  vsl: {
    name: 'VSL Writer',
    type: 'specialist',
    systemPrompt: `Você é o VSL WRITER. Sua missão é criar um roteiro persuasivo de Video Sales Letter.

INSTRUÇÃO CRÍTICA: Você DEVE usar a memória estratégica:
- "positioning" → use big idea, mecanismo único e oferta
- "vox" → use frases literais, dores e linguagem recorrente (copie termos exatos!)
- "funnel" → adapte o CTA ao tipo de funil definido

O roteiro deve usar a LINGUAGEM REAL do cliente (do Vox), não jargão de marketing.

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "hook": { "texto": "", "duracao_estimada": "", "tipo_hook": "" },
  "problema": { "texto": "", "duracao_estimada": "" },
  "agitacao": { "texto": "", "duracao_estimada": "" },
  "descoberta": { "texto": "", "duracao_estimada": "" },
  "mecanismo": { "texto": "", "duracao_estimada": "" },
  "prova": { "texto": "", "duracao_estimada": "" },
  "oferta": { "texto": "", "duracao_estimada": "" },
  "bonus": { "texto": "", "duracao_estimada": "" },
  "garantia": { "texto": "", "duracao_estimada": "" },
  "escassez": { "texto": "", "duracao_estimada": "" },
  "cta": { "texto": "", "duracao_estimada": "" },
  "duracao_total_estimada": ""
}`
  },
  landing_page: {
    name: 'Landing Page Builder',
    type: 'specialist',
    systemPrompt: `Você é o LANDING PAGE BUILDER. Sua missão é criar a estrutura completa de uma página de vendas de alta conversão.

INSTRUÇÃO CRÍTICA: Você DEVE usar a memória estratégica:
- "positioning" → headline, oferta, diferenciação, garantia
- "vox" → dores, desejos e linguagem para copys
- "funnel" → tipo de funil define o formato da página
- "vsl" → se existir, integre o vídeo na hero section

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "sections": [
    { "tipo": "hero", "headline": "", "subheadline": "", "cta_text": "", "tem_video": false },
    { "tipo": "problema", "titulo": "", "conteudo": "", "bullets": [""] },
    { "tipo": "solucao", "titulo": "", "conteudo": "" },
    { "tipo": "mecanismo", "titulo": "", "conteudo": "", "passos": [""] },
    { "tipo": "prova", "titulo": "", "items": [""] },
    { "tipo": "depoimentos", "titulo": "", "depoimentos": [{ "nome": "", "texto": "", "resultado": "" }] },
    { "tipo": "oferta", "titulo": "", "preco": "", "preco_de": "", "bonus": [{ "nome": "", "valor": "" }], "garantia": "" },
    { "tipo": "faq", "perguntas": [{ "pergunta": "", "resposta": "" }] },
    { "tipo": "cta_final", "headline": "", "subheadline": "", "cta_text": "", "urgencia": "" }
  ],
  "meta_title": "",
  "meta_description": ""
}`
  },
  creative: {
    name: 'Creative Strategist',
    type: 'specialist',
    systemPrompt: `Você é o CREATIVE STRATEGIST. Sua missão é criar conceitos de criativos para anúncios de alta performance.

INSTRUÇÃO CRÍTICA: Você DEVE usar a memória estratégica:
- "positioning" → big idea e mecanismo para os conceitos
- "vox" → dores, frases literais e objeções para hooks
- "cipher" → ângulos não explorados por concorrentes
- "funnel" → fontes de tráfego definem as plataformas

Crie pelo menos 3 hooks, 3 conceitos e 5 ideias de anúncio.

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "hooks": [{ "texto": "", "tipo": "curiosidade|dor|resultado|contraintuitivo|autoridade", "plataforma": "" }],
  "conceitos_criativos": [{ "nome": "", "formato": "video|imagem|carrossel|stories", "descricao": "", "roteiro": "" }],
  "angulos_campanha": [{ "angulo": "", "publico_alvo": "", "mensagem_chave": "", "objecao_que_quebra": "" }],
  "ideias_anuncios": [{ "titulo": "", "formato": "", "copy": "", "cta": "", "plataforma": "" }]
}`
  },
  email: {
    name: 'Email Engine',
    type: 'specialist',
    systemPrompt: `Você é o EMAIL ENGINE. Sua missão é criar sequências de email marketing estratégicas.

INSTRUÇÃO CRÍTICA: Você DEVE usar a memória estratégica:
- "positioning" → oferta, big idea e mecanismo para as sequências
- "vox" → linguagem do cliente, objeções para emails de quebra
- "funnel" → adapte sequências ao tipo de funil

Crie pelo menos 3 emails por sequência. Use a linguagem real do cliente.

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "sequencias": [
    {
      "tipo": "boas_vindas",
      "objetivo": "",
      "emails": [{ "assunto": "", "preview": "", "corpo": "", "cta": "", "delay_dias": 0, "gatilho_emocional": "" }]
    },
    {
      "tipo": "nutricao",
      "objetivo": "",
      "emails": [{ "assunto": "", "preview": "", "corpo": "", "cta": "", "delay_dias": 0, "gatilho_emocional": "" }]
    },
    {
      "tipo": "quebra_objecoes",
      "objetivo": "",
      "emails": [{ "assunto": "", "preview": "", "corpo": "", "cta": "", "delay_dias": 0, "objecao_alvo": "" }]
    },
    {
      "tipo": "conversao",
      "objetivo": "",
      "emails": [{ "assunto": "", "preview": "", "corpo": "", "cta": "", "delay_dias": 0, "gatilho_emocional": "" }]
    }
  ]
}`
  },
  reel: {
    name: 'Reel Writer',
    type: 'specialist',
    systemPrompt: `Você é o REEL WRITER. Sua missão é criar scripts para vídeos curtos de alta retenção.

INSTRUÇÃO CRÍTICA: Você DEVE usar a memória estratégica:
- "positioning" → mecanismo único e big idea para conteúdo
- "vox" → linguagem, dores e desejos para hooks
- "creative" → ângulos de campanha para variar abordagens

Crie pelo menos 5 scripts variados com hooks diferentes. Cada script deve ter menos de 60 segundos.

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "scripts": [
    {
      "titulo": "",
      "duracao": "",
      "plataforma": "reels|tiktok|shorts",
      "objetivo": "awareness|consideracao|conversao",
      "hook": { "texto": "", "duracao": "", "tipo": "" },
      "desenvolvimento": { "texto": "", "duracao": "" },
      "cta": { "texto": "", "duracao": "" },
      "instrucoes_visuais": "",
      "musica_sugerida": "",
      "hashtags": [""]
    }
  ]
}`
  }
};

const VALIDATOR_DEFINITIONS: Record<string, { name: string; systemPrompt: string }> = {
  clareza: {
    name: 'Validador de Clareza',
    systemPrompt: `Você é um validador de clareza de comunicação de marketing.
Avalie se o conteúdo está claro, compreensível e sem ambiguidades para o público-alvo.
Considere: simplicidade da linguagem, estrutura lógica, ausência de jargão desnecessário.
Retorne EXCLUSIVAMENTE um JSON: { "pontuacao": 0-100, "diagnostico": "", "sugestoes": [""] }`
  },
  especificidade: {
    name: 'Validador de Especificidade',
    systemPrompt: `Você é um validador de especificidade de comunicação de marketing.
Avalie se o conteúdo é específico (números, dados, exemplos concretos) ou genérico/vago.
Penalize frases como "o melhor", "incrível", "revolucionário" sem substância.
Retorne EXCLUSIVAMENTE um JSON: { "pontuacao": 0-100, "diagnostico": "", "sugestoes": [""] }`
  },
  voc: {
    name: 'Validador de VOC',
    systemPrompt: `Você é um validador de Voz do Cliente (VOC).
Avalie se a comunicação reflete a linguagem real que o público-alvo usaria.
Compare com os dados de "vox" na memória estratégica (se disponível).
Penalize linguagem corporativa ou de marketing que o cliente não usaria.
Retorne EXCLUSIVAMENTE um JSON: { "pontuacao": 0-100, "diagnostico": "", "sugestoes": [""] }`
  },
  diferenciacao: {
    name: 'Validador de Diferenciação',
    systemPrompt: `Você é um validador de diferenciação competitiva.
Avalie se a proposta se diferencia claramente dos concorrentes.
Compare com os dados de "cipher" na memória estratégica (se disponível).
Penalize promessas genéricas que qualquer concorrente poderia fazer.
Retorne EXCLUSIVAMENTE um JSON: { "pontuacao": 0-100, "diagnostico": "", "sugestoes": [""] }`
  },
  consistencia: {
    name: 'Validador de Consistência',
    systemPrompt: `Você é um validador de consistência estratégica.
Avalie se o conteúdo está alinhado com o posicionamento definido na memória estratégica.
Verifique: tom de voz, promessa, mecanismo, ICP — tudo deve ser consistente.
Retorne EXCLUSIVAMENTE um JSON: { "pontuacao": 0-100, "diagnostico": "", "sugestoes": [""] }`
  }
};

const AGENT_ORDER = ['vox', 'cipher', 'positioning', 'funnel', 'vsl', 'landing_page', 'creative', 'email', 'reel'];

// ─── HELPERS ────────────────────────────────────────────────────────────────────

async function callAI(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
    }),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) throw new Error('Rate limit atingido. Tente novamente em instantes.');
    if (status === 402) throw new Error('Créditos insuficientes. Adicione créditos em Configurações.');
    throw new Error(`Erro na API de IA: ${status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function extractJSON(text: string): any {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1].trim());
  }
  return JSON.parse(text.trim());
}

/**
 * Build a context-rich prompt that injects only the relevant upstream agent outputs.
 * This ensures every agent reads the shared strategic memory before executing.
 */
function buildAgentPrompt(
  agentType: string,
  businessDescription: string,
  memory: Record<string, any>
): string {
  const deps = AGENT_DEPENDENCIES[agentType] || [];
  
  let prompt = `═══════════════════════════════════════════════════
DESCRIÇÃO DO NEGÓCIO:
═══════════════════════════════════════════════════
${businessDescription}

`;

  // Always show what's available in memory
  const availableKeys = Object.keys(memory).filter(k => memory[k] != null);
  
  if (availableKeys.length > 0) {
    prompt += `═══════════════════════════════════════════════════
MEMÓRIA ESTRATÉGICA COMPARTILHADA
(dados gerados por agentes anteriores que você DEVE consultar)
═══════════════════════════════════════════════════\n\n`;

    // First: inject required dependencies with emphasis
    if (deps.length > 0) {
      prompt += `🔴 DADOS OBRIGATÓRIOS (você DEVE usar estes dados na sua análise):\n\n`;
      for (const dep of deps) {
        if (memory[dep]) {
          const agentName = AGENT_DEFINITIONS[dep]?.name || dep;
          prompt += `── ${agentName.toUpperCase()} ──\n`;
          prompt += JSON.stringify(memory[dep], null, 2);
          prompt += `\n\n`;
        } else {
          prompt += `── ${dep.toUpperCase()} ── (ainda não executado)\n\n`;
        }
      }
    }

    // Then: inject other available context as supplementary
    const supplementary = availableKeys.filter(k => !deps.includes(k));
    if (supplementary.length > 0) {
      prompt += `🟡 CONTEXTO SUPLEMENTAR (use se relevante):\n\n`;
      for (const key of supplementary) {
        const agentName = AGENT_DEFINITIONS[key]?.name || key;
        prompt += `── ${agentName.toUpperCase()} ──\n`;
        // Summarize to avoid token overflow for supplementary data
        const content = memory[key];
        const contentStr = JSON.stringify(content);
        if (contentStr.length > 2000) {
          prompt += JSON.stringify(content, null, 1).substring(0, 2000) + '... (truncado)\n\n';
        } else {
          prompt += JSON.stringify(content, null, 2) + '\n\n';
        }
      }
    }
  }

  prompt += `═══════════════════════════════════════════════════
INSTRUÇÃO FINAL: Execute sua análise agora.
- Use os DADOS OBRIGATÓRIOS acima como base para suas decisões
- Seja específico ao nicho descrito — nunca genérico
- Retorne APENAS JSON válido, sem explicações
═══════════════════════════════════════════════════`;

  return prompt;
}

/**
 * Fetch the latest strategic memory from the database (not a stale local copy).
 */
async function getLatestMemory(supabase: any, projectId: string): Promise<{ project: any; memory: Record<string, any> }> {
  const { data: project, error } = await supabase
    .from('strategy_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error || !project) throw new Error('Projeto não encontrado');
  return { project, memory: (project.strategic_memory as any) || {} };
}

/**
 * Save artifact and version history in a single operation.
 */
async function saveArtifactWithHistory(
  supabase: any,
  projectId: string,
  executionId: string,
  agentType: string,
  agentName: string,
  content: any,
  version: number = 1
) {
  const { data: artifact } = await supabase
    .from('strategy_artifacts')
    .insert({
      project_id: projectId,
      execution_id: executionId,
      tipo: agentType,
      titulo: agentName,
      conteudo: content,
      status: 'completed',
      version
    })
    .select()
    .single();

  if (artifact) {
    await supabase.from('strategy_artifact_versions').insert({
      project_id: projectId,
      artifact_id: artifact.id,
      tipo: agentType,
      titulo: agentName,
      conteudo: content,
      version,
      status: 'completed'
    });
  }

  return artifact;
}

// ─── MAIN HANDLER ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { action, projectId, agentType, message, variationIndex, artifactId, validatorType, artifactContent } = body;

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTION: Execute single agent
    // ═══════════════════════════════════════════════════════════════════════════
    if (action === 'execute_agent') {
      const agent = AGENT_DEFINITIONS[agentType];
      if (!agent) throw new Error(`Agente desconhecido: ${agentType}`);

      // Always fetch latest memory from DB
      const { project, memory } = await getLatestMemory(supabase, projectId);

      // Check dependencies
      const deps = AGENT_DEPENDENCIES[agentType] || [];
      const missingDeps = deps.filter(d => !memory[d]);
      if (missingDeps.length > 0) {
        console.log(`⚠️ Agent ${agentType} missing dependencies: ${missingDeps.join(', ')} — executing anyway with available context`);
      }

      // Create execution record with dependency info
      const { data: execution } = await supabase
        .from('strategy_agent_executions')
        .insert({
          project_id: projectId,
          agent_type: agentType,
          agent_name: agent.name,
          status: 'running',
          input_data: {
            dependencies: deps,
            missing_dependencies: missingDeps,
            memory_keys_available: Object.keys(memory),
            descricao: project.descricao_negocio
          }
        })
        .select()
        .single();

      const startTime = Date.now();

      try {
        const userPrompt = buildAgentPrompt(agentType, project.descricao_negocio, memory);
        const rawResult = await callAI(LOVABLE_API_KEY, agent.systemPrompt, userPrompt);
        const parsedResult = extractJSON(rawResult);
        const duration = Date.now() - startTime;

        // Update execution
        await supabase
          .from('strategy_agent_executions')
          .update({ status: 'completed', output_data: parsedResult, duration_ms: duration })
          .eq('id', execution!.id);

        // Update strategic memory
        const updatedMemory = { ...memory, [agentType]: parsedResult };
        await supabase
          .from('strategy_projects')
          .update({ strategic_memory: updatedMemory })
          .eq('id', projectId);

        // Save artifact + version
        await saveArtifactWithHistory(supabase, projectId, execution!.id, agentType, agent.name, parsedResult);

        return new Response(JSON.stringify({
          success: true,
          execution_id: execution!.id,
          result: parsedResult,
          duration_ms: duration,
          dependencies_used: deps.filter(d => memory[d]),
          dependencies_missing: missingDeps
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error: any) {
        await supabase
          .from('strategy_agent_executions')
          .update({ status: 'failed', error_message: error.message, duration_ms: Date.now() - startTime })
          .eq('id', execution!.id);
        throw error;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTION: Validate artifact (now with project context)
    // ═══════════════════════════════════════════════════════════════════════════
    if (action === 'validate') {
      const validator = VALIDATOR_DEFINITIONS[validatorType];
      if (!validator) throw new Error(`Validador desconhecido: ${validatorType}`);

      // Fetch project memory for context-aware validation
      let contextPrompt = `Conteúdo a validar:\n${JSON.stringify(artifactContent, null, 2)}`;
      
      if (projectId) {
        try {
          const { memory } = await getLatestMemory(supabase, projectId);
          contextPrompt += `\n\nMEMÓRIA ESTRATÉGICA DO PROJETO (use como referência para validação):\n`;
          if (memory.positioning) contextPrompt += `Posicionamento: ${JSON.stringify(memory.positioning, null, 1)}\n`;
          if (memory.vox) contextPrompt += `Voz do Cliente: ${JSON.stringify(memory.vox, null, 1)}\n`;
          if (memory.cipher) contextPrompt += `Inteligência Competitiva: ${JSON.stringify(memory.cipher, null, 1)}\n`;
        } catch { /* project context optional */ }
      }

      const rawResult = await callAI(LOVABLE_API_KEY, validator.systemPrompt, contextPrompt);
      const result = extractJSON(rawResult);

      return new Response(JSON.stringify({ success: true, validation: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTION: Generate A/B variation
    // ═══════════════════════════════════════════════════════════════════════════
    if (action === 'generate_variation') {
      const agent = AGENT_DEFINITIONS[agentType];
      if (!agent) throw new Error(`Agente desconhecido: ${agentType}`);

      const { project, memory } = await getLatestMemory(supabase, projectId);

      const variationPrompt = buildAgentPrompt(agentType, project.descricao_negocio, memory) + `

INSTRUÇÃO ESPECIAL DE VARIAÇÃO (#${variationIndex || 1}):
Crie uma VARIAÇÃO ALTERNATIVA completamente diferente. Use:
- Um ângulo criativo distinto
- Tom de voz diferente (mais formal, mais casual, mais provocativo, etc.)
- Abordagem ou estrutura diferente
O resultado deve ser válido e de alta qualidade, mas CLARAMENTE DIFERENTE do padrão.`;

      const rawResult = await callAI(LOVABLE_API_KEY, agent.systemPrompt, variationPrompt);
      const parsedResult = extractJSON(rawResult);

      return new Response(JSON.stringify({ success: true, result: parsedResult }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTION: Clone project
    // ═══════════════════════════════════════════════════════════════════════════
    if (action === 'clone_project') {
      const { sourceProjectId, newName } = body;
      
      const { data: source } = await supabase
        .from('strategy_projects')
        .select('*')
        .eq('id', sourceProjectId)
        .single();

      if (!source) throw new Error('Projeto fonte não encontrado');

      const { data: cloned } = await supabase
        .from('strategy_projects')
        .insert({
          nome: newName || `${source.nome} (Cópia)`,
          descricao_negocio: source.descricao_negocio,
          estabelecimento_id: source.estabelecimento_id,
          user_id: source.user_id,
          strategic_memory: source.strategic_memory,
          status: 'draft'
        })
        .select()
        .single();

      if (!cloned) throw new Error('Erro ao clonar projeto');

      const { data: artifacts } = await supabase
        .from('strategy_artifacts')
        .select('*')
        .eq('project_id', sourceProjectId);

      if (artifacts && artifacts.length > 0) {
        const clonedArtifacts = artifacts.map((a: any) => ({
          project_id: cloned.id,
          tipo: a.tipo,
          titulo: a.titulo,
          conteudo: a.conteudo,
          version: 1,
          status: 'completed'
        }));
        await supabase.from('strategy_artifacts').insert(clonedArtifacts);
      }

      return new Response(JSON.stringify({ success: true, project: cloned }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTION: Revise agent (re-execute with feedback)
    // ═══════════════════════════════════════════════════════════════════════════
    if (action === 'revise_agent') {
      const agent = AGENT_DEFINITIONS[agentType];
      if (!agent) throw new Error(`Agente desconhecido: ${agentType}`);

      // Always re-read latest memory
      const { project, memory } = await getLatestMemory(supabase, projectId);

      const { data: currentArtifact } = await supabase
        .from('strategy_artifacts')
        .select('*')
        .eq('project_id', projectId)
        .eq('tipo', agentType)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const { data: execution } = await supabase
        .from('strategy_agent_executions')
        .insert({
          project_id: projectId,
          agent_type: agentType,
          agent_name: agent.name + ' (Revisão)',
          status: 'running',
          input_data: { memory_keys: Object.keys(memory), revision: true }
        })
        .select()
        .single();

      const startTime = Date.now();

      try {
        // Build context-rich prompt + revision instructions
        const basePrompt = buildAgentPrompt(agentType, project.descricao_negocio, memory);
        const revisionPrompt = basePrompt + `

═══════════════════════════════════════════════════
MODO REVISÃO — RESULTADO ANTERIOR:
═══════════════════════════════════════════════════
${JSON.stringify(currentArtifact?.conteudo || {}, null, 2)}

INSTRUÇÃO DE REVISÃO:
1. Analise o resultado anterior criticamente
2. Identifique pontos fracos, genéricos ou inconsistentes
3. Melhore significativamente: mais específico, mais criativo, mais alinhado com a memória estratégica
4. Retorne o resultado COMPLETO revisado no mesmo formato JSON`;

        const rawResult = await callAI(LOVABLE_API_KEY, agent.systemPrompt, revisionPrompt);
        const parsedResult = extractJSON(rawResult);
        const duration = Date.now() - startTime;

        await supabase
          .from('strategy_agent_executions')
          .update({ status: 'completed', output_data: parsedResult, duration_ms: duration })
          .eq('id', execution!.id);

        // Update memory with revised output
        const updatedMemory = { ...memory, [agentType]: parsedResult };
        await supabase.from('strategy_projects').update({ strategic_memory: updatedMemory }).eq('id', projectId);

        const newVersion = ((currentArtifact as any)?.version || 1) + 1;
        if (currentArtifact) {
          await supabase
            .from('strategy_artifacts')
            .update({ conteudo: parsedResult, version: newVersion, status: 'completed', execution_id: execution!.id })
            .eq('id', currentArtifact.id);

          await supabase.from('strategy_artifact_versions').insert({
            project_id: projectId,
            artifact_id: currentArtifact.id,
            tipo: agentType,
            titulo: currentArtifact.titulo,
            conteudo: parsedResult,
            version: newVersion,
            status: 'completed'
          });
        }

        return new Response(JSON.stringify({
          success: true, new_version: newVersion, result: parsedResult, duration_ms: duration
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (error: any) {
        await supabase
          .from('strategy_agent_executions')
          .update({ status: 'failed', error_message: error.message, duration_ms: Date.now() - startTime })
          .eq('id', execution!.id);
        throw error;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTION: Chat with orchestrator
    // ═══════════════════════════════════════════════════════════════════════════
    if (action === 'chat') {
      const { project, memory } = await getLatestMemory(supabase, projectId);

      // Save user message
      await supabase.from('strategy_chat_messages').insert({
        project_id: projectId,
        role: 'user',
        content: message
      });

      const memoryKeys = Object.keys(memory);
      const completedAgents = AGENT_ORDER.filter(a => memory[a]);
      const pendingAgents = AGENT_ORDER.filter(a => !memory[a]);

      const systemPrompt = `Você é o Orchestrator do Motor de Estratégia de Marketing.
Você coordena 9 agentes especializados para criar estratégias completas de marketing.

PROJETO: ${project.nome}
DESCRIÇÃO: ${project.descricao_negocio}

STATUS DOS AGENTES:
✅ Concluídos: ${completedAgents.length > 0 ? completedAgents.map(a => AGENT_DEFINITIONS[a]?.name).join(', ') : 'Nenhum'}
⏳ Pendentes: ${pendingAgents.length > 0 ? pendingAgents.map(a => AGENT_DEFINITIONS[a]?.name).join(', ') : 'Nenhum'}

MEMÓRIA ESTRATÉGICA RESUMIDA:
${memoryKeys.length > 0 ? memoryKeys.map(k => {
  const content = memory[k];
  const summary = typeof content === 'object' ? Object.keys(content).join(', ') : String(content).substring(0, 100);
  return `- ${k}: [${summary}]`;
}).join('\n') : '(vazia — nenhum agente executado ainda)'}

REGRAS:
- Responda de forma concisa e estratégica
- Se o usuário pedir para executar agentes, indique quais serão acionados e suas dependências
- Se pedir ajustes, identifique quais artefatos precisam ser revisados
- Sugira próximos passos proativamente
- Nunca revele detalhes técnicos internos (IDs, nomes de tabelas, etc.)`;

      const result = await callAI(LOVABLE_API_KEY, systemPrompt, message);

      await supabase.from('strategy_chat_messages').insert({
        project_id: projectId,
        role: 'assistant',
        content: result
      });

      return new Response(JSON.stringify({ success: true, message: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTION: Run full pipeline with proper orchestration
    // ═══════════════════════════════════════════════════════════════════════════
    if (action === 'run_pipeline') {
      const { project, memory: initialMemory } = await getLatestMemory(supabase, projectId);

      await supabase.from('strategy_projects').update({ status: 'processing' }).eq('id', projectId);

      // Create pending executions for all agents
      const executions = [];
      for (const agentKey of AGENT_ORDER) {
        const agent = AGENT_DEFINITIONS[agentKey];
        const deps = AGENT_DEPENDENCIES[agentKey] || [];
        const { data: exec } = await supabase
          .from('strategy_agent_executions')
          .insert({
            project_id: projectId,
            agent_type: agentKey,
            agent_name: agent.name,
            status: 'pending',
            input_data: { dependencies: deps }
          })
          .select()
          .single();
        executions.push({ key: agentKey, id: exec!.id });
      }

      // Execute agents sequentially, RE-READING memory from DB before each agent
      for (const exec of executions) {
        const agent = AGENT_DEFINITIONS[exec.key];
        const startTime = Date.now();

        // Mark as running
        await supabase
          .from('strategy_agent_executions')
          .update({ status: 'running', input_data: { started_at: new Date().toISOString() } })
          .eq('id', exec.id);

        try {
          // *** CRITICAL: Re-read latest memory from DB before each agent ***
          const { memory: latestMemory } = await getLatestMemory(supabase, projectId);

          // Log dependency status
          const deps = AGENT_DEPENDENCIES[exec.key] || [];
          const availableDeps = deps.filter(d => latestMemory[d]);
          const missingDeps = deps.filter(d => !latestMemory[d]);
          console.log(`🤖 ${agent.name}: deps=${deps.join(',')}, available=${availableDeps.join(',')}, missing=${missingDeps.join(',')}`);

          // Build context-rich prompt with dependency injection
          const userPrompt = buildAgentPrompt(exec.key, project.descricao_negocio, latestMemory);

          const rawResult = await callAI(LOVABLE_API_KEY, agent.systemPrompt, userPrompt);
          const parsedResult = extractJSON(rawResult);
          const duration = Date.now() - startTime;

          // Update execution record
          await supabase
            .from('strategy_agent_executions')
            .update({
              status: 'completed',
              output_data: parsedResult,
              duration_ms: duration
            })
            .eq('id', exec.id);

          // Save artifact + version history
          await saveArtifactWithHistory(supabase, projectId, exec.id, exec.key, agent.name, parsedResult);

          // Update memory IMMEDIATELY so next agent can read it
          const updatedMemory = { ...latestMemory, [exec.key]: parsedResult };
          await supabase
            .from('strategy_projects')
            .update({ strategic_memory: updatedMemory })
            .eq('id', projectId);

          console.log(`✅ ${agent.name} concluído em ${duration}ms`);

        } catch (error: any) {
          console.error(`❌ ${agent.name} falhou: ${error.message}`);
          await supabase
            .from('strategy_agent_executions')
            .update({ status: 'failed', error_message: error.message, duration_ms: Date.now() - startTime })
            .eq('id', exec.id);
          // Continue with next agent — it will work with whatever memory is available
        }
      }

      await supabase.from('strategy_projects').update({ status: 'completed' }).eq('id', projectId);

      return new Response(JSON.stringify({ success: true, message: 'Pipeline concluído' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Ação desconhecida: ${action}`);

  } catch (error: any) {
    console.error('Strategy Engine Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: error.message.includes('Rate limit') ? 429 : error.message.includes('Créditos') ? 402 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
