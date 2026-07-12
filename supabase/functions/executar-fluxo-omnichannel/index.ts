import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FlowNode {
  id: string;
  type: string;
  data: {
    type: string;
    label: string;
    config: any;
  };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const reqBody = await req.json();
    const {
      flowId,
      conversationId,
      customerId,
      estabelecimentoId,
      canal,
      triggerSource,
      automationId,
      variaveis,
      contexto,
    } = reqBody;

    console.log("Executando fluxo omnichannel:", {
      flowId, conversationId, customerId, estabelecimentoId, canal, triggerSource, automationId,
      varKeys: variaveis ? Object.keys(variaveis) : [],
    });

    // Buscar o fluxo
    const { data: flow, error: flowError } = await supabase
      .from("omnichannel_flows")
      .select("*")
      .eq("id", flowId)
      .eq("ativo", true)
      .single();

    if (flowError || !flow) {
      throw new Error("Fluxo não encontrado ou inativo");
    }

    const flowData = flow.flow_data as { nodes: FlowNode[]; edges: FlowEdge[] };

    // Encontrar o nó de início
    const startNode = flowData.nodes.find(node => node.data.type === "inicio");
    if (!startNode) {
      throw new Error("Nó de início não encontrado");
    }

    // Executar o fluxo expondo as variáveis personalizadas no contexto
    const result = await executeFlow(supabase, flowData, startNode, {
      conversationId,
      customerId,
      estabelecimentoId,
      canal,
      triggerSource,
      automationId,
      variaveis: variaveis || contexto?.variaveis || {},
      contexto: contexto || {},
    });

    // Registrar log de execução
    await supabase.from("omnichannel_execution_logs").insert({
      flow_id: flowId,
      conversation_id: conversationId,
      execution_data: result,
      status: result.success ? "success" : "error",
      estabelecimento_id: estabelecimentoId,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro ao executar fluxo:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function executeFlow(
  supabase: any,
  flowData: { nodes: FlowNode[]; edges: FlowEdge[] },
  currentNode: FlowNode,
  context: any
): Promise<any> {
  console.log("Executando nó:", currentNode.data.type, currentNode.data.label);

  switch (currentNode.data.type) {
    case "inicio":
      return await executeNextNode(supabase, flowData, currentNode, context);

    case "fila":
      return await executeFila(supabase, flowData, currentNode, context);

    case "atendente":
      return await executeAtendente(supabase, flowData, currentNode, context);

    case "skill":
      return await executeSkill(supabase, flowData, currentNode, context);

    case "regra_roteamento":
      return await executeRegraRoteamento(supabase, flowData, currentNode, context);

    case "horario":
      return await executeHorario(supabase, flowData, currentNode, context);

    case "webhook":
      return await executeWebhook(supabase, flowData, currentNode, context);

    case "aguardar":
      return await executeAguardar(supabase, flowData, currentNode, context);

    case "disparar_push": {
      try {
        await supabase.functions.invoke("push-send", {
          body: {
            ...currentNode.data.config,
            workflow_id: context?.flowId,
            workflow_tipo: "omnichannel",
            origem: "omnichannel_flow",
          },
        });
      } catch (e) {
        console.error("[omnichannel] disparar_push falhou:", e);
      }
      return await executeNextNode(supabase, flowData, currentNode, context);
    }

    case "enviar_sms": {
      try {
        const cfg = currentNode.data.config || {};
        const rawNumbers: string[] = Array.isArray(cfg.phoneNumbers)
          ? cfg.phoneNumbers
          : cfg.phoneNumber ? [cfg.phoneNumber] : [];
        const numbers = rawNumbers
          .map((n: string) => String(n || "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_: string, p: string) => {
            const parts = p.split(".");
            let v: any = context?.variaveis || context || {};
            for (const k of parts) v = v?.[k];
            return v == null ? "" : String(v);
          }).replace(/\D/g, ""))
          .filter(Boolean);
        const mensagem = String(cfg.message || "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_: string, p: string) => {
          const parts = p.split(".");
          let v: any = context?.variaveis || context || {};
          for (const k of parts) v = v?.[k];
          return v == null ? "" : String(v);
        });
        const estId = context?.estabelecimento_id || currentNode.data?.estabelecimento_id;
        if (estId && mensagem && numbers.length) {
          for (const destino of numbers) {
            await supabase.functions.invoke("send-sms", {
              body: { estabelecimento_id: estId, destino, mensagem },
            });
          }
        }
      } catch (e) {
        console.error("[omnichannel] enviar_sms falhou:", e);
      }
      return await executeNextNode(supabase, flowData, currentNode, context);
    }

    default:
      console.log("Tipo de nó não implementado:", currentNode.data.type);
      return { success: true, message: "Nó não implementado" };
  }
}

async function executeNextNode(
  supabase: any,
  flowData: { nodes: FlowNode[]; edges: FlowEdge[] },
  currentNode: FlowNode,
  context: any,
  handle?: string
): Promise<any> {
  const nextEdge = flowData.edges.find(
    edge => edge.source === currentNode.id && (!handle || edge.sourceHandle === handle)
  );

  if (!nextEdge) {
    return { success: true, message: "Fim do fluxo" };
  }

  const nextNode = flowData.nodes.find(node => node.id === nextEdge.target);
  if (!nextNode) {
    return { success: false, error: "Próximo nó não encontrado" };
  }

  return await executeFlow(supabase, flowData, nextNode, context);
}

async function executeFila(supabase: any, flowData: any, node: FlowNode, context: any) {
  const config = node.data.config;
  let filaId = config.filaId;

  // Se estiver usando fila do sistema, buscar o ID real
  if (config.usarDoSistema && config.sistemaNome) {
    const { data: fila } = await supabase
      .from("filas_atendimento")
      .select("id")
      .eq("nome", config.sistemaNome)
      .eq("estabelecimento_id", context.estabelecimentoId)
      .single();
    
    if (fila) filaId = fila.id;
  }

  // Atualizar conversa com a fila
  await supabase
    .from("conversations")
    .update({
      fila_id: filaId,
      chat_status: "em_fila",
    })
    .eq("id", context.conversationId);

  // Chamar função de roteamento
  const { data, error } = await supabase.functions.invoke("rotear-chat-automatico", {
    body: {
      conversationId: context.conversationId,
      customerId: context.customerId,
      estabelecimentoId: context.estabelecimentoId,
      filaId,
      canal: context.canal,
    },
  });

  if (error) {
    console.error("Erro ao rotear para fila:", error);
    return { success: false, error: error.message };
  }

  return await executeNextNode(supabase, flowData, node, context);
}

async function executeAtendente(supabase: any, flowData: any, node: FlowNode, context: any) {
  const config = node.data.config;
  let atendenteId = config.atendenteId;

  // Se estiver usando atendente do sistema, buscar o ID real
  if (config.usarDoSistema && config.sistemaNome) {
    const { data: atendente } = await supabase
      .from("atendentes")
      .select("id")
      .eq("usuario_id", config.sistemaId)
      .eq("estabelecimento_id", context.estabelecimentoId)
      .single();
    
    if (atendente) atendenteId = atendente.id;
  }

  // Atribuir conversa ao atendente
  await supabase
    .from("conversations")
    .update({
      atendente_atual_id: atendenteId,
      chat_status: "em_atendimento",
      tempo_atendimento_inicio: new Date().toISOString(),
    })
    .eq("id", context.conversationId);

  return await executeNextNode(supabase, flowData, node, context);
}

async function executeSkill(supabase: any, flowData: any, node: FlowNode, context: any) {
  const config = node.data.config;
  let skillId = config.skillId;

  // Se estiver usando skill do sistema
  if (config.usarDoSistema && config.sistemaNome) {
    const { data: skill } = await supabase
      .from("skills")
      .select("id")
      .eq("nome", config.sistemaNome)
      .eq("estabelecimento_id", context.estabelecimentoId)
      .single();
    
    if (skill) skillId = skill.id;
  }

  // Buscar atendentes com a skill
  const { data: atendentesComSkill } = await supabase
    .from("atendente_skills")
    .select("atendente_id, atendentes!inner(status, max_chats_simultaneos)")
    .eq("skill_id", skillId)
    .eq("atendentes.status", "disponivel");

  if (!atendentesComSkill || atendentesComSkill.length === 0) {
    // Nenhum atendente com skill disponível
    return await executeNextNode(supabase, flowData, node, context, "nao_tem");
  }

  // Tem atendentes com skill disponíveis
  return await executeNextNode(supabase, flowData, node, context, "tem");
}

async function executeRegraRoteamento(supabase: any, flowData: any, node: FlowNode, context: any) {
  const config = node.data.config;
  
  // Implementar lógica de regra de roteamento
  let resultado = false;
  
  // Exemplo de validação baseada no canal
  if (config.condicao === "canal_whatsapp") {
    resultado = context.canal === "whatsapp";
  }

  const handle = resultado ? "sim" : "nao";
  return await executeNextNode(supabase, flowData, node, context, handle);
}

async function executeHorario(supabase: any, flowData: any, node: FlowNode, context: any) {
  const config = node.data.config;
  const now = new Date();
  const hora = now.getHours();
  const minuto = now.getMinutes();
  const diaSemana = now.getDay();

  // Verificar se está dentro do horário de funcionamento
  const dentroHorario = hora >= 8 && hora < 18 && diaSemana >= 1 && diaSemana <= 5;

  const handle = dentroHorario ? "dentro" : "fora";
  return await executeNextNode(supabase, flowData, node, context, handle);
}

async function executeWebhook(supabase: any, flowData: any, node: FlowNode, context: any) {
  const config = node.data.config;
  let webhookUrl = config.url;

  // Se estiver usando webhook do sistema
  if (config.usarDoSistema && config.sistemaNome) {
    const { data: webhook } = await supabase
      .from("webhooks")
      .select("url")
      .eq("nome", config.sistemaNome)
      .eq("estabelecimento_id", context.estabelecimentoId)
      .single();
    
    if (webhook) webhookUrl = webhook.url;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(context),
    });

    const handle = response.ok ? "sucesso" : "erro";
    return await executeNextNode(supabase, flowData, node, context, handle);
  } catch (error) {
    console.error("Erro ao executar webhook:", error);
    return await executeNextNode(supabase, flowData, node, context, "erro");
  }
}

async function executeAguardar(supabase: any, flowData: any, node: FlowNode, context: any) {
  const config = node.data.config;
  const tempoEspera = parseInt(config.tempo) || 5;

  // Aguardar o tempo configurado (em segundos)
  await new Promise(resolve => setTimeout(resolve, tempoEspera * 1000));

  return await executeNextNode(supabase, flowData, node, context);
}
