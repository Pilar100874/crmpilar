import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const KB_STOP_WORDS = new Set([
  "a", "o", "os", "as", "um", "uma", "uns", "umas", "de", "da", "do", "das", "dos", "e", "ou", "que", "para",
  "por", "com", "sem", "sobre", "qual", "quais", "como", "onde", "quando", "isso", "essa", "esse", "esta", "este",
  "tem", "temos", "ser", "sao", "são", "eh", "é", "na", "no", "nas", "nos", "ao", "aos", "à", "às", "paper", "papel",
  "posso", "usar", "fazer", "fabricar", "sugere", "sugerir", "preciso", "quero", "gostaria", "indica", "indicar", "seria"
]);

const normalizeForSearch = (value: string = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const tokenizeForSearch = (value: string = "") =>
  normalizeForSearch(value)
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);

const normalizeSearchToken = (term: string) => {
  if (!term) return "";
  if (term.endsWith("oes") && term.length > 5) return `${term.slice(0, -3)}ao`;
  if (term.endsWith("ais") && term.length > 5) return `${term.slice(0, -3)}al`;
  if (term.endsWith("eis") && term.length > 5) return `${term.slice(0, -3)}el`;
  if (term.endsWith("is") && term.length > 4) return `${term.slice(0, -2)}l`;
  if (term.endsWith("s") && !term.endsWith("ss") && term.length > 4) return term.slice(0, -1);
  return term;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildKbSearchTerms = (message: string = "") =>
  Array.from(
    new Set(
      tokenizeForSearch(message)
        .map(normalizeSearchToken)
        .filter((term) => term.length >= 3 && !KB_STOP_WORDS.has(term))
    )
  );

const levenshteinDistance = (a: string, b: string) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = Array.from({ length: b.length + 1 }, (_, row) =>
    Array.from({ length: a.length + 1 }, (_, col) => (row === 0 ? col : col === 0 ? row : 0))
  );

  for (let row = 1; row <= b.length; row++) {
    for (let col = 1; col <= a.length; col++) {
      const cost = a[col - 1] === b[row - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost,
      );
    }
  }

  return matrix[b.length][a.length];
};

const isFuzzyTokenMatch = (term: string, candidate: string) => {
  if (!term || !candidate) return false;
  if (term === candidate) return true;
  if (term.length < 5 || candidate.length < 5) return false;
  if (term.includes(candidate) || candidate.includes(term)) return true;
  if (Math.abs(term.length - candidate.length) > 2) return false;

  const maxDistance = Math.max(term.length, candidate.length) >= 9 ? 2 : 1;
  return levenshteinDistance(term, candidate) <= maxDistance;
};

const splitKbIntoSections = (text: string) => {
  const cleanText = text?.trim() || "";
  if (!cleanText) return [];

  const markdownSections = cleanText
    .split(/\n(?=###\s)/g)
    .map((section) => section.trim())
    .filter(Boolean);

  if (markdownSections.length > 1) return markdownSections;

  const blocks = cleanText
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block, index) =>
    [blocks[index - 1], block, blocks[index + 1]].filter(Boolean).join("\n\n")
  );
};

