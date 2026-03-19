import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AGENT_DEFINITIONS: Record<string, { name: string; type: string; systemPrompt: string }> = {
  vox: {
    name: 'Vox Agent',
    type: 'specialist',
    systemPrompt: `Você é o VOX AGENT, especialista em extrair insights da voz do cliente.
Analise a descrição do negócio e a memória estratégica disponível.
Retorne um JSON com:
{
  "dores": ["lista de dores do público"],
  "desejos": ["lista de desejos"],
  "objecoes": ["lista de objeções comuns"],
  "frases_literais": ["frases que o público usaria"],
  "padroes_emocionais": ["padrões emocionais identificados"],
  "linguagem_recorrente": ["termos e expressões recorrentes"]
}
Seja específico e baseado no contexto do negócio. Retorne APENAS o JSON válido.`
  },
  cipher: {
    name: 'Cipher Agent',
    type: 'specialist',
    systemPrompt: `Você é o CIPHER AGENT, especialista em inteligência competitiva.
Analise o mercado do negócio descrito e retorne um JSON com:
{
  "promessas_dominantes": ["promessas mais usadas no mercado"],
  "mecanismos_concorrentes": ["mecanismos/métodos usados por concorrentes"],
  "angulos_anuncio": ["ângulos de anúncio comuns"],
  "padroes_posicionamento": ["como concorrentes se posicionam"],
  "lacunas_estrategicas": ["oportunidades não exploradas"]
}
Seja específico ao nicho. Retorne APENAS o JSON válido.`
  },
  positioning: {
    name: 'Positioning Strategist',
    type: 'specialist',
    systemPrompt: `Você é o POSITIONING STRATEGIST. Com base nos insights do Vox e Cipher, crie o posicionamento estratégico.
Retorne um JSON com:
{
  "icp": { "descricao": "", "demografico": "", "psicografico": "", "comportamental": "" },
  "problema_central": "",
  "resultado_desejado": "",
  "mecanismo_unico": "",
  "big_idea": "",
  "estrutura_oferta": { "principal": "", "bonus": [], "garantia": "" },
  "diferenciacao": ""
}
Retorne APENAS o JSON válido.`
  },
  funnel: {
    name: 'Funnel Architect',
    type: 'specialist',
    systemPrompt: `Você é o FUNNEL ARCHITECT. Com base no posicionamento, desenhe o funil de marketing.
Retorne um JSON com:
{
  "fontes_trafego": [{ "canal": "", "estrategia": "", "investimento_sugerido": "" }],
  "etapas_funil": [{ "nome": "", "objetivo": "", "metricas": [], "ativos": [] }],
  "logica_conversao": "",
  "kpis": [{ "metrica": "", "meta": "" }]
}
Retorne APENAS o JSON válido.`
  },
  vsl: {
    name: 'VSL Writer',
    type: 'specialist',
    systemPrompt: `Você é o VSL WRITER. Crie um roteiro completo de Video Sales Letter.
Retorne um JSON com:
{
  "hook": { "texto": "", "duracao_estimada": "" },
  "problema": { "texto": "", "duracao_estimada": "" },
  "descoberta": { "texto": "", "duracao_estimada": "" },
  "mecanismo": { "texto": "", "duracao_estimada": "" },
  "prova": { "texto": "", "duracao_estimada": "" },
  "oferta": { "texto": "", "duracao_estimada": "" },
  "cta": { "texto": "", "duracao_estimada": "" },
  "duracao_total_estimada": ""
}
Use a linguagem do cliente (Vox) e o posicionamento definido. Retorne APENAS o JSON válido.`
  },
  landing_page: {
    name: 'Landing Page Builder',
    type: 'specialist',
    systemPrompt: `Você é o LANDING PAGE BUILDER. Crie a estrutura completa da página de vendas.
Retorne um JSON com:
{
  "sections": [
    { "tipo": "hero", "headline": "", "subheadline": "", "cta_text": "" },
    { "tipo": "problema", "titulo": "", "conteudo": "" },
    { "tipo": "solucao", "titulo": "", "conteudo": "" },
    { "tipo": "mecanismo", "titulo": "", "conteudo": "" },
    { "tipo": "prova", "titulo": "", "items": [] },
    { "tipo": "depoimentos", "titulo": "", "depoimentos": [{ "nome": "", "texto": "" }] },
    { "tipo": "oferta", "titulo": "", "preco": "", "bonus": [], "garantia": "" },
    { "tipo": "faq", "perguntas": [{ "pergunta": "", "resposta": "" }] },
    { "tipo": "cta_final", "headline": "", "cta_text": "" }
  ]
}
Retorne APENAS o JSON válido.`
  },
  creative: {
    name: 'Creative Strategist',
    type: 'specialist',
    systemPrompt: `Você é o CREATIVE STRATEGIST. Crie conceitos de criativos para anúncios.
Retorne um JSON com:
{
  "hooks": [{ "texto": "", "tipo": "", "plataforma": "" }],
  "conceitos_criativos": [{ "nome": "", "formato": "", "descricao": "", "roteiro": "" }],
  "angulos_campanha": [{ "angulo": "", "publico_alvo": "", "mensagem_chave": "" }],
  "ideias_anuncios": [{ "titulo": "", "formato": "", "copy": "", "cta": "" }]
}
Retorne APENAS o JSON válido.`
  },
  email: {
    name: 'Email Engine',
    type: 'specialist',
    systemPrompt: `Você é o EMAIL ENGINE. Crie sequências de email marketing.
Retorne um JSON com:
{
  "sequencias": [
    {
      "tipo": "boas_vindas",
      "emails": [{ "assunto": "", "preview": "", "corpo": "", "cta": "", "delay_dias": 0 }]
    },
    {
      "tipo": "nutricao",
      "emails": [{ "assunto": "", "preview": "", "corpo": "", "cta": "", "delay_dias": 0 }]
    },
    {
      "tipo": "quebra_objecoes",
      "emails": [{ "assunto": "", "preview": "", "corpo": "", "cta": "", "delay_dias": 0 }]
    },
    {
      "tipo": "conversao",
      "emails": [{ "assunto": "", "preview": "", "corpo": "", "cta": "", "delay_dias": 0 }]
    }
  ]
}
Use a linguagem do cliente. Retorne APENAS o JSON válido.`
  },
  reel: {
    name: 'Reel Writer',
    type: 'specialist',
    systemPrompt: `Você é o REEL WRITER. Crie scripts para vídeos curtos (Reels/TikTok/Shorts).
Retorne um JSON com:
{
  "scripts": [
    {
      "titulo": "",
      "duracao": "",
      "hook": { "texto": "", "duracao": "" },
      "desenvolvimento": { "texto": "", "duracao": "" },
      "cta": { "texto": "", "duracao": "" },
      "instrucoes_visuais": "",
      "musica_sugerida": ""
    }
  ]
}
Crie pelo menos 5 scripts variados. Retorne APENAS o JSON válido.`
  }
};

