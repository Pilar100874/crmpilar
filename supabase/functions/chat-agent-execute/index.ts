import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { agent_id, mensagem_cliente, historico_chat, conversation_id, modo_privado, contexto_chat_cliente } = await req.json();

    if (!agent_id || !mensagem_cliente) {
      return new Response(JSON.stringify({ error: "agent_id e mensagem_cliente são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar agente
    const { data: agent, error: agentError } = await supabase
      .from("chat_agents")
      .select("*")
      .eq("id", agent_id)
      .eq("ativo", true)
      .single();

    if (agentError || !agent) {
      return new Response(JSON.stringify({ error: "Agente não encontrado ou desativado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Montar contexto de KB
    let kbContext = "";

    if (agent.knowledge_base_type === "interna" && agent.knowledge_base_internal_data?.length) {
      const items = agent.knowledge_base_internal_data;
      kbContext = "\n\n--- BASE DE CONHECIMENTO ---\n" + items.join("\n\n") + "\n--- FIM DA BASE ---\n";
    }

    if (agent.knowledge_base_type === "externa") {
      // Buscar arquivos KB
      const { data: kbFiles } = await supabase
        .from("chat_agent_kb_files")
        .select("storage_path, nome_arquivo")
        .eq("agent_id", agent_id);

      if (kbFiles?.length) {
        kbContext = "\n\n--- BASE DE CONHECIMENTO (ARQUIVOS) ---\n";
        for (const file of kbFiles) {
          try {
            const { data: fileData } = await supabase.storage
              .from("agent-knowledge-base")
              .download(file.storage_path);
            if (fileData) {
              const text = await fileData.text();
              kbContext += `\n[Arquivo: ${file.nome_arquivo}]\n${text.substring(0, 10000)}\n`;
            }
          } catch (e) {
            console.error(`Erro ao ler arquivo ${file.nome_arquivo}:`, e);
          }
        }
        kbContext += "--- FIM DA BASE ---\n";
      }
    }

    // Buscar estoque do sistema se habilitado
    let estoqueSistemaContext = "";
    if (agent.usar_estoque_sistema) {
      try {
        const { data: produtos } = await supabase
          .from("produtos")
          .select("nome, codigo, ean_13, preco_tabela, estoque, marca, descricao, categoria, unidade, foto_url")
          .eq("estabelecimento_id", agent.estabelecimento_id)
          .limit(500);

        if (produtos?.length) {
          estoqueSistemaContext = "\n\n--- ESTOQUE DO SISTEMA ---\n";
          estoqueSistemaContext += "Produtos cadastrados no sistema com informações de estoque e preços:\n\n";
          for (const p of produtos) {
            const parts = [`Nome: ${p.nome}`];
            if (p.codigo) parts.push(`Código: ${p.codigo}`);
            if (p.ean_13) parts.push(`EAN: ${p.ean_13}`);
            if (p.preco_tabela) parts.push(`Preço: R$${Number(p.preco_tabela).toFixed(2)}`);
            if (p.estoque !== null && p.estoque !== undefined) parts.push(`Estoque: ${p.estoque}`);
            if (p.marca) parts.push(`Marca: ${p.marca}`);
            if (p.categoria) parts.push(`Categoria: ${p.categoria}`);
            if (p.unidade) parts.push(`Unidade: ${p.unidade}`);
            if (p.descricao) parts.push(`Desc: ${p.descricao}`);
            estoqueSistemaContext += `• ${parts.join(" | ")}\n`;
          }
          estoqueSistemaContext += "--- FIM ESTOQUE DO SISTEMA ---\n";
        }
      } catch (e) {
        console.error("Erro ao carregar estoque do sistema:", e);
      }
    }

    // Buscar produtos importados de terceiros se habilitado
    let produtosImportadosContext = "";
    if (agent.usar_produtos_importados) {
      try {
        const { data: produtosImportados } = await supabase
          .from("produtos_importados")
          .select("nome, quantidade, gramatura, largura, comprimento, tipo, embalagem, numero_folhas, obs")
          .eq("estabelecimento_id", agent.estabelecimento_id)
          .limit(500);

        if (produtosImportados?.length) {
          produtosImportadosContext = "\n\n--- PRODUTOS IMPORTADOS DE TERCEIROS ---\n";
          produtosImportadosContext += "Use estes dados para responder sobre produtos de fornecedores terceiros:\n\n";
          for (const p of produtosImportados) {
            const parts = [`Nome: ${p.nome}`];
            if (p.quantidade) parts.push(`Qtd: ${p.quantidade}`);
            if (p.tipo) parts.push(`Tipo: ${p.tipo}`);
            if (p.gramatura) parts.push(`Gramatura: ${p.gramatura}`);
            if (p.largura) parts.push(`Largura: ${p.largura}`);
            if (p.comprimento) parts.push(`Comprimento: ${p.comprimento}`);
            if (p.embalagem) parts.push(`Embalagem: ${p.embalagem}`);
            if (p.numero_folhas) parts.push(`Folhas: ${p.numero_folhas}`);
            if (p.obs) parts.push(`Obs: ${p.obs}`);
            produtosImportadosContext += `• ${parts.join(" | ")}\n`;
          }
          produtosImportadosContext += "--- FIM PRODUTOS IMPORTADOS ---\n";
        }
      } catch (e) {
        console.error("Erro ao carregar produtos importados:", e);
      }
    }

    // Buscar dados das APIs configuradas
    let apiContext = "";
    const apiEndpointIds = agent.api_endpoint_ids || [];

    if (apiEndpointIds.length > 0) {
      const { data: endpoints } = await supabase
        .from("api_endpoints")
        .select("*")
        .in("id", apiEndpointIds)
        .eq("active", true);

      if (endpoints?.length) {
        apiContext = "\n\n--- DADOS DE APIs EM TEMPO REAL ---\n";
        for (const ep of endpoints) {
          try {
            let url = ep.custom_url || `${SUPABASE_URL}/rest/v1/${ep.endpoint_path}`;
            
            // Se for endpoint do Supabase, adicionar headers
            const headers: Record<string, string> = {};
            if (!ep.is_custom) {
              headers["apikey"] = SUPABASE_SERVICE_ROLE_KEY;
              headers["Authorization"] = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
              url = `${SUPABASE_URL}/rest/v1/${ep.query}`;
            }

            const apiResp = await fetch(url, { headers });
            if (apiResp.ok) {
              const data = await apiResp.json();
              const dataStr = JSON.stringify(data).substring(0, 15000);
              apiContext += `\n[${ep.name}]: ${dataStr}\n`;
            }
          } catch (e) {
            console.error(`Erro ao consultar API ${ep.name}:`, e);
            apiContext += `\n[${ep.name}]: Erro ao consultar dados\n`;
          }
        }
        apiContext += "--- FIM DOS DADOS ---\n";
      }
    }

    // Montar prompt final
    let systemPrompt = agent.system_prompt || "Você é um assistente útil de atendimento ao cliente.";
    systemPrompt = systemPrompt.replace("{{historico_chat}}", historico_chat || "");
    systemPrompt = systemPrompt.replace("{{mensagem_cliente}}", mensagem_cliente);
    systemPrompt += kbContext;
    systemPrompt += estoqueSistemaContext;
    systemPrompt += produtosImportadosContext;
    systemPrompt += apiContext;

    // Modo privado: adicionar contexto da conversa com o cliente
    if (modo_privado && contexto_chat_cliente) {
      systemPrompt += "\n\n--- CONTEXTO DA CONVERSA COM O CLIENTE ---\n" + contexto_chat_cliente + "\n--- FIM DO CONTEXTO ---\n";
      systemPrompt += "\nIMPORTANTE: Você está conversando com o ATENDENTE (não com o cliente). Ajude o atendente a formular respostas, encontrar informações e resolver dúvidas. Seja direto e objetivo.";
    }

    if (agent.knowledge_base_type === "externa" && kbContext) {
      systemPrompt += "\n\nIMPORTANTE: Responda EXCLUSIVAMENTE com base nos documentos fornecidos na Base de Conhecimento. Se a informação não estiver disponível nos documentos, informe que não possui essa informação.";
    }

    // Chamar Lovable AI
    const messages = [
      { role: "system", content: systemPrompt },
    ];

    // Adicionar histórico se disponível
    if (historico_chat && Array.isArray(historico_chat)) {
      messages.push(...historico_chat);
    }

    messages.push({ role: "user", content: mensagem_cliente });

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: agent.modelo_ia || "google/gemini-3-flash-preview",
        messages,
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione fundos nas configurações." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error(`Erro na IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const resposta = aiData.choices?.[0]?.message?.content || "Não foi possível gerar uma resposta.";

    return new Response(JSON.stringify({
      resposta,
      modo_operacao: agent.modo_operacao,
      agent_nome: agent.nome,
      agent_icone: agent.icone,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("chat-agent-execute error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