const extractRelevantKbSnippet = (text: string, fileName: string, searchTerms: string[]) => {
  const cleanText = text?.trim() || "";
  if (!cleanText) return "";

  if (!searchTerms.length) {
    return cleanText.substring(0, 2000).trim();
  }

  const normalizedFileName = normalizeForSearch(fileName);
  const sections = splitKbIntoSections(cleanText);

  const scoredSections = sections
    .map((section) => {
      const normalizedSection = normalizeForSearch(section);
      const sectionTokens = Array.from(new Set(tokenizeForSearch(section).map(normalizeSearchToken)));
      const heading = section.split("\n")[0] || "";
      const normalizedHeading = normalizeForSearch(heading);
      const headingTokens = Array.from(new Set(tokenizeForSearch(heading).map(normalizeSearchToken)));
      let score = 0;

      for (const term of searchTerms) {
        const exactMatches = normalizedSection.match(new RegExp(`\\b${escapeRegExp(term)}\\b`, "g"));
        if (exactMatches?.length) {
          score += exactMatches.length * (term.length >= 5 ? 5 : 3);
        } else if (sectionTokens.some((token) => isFuzzyTokenMatch(term, token))) {
          score += term.length >= 7 ? 4 : 2;
        } else if (sectionTokens.some((token) => isFuzzyTokenMatch(term, token))) {
          score += term.length >= 7 ? 4 : 2;
        }

        if (
          normalizedHeading.includes(term) ||
          headingTokens.some((token) => isFuzzyTokenMatch(term, token))
        ) {
          score += 3;
        }
      }

      if (score === 0 && searchTerms.some((term) => normalizedFileName.includes(term))) {
        score = 1;
      }

      return { section, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.section.length - a.section.length)
    .slice(0, 4)
    .map((item) => item.section.substring(0, 2400).trim());

  if (scoredSections.length) {
    return Array.from(new Set(scoredSections)).join("\n\n");
  }

  if (searchTerms.some((term) => normalizedFileName.includes(term))) {
    return cleanText.substring(0, 2000).trim();
  }

  return "";
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { agent_id, mensagem_cliente, historico_chat, conversation_id, modo_privado, contexto_chat_cliente, cnpj_cliente } = await req.json();

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

    // Se for orquestrador, mesclar capacidades dos sub-agentes
    let subAgents: any[] = [];
    if (agent.tipo_agente === 'orquestrador' && agent.sub_agent_ids?.length) {
      const { data: subs } = await supabase
        .from("chat_agents")
        .select("*")
        .in("id", agent.sub_agent_ids)
        .eq("ativo", true);
      subAgents = subs || [];

      // Mesclar flags dos sub-agentes no agente orquestrador
      for (const sub of subAgents) {
        if (sub.usar_estoque_sistema) agent.usar_estoque_sistema = true;
        if (sub.usar_produtos_importados) agent.usar_produtos_importados = true;
        if (sub.solicitar_cnpj) agent.solicitar_cnpj = true;
        if (sub.gerar_pre_orcamento) agent.gerar_pre_orcamento = true;
        if (sub.acumular_filtros) agent.acumular_filtros = true;
        if (sub.resposta_formato_tabela) agent.resposta_formato_tabela = true;
        if (sub.restringir_base_conhecimento) agent.restringir_base_conhecimento = true;
        // Mesclar API endpoint IDs
        const subApiIds = sub.api_endpoint_ids || [];
        for (const id of subApiIds) {
          if (!(agent.api_endpoint_ids || []).includes(id)) {
            agent.api_endpoint_ids = [...(agent.api_endpoint_ids || []), id];
          }
        }
        // Mesclar config de endpoints
        const subConfig = sub.api_endpoint_config || {};
        agent.api_endpoint_config = { ...(agent.api_endpoint_config || {}), ...subConfig };
        // Mesclar KB interna
        if (sub.knowledge_base_type === 'interna' && sub.knowledge_base_internal_data?.length) {
          agent.knowledge_base_internal_data = [
            ...(agent.knowledge_base_internal_data || []),
            ...sub.knowledge_base_internal_data,
          ];
          if (agent.knowledge_base_type === 'nenhuma') agent.knowledge_base_type = 'interna';
        }
        // Marcar para herdar KB externa (arquivos) dos sub-agentes
        if (sub.knowledge_base_type === 'externa') {
          if (agent.knowledge_base_type === 'nenhuma') agent.knowledge_base_type = 'externa';
          (agent as any)._inheritedKbAgentIds = [
            ...((agent as any)._inheritedKbAgentIds || []),
            sub.id,
          ];
        }
        // Mesclar regras de busca
        if (sub.regras_busca_personalizada?.trim()) {
          agent.regras_busca_personalizada = (agent.regras_busca_personalizada || '') + '\n' + sub.regras_busca_personalizada;
        }
      }
    }

    // Montar contexto de KB
    let kbContext = "";

    if (agent.knowledge_base_type === "interna" && agent.knowledge_base_internal_data?.length) {
      const items = agent.knowledge_base_internal_data;
      kbContext = "\n\n--- BASE DE CONHECIMENTO ---\n" + items.join("\n\n") + "\n--- FIM DA BASE ---\n";
    }

    if (agent.knowledge_base_type === "externa" || (agent as any)._inheritedKbAgentIds?.length) {
      const kbAgentIds = Array.from(new Set([
        agent_id,
        ...(((agent as any)._inheritedKbAgentIds as string[]) || []),
      ]));
      const kbSearchTerms = buildKbSearchTerms(mensagem_cliente);
      const { data: kbFiles } = await supabase
        .from("chat_agent_kb_files")
        .select("storage_path, nome_arquivo, agent_id")
        .in("agent_id", kbAgentIds);

      console.log(`[KB externa] Buscando arquivos para agentes: ${kbAgentIds.join(", ")} -> ${kbFiles?.length || 0} arquivo(s)`);

      if (kbFiles?.length) {
        const relevantSnippets: string[] = [];
        const fallbackSnippets: string[] = [];

        for (const file of kbFiles) {
          try {
            const { data: fileData } = await supabase.storage
              .from("agent-knowledge-base")
              .download(file.storage_path);
            if (fileData) {
              const text = await fileData.text();
              const relevantSnippet = extractRelevantKbSnippet(text, file.nome_arquivo, kbSearchTerms);

              if (relevantSnippet) {
                relevantSnippets.push(`\n[Arquivo: ${file.nome_arquivo}]\n${relevantSnippet}\n`);
              } else if (fallbackSnippets.length < 3) {
                fallbackSnippets.push(`\n[Arquivo: ${file.nome_arquivo}]\n${text.substring(0, 1500)}\n`);
              }
            }
          } catch (e) {
            console.error(`Erro ao ler arquivo ${file.nome_arquivo}:`, e);
          }
        }

        const selectedSnippets = relevantSnippets.length ? relevantSnippets : fallbackSnippets;
        if (selectedSnippets.length) {
          kbContext = "\n\n--- BASE DE CONHECIMENTO (ARQUIVOS) ---\n";
          kbContext += selectedSnippets.join("\n");
          kbContext += "--- FIM DA BASE ---\n";
          console.log(`[KB externa] Termos: ${kbSearchTerms.join(", ") || "nenhum"} | trechos relevantes: ${relevantSnippets.length} | fallback: ${fallbackSnippets.length} | chars: ${kbContext.length}`);
        }
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
        const { data: activeReports } = await supabase
          .from("relatorios_importacao")
          .select("id, nome")
          .eq("estabelecimento_id", agent.estabelecimento_id)
          .eq("ativo", true);

        const reportNameMap: Record<string, string> = {};
        const activeIds: string[] = [];
        if (activeReports?.length) {
          for (const r of activeReports) {
            reportNameMap[r.id] = r.nome || 'Importação';
            activeIds.push(r.id);
          }
        }

        let produtosImportados: any[] = [];
        if (activeIds.length > 0) {
          const { data } = await supabase
            .from("produtos_importados")
            .select("relatorio_importacao_id, nome, quantidade, gramatura, largura, comprimento, tipo, embalagem, numero_folhas, obs")
            .eq("estabelecimento_id", agent.estabelecimento_id)
            .in("relatorio_importacao_id", activeIds)
            .limit(500);
          produtosImportados = data || [];
        }

        if (produtosImportados.length) {
          const cleanVal = (v: any) => {
            if (v === null || v === undefined) return '';
            const s = String(v).trim();
            return (s === '----' || s === '---' || s === '--' || s === '-') ? '' : s;
          };
          const tableData = produtosImportados.map((p: any) => ({
            Origem: reportNameMap[p.relatorio_importacao_id] || 'Desconhecido',
            Nome: cleanVal(p.nome),
            Qtd: cleanVal(p.quantidade),
            Tipo: cleanVal(p.tipo),
            Gramatura: cleanVal(p.gramatura),
            Largura: cleanVal(p.largura),
            Comprimento: cleanVal(p.comprimento),
            Embalagem: cleanVal(p.embalagem),
            Folhas: cleanVal(p.numero_folhas),
            Obs: cleanVal(p.obs),
          }));
          produtosImportadosContext = "\n\n--- PRODUTOS IMPORTADOS DE TERCEIROS (DADOS ESTRUTURADOS) ---\n";
          produtosImportadosContext += "IMPORTANTE: Quando o usuário pedir dados de produtos importados, listas ou qualquer informação tabular, responda OBRIGATORIAMENTE incluindo um bloco JSON com a tag <!--TABLE_DATA_START--> antes e <!--TABLE_DATA_END--> depois. Exemplo:\n";
          produtosImportadosContext += '<!--TABLE_DATA_START-->\n[{"Origem":"Fornecedor X","Nome":"Produto","Qtd":"10"}]\n<!--TABLE_DATA_END-->\n';
          produtosImportadosContext += "A coluna 'Origem' identifica de qual fornecedor/card veio o produto. NUNCA use uma coluna chamada 'secao' ou 'seção'. Use SEMPRE 'Origem' para indicar a procedência.\n";
          produtosImportadosContext += "REGRA CRÍTICA: Use os nomes dos produtos EXATAMENTE como estão nos dados. NÃO adicione prefixos como 'Papel' antes do nome. Se o nome é 'Duplex', mostre 'Duplex', não 'Papel Duplex'.\n";
          produtosImportadosContext += "Se um campo estiver vazio, deixe-o vazio na tabela — NÃO invente valores.\n";
          produtosImportadosContext += "Inclua também texto explicativo antes ou depois da tabela. Filtre os dados conforme o pedido do usuário. Se o usuário pedir todos, inclua TODOS os registros que correspondem, sem resumir ou omitir.\n\n";
          produtosImportadosContext += "Dados disponíveis:\n" + JSON.stringify(tableData) + "\n";
          produtosImportadosContext += "--- FIM PRODUTOS IMPORTADOS ---\n";
        }
      } catch (e) {
        console.error("Erro ao carregar produtos importados:", e);
      }
    }

    // Buscar dados das APIs configuradas (com classificação)
    let apiEstoqueContext = "";
    let apiComprasContext = "";
    let apiContext = "";
    const apiEndpointIds = agent.api_endpoint_ids || [];
    const apiEndpointConfig = agent.api_endpoint_config || {};

    if (apiEndpointIds.length > 0) {
      const { data: endpoints } = await supabase
        .from("api_endpoints")
        .select("*")
        .in("id", apiEndpointIds)
        .eq("active", true);

      if (endpoints?.length) {
        for (const ep of endpoints) {
          try {
            let url = ep.custom_url || `${SUPABASE_URL}/rest/v1/${ep.endpoint_path}`;
            const headers: Record<string, string> = {};
            if (!ep.is_custom) {
              headers["apikey"] = SUPABASE_SERVICE_ROLE_KEY;
              headers["Authorization"] = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
              url = `${SUPABASE_URL}/rest/v1/${ep.query}`;
            }

            // Se for API de compras do cliente e temos um CNPJ, filtrar
            const epConf = apiEndpointConfig[ep.id];
            const epTipo = epConf?.tipo || 'estoque';

            if (epTipo === 'compras_cliente' && cnpj_cliente) {
              // Adicionar filtro de CNPJ na URL se possível
              const separator = url.includes('?') ? '&' : '?';
              url += `${separator}cnpj=eq.${cnpj_cliente}`;
            }

            const apiResp = await fetch(url, { headers });
            if (apiResp.ok) {
              const data = await apiResp.json();
              const dataStr = JSON.stringify(data).substring(0, 15000);
              
              if (epTipo === 'compras_cliente') {
                apiComprasContext += `\n[${ep.name}]: ${dataStr}\n`;
              } else {
                apiEstoqueContext += `\n[${ep.name}]: ${dataStr}\n`;
              }
            }
          } catch (e) {
            console.error(`Erro ao consultar API ${ep.name}:`, e);
          }
        }
      }
    }

    if (apiEstoqueContext) {
      apiContext += "\n\n--- DADOS DE ESTOQUE (APIs) ---\n" + apiEstoqueContext + "--- FIM DADOS DE ESTOQUE ---\n";
    }
    if (apiComprasContext) {
      apiContext += "\n\n--- HISTÓRICO DE COMPRAS DO CLIENTE (APIs) ---\n" + apiComprasContext + "--- FIM HISTÓRICO DE COMPRAS ---\n";
    }

    // Buscar cliente por CNPJ se solicitado
    let clienteContext = "";
    if (agent.solicitar_cnpj && cnpj_cliente) {
      try {
        const cnpjLimpo = cnpj_cliente.replace(/\D/g, '');
        const { data: customer } = await supabase
          .from("customers")
          .select("id, name, phone, email, cnpj_cpf, empresa_nome")
          .eq("estabelecimento_id", agent.estabelecimento_id)
          .or(`cnpj_cpf.eq.${cnpjLimpo},cnpj_cpf.eq.${cnpj_cliente}`)
          .limit(1)
          .maybeSingle();

        if (customer) {
          clienteContext = `\n\n--- CLIENTE IDENTIFICADO ---\nNome: ${customer.name}\nEmpresa: ${customer.empresa_nome || 'N/A'}\nCNPJ: ${cnpj_cliente}\nTelefone: ${customer.phone || 'N/A'}\nEmail: ${customer.email || 'N/A'}\nID: ${customer.id}\n--- FIM CLIENTE ---\n`;

          // Buscar orçamentos anteriores do cliente
          const { data: orcamentos } = await supabase
            .from("orcamentos")
            .select("id, numero, created_at, status, valor_total")
            .eq("cliente_id", customer.id)
            .order("created_at", { ascending: false })
            .limit(10);

          if (orcamentos?.length) {
            let orcContext = "\n--- ÚLTIMOS ORÇAMENTOS/PEDIDOS DO CLIENTE ---\n";
            for (const orc of orcamentos) {
              orcContext += `Orçamento #${orc.numero} | Status: ${orc.status} | Valor: R$ ${orc.valor_total || 0} | Data: ${orc.created_at}\n`;
              
              // Buscar itens do orçamento
              const { data: itens } = await supabase
                .from("orcamento_itens")
                .select("produto_nome, quantidade, valor_unitario, largura, comprimento, gramatura")
                .eq("orcamento_id", orc.id)
                .limit(20);
              
              if (itens?.length) {
                for (const item of itens) {
                  orcContext += `  → ${item.produto_nome} | Qtd: ${item.quantidade} | R$ ${item.valor_unitario}`;
                  if (item.largura) orcContext += ` | Larg: ${item.largura}`;
                  if (item.comprimento) orcContext += ` | Comp: ${item.comprimento}`;
                  if (item.gramatura) orcContext += ` | Gram: ${item.gramatura}`;
                  orcContext += "\n";
                }
              }
            }
            orcContext += "--- FIM DOS ORÇAMENTOS ---\n";
            clienteContext += orcContext;
          }
        } else {
          clienteContext = `\n\n--- CLIENTE NÃO ENCONTRADO ---\nCNPJ informado: ${cnpj_cliente}\nNenhum cliente encontrado com este CNPJ na base de dados.\n--- FIM ---\n`;
        }
      } catch (e) {
        console.error("Erro ao buscar cliente por CNPJ:", e);
      }
    }

    // Montar prompt final
    let systemPrompt = agent.system_prompt || "Você é um assistente útil de atendimento ao cliente.";

    // Se for orquestrador, injetar capacidades dos sub-agentes
    if (agent.tipo_agente === 'orquestrador' && subAgents.length > 0) {
      systemPrompt += "\n\n--- VOCÊ É UM AGENTE ORQUESTRADOR ---\n";
      systemPrompt += "Você combina as capacidades de múltiplos agentes especializados. Analise a pergunta do usuário e use a capacidade mais adequada para responder. Você pode combinar conhecimentos de diferentes áreas na mesma resposta.\n\n";
      systemPrompt += "CAPACIDADES DISPONÍVEIS:\n";
      for (const sub of subAgents) {
        systemPrompt += `\n### ${sub.icone} ${sub.nome}${sub.descricao ? ` — ${sub.descricao}` : ''}\n`;
        if (sub.system_prompt) {
          // Extrair apenas as instruções essenciais do sub-agente (limitar tamanho)
          const subPrompt = sub.system_prompt.substring(0, 2000);
          systemPrompt += `Instruções: ${subPrompt}\n`;
        }
      }
      systemPrompt += "\n--- FIM DAS CAPACIDADES ---\n";

      // Regra de Mesclagem (editável pelo usuário, com fallback padrão)
      const mesclagemAtiva = agent.regra_mesclagem_ativa !== false;
      const mesclagemTexto = (agent.regra_mesclagem && agent.regra_mesclagem.trim())
        || `Quando a pergunta do cliente envolver múltiplas áreas/capacidades, você DEVE:

1. Acionar TODOS os sub-agentes relevantes mentalmente (não apenas um).
2. CONSOLIDAR todas as informações em UMA ÚNICA RESPOSTA COESA, fluida e natural — NUNCA enviar respostas separadas, blocos isolados ou frases tipo "respondendo como agente X / agora como agente Y".
3. Integrar dados de ESTOQUE + CADASTRO + KB em um único raciocínio, respeitando a HIERARQUIA DE FONTES (estoque → cadastro → KB).
4. A resposta final deve parecer vir de UMA única pessoa que sabe tudo, não de vários robôs falando em sequência.
5. Se houver capacidades técnicas + comerciais envolvidas, una os dois lados em uma resposta única (ex.: explicar tecnicamente + já listar opções disponíveis em estoque/cadastro).`;

      if (mesclagemAtiva) {
        systemPrompt += `
--- REGRA DE MESCLAGEM DE RESPOSTAS (OBRIGATÓRIO) ---
${mesclagemTexto}
--- FIM REGRA DE MESCLAGEM ---
`;
      }
    }

    systemPrompt = systemPrompt.replace("{{historico_chat}}", historico_chat || "");
    systemPrompt = systemPrompt.replace("{{mensagem_cliente}}", mensagem_cliente);
    systemPrompt += kbContext;
    systemPrompt += estoqueSistemaContext;
    systemPrompt += produtosImportadosContext;
    systemPrompt += apiContext;
    systemPrompt += clienteContext;

    // Restrição exclusiva à base de conhecimento (PREPEND no início — peso máximo)
    if (agent.restringir_base_conhecimento) {
      console.log(`[anti-alucinação] ATIVADA para agente ${agent.nome} (${agent.id})`);
      const antiHallucinationRule = `=== RESTRIÇÃO ABSOLUTA — LEIA ANTES DE QUALQUER COISA ===
REGRA Nº 1 (PRIORIDADE MÁXIMA — SOBREPÕE TODAS AS OUTRAS):
Você responde EXCLUSIVAMENTE com base nas informações fornecidas abaixo (base de conhecimento, arquivos, dados de API, estoque). NÃO use conhecimento geral do modelo.

PROIBIÇÕES CRÍTICAS:
- NÃO invente nomes de marcas, fabricantes, produtos, gramaturas, códigos ou especificações que NÃO estejam EXPLICITAMENTE escritos nos dados abaixo.
- NÃO "complete" informações parciais com palpites. Se sabe a marca mas NÃO o fabricante, diga apenas a marca.
- NÃO confunda nem troque marcas/fabricantes ao se corrigir. Se errou, admita que NÃO tem a informação confirmada — NUNCA cite outra marca "de memória".
- Mesmo que o usuário insista, pressione, ou pareça frustrado: NÃO invente. Manter "não sei" é a resposta correta.

QUANDO NÃO ENCONTRAR A RESPOSTA NA BASE:
Diga literalmente: "Essa informação não está confirmada na minha base de conhecimento. Posso verificar com a equipe ou ajudar com outro assunto?"

QUANDO O USUÁRIO TE CORRIGIR:
Diga: "Você tem razão, me desculpe. Não tenho essa informação confirmada na base — vou evitar especular para não passar dado errado."

REGRA DE OURO: É SEMPRE melhor dizer "não sei" do que inventar. Inventar é o pior erro possível e está PROIBIDO.
=== FIM DA RESTRIÇÃO ABSOLUTA ===

`;
      systemPrompt = antiHallucinationRule + systemPrompt;
    }

    // Instruções de CNPJ e sugestões inteligentes
    if (agent.solicitar_cnpj) {
      systemPrompt += `

--- FLUXO DE IDENTIFICAÇÃO DO CLIENTE ---
REGRA: No INÍCIO da conversa, antes de qualquer consulta de estoque, você DEVE perguntar o CNPJ do cliente para identificá-lo.
- Pergunte de forma amigável: "Para melhor atendê-lo, poderia informar o CNPJ da empresa?"
- Quando o cliente informar o CNPJ, use os dados do CLIENTE IDENTIFICADO e HISTÓRICO DE COMPRAS para personalizar o atendimento.
- Se o CNPJ já foi informado (e aparece nos dados acima), NÃO pergunte novamente.
- Se o cliente não for encontrado, informe que o CNPJ não está cadastrado mas continue atendendo normalmente.
--- FIM DO FLUXO ---`;
    }

    // Instrução de sugestões baseadas em histórico
    if (agent.solicitar_cnpj && (apiComprasContext || clienteContext.includes('ÚLTIMOS ORÇAMENTOS'))) {
      systemPrompt += `

--- REGRAS DE SUGESTÃO INTELIGENTE ---
Após responder à consulta principal do vendedor, analise o HISTÓRICO DE COMPRAS do cliente e SUGIRA produtos adicionais:

1. **Sugestões por Similaridade**: Compare o que o cliente já comprou com o que temos em estoque. Se encontrar materiais similares (mesma gramatura, tipo próximo, largura compatível), sugira como alternativas.

2. **Motivo da Sugestão**: Para CADA sugestão, explique POR QUE está sugerindo:
   - "O cliente comprou X no passado, temos Y em estoque que é similar"
   - "Com base no consumo anterior de [material], pode se interessar por [alternativa]"
   - "Temos [produto] com gramatura próxima ao que costuma comprar"

3. **Formato**: Apresente as sugestões em um BLOCO SEPARADO após a resposta principal, usando o título "📋 **Sugestões baseadas no histórico do cliente:**"

4. **Calcule Perdas**: Se sugerir um material maior que precisa de corte, informe a perda percentual.

5. **NÃO misture**: Mantenha a resposta à consulta do vendedor SEPARADA das sugestões baseadas em histórico.
--- FIM REGRAS DE SUGESTÃO ---`;
    }

    // Instrução de pré-orçamento
    if (agent.gerar_pre_orcamento) {
      systemPrompt += `

--- REGRAS DE PRÉ-ORÇAMENTO ---
REGRA IMPORTANTE: Durante a conversa, acompanhe todos os itens que o vendedor/cliente demonstrou INTERESSE (perguntou disponibilidade, pediu preço, solicitou quantidade, etc.).

Quando o vendedor/cliente disser algo como "é isso", "pode fechar", "gerar orçamento", "resumo dos itens", "finalizar", "quero esses", ou quando você perceber que a consulta está sendo concluída, gere um RESUMO DE INTERESSE com os itens identificados usando o seguinte formato especial:

<!--PRE_ORDER_START-->
[{"produto":"Nome do Produto","quantidade":"10","gramatura":"120","largura":"700","comprimento":"1000","observacao":"Cliente demonstrou interesse, disponível em estoque"}]
<!--PRE_ORDER_END-->

REGRAS:
- Inclua APENAS itens pelos quais o cliente/vendedor demonstrou interesse real (perguntou, pediu, confirmou)
- NÃO inclua itens apenas mencionados como sugestão se o vendedor não demonstrou interesse
- Preencha os campos que tiver informação, deixe vazio os demais
- Adicione na observação o motivo (disponível em estoque, corte necessário, etc.)
- O vendedor deve poder revisar antes de confirmar
--- FIM PRÉ-ORÇAMENTO ---`;
    }

    // Instrução de busca inteligente com sugestões de alternativas
    const hasCustomRules = agent.regras_busca_personalizada && agent.regras_busca_personalizada.trim().length > 0;
    
    if (hasCustomRules) {
      systemPrompt += "\n\n--- REGRAS DE BUSCA PERSONALIZADAS ---\n" + agent.regras_busca_personalizada + "\n--- FIM DAS REGRAS ---";
    }

    // Modo privado
    if (modo_privado && contexto_chat_cliente) {
      systemPrompt += "\n\n--- CONTEXTO DA CONVERSA COM O CLIENTE ---\n" + contexto_chat_cliente + "\n--- FIM DO CONTEXTO ---\n";
      systemPrompt += "\nIMPORTANTE: Você está conversando com o ATENDENTE (não com o cliente). Ajude o atendente a formular respostas, encontrar informações e resolver dúvidas. Seja direto e objetivo.";
    }

    if (agent.knowledge_base_type === "externa" && kbContext) {
      systemPrompt += "\n\nIMPORTANTE: Responda EXCLUSIVAMENTE com base nos documentos fornecidos na Base de Conhecimento. Se a informação não estiver disponível nos documentos, informe que não possui essa informação.";
    }

    // Instrução de formato tabela
    if (agent.resposta_formato_tabela) {
      systemPrompt += "\n\nREGRA DE FORMATAÇÃO: Sempre que sua resposta contiver dados em formato de lista, tabela, ou múltiplos itens com propriedades (ex: produtos, preços, resultados, comparações, etc.), você DEVE incluir os dados dentro de tags especiais no formato JSON array. Use <!--TABLE_DATA_START--> antes do JSON e <!--TABLE_DATA_END--> depois. Exemplo:\n";
      systemPrompt += "<!--TABLE_DATA_START-->\n[{\"Nome\":\"Item 1\",\"Valor\":\"100\"},{\"Nome\":\"Item 2\",\"Valor\":\"200\"}]\n<!--TABLE_DATA_END-->\n";
      systemPrompt += "Inclua texto explicativo antes ou depois da tabela. Sempre use essa formatação para dados tabulares.";
      systemPrompt += "\nIMPORTANTE: NÃO inclua as tags <!--TABLE_DATA_START--> e <!--TABLE_DATA_END--> quando não houver dados para mostrar (array vazio). Só use as tags quando tiver dados reais para apresentar.";
    }

    // Regra de fidelidade aos dados
    if (estoqueSistemaContext || produtosImportadosContext || apiContext) {
      systemPrompt += "\n\n--- REGRA DE FIDELIDADE AOS DADOS ---\n";
      systemPrompt += "REGRA CRÍTICA: Você DEVE basear suas respostas, sugestões e menções EXCLUSIVAMENTE nos dados reais fornecidos acima. ";
      systemPrompt += "NÃO mencione tipos de materiais, categorias, formatos ou produtos que NÃO existam nos dados disponíveis. ";
      systemPrompt += "Exemplo: só mencione 'bobinas' se existirem bobinas nos dados; só mencione 'pacotes' se existirem pacotes. ";
      systemPrompt += "Na saudação inicial, NÃO liste tipos de produtos — apenas se apresente e pergunte como pode ajudar. ";
      systemPrompt += "Descubra os tipos disponíveis analisando os dados fornecidos e use APENAS esses tipos nas suas respostas.\n";
      systemPrompt += "--- FIM DA REGRA DE FIDELIDADE ---";
    }

    // Hierarquia obrigatória de fontes de dados
    if (estoqueSistemaContext || produtosImportadosContext || kbContext) {
      systemPrompt += `

--- HIERARQUIA OBRIGATÓRIA DE FONTES (PRIORIDADE DE SUGESTÃO) ---
Ao recomendar, sugerir ou listar papéis/produtos para o cliente, você DEVE seguir RIGOROSAMENTE esta ordem de prioridade:

1️⃣ PRIMEIRO — ESTOQUE DO SISTEMA (disponibilidade imediata):
   • Sempre comece sugerindo papéis/produtos que estão atualmente em ESTOQUE no sistema.
   • Estes têm prioridade ABSOLUTA porque podem ser entregues imediatamente.
   • Sinalize claramente: "Temos em estoque: ..." ou "Disponível agora: ..."

2️⃣ SEGUNDO — PRODUTOS CADASTRADOS (sem estoque imediato, mas no catálogo):
   • Caso o item solicitado não esteja em estoque, sugira papéis/produtos do CADASTRO de produtos importados/cadastrados.
   • Sinalize: "Temos no catálogo (sob encomenda): ..." ou "Cadastrado mas sem estoque imediato: ..."

3️⃣ POR ÚLTIMO — BASE DE CONHECIMENTO (informação técnica/genérica):
   • SOMENTE quando o cliente pedir explicações técnicas, especificações, ou quando NÃO houver opção equivalente em estoque nem em cadastro, use a BASE DE CONHECIMENTO.
   • A base de conhecimento serve para EXPLICAR características técnicas, NÃO para substituir produtos reais.
   • Sinalize: "Como referência técnica: ..." ou "Informação técnica complementar: ..."

REGRA DE OURO: NUNCA recomende um papel da base de conhecimento se houver opção equivalente em estoque ou cadastrado. NUNCA misture as três fontes sem deixar claro de onde vem cada sugestão.
--- FIM DA HIERARQUIA DE FONTES ---`;

      // Sugestão proativa de produtos disponíveis (editável pelo usuário, com fallback padrão)
      const sugestaoAtiva = agent.regra_sugestao_ativa !== false;
      const sugestaoTexto = (agent.regra_sugestao_proativa && agent.regra_sugestao_proativa.trim())
        || `SEMPRE que o cliente mencionar um TIPO de aplicação, USO, INDÚSTRIA, SEGMENTO, NECESSIDADE ou PRODUTO (ex.: "embalagem de pasta de dente", "caixa de remédio", "papel para impressão", "cartão de visita", "rótulo de cosmético"), você DEVE:

1. ANTES de explicar características técnicas, BUSCAR ATIVAMENTE no ESTOQUE e no CADASTRO de produtos por papéis/itens compatíveis com a aplicação mencionada.
2. APRESENTAR opções concretas reais já na PRIMEIRA resposta, com SKU/código, gramatura, largura e preço quando disponíveis.
3. Use o formato:
   "💡 OPÇÕES DISPONÍVEIS PARA SUA NECESSIDADE:
   • [EM ESTOQUE] Produto X — gramatura, largura, preço
   • [EM ESTOQUE] Produto Y — gramatura, largura, preço
   • [CATÁLOGO/SOB ENCOMENDA] Produto Z — gramatura, largura"
4. Só DEPOIS de listar as opções concretas, adicione (se necessário) breve explicação técnica.
5. Se NÃO houver match exato no estoque/catálogo, mostre os MAIS PRÓXIMOS disponíveis e sinalize: "Não temos exatamente esse, mas estas opções se aproximam:"
6. NUNCA responda apenas com teoria/explicação técnica quando há produtos reais que atendem.`;

      if (sugestaoAtiva) {
        systemPrompt += `

--- SUGESTÃO PROATIVA DE OPÇÕES (OBRIGATÓRIO) ---
${sugestaoTexto}
--- FIM SUGESTÃO PROATIVA ---`;
      }
    }

    // Filtros progressivos
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
    const groundingContext = [kbContext, estoqueSistemaContext, produtosImportadosContext, apiContext, clienteContext]
      .filter((part) => Boolean(part && part.trim()))
      .join("\n\n")
      .trim();
    const isKnowledgeRestricted = Boolean(agent.restringir_base_conhecimento);
    const hasOperationalDataContext = Boolean(
      estoqueSistemaContext?.trim() ||
      produtosImportadosContext?.trim() ||
      apiContext?.trim()
    );
    const safeKnowledgeFallback = "Essa informação não está confirmada na minha base de conhecimento. Posso verificar com a equipe ou ajudar com outro assunto?";
    const shouldSkipHumanization = (text: string) =>
      /não está confirmada na minha base de conhecimento|não tenho essa informação confirmada na base/i.test(text);
    const stripNonGroundedOperationalClauses = (text: string) => {
      if (hasOperationalDataContext || !text?.trim()) return text;

      const operationalPatterns = [
        /essa informação não está confirmada no meu estoque atual\.?/gi,
        /não consigo confirmar a disponibilidade no meu estoque atual\.?/gi,
        /posso verificar (?:a )?disponibilidade com a equipe[^.!?\n]*[.!?]?/gi,
        /posso verificar com a equipe[^.!?\n]*[.!?]?/gi,
        /se quiser[, ]+posso verificar[^.!?\n]*[.!?]?/gi,
        /ou te ajudar com algum outro modelo[^.!?\n]*[.!?]?/gi,
        /posso te ajudar com algum outro modelo[^.!?\n]*[.!?]?/gi,
      ];

      let sanitized = text;
      for (const pattern of operationalPatterns) {
        sanitized = sanitized.replace(pattern, " ");
      }

      return sanitized
        .replace(/[ \t]{2,}/g, " ")
        .replace(/ ?\n ?/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/\s+([,.;!?])/g, "$1")
        .trim();
    };
    const extractJsonObject = (text: string): { grounded?: boolean; reason?: string } | null => {
      const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
      const candidate = fenced?.[1] || text.match(/\{[\s\S]*\}/)?.[0];
      if (!candidate) return null;
      try {
        return JSON.parse(candidate);
      } catch {
        return null;
      }
    };

    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    if (historico_chat && Array.isArray(historico_chat) && historico_chat.length > 0) {
      messages.push(...historico_chat);
    } else {
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
    let resposta = aiData.choices?.[0]?.message?.content || "Não foi possível gerar uma resposta.";

    if (isKnowledgeRestricted) {
      const respostaOriginal = resposta;
      resposta = stripNonGroundedOperationalClauses(resposta);
      if (resposta !== respostaOriginal) {
        console.log("[anti-alucinação] Removidas cláusulas operacionais não ancoradas da resposta.");
      }

      const respostaSemBlocos = resposta
        .replace(/<!--PRE_ORDER_START-->[\s\S]*?<!--PRE_ORDER_END-->/g, "")
        .replace(/<!--TABLE_DATA_START-->[\s\S]*?<!--TABLE_DATA_END-->/g, "")
        .trim();

      if (!groundingContext) {
        console.warn("[anti-alucinação] Restrição ativa sem contexto disponível; bloqueando resposta livre.");
        resposta = safeKnowledgeFallback;
      } else if (respostaSemBlocos) {
        try {
          const validationResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                {
                  role: "system",
                  content: `Você é um validador factual TOLERANTE. Sua única função é detectar INVENÇÃO de fatos. Compare a RESPOSTA com o CONTEXTO.

REGRAS DE VALIDAÇÃO (siga RIGOROSAMENTE):

1. grounded=TRUE quando:
   - Os fatos centrais da resposta (nomes de produtos, marcas, fabricantes, especificações, aplicações citadas) APARECEM no contexto, mesmo que com palavras diferentes.
   - A resposta faz inferência razoável a partir de informações presentes no contexto (ex: contexto diz "FineKraft 30-60 g/m² para embalagens de pão" → resposta pode recomendar gramatura específica dentro dessa faixa).
   - A resposta cita um produto/marca/fabricante que aparece no contexto, mesmo que combine informações de seções diferentes do mesmo contexto.
   - A resposta inclui frases conversacionais, perguntas de acompanhamento, ofertas de ajuda, comentários operacionais (verificar estoque, falar com equipe), emojis ou cortesias — IGNORE TUDO ISSO na avaliação.
   - A resposta lista itens, fabricantes ou opções que estão no contexto.
   - A resposta diz que possui informações sobre X e X aparece no contexto.

2. grounded=FALSE APENAS quando:
   - A resposta cita um nome de produto, marca, fabricante ou especificação técnica concreta que NÃO aparece em lugar nenhum do contexto (invenção pura).
   - A resposta afirma um número (gramatura, preço, quantidade) específico que contradiz ou não existe no contexto.
   - A resposta inventa uma certificação, norma ou selo que não está no contexto.

NÃO bloqueie por:
- Falta de menção a "disponibilidade exata" ou "estoque atual"
- Reformulação ou síntese de informações
- Adição de frases de cortesia ou perguntas
- Combinação de informações de diferentes partes do contexto
- Recomendações dentro de faixas mencionadas no contexto

Responda APENAS JSON válido no formato {"grounded": boolean, "reason": string}.`
                },
                {
                  role: "user",
                  content: `[CONTEXTO]\n${groundingContext.substring(0, 30000)}\n\n[RESPOSTA]\n${respostaSemBlocos}`
                }
              ],
              stream: false,
            }),
          });

          if (!validationResponse.ok) {
            const validationError = await validationResponse.text().catch(() => "");
            console.warn("[anti-alucinação] Falha ao validar grounding:", validationResponse.status, validationError);
            resposta = safeKnowledgeFallback;
          } else {
            const validationData = await validationResponse.json();
            const validationText = validationData.choices?.[0]?.message?.content || "";
            const validationJson = extractJsonObject(validationText);
            const isGrounded = validationJson?.grounded === true;

            if (!isGrounded) {
              console.warn("[anti-alucinação] Resposta bloqueada por falta de grounding:", validationJson?.reason || "sem motivo informado");
              resposta = safeKnowledgeFallback;
            }
          }
        } catch (validationError) {
          console.error("[anti-alucinação] Erro na validação de grounding:", validationError);
          resposta = safeKnowledgeFallback;
        }
      }
    }

    // 🗣️ ETAPA DE HUMANIZAÇÃO: se o orquestrador tem um sub-agente Humanizador, passa a resposta por ele
    if (agent.tipo_agente === 'orquestrador' && subAgents.length > 0 && !shouldSkipHumanization(resposta)) {
      const humanizador = subAgents.find((s: any) =>
        s.tipo_agente === 'humanizador' ||
        (s.nome && s.nome.toLowerCase().includes('humanizador')) ||
        s.dominio === 'humanizacao'
      );

      if (humanizador && resposta && resposta.trim().length > 0) {
        try {
          const respostaOriginal = resposta;
          const preservedBlocks: string[] = [];
          let respostaParaHumanizar = resposta;

          respostaParaHumanizar = respostaParaHumanizar.replace(
            /<!--PRE_ORDER_START-->[\s\S]*?<!--PRE_ORDER_END-->/g,
            (match: string) => {
              preservedBlocks.push(match);
              return `[[PRESERVED_${preservedBlocks.length - 1}]]`;
            }
          );
          respostaParaHumanizar = respostaParaHumanizar.replace(
            /<!--TABLE_DATA_START-->[\s\S]*?<!--TABLE_DATA_END-->/g,
            (match: string) => {
              preservedBlocks.push(match);
              return `[[PRESERVED_${preservedBlocks.length - 1}]]`;
            }
          );

          const humanizerResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: humanizador.modelo_ia || "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: humanizador.system_prompt },
                {
                  role: "user",
                  content: `[RESPOSTA_ORIGINAL]\n${respostaParaHumanizar}\n\nReescreva acima em tom humano, natural e amigável. Preserve EXATAMENTE qualquer marcador no formato [[PRESERVED_0]], [[PRESERVED_1]], etc. NÃO troque por [[PRESERVED_N]] nem altere a numeração. Se não houver marcadores, ignore esta instrução. Devolva APENAS o texto humanizado, sem comentários.`
                }
              ],
              stream: false,
            }),
          });

          if (humanizerResponse.ok) {
            const humanData = await humanizerResponse.json();
            const humanizada = humanData.choices?.[0]?.message?.content;
            if (humanizada && humanizada.trim().length > 0) {
              const restoredHumanizada = humanizada.replace(/\[\[PRESERVED_(\d+)\]\]/g, (_: string, idx: string) => {
                return preservedBlocks[parseInt(idx)] || '';
              });

              if (/\[\[PRESERVED_[^\]]+\]\]/i.test(restoredHumanizada)) {
                console.warn("⚠️ Humanizador devolveu marcador inválido, usando resposta original");
                resposta = respostaOriginal;
              } else {
                resposta = restoredHumanizada;
                console.log("✅ Resposta humanizada com sucesso");
              }
            }
          } else {
            console.warn("⚠️ Humanizador falhou, usando resposta original");
          }
        } catch (humErr) {
          console.error("Erro no humanizador (usando resposta original):", humErr);
        }
      }
    }

    // Detectar e extrair pré-orçamento da resposta
    let preOrderData = null;
    const preOrderMatch = resposta.match(/<!--PRE_ORDER_START-->\s*([\s\S]*?)\s*<!--PRE_ORDER_END-->/);
    if (preOrderMatch) {
      try {
        preOrderData = JSON.parse(preOrderMatch[1].trim());
      } catch (e) {
        console.error("Erro ao parsear pré-orçamento:", e);
      }
    }

    // 📝 LACUNAS DA BASE DE CONHECIMENTO
    // Registrar pergunta sem resposta confiável para revisão posterior pelo usuário
    try {
      const respostaIsFallback = /não está confirmada na minha base de conhecimento|não tenho essa informação confirmada na base/i.test(resposta);
      const askedSomething = (mensagem_cliente || "").trim().length >= 4;
      if (askedSomething && respostaIsFallback) {
        const perguntaLimpa = (mensagem_cliente as string).trim().slice(0, 2000);
        const { data: existente } = await supabase
          .from("kb_lacunas")
          .select("id")
          .eq("estabelecimento_id", agent.estabelecimento_id)
          .eq("agent_id", agent.id)
          .eq("status", "pendente")
          .ilike("pergunta", perguntaLimpa)
          .maybeSingle();
        if (!existente) {
          await supabase.from("kb_lacunas").insert({
            estabelecimento_id: agent.estabelecimento_id,
            agent_id: agent.id,
            agent_nome: agent.nome,
            session_id: conversation_id || null,
            pergunta: perguntaLimpa,
            motivo: 'fallback',
            status: 'pendente',
          });
        }
      }
    } catch (lacunaErr) {
      console.warn("[kb_lacunas] Falha ao registrar lacuna:", lacunaErr);
    }

    return new Response(JSON.stringify({
      resposta,
      modo_operacao: agent.modo_operacao,
      agent_nome: agent.nome,
      agent_icone: agent.icone,
      pre_order_data: preOrderData,
      solicitar_cnpj: agent.solicitar_cnpj || false,
      gerar_pre_orcamento: agent.gerar_pre_orcamento || false,
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