const VALIDATOR_DEFINITIONS: Record<string, { name: string; systemPrompt: string }> = {
  clareza: {
    name: 'Validador de Clareza',
    systemPrompt: `Avalie se a mensagem/artefato está clara e compreensível. Retorne JSON:
{ "pontuacao": 0-100, "diagnostico": "", "sugestoes": [""] }`
  },
  especificidade: {
    name: 'Validador de Especificidade',
    systemPrompt: `Avalie se as mensagens são específicas (não genéricas). Retorne JSON:
{ "pontuacao": 0-100, "diagnostico": "", "sugestoes": [""] }`
  },
  voc: {
    name: 'Validador de VOC',
    systemPrompt: `Avalie se a comunicação reflete a linguagem real do cliente. Retorne JSON:
{ "pontuacao": 0-100, "diagnostico": "", "sugestoes": [""] }`
  },
  diferenciacao: {
    name: 'Validador de Diferenciação',
    systemPrompt: `Avalie se a proposta se diferencia dos concorrentes. Retorne JSON:
{ "pontuacao": 0-100, "diagnostico": "", "sugestoes": [""] }`
  },
  consistencia: {
    name: 'Validador de Consistência',
    systemPrompt: `Avalie se todos os ativos seguem o mesmo posicionamento. Retorne JSON:
{ "pontuacao": 0-100, "diagnostico": "", "sugestoes": [""] }`
  }
};

