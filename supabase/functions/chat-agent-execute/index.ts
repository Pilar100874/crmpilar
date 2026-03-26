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
          const tableData = produtos.map((p: any) => ({
            Nome: p.nome || '',
            Código: p.codigo || '',
            EAN: p.ean_13 || '',
            'Preço (R$)': p.preco_tabela ? Number(p.preco_tabela).toFixed(2) : '',
            Estoque: p.estoque ?? '',
            Marca: p.marca || '',
            Categoria: p.categoria || '',
            Unidade: p.unidade || '',
          }));
          estoqueSistemaContext = "\n\n--- ESTOQUE DO SISTEMA (DADOS ESTRUTURADOS) ---\n";
          estoqueSistemaContext += "IMPORTANTE: Quando o usuário pedir dados de estoque, produtos, listas ou qualquer informação tabular, responda OBRIGATORIAMENTE incluindo um bloco JSON com a tag <!--TABLE_DATA_START--> antes e <!--TABLE_DATA_END--> depois. Exemplo:\n";
          estoqueSistemaContext += "<!--TABLE_DATA_START-->\n[{\"Nome\":\"Produto\",\"Preço (R$)\":\"10.00\"}]\n<!--TABLE_DATA_END-->\n";
          estoqueSistemaContext += "Inclua também texto explicativo antes ou depois da tabela. Filtre os dados conforme o pedido do usuário. Se o usuário pedir todos, inclua todos.\n\n";
          estoqueSistemaContext += "Dados disponíveis:\n" + JSON.stringify(tableData) + "\n";
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

    // Instrução de busca inteligente com sugestões de alternativas
    // Usa regras personalizadas se existirem, senão usa as padrão
    const hasCustomRules = agent.regras_busca_personalizada && agent.regras_busca_personalizada.trim().length > 0;
    
    if (hasCustomRules) {
      systemPrompt += "\n\n--- REGRAS DE BUSCA PERSONALIZADAS ---\n" + agent.regras_busca_personalizada + "\n--- FIM DAS REGRAS ---";
    } else if (agent.usar_estoque_sistema || agent.usar_produtos_importados || apiEndpointIds.length > 0) {
      systemPrompt += `

--- REGRAS DE BUSCA INTELIGENTE COM SUGESTÕES DE ALTERNATIVAS ---

O estoque contém dois tipos de produtos: **PAPÉIS GRÁFICOS FORMATADOS** (folhas cortadas com largura e comprimento definidos) e **BOBINAS** (rolos com largura definida, sem comprimento fixo — cortados sob demanda). Siga este fluxo OBRIGATÓRIO quando o usuário pedir um produto:

**ETAPA 1 - BUSCA EXATA NO FORMATO PEDIDO:**
Procure nos dados um produto que corresponda EXATAMENTE a todos os critérios (tipo, gramatura, largura, comprimento).
- Se encontrar: apresente e informe "✅ Encontrado exatamente o que você pediu!"

**ETAPA 2 - ALTERNATIVAS NO MESMO FORMATO (±10%):**
Se NÃO encontrar exato:
1. Informe: "❌ Não encontrei o produto exato com essas especificações."
2. Busque alternativas próximas variando ±10% em gramatura, largura e comprimento
3. Priorize manter o tipo de material e variar as dimensões
4. Para cada sugestão, indique a diferença vs. pedido original

**ETAPA 3 - BUSCA CRUZADA GRÁFICO ↔ BOBINA (CONJUGAÇÃO DE CORTE):**
Se o produto pedido é um papel gráfico formatado e não foi encontrado (nem exato nem próximo), VERIFIQUE SE HÁ BOBINAS que possam ser cortadas para atender:

1. **Buscar bobinas do mesmo tipo e gramatura** (ou gramatura ±10%)
2. **Verificar conjugação de corte** — A largura da bobina permite cortar as medidas pedidas?
   - Ex: Pediu folha 50×70cm. Bobina de 70cm de largura → corta folhas de 70×50cm ✅
   - Ex: Pediu folha 50×70cm. Bobina de 100cm → corta 2 folhas de 50cm na largura, comprimento 70cm ✅
   - Ex: Pediu folha 50×70cm. Bobina de 150cm → corta 2×70cm (140cm usados, 10cm perda) ou 3×50cm (150cm, 0 perda)
3. **Calcular a PERDA de corte** para cada opção:
   - Fórmula: Perda = (Largura bobina - (N × medida cortada)) / Largura bobina × 100%
   - Ex: Bobina 105cm cortando 2×50cm = 5cm sobra = 4.76% de perda
   - Ex: Bobina 100cm cortando 2×50cm = 0cm sobra = 0% de perda ✅
4. **Apresentar as opções de corte** ordenadas por menor perda:
   | Bobina | Gramatura | Largura Bobina | Corte | Qtd por largura | Perda | Diferença |

**ETAPA 4 - BUSCA CRUZADA INVERSA (BOBINA → GRÁFICO):**
Se pediram uma bobina e não tem, verificar se há papéis gráficos formatados que atendam (pode ser mais econômico para pequenas quantidades).

**ETAPA 5 - AMPLIAR TOLERÂNCIAS:**
Se nada foi encontrado com ±10%:
1. Amplie para ±20% e depois ±30%
2. Repita a busca em ambos os formatos (gráfico + bobina)
3. Informe: "📌 Os materiais mais próximos disponíveis são:" e liste-os

**ETAPA 6 - PERGUNTAR TOLERÂNCIA AO CLIENTE:**
Após apresentar as alternativas, SEMPRE pergunte:
- "📐 Você aceitaria medidas X% maiores ou menores? (ex: largura 5% maior, gramatura 10% menor)"
- "Posso buscar com uma tolerância diferente?"

**FORMATO DE APRESENTAÇÃO:**
Sempre apresente em formato estruturado:
| Material | Formato | Gramatura | Largura | Comprimento | Perda Corte | Diferença vs Pedido |

**LEGENDA:**
- Formato: "Gráfico" (folha pronta) ou "Bobina→Corte" (requer corte)
- Perda Corte: percentual de material desperdiçado no corte (só para bobinas)
- Diferença: variação de cada especificação vs. pedido original

**REGRA FINAL:** Sempre pergunte: "Alguma dessas opções atende? Posso buscar com outros critérios ou tolerâncias diferentes?"

--- FIM DAS REGRAS DE BUSCA INTELIGENTE ---`;
    }

    // Modo privado: adicionar contexto da conversa com o cliente
    if (modo_privado && contexto_chat_cliente) {
      systemPrompt += "\n\n--- CONTEXTO DA CONVERSA COM O CLIENTE ---\n" + contexto_chat_cliente + "\n--- FIM DO CONTEXTO ---\n";
      systemPrompt += "\nIMPORTANTE: Você está conversando com o ATENDENTE (não com o cliente). Ajude o atendente a formular respostas, encontrar informações e resolver dúvidas. Seja direto e objetivo.";
    }

    if (agent.knowledge_base_type === "externa" && kbContext) {
      systemPrompt += "\n\nIMPORTANTE: Responda EXCLUSIVAMENTE com base nos documentos fornecidos na Base de Conhecimento. Se a informação não estiver disponível nos documentos, informe que não possui essa informação.";
    }

    // Instrução de formato tabela (flag geral do agente)
    if (agent.resposta_formato_tabela) {
      systemPrompt += "\n\nREGRA DE FORMATAÇÃO: Sempre que sua resposta contiver dados em formato de lista, tabela, ou múltiplos itens com propriedades (ex: produtos, preços, resultados, comparações, etc.), você DEVE incluir os dados dentro de tags especiais no formato JSON array. Use <!--TABLE_DATA_START--> antes do JSON e <!--TABLE_DATA_END--> depois. Exemplo:\n";
      systemPrompt += "<!--TABLE_DATA_START-->\n[{\"Nome\":\"Item 1\",\"Valor\":\"100\"},{\"Nome\":\"Item 2\",\"Valor\":\"200\"}]\n<!--TABLE_DATA_END-->\n";
      systemPrompt += "Inclua texto explicativo antes ou depois da tabela. Sempre use essa formatação para dados tabulares.";
    }

    // Filtros progressivos (condicional por agente)
    if (agent.acumular_filtros) {
      systemPrompt += `

--- REGRAS DE FILTRO PROGRESSIVO E MEMÓRIA DE CONVERSA ---

REGRA FUNDAMENTAL: Você DEVE manter um "estado de filtros ativos" mental ao longo da conversa. Siga estas regras rigorosamente:

1. **ACUMULAR FILTROS**: Quando o usuário faz uma nova pergunta com um critério adicional (ex: gramatura, largura, tipo, marca), SEMPRE pergunte se ele deseja ACUMULAR esse novo filtro aos filtros anteriores ou aplicar somente o novo.
   - Exemplo: Se ele perguntou "tem Duplex?" e depois "tem 220 gramas?", pergunte: "Você quer ver produtos Duplex com 220g, ou todos os produtos com 220g?"

2. **LISTAR FILTROS ATIVOS**: Sempre que apresentar resultados filtrados, liste os filtros que estão sendo aplicados no topo da resposta. Ex: "📋 Filtros ativos: Tipo=Duplex | Gramatura=220g | Largura=2160mm"

3. **CONFIRMAR ANTES DE LIMPAR**: Se o usuário fizer uma pergunta que parece ignorar filtros anteriores, pergunte: "Notei que você tinha os filtros [X, Y] ativos. Deseja manter esses filtros e adicionar [Z], ou começar uma nova busca apenas com [Z]?"

4. **RESUMIR O CONTEXTO**: Ao responder, mencione brevemente o que foi perguntado antes para demonstrar que você lembra do histórico.

5. **RESETAR quando pedido**: Se o usuário disser "limpar filtros", "nova busca", "sem filtros" ou similar, limpe todos os filtros e confirme.

Aplique essas regras SEMPRE que houver dados de produtos, estoque, catálogo ou qualquer lista filtrável na conversa.
--- FIM DAS REGRAS DE FILTRO ---`;
    }

    // Chamar Lovable AI
    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    // Adicionar histórico completo (já inclui a mensagem atual do usuário)
    if (historico_chat && Array.isArray(historico_chat) && historico_chat.length > 0) {
      messages.push(...historico_chat);
    } else {
      // Fallback se não houver histórico, adicionar só a mensagem atual
      messages.push({ role: "user", content: mensagem_cliente });
    }

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
