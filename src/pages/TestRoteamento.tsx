import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, AlertCircle, Play, Send, Bot, User, Zap, Building2, UserCheck, UserX, Plus, X } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { cn } from "@/lib/utils";

interface RouteStep {
  step: number;
  type: string;
  description: string;
  detail?: string;
  status: "success" | "warning" | "info";
}

interface ChatMessage {
  id: string;
  sender: "user" | "bot" | "system";
  text: string;
  timestamp: Date;
}

interface FlowBlock {
  id: string;
  type: string;
  label: string;
  status: "pending" | "active" | "completed" | "skipped";
  position: number;
}

interface BlockExecution {
  blockId: string;
  blockLabel: string;
  blockType: string;
  timestamp: Date;
  variables: Record<string, any>;
  conditions: Array<{
    condition: string;
    result: boolean;
    reason: string;
  }>;
  decision: {
    action: string;
    reason: string;
    nextBlock?: string;
  };
  duration?: number;
}

export default function TestRoteamento() {
  const [selectedCanal, setSelectedCanal] = useState<string>("");
  const [selectedBot, setSelectedBot] = useState<string>("");
  const [selectedFluxo, setSelectedFluxo] = useState<string>("");
  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [flowBlocks, setFlowBlocks] = useState<FlowBlock[]>([]);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [simulationStarted, setSimulationStarted] = useState(false);
  const [simulatedAtendentes, setSimulatedAtendentes] = useState<any[]>([]);
  const [availableEmpresas, setAvailableEmpresas] = useState<any[]>([]);
  const [showVinculoDialog, setShowVinculoDialog] = useState(false);
  const [selectedAtendenteForVinculo, setSelectedAtendenteForVinculo] = useState<string | null>(null);
  const [executionTrace, setExecutionTrace] = useState<BlockExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<BlockExecution | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Buscar bots disponíveis
  const { data: bots } = useQuery({
    queryKey: ["bots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bot_flows")
        .select("id, name, active, flow_data")
        .eq("active", true);
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar fluxos omnichannel
  const { data: fluxos } = useQuery({
    queryKey: ["omnichannel-flows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("omnichannel_flows")
        .select("id, nome, ativo, flow_data")
        .eq("ativo", true);
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar filas
  const { data: filas } = useQuery({
    queryKey: ["filas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("filas_atendimento")
        .select("id, nome, ativa, tipo_roteamento")
        .eq("ativa", true);
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar atendentes com skills
  const { data: atendentes } = useQuery({
    queryKey: ["atendentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atendentes")
        .select(`
          id, 
          usuario_id, 
          status, 
          max_chats_simultaneos, 
          aceita_novos_chats,
          usuarios(nome),
          atendente_skills(
            skill_id,
            nivel,
            skills(nome)
          )
        `);
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar skills
  const { data: skills } = useQuery({
    queryKey: ["skills"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skills")
        .select("id, nome, descricao");
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar carteiras de atendentes
  const { data: carteiras } = useQuery({
    queryKey: ["atendente-carteiras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atendente_carteiras")
        .select(`
          id,
          atendente_id,
          customer_id,
          ativa,
          customers(nome, email)
        `)
        .eq("ativa", true);
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar empresas disponíveis
  const { data: empresasData } = useQuery({
    queryKey: ["empresas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, nome, cnpj");
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar conversas ativas por atendente (para calcular carga)
  const { data: conversasAtivas } = useQuery({
    queryKey: ["conversas-ativas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("atendente_atual_id")
        .in("chat_status", ["em_atendimento", "aguardando_cliente"]);
      if (error) throw error;
      return data || [];
    },
  });

  // Inicializar atendentes simulados quando os dados reais forem carregados
  useEffect(() => {
    if (atendentes && atendentes.length > 0 && simulatedAtendentes.length === 0) {
      const initialSimulated = atendentes.map((atendente: any) => ({
        ...atendente,
        simulatedStatus: atendente.status,
        simulatedAcceptsNew: atendente.aceita_novos_chats,
        simulatedVinculos: [], // vínculos simulados com empresas
      }));
      setSimulatedAtendentes(initialSimulated);
    }
  }, [atendentes]);

  // Set available empresas
  useEffect(() => {
    if (empresasData) {
      setAvailableEmpresas(empresasData);
    }
  }, [empresasData]);

  const toggleAtendenteStatus = (atendenteId: string, status: string) => {
    setSimulatedAtendentes(prev => prev.map(a => 
      a.id === atendenteId ? { ...a, simulatedStatus: status } : a
    ));
  };

  const toggleAtendenteAcceptsNew = (atendenteId: string) => {
    setSimulatedAtendentes(prev => prev.map(a => 
      a.id === atendenteId ? { ...a, simulatedAcceptsNew: !a.simulatedAcceptsNew } : a
    ));
  };

  const addVinculoEmpresa = (atendenteId: string, empresaId: string) => {
    setSimulatedAtendentes(prev => 
      prev.map(a => {
        if (a.id === atendenteId) {
          const empresa = availableEmpresas.find(e => e.id === empresaId);
          if (empresa && !a.simulatedVinculos?.some((v: any) => v.id === empresaId)) {
            return {
              ...a,
              simulatedVinculos: [...(a.simulatedVinculos || []), empresa]
            };
          }
        }
        return a;
      })
    );
  };

  const removeVinculoEmpresa = (atendenteId: string, empresaId: string) => {
    setSimulatedAtendentes(prev => 
      prev.map(a => a.id === atendenteId ? {
        ...a,
        simulatedVinculos: (a.simulatedVinculos || []).filter((v: any) => v.id !== empresaId)
      } : a)
    );
  };

  // Buscar clientes para teste
  const { data: clientes } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, nome, email")
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const addSystemMessage = (text: string) => {
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: "system",
      text,
      timestamp: new Date()
    }]);
  };

  const addBotMessage = (text: string) => {
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: "bot",
      text,
      timestamp: new Date()
    }]);
  };

  const initializeFlowBlocks = () => {
    const blocks: FlowBlock[] = [];
    let position = 0;

    // Bloco de entrada
    blocks.push({
      id: "entrada",
      type: "start",
      label: "Entrada do Cliente",
      status: "pending",
      position: position++
    });

    // Expandir blocos do bot se selecionado
    if (selectedBot) {
      const bot = bots?.find(b => b.id === selectedBot);
      const botFlowData = bot?.flow_data as any;
      if (botFlowData?.nodes && Array.isArray(botFlowData.nodes)) {
        botFlowData.nodes.forEach((node: any) => {
          blocks.push({
            id: `bot-${node.id}`,
            type: "bot",
            label: `Bot: ${node.data?.label || node.data?.type || 'Etapa'}`,
            status: "pending",
            position: position++
          });
        });
      } else {
        blocks.push({
          id: "bot-generic",
          type: "bot",
          label: "Processamento Bot",
          status: "pending",
          position: position++
        });
      }
    }

    // Expandir blocos do workflow omnichannel se selecionado
    if (selectedFluxo) {
      const fluxo = fluxos?.find(f => f.id === selectedFluxo);
      const fluxoFlowData = fluxo?.flow_data as any;
      if (fluxoFlowData?.nodes && Array.isArray(fluxoFlowData.nodes)) {
        fluxoFlowData.nodes.forEach((node: any) => {
          blocks.push({
            id: `workflow-${node.id}`,
            type: "workflow",
            label: `Workflow: ${node.data?.label || node.data?.type || 'Etapa'}`,
            status: "pending",
            position: position++
          });
        });
      } else {
        blocks.push({
          id: "workflow-generic",
          type: "workflow",
          label: "Workflow Omnichannel",
          status: "pending",
          position: position++
        });
      }
    }

    // Blocos finais
    blocks.push({
      id: "fila",
      type: "queue",
      label: "Seleção de Fila",
      status: "pending",
      position: position++
    });

    blocks.push({
      id: "atendente",
      type: "agent",
      label: "Atendente",
      status: "pending",
      position: position++
    });

    setFlowBlocks(blocks);
  };

  const addExecutionTrace = (trace: BlockExecution) => {
    setExecutionTrace(prev => [...prev, trace]);
  };

  const simulateRouting = async () => {
    if (!selectedCanal) {
      toast.error("Selecione um canal de entrada");
      return;
    }

    setIsSimulating(true);
    setRouteSteps([]);
    setSimulationStarted(true);
    setChatMessages([]);
    setCurrentBlockIndex(0);
    setExecutionTrace([]);
    setSelectedExecution(null);
    initializeFlowBlocks();

    const steps: RouteStep[] = [];
    let contextVariables: Record<string, any> = {
      canal: selectedCanal,
      cliente_id: selectedCliente,
      timestamp_entrada: new Date().toISOString(),
    };
    
    // Mensagem inicial do sistema
    addSystemMessage(`Simulação iniciada - Canal: ${selectedCanal}`);

    // Passo 1: Canal de entrada
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 1000));
    setFlowBlocks(prev => prev.map(b => b.id === "entrada" ? { ...b, status: "active" } : b));
    addSystemMessage("Cliente conectado, iniciando atendimento...");
    
    addExecutionTrace({
      blockId: "entrada",
      blockLabel: "Entrada do Cliente",
      blockType: "start",
      timestamp: new Date(),
      variables: { ...contextVariables },
      conditions: [
        {
          condition: "Canal válido?",
          result: true,
          reason: `Canal ${selectedCanal} está configurado e disponível`
        }
      ],
      decision: {
        action: "Iniciar fluxo de atendimento",
        reason: "Cliente conectado com sucesso",
        nextBlock: selectedBot ? "bot-processing" : (selectedFluxo ? "workflow-processing" : "fila")
      },
      duration: Date.now() - startTime
    });
    
    steps.push({
      step: 1,
      type: "Canal de Entrada",
      description: `Cliente iniciou contato via ${selectedCanal}`,
      detail: selectedCliente ? `Cliente selecionado para teste` : "Cliente novo",
      status: "success",
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    setFlowBlocks(prev => prev.map(b => b.id === "entrada" ? { ...b, status: "completed" } : b));
    setCurrentBlockIndex(prev => prev + 1);

    // Passo 2: Bot (se selecionado)
    if (selectedBot) {
      const bot = bots?.find(b => b.id === selectedBot);
      addSystemMessage(`Bot "${bot?.name || 'Desconhecido'}" ativado`);
      
      contextVariables.bot_id = selectedBot;
      contextVariables.bot_name = bot?.name;
      
      const botFlowData = bot?.flow_data as any;
      if (botFlowData?.nodes && Array.isArray(botFlowData.nodes)) {
        // Processar cada nó do bot
        for (const node of botFlowData.nodes) {
          const nodeStartTime = Date.now();
          await new Promise(resolve => setTimeout(resolve, 800));
          const blockId = `bot-${node.id}`;
          
          setFlowBlocks(prev => prev.map(b => b.id === blockId ? { ...b, status: "active" } : b));
          
          const label = node.data?.label || node.data?.type || 'Etapa';
          const nodeType = node.data?.type || 'unknown';
          addBotMessage(`[${label}] Processando...`);
          
          // Simular variáveis do bloco
          const blockVariables: Record<string, any> = {
            node_id: node.id,
            node_type: nodeType,
            node_label: label,
          };
          
          // Simular condições baseadas no tipo de bloco
          const blockConditions = [];
          if (nodeType === 'message') {
            blockVariables.message_sent = true;
            blockConditions.push({
              condition: "Mensagem válida?",
              result: true,
              reason: "Mensagem configurada corretamente"
            });
          } else if (nodeType === 'question') {
            blockVariables.awaiting_response = true;
            blockConditions.push({
              condition: "Pergunta configurada?",
              result: true,
              reason: "Pergunta definida no bloco"
            });
          }
          
          contextVariables = { ...contextVariables, ...blockVariables };
          
          await new Promise(resolve => setTimeout(resolve, 600));
          
          addExecutionTrace({
            blockId,
            blockLabel: label,
            blockType: `bot-${nodeType}`,
            timestamp: new Date(),
            variables: { ...contextVariables },
            conditions: blockConditions,
            decision: {
              action: "Continuar para próximo bloco",
              reason: `Bloco ${label} executado com sucesso`,
              nextBlock: "next-bot-block"
            },
            duration: Date.now() - nodeStartTime
          });
          
          setFlowBlocks(prev => prev.map(b => b.id === blockId ? { ...b, status: "completed" } : b));
          setCurrentBlockIndex(prev => prev + 1);
        }
      } else {
        const genericBotStartTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 1000));
        setFlowBlocks(prev => prev.map(b => b.id === "bot-generic" ? { ...b, status: "active" } : b));
        addBotMessage(`Olá! Sou o bot ${bot?.name}. Como posso ajudar?`);
        
        addExecutionTrace({
          blockId: "bot-generic",
          blockLabel: `Bot ${bot?.name}`,
          blockType: "bot-generic",
          timestamp: new Date(),
          variables: { ...contextVariables },
          conditions: [{
            condition: "Bot ativo?",
            result: true,
            reason: "Bot está configurado e ativo"
          }],
          decision: {
            action: "Enviar mensagem de boas-vindas",
            reason: "Iniciar interação com cliente",
            nextBlock: selectedFluxo ? "workflow" : "fila"
          },
          duration: Date.now() - genericBotStartTime
        });
        
        await new Promise(resolve => setTimeout(resolve, 800));
        setFlowBlocks(prev => prev.map(b => b.id === "bot-generic" ? { ...b, status: "completed" } : b));
        setCurrentBlockIndex(prev => prev + 1);
      }
      
      steps.push({
        step: steps.length + 1,
        type: "Bot Acionado",
        description: `Bot "${bot?.name}" foi acionado`,
        detail: "Bot processou a mensagem inicial",
        status: "success",
      });
    }

    // Passo 3: Fluxo Omnichannel (se selecionado)
    if (selectedFluxo) {
      const fluxo = fluxos?.find(f => f.id === selectedFluxo);
      addSystemMessage(`Workflow "${fluxo?.nome || 'Desconhecido'}" iniciado`);
      
      contextVariables.workflow_id = selectedFluxo;
      contextVariables.workflow_name = fluxo?.nome;
      
      const fluxoFlowData = fluxo?.flow_data as any;
      if (fluxoFlowData?.nodes && Array.isArray(fluxoFlowData.nodes)) {
        // Processar cada nó do workflow
        for (const node of fluxoFlowData.nodes) {
          const nodeStartTime = Date.now();
          await new Promise(resolve => setTimeout(resolve, 800));
          const blockId = `workflow-${node.id}`;
          
          setFlowBlocks(prev => prev.map(b => b.id === blockId ? { ...b, status: "active" } : b));
          
          const label = node.data?.label || node.data?.type || 'Etapa';
          const nodeType = node.data?.type || 'unknown';
          addSystemMessage(`[${label}] Executando bloco...`);
          
          const blockVariables: Record<string, any> = {
            workflow_node_id: node.id,
            workflow_node_type: nodeType,
            workflow_node_label: label,
          };
          
          const blockConditions = [];
          let decision = {
            action: "Continuar fluxo",
            reason: "Bloco executado com sucesso",
            nextBlock: "next-workflow-block"
          };
          
          // Simular lógica baseada no tipo de bloco de workflow
          if (nodeType === 'horario_funcionamento') {
            blockVariables.horario_atual = new Date().toLocaleTimeString();
            blockVariables.dentro_horario = true;
            blockConditions.push({
              condition: "Dentro do horário comercial?",
              result: true,
              reason: "Horário atual está dentro do período configurado"
            });
            decision = {
              action: "Prosseguir para próximo bloco",
              reason: "Dentro do horário de funcionamento",
              nextBlock: "next-block"
            };
          } else if (nodeType === 'fila') {
            blockVariables.fila_selecionada = filas?.[0]?.nome || 'Padrão';
            blockConditions.push({
              condition: "Fila disponível?",
              result: true,
              reason: "Fila encontrada e ativa"
            });
          } else if (nodeType === 'skill_requerida') {
            blockVariables.skill_necessaria = "Atendimento Técnico";
            blockConditions.push({
              condition: "Skill configurada?",
              result: true,
              reason: "Skill requerida está definida"
            });
          } else if (nodeType === 'regras_roteamento') {
            blockVariables.tipo_roteamento = filas?.[0]?.tipo_roteamento || 'round_robin';
            blockConditions.push({
              condition: "Regras de roteamento válidas?",
              result: true,
              reason: "Regras configuradas corretamente"
            });
          }
          
          contextVariables = { ...contextVariables, ...blockVariables };
          
          await new Promise(resolve => setTimeout(resolve, 600));
          
          addExecutionTrace({
            blockId,
            blockLabel: label,
            blockType: `workflow-${nodeType}`,
            timestamp: new Date(),
            variables: { ...contextVariables },
            conditions: blockConditions,
            decision,
            duration: Date.now() - nodeStartTime
          });
          
          setFlowBlocks(prev => prev.map(b => b.id === blockId ? { ...b, status: "completed" } : b));
          setCurrentBlockIndex(prev => prev + 1);
        }
      } else {
        const genericWorkflowStartTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 1000));
        setFlowBlocks(prev => prev.map(b => b.id === "workflow-generic" ? { ...b, status: "active" } : b));
        
        addExecutionTrace({
          blockId: "workflow-generic",
          blockLabel: `Workflow ${fluxo?.nome}`,
          blockType: "workflow-generic",
          timestamp: new Date(),
          variables: { ...contextVariables },
          conditions: [{
            condition: "Workflow ativo?",
            result: true,
            reason: "Workflow está configurado e ativo"
          }],
          decision: {
            action: "Aplicar regras de roteamento",
            reason: "Workflow executado com sucesso",
            nextBlock: "fila"
          },
          duration: Date.now() - genericWorkflowStartTime
        });
        
        await new Promise(resolve => setTimeout(resolve, 800));
        setFlowBlocks(prev => prev.map(b => b.id === "workflow-generic" ? { ...b, status: "completed" } : b));
        setCurrentBlockIndex(prev => prev + 1);
      }
      
      steps.push({
        step: steps.length + 1,
        type: "Workflow Omnichannel",
        description: `Fluxo "${fluxo?.nome}" foi executado`,
        detail: "Processando regras de roteamento",
        status: "success",
      });
    }

    // Simular análise de fila
    if (filas && filas.length > 0) {
      const filaStartTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 800));
      setFlowBlocks(prev => prev.map(b => b.id === "fila" ? { ...b, status: "active" } : b));
      setCurrentBlockIndex(prev => prev + 1);
      
      const filaEscolhida = filas[0];
      addSystemMessage(`Direcionando para fila: ${filaEscolhida.nome}`);
      
      contextVariables.fila_id = filaEscolhida.id;
      contextVariables.fila_nome = filaEscolhida.nome;
      contextVariables.tipo_roteamento = filaEscolhida.tipo_roteamento;
      
      addExecutionTrace({
        blockId: "fila",
        blockLabel: "Seleção de Fila",
        blockType: "queue-selection",
        timestamp: new Date(),
        variables: { ...contextVariables },
        conditions: [
          {
            condition: "Fila ativa?",
            result: true,
            reason: `Fila "${filaEscolhida.nome}" está ativa e disponível`
          },
          {
            condition: "Tipo de roteamento definido?",
            result: !!filaEscolhida.tipo_roteamento,
            reason: `Roteamento configurado: ${filaEscolhida.tipo_roteamento || 'padrão'}`
          }
        ],
        decision: {
          action: "Buscar atendente",
          reason: `Aplicar regra de roteamento: ${filaEscolhida.tipo_roteamento}`,
          nextBlock: "atendente"
        },
        duration: Date.now() - filaStartTime
      });
      
      steps.push({
        step: steps.length + 1,
        type: "Seleção de Fila",
        description: `Fila "${filaEscolhida.nome}" selecionada`,
        detail: `Tipo de roteamento: ${filaEscolhida.tipo_roteamento}`,
        status: "info",
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      setFlowBlocks(prev => prev.map(b => b.id === "fila" ? { ...b, status: "completed" } : b));

      // Simular seleção de atendente com lógica detalhada
      if (simulatedAtendentes && simulatedAtendentes.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 800));
        setFlowBlocks(prev => prev.map(b => b.id === "atendente" ? { ...b, status: "active" } : b));
        
        // Filtrar atendentes disponíveis USANDO STATUS SIMULADO
        addSystemMessage("Analisando atendentes disponíveis...");
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const atendentesDisponiveis = simulatedAtendentes.filter(a => 
          a.simulatedStatus === "disponivel" && a.simulatedAcceptsNew
        );
        
        addSystemMessage(`${atendentesDisponiveis.length} atendentes disponíveis encontrados`);
        
        if (atendentesDisponiveis.length === 0) {
          await new Promise(resolve => setTimeout(resolve, 800));
          addSystemMessage("Nenhum atendente disponível no momento");
          addSystemMessage("Chat será mantido em fila de espera");
          
          steps.push({
            step: steps.length + 1,
            type: "Fila de Espera",
            description: "Nenhum atendente disponível",
            detail: "Chat permanecerá em fila de espera até que um atendente fique disponível",
            status: "warning",
          });
          
          setFlowBlocks(prev => prev.map(b => b.id === "atendente" ? { ...b, status: "active" } : b));
          return;
        }
        
        // Calcular carga de trabalho
        const cargaPorAtendente = new Map();
        conversasAtivas?.forEach(conv => {
          const count = cargaPorAtendente.get(conv.atendente_atual_id) || 0;
          cargaPorAtendente.set(conv.atendente_atual_id, count + 1);
        });
        
        await new Promise(resolve => setTimeout(resolve, 600));
        addSystemMessage("Calculando carga de trabalho dos atendentes...");
        
        // Aplicar regras de roteamento
        const tipoRoteamento = filaEscolhida.tipo_roteamento || "round_robin";
        addSystemMessage(`Aplicando regra: ${tipoRoteamento}`);
        await new Promise(resolve => setTimeout(resolve, 600));
        
        let atendenteEscolhido = atendentesDisponiveis[0];
        
        if (tipoRoteamento === "por_disponibilidade") {
          // Escolher o com menor carga
          atendenteEscolhido = atendentesDisponiveis.reduce((prev, curr) => {
            const prevCarga = cargaPorAtendente.get(prev.id) || 0;
            const currCarga = cargaPorAtendente.get(curr.id) || 0;
            return currCarga < prevCarga ? curr : prev;
          });
          addSystemMessage(`Selecionado atendente com menor carga de trabalho`);
        } else if (tipoRoteamento === "round_robin") {
          addSystemMessage(`Distribuição por rodízio (round-robin)`);
        } else if (tipoRoteamento === "por_skill") {
          addSystemMessage(`Seleção baseada em habilidades (skills)`);
        } else if (tipoRoteamento === "por_prioridade") {
          addSystemMessage(`Seleção baseada em prioridade`);
        } else if (tipoRoteamento === "por_carteira") {
          // Verificar se o cliente tem um atendente fixo (carteira real)
          const clienteCarteira = carteiras?.find(c => 
            c.customer_id === selectedCliente && c.ativa
          );
          
          if (clienteCarteira) {
            const atendenteCarteira = atendentesDisponiveis.find(a => 
              a.id === clienteCarteira.atendente_id
            );
            
            if (atendenteCarteira) {
              atendenteEscolhido = atendenteCarteira;
              addSystemMessage(`Cliente tem atendente fixo na carteira: ${atendenteEscolhido.usuarios?.nome}`);
            } else {
              addSystemMessage(`Atendente da carteira não está disponível, aplicando regra secundária`);
            }
          } else {
            addSystemMessage(`Cliente não possui atendente fixo, aplicando round-robin`);
          }
        }
        
        // Se não encontrou via regras normais, verificar vínculos simulados com empresas
        if (!selectedCliente && atendenteEscolhido === atendentesDisponiveis[0]) {
          // Simular que temos uma empresa vinculada (usar a primeira empresa como exemplo)
          const empresaSimuladaId = availableEmpresas?.[0]?.id;
          if (empresaSimuladaId) {
            const atendenteComVinculo = atendentesDisponiveis.find(a => 
              a.simulatedVinculos?.some((v: any) => v.id === empresaSimuladaId)
            );
            
            if (atendenteComVinculo) {
              const empresa = atendenteComVinculo.simulatedVinculos?.find((v: any) => v.id === empresaSimuladaId);
              addSystemMessage(`✅ Vínculo simulado: Empresa "${empresa?.nome}" direcionada para ${atendenteComVinculo.usuarios?.nome}`);
              atendenteEscolhido = atendenteComVinculo;
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // Verificar skills se necessário
        const atendenteSkills = atendenteEscolhido.atendente_skills || [];
        if (atendenteSkills.length > 0) {
          addSystemMessage(`Atendente possui ${atendenteSkills.length} skill(s):`);
          atendenteSkills.forEach((as: any) => {
            addSystemMessage(`  • ${as.skills?.nome} (Nível ${as.nivel})`);
          });
          await new Promise(resolve => setTimeout(resolve, 800));
        }
        
        // Verificar carteira
        const clientesNaCarteira = carteiras?.filter(c => 
          c.atendente_id === atendenteEscolhido.id && c.ativa
        ) || [];
        
        if (clientesNaCarteira.length > 0) {
          addSystemMessage(`Atendente possui ${clientesNaCarteira.length} cliente(s) na carteira`);
          await new Promise(resolve => setTimeout(resolve, 600));
        }
        
        const cargaAtual = cargaPorAtendente.get(atendenteEscolhido.id) || 0;
        addSystemMessage(`Conectando com ${atendenteEscolhido.usuarios?.nome}...`);
        addSystemMessage(`Carga atual: ${cargaAtual}/${atendenteEscolhido.max_chats_simultaneos} chats`);
        
        contextVariables.atendente_id = atendenteEscolhido.id;
        contextVariables.atendente_nome = atendenteEscolhido.usuarios?.nome;
        contextVariables.atendente_status = atendenteEscolhido.simulatedStatus;
        contextVariables.atendente_carga_atual = cargaAtual;
        contextVariables.atendente_max_chats = atendenteEscolhido.max_chats_simultaneos;
        contextVariables.atendente_skills = atendenteSkills.map((s: any) => ({
          nome: s.skills?.nome,
          nivel: s.nivel
        }));
        contextVariables.atendente_carteira_size = clientesNaCarteira.length;
        
        addExecutionTrace({
          blockId: "atendente",
          blockLabel: "Seleção de Atendente",
          blockType: "agent-selection",
          timestamp: new Date(),
          variables: { ...contextVariables },
          conditions: [
            {
              condition: "Atendente disponível?",
              result: true,
              reason: `${atendenteEscolhido.usuarios?.nome} está ${atendenteEscolhido.simulatedStatus}`
            },
            {
              condition: "Aceita novos chats?",
              result: atendenteEscolhido.simulatedAcceptsNew,
              reason: "Atendente está aceitando novos chats"
            },
            {
              condition: "Capacidade disponível?",
              result: cargaAtual < atendenteEscolhido.max_chats_simultaneos,
              reason: `Carga ${cargaAtual}/${atendenteEscolhido.max_chats_simultaneos}`
            },
            {
              condition: "Skills compatíveis?",
              result: atendenteSkills.length > 0,
              reason: `Possui ${atendenteSkills.length} skill(s)`
            }
          ],
          decision: {
            action: "Conectar com atendente",
            reason: `${atendenteEscolhido.usuarios?.nome} selecionado via regra: ${tipoRoteamento}`,
            nextBlock: "chat-ativo"
          },
          duration: 0
        });
        
        steps.push({
          step: steps.length + 1,
          type: "Atendente Selecionado",
          description: `Atendente "${atendenteEscolhido.usuarios?.nome}" designado`,
          detail: `Status: ${atendenteEscolhido.simulatedStatus} | Carga: ${cargaAtual}/${atendenteEscolhido.max_chats_simultaneos} | Skills: ${atendenteSkills.length} | Carteira: ${clientesNaCarteira.length} clientes`,
          status: "success",
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        setFlowBlocks(prev => prev.map(b => b.id === "atendente" ? { ...b, status: "completed" } : b));
        addBotMessage(`Você foi conectado com ${atendenteEscolhido.usuarios?.nome}. Como posso ajudar?`);
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
        setFlowBlocks(prev => prev.map(b => b.id === "atendente" ? { ...b, status: "active" } : b));
        addSystemMessage("Nenhum atendente cadastrado no sistema");
        
        steps.push({
          step: steps.length + 1,
          type: "Erro de Configuração",
          description: "Nenhum atendente cadastrado",
          detail: "Verifique as configurações de atendentes",
          status: "warning",
        });
      }
    } else {
      steps.push({
        step: steps.length + 1,
        type: "Erro",
        description: "Nenhuma fila ativa encontrada",
        detail: "Verifique as configurações de filas",
        status: "warning",
      });
    }

    setRouteSteps(steps);
    setIsSimulating(false);
    addSystemMessage("Simulação concluída!");
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !simulationStarted) return;
    
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: "user",
      text: inputMessage,
      timestamp: new Date()
    }]);
    
    // Simular resposta do bot/atendente
    setTimeout(() => {
      addBotMessage("Mensagem recebida! Esta é uma simulação.");
    }, 500);
    
    setInputMessage("");
  };

  const resetSimulation = () => {
    setSelectedCanal("");
    setSelectedBot("");
    setSelectedFluxo("");
    setSelectedCliente("");
    setRouteSteps([]);
    setChatMessages([]);
    setFlowBlocks([]);
    setCurrentBlockIndex(0);
    setSimulationStarted(false);
  };

  const getBlockIcon = (type: string) => {
    switch (type) {
      case "start": return Play;
      case "bot": return Bot;
      case "workflow": return Zap;
      case "queue": return AlertCircle;
      case "agent": return User;
      default: return CheckCircle2;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Teste de Roteamento</h1>
        <p className="text-muted-foreground mt-2">
          Simule o fluxo completo de roteamento omnichannel
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Painel de Configuração */}
        <Card className="p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Configuração do Teste</h2>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="canal">Canal de Entrada *</Label>
              <Select value={selectedCanal} onValueChange={setSelectedCanal}>
                <SelectTrigger id="canal">
                  <SelectValue placeholder="Selecione o canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="webchat">WebChat</SelectItem>
                  <SelectItem value="mensagem_direta">Mensagem Direta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="cliente">Cliente (Opcional)</Label>
              <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                <SelectTrigger id="cliente">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes?.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome} ({cliente.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bot">Bot (Opcional)</Label>
              <Select value={selectedBot} onValueChange={setSelectedBot}>
                <SelectTrigger id="bot">
                  <SelectValue placeholder="Selecione um bot" />
                </SelectTrigger>
                <SelectContent>
                  {bots?.map((bot) => (
                    <SelectItem key={bot.id} value={bot.id}>
                      {bot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="fluxo">Workflow Omnichannel (Opcional)</Label>
              <Select value={selectedFluxo} onValueChange={setSelectedFluxo}>
                <SelectTrigger id="fluxo">
                  <SelectValue placeholder="Selecione um fluxo" />
                </SelectTrigger>
                <SelectContent>
                  {fluxos?.map((fluxo) => (
                    <SelectItem key={fluxo.id} value={fluxo.id}>
                      {fluxo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={simulateRouting}
              disabled={isSimulating || !selectedCanal}
              className="flex-1"
            >
              <Play className="w-4 h-4 mr-2" />
              {isSimulating ? "Simulando..." : "Simular Roteamento"}
            </Button>
            <Button onClick={resetSimulation} variant="outline">
              Limpar
            </Button>
          </div>
        </Card>

        {/* Painel de Status do Sistema */}
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-4">Status do Sistema</h2>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Atendentes</span>
                <Badge variant="outline">{atendentes?.length || 0} Total</Badge>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Disponíveis:</span>
                  <span className="font-medium text-green-600">
                    {atendentes?.filter(a => a.status === "disponivel").length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Ocupados:</span>
                  <span className="font-medium text-yellow-600">
                    {atendentes?.filter(a => a.status === "ocupado").length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Offline:</span>
                  <span className="font-medium text-gray-500">
                    {atendentes?.filter(a => a.status === "offline").length || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Skills Cadastradas</span>
                <Badge variant="outline">{skills?.length || 0}</Badge>
              </div>
              {skills && skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {skills.slice(0, 5).map(skill => (
                    <Badge key={skill.id} variant="secondary" className="text-xs">
                      {skill.nome}
                    </Badge>
                  ))}
                  {skills.length > 5 && (
                    <Badge variant="secondary" className="text-xs">
                      +{skills.length - 5}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Filas Ativas</span>
                <Badge variant="outline">{filas?.length || 0}</Badge>
              </div>
              {filas && filas.length > 0 && (
                <div className="space-y-1 text-xs">
                  {filas.slice(0, 3).map(fila => (
                    <div key={fila.id} className="flex justify-between items-center">
                      <span className="text-muted-foreground">{fila.nome}</span>
                      <Badge variant="outline" className="text-xs">
                        {fila.tipo_roteamento}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Bots Ativos</span>
                <Badge variant="outline">{bots?.length || 0}</Badge>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Workflows Ativos</span>
                <Badge variant="outline">{fluxos?.length || 0}</Badge>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Chats em Atendimento</span>
                <Badge variant="outline">{conversasAtivas?.length || 0}</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Visualização de Blocos */}
        <Card className="p-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Fluxo Visual</h2>
          </div>

          {flowBlocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Zap className="w-12 h-12 mb-4 opacity-20" />
              <p>Inicie a simulação para visualizar o fluxo</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4 pr-4">
                {flowBlocks.map((block, index) => {
                  const BlockIcon = getBlockIcon(block.type);
                  const isActive = block.status === "active";
                  const isCompleted = block.status === "completed";
                  const isSkipped = block.status === "skipped";
                  
                  return (
                    <div key={block.id} className="relative">
                      {index < flowBlocks.length - 1 && (
                        <div className={cn(
                          "absolute left-6 top-14 w-0.5 h-8",
                          isCompleted ? "bg-green-500" : "bg-border"
                        )} />
                      )}
                      <div className={cn(
                        "flex items-center gap-4 p-4 rounded-lg border-2 transition-all",
                        isActive && "border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-lg",
                        isCompleted && "border-green-500 bg-green-50 dark:bg-green-950/20",
                        isSkipped && "border-gray-300 bg-gray-50 dark:bg-gray-900/20 opacity-50",
                        !isActive && !isCompleted && !isSkipped && "border-border"
                      )}>
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center",
                          isActive && "bg-blue-500 text-white",
                          isCompleted && "bg-green-500 text-white",
                          isSkipped && "bg-gray-400 text-white",
                          !isActive && !isCompleted && !isSkipped && "bg-muted"
                        )}>
                          <BlockIcon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold">{block.label}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {isActive && "Em execução..."}
                            {isCompleted && "Concluído"}
                            {isSkipped && "Ignorado"}
                            {!isActive && !isCompleted && !isSkipped && "Aguardando"}
                          </div>
                        </div>
                        {isActive && (
                          <Badge variant="default" className="animate-pulse">
                            Ativo
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </Card>

        {/* Painel de Chat */}
        <Card className="p-6 flex flex-col">
          <div>
            <h2 className="text-xl font-semibold mb-4">Chat Simulado</h2>
          </div>

          <ScrollArea className="flex-1 h-[400px] mb-4 border rounded-lg p-4" ref={chatScrollRef}>
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Send className="w-12 h-12 mb-4 opacity-20" />
                <p>As mensagens aparecerão aqui</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.sender === "user" && "flex-row-reverse"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      message.sender === "user" && "bg-primary text-primary-foreground",
                      message.sender === "bot" && "bg-blue-500 text-white",
                      message.sender === "system" && "bg-orange-500 text-white"
                    )}>
                      {message.sender === "user" && <User className="w-4 h-4" />}
                      {message.sender === "bot" && <Bot className="w-4 h-4" />}
                      {message.sender === "system" && <Zap className="w-4 h-4" />}
                    </div>
                    <div className={cn(
                      "flex-1 p-3 rounded-lg max-w-[80%]",
                      message.sender === "user" && "bg-primary text-primary-foreground ml-auto",
                      message.sender === "bot" && "bg-blue-100 dark:bg-blue-900/30",
                      message.sender === "system" && "bg-orange-100 dark:bg-orange-900/30 text-sm italic"
                    )}>
                      <div>{message.text}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Input
              placeholder={simulationStarted ? "Digite uma mensagem..." : "Inicie a simulação primeiro"}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              disabled={!simulationStarted || isSimulating}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!simulationStarted || isSimulating || !inputMessage.trim()}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {/* Detalhes dos Atendentes */}
        {simulatedAtendentes && simulatedAtendentes.length > 0 && (
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Controle de Atendentes</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configure o status dos atendentes para simular diferentes cenários
              </p>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                {simulatedAtendentes.map((atendente: any) => {
                  const carga = conversasAtivas?.filter(c => c.atendente_atual_id === atendente.id).length || 0;
                  const atendenteSkills = atendente.atendente_skills || [];
                  const clientesCarteira = carteiras?.filter(c => 
                    c.atendente_id === atendente.id && c.ativa
                  ) || [];
                  const vinculosSimulados = atendente.simulatedVinculos || [];
                  
                  return (
                    <div key={atendente.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{atendente.usuarios?.nome}</span>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant={atendente.simulatedStatus === "disponivel" ? "default" : "outline"}
                            onClick={() => toggleAtendenteStatus(atendente.id, "disponivel")}
                            className="h-7"
                          >
                            <UserCheck className="w-3 h-3 mr-1" />
                            Disponível
                          </Button>
                          <Button
                            size="sm"
                            variant={atendente.simulatedStatus === "ocupado" ? "default" : "outline"}
                            onClick={() => toggleAtendenteStatus(atendente.id, "ocupado")}
                            className="h-7"
                          >
                            <UserX className="w-3 h-3 mr-1" />
                            Ocupado
                          </Button>
                          <Button
                            size="sm"
                            variant={atendente.simulatedStatus === "ausente" ? "default" : "outline"}
                            onClick={() => toggleAtendenteStatus(atendente.id, "ausente")}
                            className="h-7"
                          >
                            Ausente
                          </Button>
                          <Button
                            size="sm"
                            variant={atendente.simulatedStatus === "offline" ? "default" : "outline"}
                            onClick={() => toggleAtendenteStatus(atendente.id, "offline")}
                            className="h-7"
                          >
                            Offline
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Switch
                          checked={atendente.simulatedAcceptsNew}
                          onCheckedChange={() => toggleAtendenteAcceptsNew(atendente.id)}
                        />
                        <span className="text-sm">Aceita novos chats</span>
                      </div>
                      
                      <div className="text-xs space-y-2 pt-2 border-t">
                        <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                          <span className="text-muted-foreground">Carga Atual:</span>
                          <span className="font-medium">
                            {carga}/{atendente.max_chats_simultaneos}
                          </span>
                        </div>
                        
                        {atendenteSkills.length > 0 && (
                          <div className="pt-2 border-t">
                            <div className="font-medium mb-2 flex items-center gap-2">
                              <Zap className="w-3 h-3" />
                              Skills ({atendenteSkills.length})
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {atendenteSkills.map((as: any) => (
                                <Badge key={as.skill_id} variant="secondary" className="text-xs">
                                  {as.skills?.nome} <span className="ml-1 text-primary">N{as.nivel}</span>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {clientesCarteira.length > 0 && (
                          <div className="pt-2 border-t">
                            <div className="font-medium mb-2 flex items-center gap-2">
                              <User className="w-3 h-3" />
                              Carteira de Clientes ({clientesCarteira.length})
                            </div>
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                              {clientesCarteira.map((carteira: any) => (
                                <div key={carteira.id} className="text-xs p-2 bg-muted rounded flex items-center justify-between">
                                  <span>{carteira.customers?.nome}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {carteira.customers?.email}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium flex items-center gap-2">
                              <Building2 className="w-3 h-3" />
                              Vínculos com Empresas (Simulação)
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedAtendenteForVinculo(atendente.id);
                                setShowVinculoDialog(true);
                              }}
                              className="h-6 text-xs"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          {vinculosSimulados.length > 0 ? (
                            <div className="space-y-1">
                              {vinculosSimulados.map((empresa: any) => (
                                <div key={empresa.id} className="flex items-center justify-between text-xs bg-muted/30 p-2 rounded">
                                  <span>• {empresa.nome}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeVinculoEmpresa(atendente.id, empresa.id)}
                                    className="h-5 w-5 p-0"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Nenhum vínculo simulado</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </Card>
        )}

        {/* Painel de Resultado */}
        <Card className="p-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Caminho do Roteamento</h2>
          </div>

          {routeSteps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Play className="w-12 h-12 mb-4 opacity-20" />
              <p>Configure os parâmetros e clique em "Simular Roteamento"</p>
              <p className="text-sm mt-2">para visualizar o caminho completo</p>
            </div>
          ) : (
            <div className="space-y-4">
              {routeSteps.map((step, index) => (
                <div key={step.step} className="relative">
                  {index < routeSteps.length - 1 && (
                    <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-border" />
                  )}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      {step.status === "success" && (
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                      )}
                      {step.status === "warning" && (
                        <AlertCircle className="w-10 h-10 text-orange-500" />
                      )}
                      {step.status === "info" && (
                        <ArrowRight className="w-10 h-10 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{step.type}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {step.description}
                      </div>
                      {step.detail && (
                        <div className="text-xs text-muted-foreground mt-1 bg-muted/50 rounded px-2 py-1 inline-block">
                          {step.detail}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Rastreamento de Execução Detalhado */}
      {executionTrace.length > 0 && (
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Rastreamento Detalhado de Execução</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Clique em um bloco para ver variáveis, condições e decisões
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista de blocos executados */}
            <div className="space-y-2">
              <h3 className="font-medium mb-3">Blocos Executados ({executionTrace.length})</h3>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {executionTrace.map((trace, index) => (
                    <div
                      key={`${trace.blockId}-${index}`}
                      onClick={() => setSelectedExecution(trace)}
                      className={cn(
                        "p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md",
                        selectedExecution?.blockId === trace.blockId && selectedExecution?.timestamp === trace.timestamp
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-medium">{trace.blockLabel}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {trace.blockType}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {trace.duration}ms
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {trace.timestamp.toLocaleTimeString()}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {Object.keys(trace.variables).length} variáveis
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {trace.conditions.length} condições
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Detalhes do bloco selecionado */}
            <div>
              <h3 className="font-medium mb-3">Detalhes do Bloco</h3>
              {selectedExecution ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4 pr-4">
                    {/* Cabeçalho */}
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <h4 className="font-semibold text-lg">{selectedExecution.blockLabel}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{selectedExecution.blockType}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{selectedExecution.timestamp.toLocaleString()}</Badge>
                        <Badge variant="default">{selectedExecution.duration}ms</Badge>
                      </div>
                    </div>

                    {/* Variáveis */}
                    <div className="space-y-2">
                      <h5 className="font-medium flex items-center gap-2">
                        <span className="text-primary">📊</span> Variáveis Coletadas
                      </h5>
                      <div className="space-y-1">
                        {Object.entries(selectedExecution.variables).map(([key, value]) => (
                          <div key={key} className="p-3 bg-muted rounded-lg">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-mono text-xs font-semibold text-primary">{key}:</span>
                              <span className="text-xs text-right flex-1 break-all">
                                {typeof value === 'object' 
                                  ? JSON.stringify(value, null, 2) 
                                  : String(value)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Condições */}
                    {selectedExecution.conditions.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="font-medium flex items-center gap-2">
                          <span className="text-primary">✓</span> Condições Avaliadas
                        </h5>
                        <div className="space-y-2">
                          {selectedExecution.conditions.map((condition, idx) => (
                            <div key={idx} className={cn(
                              "p-3 rounded-lg border-l-4",
                              condition.result 
                                ? "bg-green-50 dark:bg-green-950/20 border-green-500" 
                                : "bg-red-50 dark:bg-red-950/20 border-red-500"
                            )}>
                              <div className="flex items-start gap-2 mb-2">
                                <Badge 
                                  variant={condition.result ? "default" : "destructive"}
                                  className="text-xs"
                                >
                                  {condition.result ? "✓ Passou" : "✗ Falhou"}
                                </Badge>
                                <span className="font-medium text-sm flex-1">{condition.condition}</span>
                              </div>
                              <p className="text-xs text-muted-foreground italic">
                                {condition.reason}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Decisão */}
                    <div className="space-y-2">
                      <h5 className="font-medium flex items-center gap-2">
                        <span className="text-primary">➜</span> Decisão Tomada
                      </h5>
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                          {selectedExecution.decision.action}
                        </div>
                        <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                          {selectedExecution.decision.reason}
                        </p>
                        {selectedExecution.decision.nextBlock && (
                          <div className="flex items-center gap-2 text-xs">
                            <ArrowRight className="w-4 h-4" />
                            <span className="text-muted-foreground">Próximo:</span>
                            <Badge variant="outline">{selectedExecution.decision.nextBlock}</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-center text-muted-foreground border rounded-lg">
                  <div>
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Selecione um bloco para ver os detalhes</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Informações adicionais */}
      <Card className="p-6">
        <h3 className="font-semibold mb-3">Informações do Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Bots Ativos</div>
            <div className="text-2xl font-bold">{bots?.length || 0}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Fluxos Ativos</div>
            <div className="text-2xl font-bold">{fluxos?.length || 0}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Filas Ativas</div>
            <div className="text-2xl font-bold">{filas?.length || 0}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Atendentes Disponíveis</div>
            <div className="text-2xl font-bold">{atendentes?.length || 0}</div>
          </div>
        </div>
      </Card>

      {/* Dialog para adicionar vínculo com empresa */}
      <Dialog open={showVinculoDialog} onOpenChange={setShowVinculoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Vínculo com Empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione uma empresa para vincular ao atendente (simulação):
            </p>
            <ScrollArea className="max-h-96">
              <div className="space-y-2 pr-4">
                {availableEmpresas.map((empresa) => {
                  const atendente = simulatedAtendentes.find(a => a.id === selectedAtendenteForVinculo);
                  const jaVinculado = atendente?.simulatedVinculos?.some((v: any) => v.id === empresa.id);
                  
                  return (
                    <Button
                      key={empresa.id}
                      variant={jaVinculado ? "secondary" : "outline"}
                      className="w-full justify-start"
                      onClick={() => {
                        if (selectedAtendenteForVinculo && !jaVinculado) {
                          addVinculoEmpresa(selectedAtendenteForVinculo, empresa.id);
                        }
                      }}
                      disabled={jaVinculado}
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      <div className="text-left flex-1">
                        <p className="font-medium">{empresa.nome}</p>
                        {empresa.cnpj && (
                          <p className="text-xs text-muted-foreground">{empresa.cnpj}</p>
                        )}
                      </div>
                      {jaVinculado && (
                        <Badge variant="secondary" className="ml-2">Vinculado</Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
