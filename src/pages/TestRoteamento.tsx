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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, AlertCircle, Play, Send, Bot, User, Zap, Building2, UserCheck, UserX, Plus, X, Trash2, Copy, Clock, Users, Layers } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { cn } from "@/lib/utils";
import FlowSimulationCanvas from "@/components/routing/FlowSimulationCanvas";

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

interface Simulation {
  id: string;
  name: string;
  status: "running" | "completed" | "error";
  startTime: Date;
  endTime?: Date;
  config: {
    canal: string;
    botId?: string;
    fluxoId?: string;
    cliente?: string;
  };
  chatMessages: ChatMessage[];
  executionTrace: BlockExecution[];
  routeSteps: RouteStep[];
  flowBlocks: FlowBlock[];
  result?: {
    atendenteNome?: string;
    filaNome?: string;
    tempoTotal?: number;
    status: "success" | "error" | "waiting";
  };
}

export default function TestRoteamento() {
  const [selectedCanal, setSelectedCanal] = useState<string>("");
  const [selectedBot, setSelectedBot] = useState<string>("");
  const [selectedFluxo, setSelectedFluxo] = useState<string>("");
  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [simulatedAtendentes, setSimulatedAtendentes] = useState<any[]>([]);
  const [availableEmpresas, setAvailableEmpresas] = useState<any[]>([]);
  const [showVinculoDialog, setShowVinculoDialog] = useState(false);
  const [selectedAtendenteForVinculo, setSelectedAtendenteForVinculo] = useState<string | null>(null);

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

  // Inicializar atendentes simulados quando os dados reais forem carregados
  useEffect(() => {
    if (atendentes && atendentes.length > 0 && simulatedAtendentes.length === 0) {
      const initialSimulated = atendentes.map((atendente: any) => ({
        ...atendente,
        simulatedStatus: atendente.status,
        simulatedAcceptsNew: atendente.aceita_novos_chats,
        simulatedVinculos: [],
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

  const createNewSimulation = async () => {
    if (!selectedCanal) {
      toast.error("Selecione um canal de entrada");
      return;
    }

    const simId = `sim-${Date.now()}`;
    const config = {
      canal: selectedCanal,
      bot: selectedBot,
      fluxo: selectedFluxo,
      cliente: selectedCliente,
    };
    
    const newSimulation: Simulation = {
      id: simId,
      name: `Simulação #${simulations.length + 1}`,
      status: "running",
      startTime: new Date(),
      config,
      chatMessages: [],
      executionTrace: [],
      routeSteps: [],
      flowBlocks: [],
    };

    setSimulations(prev => [...prev, newSimulation]);
    
    // Executar simulação diretamente com a config
    simulateRoutingForSimulation(simId, config);
  };

  const deleteSimulation = (id: string) => {
    setSimulations(prev => prev.filter(sim => sim.id !== id));
  };

  const duplicateSimulation = (id: string) => {
    const simToDuplicate = simulations.find(s => s.id === id);
    if (!simToDuplicate) return;

    const simId = `sim-${Date.now()}`;
    const newSimulation: Simulation = {
      ...simToDuplicate,
      id: simId,
      name: `${simToDuplicate.name} (Cópia)`,
      status: "running",
      startTime: new Date(),
      endTime: undefined,
      chatMessages: [],
      executionTrace: [],
      routeSteps: [],
      flowBlocks: [],
    };

    setSimulations(prev => [...prev, newSimulation]);
    simulateRoutingForSimulation(simId, simToDuplicate.config);
  };

  const simulateRoutingForSimulation = async (simulationId: string, config: Simulation['config']) => {
    console.log('🚀 Iniciando simulação:', simulationId, 'Config:', config);
    
    const { canal, botId, fluxoId, cliente } = config;
    
    let contextVariables: Record<string, any> = {
      canal,
      cliente_id: cliente,
      timestamp_entrada: new Date().toISOString(),
      simulation_id: simulationId,
    };

    // Adicionar mensagem inicial
    addSimulationMessage(simulationId, {
      id: `${Date.now()}-1`,
      sender: "system",
      text: `Simulação iniciada - Canal: ${canal}`,
      timestamp: new Date()
    });

    // Processar entrada
    await new Promise(resolve => setTimeout(resolve, 800));
    const startTime = Date.now();
    
    addSimulationTrace(simulationId, {
      blockId: "entrada",
      blockLabel: "Entrada do Cliente",
      blockType: "start",
      timestamp: new Date(),
      variables: { ...contextVariables },
      conditions: [
        {
          condition: "Canal válido?",
          result: true,
          reason: `Canal ${canal} está configurado e disponível`
        }
      ],
      decision: {
        action: "Iniciar fluxo de atendimento",
        reason: "Cliente conectado com sucesso",
        nextBlock: botId ? "bot-processing" : (fluxoId ? "workflow-processing" : "fila")
      },
      duration: Date.now() - startTime
    });

    addSimulationMessage(simulationId, {
      id: `${Date.now()}-2`,
      sender: "system",
      text: "Cliente conectado, iniciando atendimento...",
      timestamp: new Date()
    });

    // Processar Bot (se selecionado)
    if (botId) {
      const botData = bots?.find(b => b.id === botId);
      if (botData) {
        await new Promise(resolve => setTimeout(resolve, 600));
        
        addSimulationMessage(simulationId, {
          id: `${Date.now()}-bot`,
          sender: "system",
          text: `Bot "${botData.name}" ativado`,
          timestamp: new Date()
        });

        contextVariables.bot_id = botId;
        contextVariables.bot_name = botData.name;

        const botFlowData = botData.flow_data as any;
        if (botFlowData?.nodes && Array.isArray(botFlowData.nodes)) {
          // Processar cada nó do bot
          for (const node of botFlowData.nodes.slice(0, 3)) { // Limitar para não demorar muito
            const nodeStartTime = Date.now();
            await new Promise(resolve => setTimeout(resolve, 500));

            const label = node.data?.label || node.data?.type || 'Etapa';
            const nodeType = node.data?.type || 'unknown';

            addSimulationMessage(simulationId, {
              id: `${Date.now()}-bot-${node.id}`,
              sender: "bot",
              text: `[${label}] Processando...`,
              timestamp: new Date()
            });

            const blockVariables: Record<string, any> = {
              node_id: node.id,
              node_type: nodeType,
              node_label: label,
            };

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

            addSimulationTrace(simulationId, {
              blockId: `bot-${node.id}`,
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

            await new Promise(resolve => setTimeout(resolve, 400));
          }
        }
      }
    }

    // Processar Workflow Omnichannel (se selecionado)
    if (fluxoId) {
      const fluxoData = fluxos?.find(f => f.id === fluxoId);
      if (fluxoData) {
        await new Promise(resolve => setTimeout(resolve, 600));
        
        addSimulationMessage(simulationId, {
          id: `${Date.now()}-workflow`,
          sender: "system",
          text: `Workflow "${fluxoData.nome}" iniciado`,
          timestamp: new Date()
        });

        contextVariables.workflow_id = fluxoId;
        contextVariables.workflow_name = fluxoData.nome;

        const fluxoFlowData = fluxoData.flow_data as any;
        if (fluxoFlowData?.nodes && Array.isArray(fluxoFlowData.nodes)) {
          // Processar cada nó do workflow
          for (const node of fluxoFlowData.nodes.slice(0, 3)) { // Limitar para não demorar muito
            const nodeStartTime = Date.now();
            await new Promise(resolve => setTimeout(resolve, 500));

            const label = node.data?.label || node.data?.type || 'Etapa';
            const nodeType = node.data?.type || 'unknown';

            addSimulationMessage(simulationId, {
              id: `${Date.now()}-workflow-${node.id}`,
              sender: "system",
              text: `[${label}] Executando bloco...`,
              timestamp: new Date()
            });

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

            if (nodeType === 'horario_funcionamento') {
              blockVariables.horario_atual = new Date().toLocaleTimeString();
              blockVariables.dentro_horario = true;
              blockConditions.push({
                condition: "Dentro do horário comercial?",
                result: true,
                reason: "Horário atual está dentro do período configurado"
              });
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
            }

            contextVariables = { ...contextVariables, ...blockVariables };

            addSimulationTrace(simulationId, {
              blockId: `workflow-${node.id}`,
              blockLabel: label,
              blockType: `workflow-${nodeType}`,
              timestamp: new Date(),
              variables: { ...contextVariables },
              conditions: blockConditions,
              decision,
              duration: Date.now() - nodeStartTime
            });

            await new Promise(resolve => setTimeout(resolve, 400));
          }
        }
      }
    }

    // Processar seleção de fila
    await new Promise(resolve => setTimeout(resolve, 600));
    const filaEscolhida = filas?.[0];
    
    if (filaEscolhida) {
      addSimulationMessage(simulationId, {
        id: `${Date.now()}-fila`,
        sender: "system",
        text: `Direcionando para fila: ${filaEscolhida.nome}`,
        timestamp: new Date()
      });

      contextVariables.fila_id = filaEscolhida.id;
      contextVariables.fila_nome = filaEscolhida.nome;
      contextVariables.tipo_roteamento = filaEscolhida.tipo_roteamento;

      const filaStartTime = Date.now();
      addSimulationTrace(simulationId, {
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
    }

    // Processar seleção de atendente
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const atendentesDisponiveis = simulatedAtendentes.filter(a => 
      a.simulatedStatus === "disponivel" && a.simulatedAcceptsNew
    );

    addSimulationMessage(simulationId, {
      id: `${Date.now()}-atendentes`,
      sender: "system",
      text: `${atendentesDisponiveis.length} atendentes disponíveis encontrados`,
      timestamp: new Date()
    });

    let resultStatus: "success" | "waiting" | "error" = "waiting";
    let atendenteNome = "Nenhum disponível";
    
    if (atendentesDisponiveis.length > 0) {
      const cargaPorAtendente = new Map();
      conversasAtivas?.forEach(conv => {
        const count = cargaPorAtendente.get(conv.atendente_atual_id) || 0;
        cargaPorAtendente.set(conv.atendente_atual_id, count + 1);
      });

      const tipoRoteamento = filaEscolhida?.tipo_roteamento || "round_robin";
      let atendenteEscolhido = atendentesDisponiveis[0];

      if (tipoRoteamento === "por_disponibilidade") {
        atendenteEscolhido = atendentesDisponiveis.reduce((prev, curr) => {
          const prevCarga = cargaPorAtendente.get(prev.id) || 0;
          const currCarga = cargaPorAtendente.get(curr.id) || 0;
          return currCarga < prevCarga ? curr : prev;
        });
      }

      atendenteNome = atendenteEscolhido.usuarios?.nome || "Atendente";
      const cargaAtual = cargaPorAtendente.get(atendenteEscolhido.id) || 0;
      const atendenteSkills = atendenteEscolhido.atendente_skills || [];

      contextVariables.atendente_id = atendenteEscolhido.id;
      contextVariables.atendente_nome = atendenteNome;
      contextVariables.atendente_carga = cargaAtual;
      contextVariables.atendente_skills = atendenteSkills.map((s: any) => ({
        nome: s.skills?.nome,
        nivel: s.nivel
      }));

      const atendenteStartTime = Date.now();
      addSimulationTrace(simulationId, {
        blockId: "atendente",
        blockLabel: "Seleção de Atendente",
        blockType: "agent-selection",
        timestamp: new Date(),
        variables: { ...contextVariables },
        conditions: [
          {
            condition: "Atendente disponível?",
            result: true,
            reason: `${atendenteNome} está ${atendenteEscolhido.simulatedStatus}`
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
          }
        ],
        decision: {
          action: "Conectar com atendente",
          reason: `${atendenteNome} selecionado via regra: ${tipoRoteamento}`,
          nextBlock: "chat-ativo"
        },
        duration: Date.now() - atendenteStartTime
      });

      addSimulationMessage(simulationId, {
        id: `${Date.now()}-conectado`,
        sender: "bot",
        text: `Você foi conectado com ${atendenteNome}. Como posso ajudar?`,
        timestamp: new Date()
      });

      resultStatus = "success";
    } else {
      addSimulationMessage(simulationId, {
        id: `${Date.now()}-fila-espera`,
        sender: "system",
        text: "Nenhum atendente disponível. Chat será mantido em fila de espera.",
        timestamp: new Date()
      });
    }

    // Finalizar simulação
    const tempoTotal = Date.now() - startTime;
    const mockResult: Simulation['result'] = {
      atendenteNome,
      filaNome: filaEscolhida?.nome || "Fila Padrão",
      tempoTotal,
      status: resultStatus,
    };

    setSimulations(prev => prev.map(sim => 
      sim.id === simulationId 
        ? { 
            ...sim, 
            status: "completed" as const,
            endTime: new Date(),
            result: mockResult,
          }
        : sim
    ));
  };

  const addSimulationMessage = (simulationId: string, message: ChatMessage) => {
    console.log(`Adding message to ${simulationId}:`, message);
    setSimulations(prev => prev.map(sim => 
      sim.id === simulationId 
        ? { ...sim, chatMessages: [...sim.chatMessages, message] }
        : sim
    ));
  };

  const addSimulationTrace = (simulationId: string, trace: BlockExecution) => {
    console.log(`Adding trace to ${simulationId}:`, trace.blockType, trace.blockLabel);
    setSimulations(prev => prev.map(sim => 
      sim.id === simulationId 
        ? { ...sim, executionTrace: [...sim.executionTrace, trace] }
        : sim
    ));
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Teste de Roteamento Avançado
          </h1>
          <p className="text-muted-foreground mt-2">
            Simule múltiplos cenários simultaneamente
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Users className="w-4 h-4 mr-2" />
          {simulations.length} Simulaç{simulations.length === 1 ? 'ão' : 'ões'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Configuração & Controle de Atendentes */}
        <div className="space-y-6">
          {/* Configuração */}
          <Card className="p-6 space-y-4 bg-gradient-to-br from-background to-muted/20">
            <div className="flex items-center gap-2 mb-4">
              <Play className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Nova Simulação</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="canal" className="text-sm font-medium">Canal *</Label>
                <Select value={selectedCanal} onValueChange={setSelectedCanal}>
                  <SelectTrigger id="canal" className="mt-1.5">
                    <SelectValue placeholder="Selecione o canal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="telegram">Telegram</SelectItem>
                    <SelectItem value="webchat">WebChat</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cliente" className="text-sm font-medium">Cliente</Label>
                <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                  <SelectTrigger id="cliente" className="mt-1.5">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes?.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="bot" className="text-sm font-medium">Bot</Label>
                <Select value={selectedBot} onValueChange={setSelectedBot}>
                  <SelectTrigger id="bot" className="mt-1.5">
                    <SelectValue placeholder="Opcional" />
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
                <Label htmlFor="fluxo" className="text-sm font-medium">Workflow</Label>
                <Select value={selectedFluxo} onValueChange={setSelectedFluxo}>
                  <SelectTrigger id="fluxo" className="mt-1.5">
                    <SelectValue placeholder="Opcional" />
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

            <Button
              onClick={createNewSimulation}
              disabled={!selectedCanal}
              className="w-full mt-4"
              size="lg"
            >
              <Play className="w-4 h-4 mr-2" />
              Iniciar Nova Simulação
            </Button>
          </Card>

          {/* Status do Sistema */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Status do Sistema</h3>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <span>Atendentes Disponíveis</span>
                <Badge variant="default" className="bg-green-600">
                  {simulatedAtendentes.filter(a => a.simulatedStatus === "disponivel" && a.simulatedAcceptsNew).length}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                <span>Atendentes Ocupados</span>
                <Badge variant="outline" className="border-yellow-600 text-yellow-600">
                  {simulatedAtendentes.filter(a => a.simulatedStatus === "ocupado").length}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span>Filas Ativas</span>
                <Badge variant="outline">{filas?.length || 0}</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span>Chats Ativos</span>
                <Badge variant="outline">{conversasAtivas?.length || 0}</Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* Simulações & Resultados */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <Tabs defaultValue="visual" className="w-full">
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="visual">Simulação Visual</TabsTrigger>
                  <TabsTrigger value="lista">Lista de Simulações</TabsTrigger>
                </TabsList>
                <Badge variant="secondary">
                  {simulations.filter(s => s.status === "running").length} em execução
                </Badge>
              </div>

              <TabsContent value="visual" className="mt-0">
                {simulations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Play className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Nenhuma simulação criada ainda</p>
                    <p className="text-sm mt-1">Configure os parâmetros e inicie uma simulação</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Canvas Visual */}
                    <div className="border rounded-lg overflow-hidden">
                      <FlowSimulationCanvas
                        simulation={simulations[simulations.length - 1]}
                        bots={bots || []}
                        fluxos={fluxos || []}
                      />
                    </div>

                    {/* Chat Interativo */}
                    <Card className="p-4 flex flex-col h-[600px]">
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                        <Send className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold">Chat da Simulação</h3>
                        <Badge variant="outline" className="ml-auto">
                          {simulations[simulations.length - 1].chatMessages.length} mensagens
                        </Badge>
                      </div>

                      <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-3">
                          {simulations[simulations.length - 1].chatMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={cn(
                                "p-3 rounded-lg text-sm",
                                msg.sender === "system" && "bg-orange-50 dark:bg-orange-950/40 border border-orange-200",
                                msg.sender === "bot" && "bg-blue-50 dark:bg-blue-950/40 border border-blue-200",
                                msg.sender === "user" && "bg-primary text-primary-foreground ml-auto max-w-[85%]"
                              )}
                            >
                              <div className="flex items-start gap-2">
                                {msg.sender === "system" && <Zap className="w-4 h-4 shrink-0 mt-0.5" />}
                                {msg.sender === "bot" && <Bot className="w-4 h-4 shrink-0 mt-0.5" />}
                                {msg.sender === "user" && <User className="w-4 h-4 shrink-0 mt-0.5" />}
                                <div className="flex-1 min-w-0">
                                  <div className="break-words">{msg.text}</div>
                                  <div className="text-xs opacity-70 mt-1">
                                    {msg.timestamp.toLocaleTimeString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      <div className="mt-4 pt-3 border-t">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Digite uma mensagem..."
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && e.currentTarget.value.trim()) {
                                const lastSim = simulations[simulations.length - 1];
                                const newMsg: ChatMessage = {
                                  id: `user-${Date.now()}`,
                                  sender: "user",
                                  text: e.currentTarget.value.trim(),
                                  timestamp: new Date()
                                };
                                
                                setSimulations(prev => prev.map(sim => 
                                  sim.id === lastSim.id 
                                    ? { ...sim, chatMessages: [...sim.chatMessages, newMsg] }
                                    : sim
                                ));
                                
                                e.currentTarget.value = "";
                              }
                            }}
                          />
                          <Button size="icon" variant="default">
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="lista" className="mt-0">
                {simulations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Play className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Nenhuma simulação criada ainda</p>
                <p className="text-sm mt-1">Configure os parâmetros e inicie uma simulação</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-4 pr-4">
                  {simulations.map((sim) => (
                    <Card 
                      key={sim.id}
                      className="p-4 transition-all hover:shadow-lg"
                    >
                      {/* Header da Simulação */}
                      <div className="flex items-start justify-between mb-3 pb-3 border-b">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{sim.name}</h3>
                            <Badge 
                              variant={sim.status === "running" ? "default" : sim.status === "completed" ? "secondary" : "destructive"}
                            >
                              {sim.status === "running" && "Em execução"}
                              {sim.status === "completed" && "Concluída"}
                              {sim.status === "error" && "Erro"}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                            <div>Canal: <span className="font-medium">{sim.config.canal}</span></div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {sim.startTime.toLocaleTimeString()}
                              {sim.endTime && ` → ${sim.endTime.toLocaleTimeString()}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => duplicateSimulation(sim.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteSimulation(sim.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Resultado da Simulação */}
                      {sim.result && (
                        <div className={cn(
                          "mb-4 p-3 rounded-lg text-sm",
                          sim.result.status === "success" && "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900",
                          sim.result.status === "waiting" && "bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900",
                          sim.result.status === "error" && "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900"
                        )}>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">
                              {sim.result.status === "success" && "✓ Roteado com sucesso"}
                              {sim.result.status === "waiting" && "⏱ Em fila de espera"}
                              {sim.result.status === "error" && "✗ Erro no roteamento"}
                            </span>
                            <Badge variant="outline">{sim.result.tempoTotal}ms</Badge>
                          </div>
                          <div className="text-xs mt-2 space-y-1">
                            <div>Fila: <span className="font-medium">{sim.result.filaNome}</span></div>
                            <div>Atendente: <span className="font-medium">{sim.result.atendenteNome}</span></div>
                          </div>
                        </div>
                      )}

                      {/* Chat da Simulação */}
                      {sim.chatMessages.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Send className="w-4 h-4 text-primary" />
                            <h4 className="font-medium text-sm">Chat ({sim.chatMessages.length} mensagens)</h4>
                          </div>
                          <div className="border rounded-lg bg-muted/30 p-3 max-h-[200px] overflow-y-auto space-y-2">
                            {sim.chatMessages.map((msg) => (
                              <div
                                key={msg.id}
                                className={cn(
                                  "p-2 rounded text-xs",
                                  msg.sender === "system" && "bg-orange-100 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900",
                                  msg.sender === "bot" && "bg-blue-100 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900",
                                  msg.sender === "user" && "bg-primary text-primary-foreground ml-auto max-w-[80%]"
                                )}
                              >
                                <div className="flex items-start gap-1.5">
                                  {msg.sender === "system" && <Zap className="w-3 h-3 shrink-0 mt-0.5" />}
                                  {msg.sender === "bot" && <Bot className="w-3 h-3 shrink-0 mt-0.5" />}
                                  {msg.sender === "user" && <User className="w-3 h-3 shrink-0 mt-0.5" />}
                                  <div className="flex-1 min-w-0">
                                    <div className="break-words">{msg.text}</div>
                                    <div className="text-[10px] opacity-70 mt-0.5">
                                      {msg.timestamp.toLocaleTimeString()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fluxo Bot Detalhado */}
                      {(() => {
                        const botTraces = sim.executionTrace.filter(t => t.blockType.startsWith('bot-'));
                        console.log(`Simulação ${sim.id} - Bot traces:`, botTraces.length);
                        return botTraces.length > 0 && (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Bot className="w-4 h-4 text-blue-500" />
                              <h4 className="font-medium text-sm">Fluxo do Bot</h4>
                              <Badge variant="secondary" className="text-xs">
                                {botTraces.length} blocos
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              {botTraces.map((trace, idx) => (
                                <div key={`bot-${idx}`} className="border rounded-lg p-3 bg-blue-50/50 dark:bg-blue-950/20">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-sm">{trace.blockLabel}</span>
                                    <Badge variant="outline" className="text-xs">{trace.duration}ms</Badge>
                                  </div>
                                  
                                  {Object.keys(trace.variables).length > 0 && (
                                    <div className="mb-2">
                                      <div className="text-xs font-medium mb-1 text-muted-foreground">Variáveis:</div>
                                      <div className="space-y-1">
                                        {Object.entries(trace.variables)
                                          .filter(([key]) => key.startsWith('node_') || key === 'message_sent' || key === 'awaiting_response')
                                          .map(([key, value]) => (
                                            <div key={key} className="text-xs bg-background/50 rounded px-2 py-1">
                                              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{key}:</span>{" "}
                                              <span className="break-all">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  )}

                                  {trace.conditions.length > 0 && (
                                    <div className="mb-2">
                                      <div className="text-xs font-medium mb-1 text-muted-foreground">Condições:</div>
                                      <div className="space-y-1">
                                        {trace.conditions.map((cond, i) => (
                                          <div 
                                            key={i}
                                            className={cn(
                                              "text-xs rounded px-2 py-1 border-l-2",
                                              cond.result 
                                                ? "bg-green-50 dark:bg-green-950/20 border-green-500" 
                                                : "bg-red-50 dark:bg-red-950/20 border-red-500"
                                            )}
                                          >
                                            <div className="font-medium">{cond.result ? "✓" : "✗"} {cond.condition}</div>
                                            <div className="text-muted-foreground italic">{cond.reason}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="text-xs bg-blue-100/50 dark:bg-blue-900/20 rounded px-2 py-1.5">
                                    <div className="font-semibold mb-0.5">{trace.decision.action}</div>
                                    <div className="text-muted-foreground">{trace.decision.reason}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Fluxo Workflow Detalhado */}
                      {(() => {
                        const workflowTraces = sim.executionTrace.filter(t => t.blockType.startsWith('workflow-'));
                        console.log(`Simulação ${sim.id} - Workflow traces:`, workflowTraces.length);
                        return workflowTraces.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Layers className="w-4 h-4 text-purple-500" />
                              <h4 className="font-medium text-sm">Fluxo Workflow Omnichannel</h4>
                              <Badge variant="secondary" className="text-xs">
                                {workflowTraces.length} blocos
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              {workflowTraces.map((trace, idx) => (
                                <div key={`workflow-${idx}`} className="border rounded-lg p-3 bg-purple-50/50 dark:bg-purple-950/20">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-sm">{trace.blockLabel}</span>
                                    <Badge variant="outline" className="text-xs">{trace.duration}ms</Badge>
                                  </div>
                                  
                                  {Object.keys(trace.variables).length > 0 && (
                                    <div className="mb-2">
                                      <div className="text-xs font-medium mb-1 text-muted-foreground">Verificações:</div>
                                      <div className="space-y-1">
                                        {Object.entries(trace.variables)
                                          .filter(([key]) => 
                                            key.startsWith('workflow_') || 
                                            key === 'horario_atual' || 
                                            key === 'dentro_horario' ||
                                            key === 'fila_selecionada' ||
                                            key === 'skill_necessaria'
                                          )
                                          .map(([key, value]) => (
                                            <div key={key} className="text-xs bg-background/50 rounded px-2 py-1">
                                              <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">{key}:</span>{" "}
                                              <span className="break-all">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  )}

                                  {trace.conditions.length > 0 && (
                                    <div className="mb-2">
                                      <div className="text-xs font-medium mb-1 text-muted-foreground">Validações:</div>
                                      <div className="space-y-1">
                                        {trace.conditions.map((cond, i) => (
                                          <div 
                                            key={i}
                                            className={cn(
                                              "text-xs rounded px-2 py-1 border-l-2",
                                              cond.result 
                                                ? "bg-green-50 dark:bg-green-950/20 border-green-500" 
                                                : "bg-red-50 dark:bg-red-950/20 border-red-500"
                                            )}
                                          >
                                            <div className="font-medium">{cond.result ? "✓" : "✗"} {cond.condition}</div>
                                            <div className="text-muted-foreground italic">{cond.reason}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="text-xs bg-purple-100/50 dark:bg-purple-900/20 rounded px-2 py-1.5">
                                    <div className="font-semibold mb-0.5">{trace.decision.action}</div>
                                    <div className="text-muted-foreground">{trace.decision.reason}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Controle de Atendentes */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Controle de Atendentes</h3>
          </div>

          <ScrollArea className="h-[700px]">
            <div className="space-y-3 pr-4">
              {simulatedAtendentes.map((atendente: any) => {
                const carga = conversasAtivas?.filter(c => c.atendente_atual_id === atendente.id).length || 0;
                const atendenteSkills = atendente.atendente_skills || [];
                
                return (
                  <Card key={atendente.id} className="p-4 bg-muted/30">
                    <div className="font-medium mb-3">{atendente.usuarios?.nome}</div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <Button
                        size="sm"
                        variant={atendente.simulatedStatus === "disponivel" ? "default" : "outline"}
                        onClick={() => toggleAtendenteStatus(atendente.id, "disponivel")}
                        className="h-8 text-xs"
                      >
                        Disponível
                      </Button>
                      <Button
                        size="sm"
                        variant={atendente.simulatedStatus === "ocupado" ? "default" : "outline"}
                        onClick={() => toggleAtendenteStatus(atendente.id, "ocupado")}
                        className="h-8 text-xs"
                      >
                        Ocupado
                      </Button>
                      <Button
                        size="sm"
                        variant={atendente.simulatedStatus === "ausente" ? "default" : "outline"}
                        onClick={() => toggleAtendenteStatus(atendente.id, "ausente")}
                        className="h-8 text-xs"
                      >
                        Ausente
                      </Button>
                      <Button
                        size="sm"
                        variant={atendente.simulatedStatus === "offline" ? "default" : "outline"}
                        onClick={() => toggleAtendenteStatus(atendente.id, "offline")}
                        className="h-8 text-xs"
                      >
                        Offline
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 mb-3 p-2 bg-background rounded">
                      <Switch
                        checked={atendente.simulatedAcceptsNew}
                        onCheckedChange={() => toggleAtendenteAcceptsNew(atendente.id)}
                      />
                      <span className="text-xs">Aceita novos chats</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between p-2 bg-background rounded">
                        <span>Carga:</span>
                        <Badge variant="outline">{carga}/{atendente.max_chats_simultaneos}</Badge>
                      </div>
                      
                      {atendenteSkills.length > 0 && (
                        <div className="p-2 bg-background rounded">
                          <div className="font-medium mb-1">Skills:</div>
                          <div className="flex flex-wrap gap-1">
                            {atendenteSkills.map((as: any) => (
                              <Badge key={as.skill_id} variant="secondary" className="text-xs">
                                {as.skills?.nome} N{as.nivel}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="p-2 bg-background rounded">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">Empresas vinculadas:</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedAtendenteForVinculo(atendente.id);
                              setShowVinculoDialog(true);
                            }}
                            className="h-5 w-5 p-0"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        {atendente.simulatedVinculos?.length > 0 ? (
                          <div className="space-y-1">
                            {atendente.simulatedVinculos.map((empresa: any) => (
                              <div key={empresa.id} className="flex items-center justify-between">
                                <span className="text-xs">• {empresa.nome}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeVinculoEmpresa(atendente.id, empresa.id)}
                                  className="h-4 w-4 p-0"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Nenhum vínculo</span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
