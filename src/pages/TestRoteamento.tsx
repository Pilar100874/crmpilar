import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, AlertCircle, Play, Send, Bot, User, Zap } from "lucide-react";
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
    initializeFlowBlocks();

    const steps: RouteStep[] = [];
    
    // Mensagem inicial do sistema
    addSystemMessage(`Simulação iniciada - Canal: ${selectedCanal}`);

    // Passo 1: Canal de entrada
    await new Promise(resolve => setTimeout(resolve, 1000));
    setFlowBlocks(prev => prev.map(b => b.id === "entrada" ? { ...b, status: "active" } : b));
    addSystemMessage("Cliente conectado, iniciando atendimento...");
    
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
      
      const botFlowData = bot?.flow_data as any;
      if (botFlowData?.nodes && Array.isArray(botFlowData.nodes)) {
        // Processar cada nó do bot
        for (const node of botFlowData.nodes) {
          await new Promise(resolve => setTimeout(resolve, 800));
          const blockId = `bot-${node.id}`;
          
          setFlowBlocks(prev => prev.map(b => b.id === blockId ? { ...b, status: "active" } : b));
          
          const label = node.data?.label || node.data?.type || 'Etapa';
          addBotMessage(`[${label}] Processando...`);
          
          await new Promise(resolve => setTimeout(resolve, 600));
          
          setFlowBlocks(prev => prev.map(b => b.id === blockId ? { ...b, status: "completed" } : b));
          setCurrentBlockIndex(prev => prev + 1);
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setFlowBlocks(prev => prev.map(b => b.id === "bot-generic" ? { ...b, status: "active" } : b));
        addBotMessage(`Olá! Sou o bot ${bot?.name}. Como posso ajudar?`);
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
      
      const fluxoFlowData = fluxo?.flow_data as any;
      if (fluxoFlowData?.nodes && Array.isArray(fluxoFlowData.nodes)) {
        // Processar cada nó do workflow
        for (const node of fluxoFlowData.nodes) {
          await new Promise(resolve => setTimeout(resolve, 800));
          const blockId = `workflow-${node.id}`;
          
          setFlowBlocks(prev => prev.map(b => b.id === blockId ? { ...b, status: "active" } : b));
          
          const label = node.data?.label || node.data?.type || 'Etapa';
          addSystemMessage(`[${label}] Executando bloco...`);
          
          await new Promise(resolve => setTimeout(resolve, 600));
          
          setFlowBlocks(prev => prev.map(b => b.id === blockId ? { ...b, status: "completed" } : b));
          setCurrentBlockIndex(prev => prev + 1);
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setFlowBlocks(prev => prev.map(b => b.id === "workflow-generic" ? { ...b, status: "active" } : b));
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
      await new Promise(resolve => setTimeout(resolve, 800));
      setFlowBlocks(prev => prev.map(b => b.id === "fila" ? { ...b, status: "active" } : b));
      setCurrentBlockIndex(prev => prev + 1);
      
      const filaEscolhida = filas[0];
      addSystemMessage(`Direcionando para fila: ${filaEscolhida.nome}`);
      
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
      if (atendentes && atendentes.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 800));
        setFlowBlocks(prev => prev.map(b => b.id === "atendente" ? { ...b, status: "active" } : b));
        
        // Filtrar atendentes disponíveis
        addSystemMessage("Analisando atendentes disponíveis...");
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const atendentesDisponiveis = atendentes.filter(a => 
          a.status === "disponivel" && a.aceita_novos_chats
        );
        
        addSystemMessage(`${atendentesDisponiveis.length} atendentes disponíveis encontrados`);
        
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
          addSystemMessage(`Seleção baseada em carteira fixa`);
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
        
        const cargaAtual = cargaPorAtendente.get(atendenteEscolhido.id) || 0;
        addSystemMessage(`Conectando com ${atendenteEscolhido.usuarios?.nome}...`);
        addSystemMessage(`Carga atual: ${cargaAtual}/${atendenteEscolhido.max_chats_simultaneos} chats`);
        
        steps.push({
          step: steps.length + 1,
          type: "Atendente Selecionado",
          description: `Atendente "${atendenteEscolhido.usuarios?.nome}" designado`,
          detail: `Status: ${atendenteEscolhido.status} | Carga: ${cargaAtual}/${atendenteEscolhido.max_chats_simultaneos} | Skills: ${atendenteSkills.length}`,
          status: "success",
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        setFlowBlocks(prev => prev.map(b => b.id === "atendente" ? { ...b, status: "completed" } : b));
        addBotMessage(`Você foi conectado com ${atendenteEscolhido.usuarios?.nome}. Como posso ajudar?`);
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
        setFlowBlocks(prev => prev.map(b => b.id === "atendente" ? { ...b, status: "active" } : b));
        addSystemMessage("Nenhum atendente disponível no momento");
        addSystemMessage("Chat será mantido em fila de espera");
        
        steps.push({
          step: steps.length + 1,
          type: "Fila de Espera",
          description: "Nenhum atendente disponível",
          detail: "Chat permanecerá em fila de espera até que um atendente fique disponível",
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
        {simulationStarted && atendentes && atendentes.length > 0 && (
          <Card className="p-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Atendentes Disponíveis</h2>
            </div>

            <ScrollArea className="h-[300px]">
              <div className="space-y-3 pr-4">
                {atendentes.map((atendente: any) => {
                  const carga = conversasAtivas?.filter(c => c.atendente_atual_id === atendente.id).length || 0;
                  const atendenteSkills = atendente.atendente_skills || [];
                  
                  return (
                    <div key={atendente.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{atendente.usuarios?.nome}</span>
                        <Badge 
                          variant={
                            atendente.status === "disponivel" ? "default" : 
                            atendente.status === "ocupado" ? "secondary" : 
                            "outline"
                          }
                        >
                          {atendente.status}
                        </Badge>
                      </div>
                      
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Carga:</span>
                          <span className="font-medium">
                            {carga}/{atendente.max_chats_simultaneos}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Aceita novos:</span>
                          <span className={atendente.aceita_novos_chats ? "text-green-600" : "text-red-600"}>
                            {atendente.aceita_novos_chats ? "Sim" : "Não"}
                          </span>
                        </div>
                        
                        {atendenteSkills.length > 0 && (
                          <div className="pt-2">
                            <span className="text-muted-foreground">Skills:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {atendenteSkills.map((as: any) => (
                                <Badge key={as.skill_id} variant="outline" className="text-xs">
                                  {as.skills?.nome} (N{as.nivel})
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
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
    </div>
  );
}