const AGENT_ORDER = ['vox', 'cipher', 'positioning', 'funnel', 'vsl', 'landing_page', 'creative', 'email', 'reel'];

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
  // Try to extract JSON from markdown code blocks or raw text
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1].trim());
  }
  return JSON.parse(text.trim());
}

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

    const { action, projectId, agentType, message, content } = await req.json();

    // ACTION: Execute single agent
    if (action === 'execute_agent') {
      const agent = AGENT_DEFINITIONS[agentType];
      if (!agent) throw new Error(`Agente desconhecido: ${agentType}`);

      // Get project memory
      const { data: project } = await supabase
        .from('strategy_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (!project) throw new Error('Projeto não encontrado');

      // Create execution record
      const { data: execution } = await supabase
        .from('strategy_agent_executions')
        .insert({
          project_id: projectId,
          agent_type: agentType,
          agent_name: agent.name,
          status: 'running',
          input_data: { memory: project.strategic_memory, descricao: project.descricao_negocio }
        })
        .select()
        .single();

      const startTime = Date.now();

      try {
        const userPrompt = `
DESCRIÇÃO DO NEGÓCIO:
${project.descricao_negocio}

MEMÓRIA ESTRATÉGICA ATUAL:
${JSON.stringify(project.strategic_memory, null, 2)}

Execute sua análise agora.`;

        const rawResult = await callAI(LOVABLE_API_KEY, agent.systemPrompt, userPrompt);
        const parsedResult = extractJSON(rawResult);
        const duration = Date.now() - startTime;

        // Update execution
        await supabase
          .from('strategy_agent_executions')
          .update({
            status: 'completed',
            output_data: parsedResult,
            duration_ms: duration
          })
          .eq('id', execution!.id);

        // Update strategic memory
        const updatedMemory = { ...((project.strategic_memory as any) || {}), [agentType]: parsedResult };
        await supabase
          .from('strategy_projects')
          .update({ strategic_memory: updatedMemory })
          .eq('id', projectId);

        // Create artifact
        await supabase
          .from('strategy_artifacts')
          .insert({
            project_id: projectId,
            execution_id: execution!.id,
            tipo: agentType,
            titulo: agent.name,
            conteudo: parsedResult,
            status: 'completed'
          });

        return new Response(JSON.stringify({
          success: true,
          execution_id: execution!.id,
          result: parsedResult,
          duration_ms: duration
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

    // ACTION: Validate artifact
    if (action === 'validate') {
      const { validatorType, artifactContent } = await req.json();
      const validator = VALIDATOR_DEFINITIONS[validatorType];
      if (!validator) throw new Error(`Validador desconhecido: ${validatorType}`);

      const rawResult = await callAI(
        LOVABLE_API_KEY,
        validator.systemPrompt,
        `Conteúdo a validar:\n${JSON.stringify(artifactContent, null, 2)}`
      );
      const result = extractJSON(rawResult);

      return new Response(JSON.stringify({ success: true, validation: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: Chat with orchestrator
    if (action === 'chat') {
      const { data: project } = await supabase
        .from('strategy_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      // Save user message
      await supabase.from('strategy_chat_messages').insert({
        project_id: projectId,
        role: 'user',
        content: message
      });

      const systemPrompt = `Você é o Orchestrator do Motor de Estratégia de Marketing.
Você coordena agentes especializados para criar estratégias completas de marketing.

Projeto atual: ${project?.nome}
Descrição: ${project?.descricao_negocio}
Memória Estratégica: ${JSON.stringify(project?.strategic_memory || {})}

Responda de forma concisa e estratégica. Se o usuário pedir para executar agentes, indique quais agentes serão acionados.
Se pedir ajustes, sugira quais artefatos precisam ser revisados.
Seja proativo em sugerir próximos passos.`;

      // Get chat history
      const { data: chatHistory } = await supabase
        .from('strategy_chat_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
        .limit(20);

      const messages = (chatHistory || []).map((m: any) => ({
        role: m.role,
        content: m.content
      }));

      const result = await callAI(LOVABLE_API_KEY, systemPrompt, message);

      // Save assistant message
      await supabase.from('strategy_chat_messages').insert({
        project_id: projectId,
        role: 'assistant',
        content: result
      });

      return new Response(JSON.stringify({ success: true, message: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: Run full pipeline
    if (action === 'run_pipeline') {
      const { data: project } = await supabase
        .from('strategy_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (!project) throw new Error('Projeto não encontrado');

      await supabase.from('strategy_projects').update({ status: 'processing' }).eq('id', projectId);

      // Create pending executions for all agents
      const executions = [];
      for (const agentKey of AGENT_ORDER) {
        const agent = AGENT_DEFINITIONS[agentKey];
        const { data: exec } = await supabase
          .from('strategy_agent_executions')
          .insert({
            project_id: projectId,
            agent_type: agentKey,
            agent_name: agent.name,
            status: 'pending'
          })
          .select()
          .single();
        executions.push({ key: agentKey, id: exec!.id });
      }

      // Execute agents sequentially
      let memory = (project.strategic_memory as any) || {};

      for (const exec of executions) {
        const agent = AGENT_DEFINITIONS[exec.key];
        const startTime = Date.now();

        await supabase
          .from('strategy_agent_executions')
          .update({ status: 'running' })
          .eq('id', exec.id);

        try {
          const userPrompt = `
DESCRIÇÃO DO NEGÓCIO:
${project.descricao_negocio}

MEMÓRIA ESTRATÉGICA ATUAL:
${JSON.stringify(memory, null, 2)}

Execute sua análise agora.`;

          const rawResult = await callAI(LOVABLE_API_KEY, agent.systemPrompt, userPrompt);
          const parsedResult = extractJSON(rawResult);
          const duration = Date.now() - startTime;

          memory[exec.key] = parsedResult;

          await supabase
            .from('strategy_agent_executions')
            .update({ status: 'completed', output_data: parsedResult, duration_ms: duration })
            .eq('id', exec.id);

          await supabase
            .from('strategy_artifacts')
            .insert({
              project_id: projectId,
              execution_id: exec.id,
              tipo: exec.key,
              titulo: agent.name,
              conteudo: parsedResult,
              status: 'completed'
            });

          // Update memory after each agent
          await supabase
            .from('strategy_projects')
            .update({ strategic_memory: memory })
            .eq('id', projectId);

        } catch (error: any) {
          await supabase
            .from('strategy_agent_executions')
            .update({ status: 'failed', error_message: error.message, duration_ms: Date.now() - startTime })
            .eq('id', exec.id);
          // Continue with next agent
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
