import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowRight, ArrowLeft, Play, Send, Bot, User, Zap, 
  Users, Activity, CheckCircle2, AlertCircle, Circle, Network, MessageSquare, Plus, X, Clock,
  UserCog, ChevronDown
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/lib/toast-config";
import { cn } from "@/lib/utils";
import FlowSimulationCanvas, { FlowSimulationCanvasRef } from "@/components/routing/FlowSimulationCanvas";
import OmnichannelWorkflowViewer from "@/components/routing/OmnichannelWorkflowViewer";
import ChannelAdaptedChat from "@/components/routing/ChannelAdaptedChat";

interface ChatMessage {
  id: string;
  sender: "user" | "bot" | "system";
  text: string;
  timestamp: Date;
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
  executionTrace: any[];
  routedTo?: {
    type: 'fila' | 'atendente';
    filaId?: string;
    atendenteId?: string;
    filaNome?: string;
    atendenteNome?: string;
  };
}

export default function TestRoteamento() {
  const [currentStep, setCurrentStep] = useState(2);
  const [selectedCanal, setSelectedCanal] = useState<string | undefined>();
  const [selectedBot, setSelectedBot] = useState<string | undefined>();
  const [selectedFluxo, setSelectedFluxo] = useState<string | undefined>();
  const [selectedCliente, setSelectedCliente] = useState<string | undefined>();
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [selectedSimulationId, setSelectedSimulationId] = useState<string | null>(null);
  const [simulatedAtendentes, setSimulatedAtendentes] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [atendentesExpanded, setAtendentesExpanded] = useState(true);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const flowSimulationRef = useRef<FlowSimulationCanvasRef>(null);
  
  const activeSimulation = simulations.find(s => s.id === selectedSimulationId) || null;

  // Buscar dados
  const { data: bots } = useQuery({
    queryKey: ["bots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bot_flows")
        .select("id, name, active, flow_data, canais, whatsapp_type");
      if (error) throw error;
      return data || [];
    },
  });

  // Filtrar bots por canal selecionado
  const availableBots = bots?.filter((bot) => {
    if (!selectedCanal) return true;
    
    // Se não tem canais definidos, mostrar para todos
    if (!bot.canais || bot.canais.length === 0) return true;
    
    // Para WhatsApp, verificar o tipo (business ou waha)
    if (selectedCanal === "whatsapp") {
      return bot.canais.includes("whatsapp");
    }
    
    // Para outros canais, verificar se está na lista
    return bot.canais.includes(selectedCanal);
  }) || [];

  // Limpar bot selecionado se não estiver mais disponível para o canal
  useEffect(() => {
    if (selectedBot && !availableBots.find(b => b.id === selectedBot)) {
      setSelectedBot(undefined);
      toast.info("Bot não disponível para este canal");
    }
  }, [selectedCanal, availableBots, selectedBot]);

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

  const { data: clientes } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, nome, telefone")
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: atendentes } = useQuery({
    queryKey: ["atendentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atendentes")
        .select(`
          id,
          status,
          max_chats_simultaneos,
          aceita_novos_chats,
          usuarios!inner(id, nome),
          atendente_skills(skill_id, nivel, skills(nome))
        `);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: filas } = useQuery({
    queryKey: ["filas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("filas_atendimento")
        .select(`
          id,
          nome,
          ativa,
          prioridade,
          max_chats_por_atendente,
          tipo_roteamento
        `);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: conversasAtivas } = useQuery({
    queryKey: ["active-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, atendente_atual_id, chat_status, fila_id")
        .in("chat_status", ["em_atendimento", "em_fila", "aguardando_cliente"]);
      if (error) throw error;
      return data || [];
    },
  });

  // Inicializar atendentes simulados
  useEffect(() => {
    if (atendentes && atendentes.length > 0) {
      setSimulatedAtendentes(
        atendentes.map((a) => ({
          ...a,
          simulatedStatus: a.status || "offline",
          simulatedAcceptsNew: a.aceita_novos_chats ?? false,
        }))
      );
    }
  }, [atendentes]);

  const toggleAtendenteStatus = (atendenteId: string, newStatus: string) => {
    setSimulatedAtendentes(prev =>
      prev.map(a =>
        a.id === atendenteId ? { ...a, simulatedStatus: newStatus } : a
      )
    );
    toast.success(`Status do atendente alterado para ${newStatus}`);
  };

  const toggleAtendenteAcceptsNew = (atendenteId: string) => {
    setSimulatedAtendentes(prev =>
      prev.map(a =>
        a.id === atendenteId ? { ...a, simulatedAcceptsNew: !a.simulatedAcceptsNew } : a
      )
    );
  };

  const startSimulation = () => {
    if (!selectedCanal) {
      toast.error("Selecione um canal para continuar");
      return;
    }

    if (simulations.length >= 6) {
      toast.error("Máximo de 6 simulações simultâneas atingido");
      return;
    }

    const newSimulation: Simulation = {
      id: `sim-${Date.now()}`,
      name: `Simulação ${simulations.length + 1}`,
      status: "running",
      startTime: new Date(),
      config: {
        canal: selectedCanal,
        botId: selectedBot || undefined,
        fluxoId: selectedFluxo || undefined,
        cliente: selectedCliente || undefined,
      },
      chatMessages: [],
      executionTrace: [],
    };

    setSimulations(prev => [...prev, newSimulation]);
    setSelectedSimulationId(newSimulation.id);
    setCurrentStep(2);
    setConfigDialogOpen(false);
    
    toast.success("Simulação iniciada!");
  };

  const removeSimulation = (simId: string) => {
    setSimulations(prev => prev.filter(s => s.id !== simId));
    if (selectedSimulationId === simId) {
      const remaining = simulations.filter(s => s.id !== simId);
      setSelectedSimulationId(remaining.length > 0 ? remaining[0].id : null);
      if (remaining.length === 0) {
        setCurrentStep(1);
      }
    }
    toast.success("Simulação removida");
  };

  const resetAllSimulations = () => {
    setSimulations([]);
    setSelectedSimulationId(null);
    setCurrentStep(1);
    setSelectedCanal(undefined);
    setSelectedBot(undefined);
    setSelectedFluxo(undefined);
    setSelectedCliente(undefined);
    toast.success("Todas simulações foram limpas");
  };

  const addNewSimulation = () => {
    setCurrentStep(1);
    setSelectedCanal(undefined);
    setSelectedBot(undefined);
    setSelectedFluxo(undefined);
    setSelectedCliente(undefined);
  };

  const addMessageToChat = (simulationId: string, message: ChatMessage) => {
    setSimulations(prev => prev.map(sim => 
      sim.id === simulationId 
        ? { ...sim, chatMessages: [...sim.chatMessages, message] }
        : sim
    ));
  };

  const sendUserMessage = async (text: string) => {
    if (!selectedSimulationId || !text.trim()) return;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date(),
    };

    // Adicionar mensagem do usuário
    addMessageToChat(selectedSimulationId, newMessage);
    
    // Se o FlowSimulationCanvas estiver aguardando input, processar a resposta
    if (flowSimulationRef.current?.isWaitingForInput()) {
      console.log('📥 Enviando resposta para simulação:', text);
      flowSimulationRef.current.processUserResponse(text);
    }
    
    setChatInput("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Simulador de Roteamento</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Teste cenários de atendimento em tempo real
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={resetAllSimulations}
                variant="outline"
                size="sm"
              >
                Limpar Todas Simulações
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog de Configuração */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure sua Simulação</DialogTitle>
            <DialogDescription>
              Selecione os parâmetros para testar o roteamento
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="canal" className="text-base font-medium">Canal *</Label>
                      <Select value={selectedCanal} onValueChange={setSelectedCanal}>
                        <SelectTrigger id="canal" className="mt-2">
                          <SelectValue placeholder="Selecione o canal de entrada" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp">
                            WhatsApp ({bots?.filter(b => b.canais?.includes("whatsapp")).length || 0} bots, {bots?.filter(b => b.canais?.includes("whatsapp") && b.active).length || 0} ativos)
                          </SelectItem>
                          <SelectItem value="instagram">
                            Instagram ({bots?.filter(b => b.canais?.includes("instagram")).length || 0} bots, {bots?.filter(b => b.canais?.includes("instagram") && b.active).length || 0} ativos)
                          </SelectItem>
                          <SelectItem value="facebook">
                            Facebook ({bots?.filter(b => b.canais?.includes("facebook")).length || 0} bots, {bots?.filter(b => b.canais?.includes("facebook") && b.active).length || 0} ativos)
                          </SelectItem>
                          <SelectItem value="telegram">
                            Telegram ({bots?.filter(b => b.canais?.includes("telegram")).length || 0} bots, {bots?.filter(b => b.canais?.includes("telegram") && b.active).length || 0} ativos)
                          </SelectItem>
                          <SelectItem value="webchat">
                            WebChat ({bots?.filter(b => b.canais?.includes("webchat")).length || 0} bots, {bots?.filter(b => b.canais?.includes("webchat") && b.active).length || 0} ativos)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {selectedCanal === "whatsapp" && bots && bots.length > 0 && (
                        <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs font-medium mb-2">
                            Tipos de WhatsApp disponíveis:
                          </p>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>
                              Business: {bots.filter(b => b.canais?.includes("whatsapp") && b.whatsapp_type === "business").length} ({bots.filter(b => b.canais?.includes("whatsapp") && b.whatsapp_type === "business" && b.active).length} ativos)
                            </span>
                            <span>
                              Evolution: {bots.filter(b => b.canais?.includes("whatsapp") && b.whatsapp_type === "waha").length} ({bots.filter(b => b.canais?.includes("whatsapp") && b.whatsapp_type === "waha" && b.active).length} ativos)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="bot" className="text-base font-medium">Bot (Opcional)</Label>
                      <Select 
                        value={selectedBot} 
                        onValueChange={(val) => setSelectedBot(val || undefined)}
                        disabled={!selectedCanal}
                      >
                        <SelectTrigger id="bot" className="mt-2">
                          <SelectValue placeholder={selectedCanal ? "Selecione um bot (opcional)" : "Selecione um canal primeiro"} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableBots.length > 0 ? (
                            availableBots.map((bot) => (
                              <SelectItem key={bot.id} value={bot.id}>
                                <div className="flex items-center gap-2">
                                  {bot.active && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                  )}
                                  <span>
                                    {bot.name}
                                    {bot.whatsapp_type && selectedCanal === "whatsapp" 
                                      ? ` (${bot.whatsapp_type === "business" ? "Business" : "Evolution"})`
                                      : ""
                                    }
                                    {bot.active && (
                                      <Badge variant="outline" className="ml-2 text-[10px] h-4 px-1.5 border-green-600 text-green-600">
                                        ATIVO
                                      </Badge>
                                    )}
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              Nenhum bot disponível para {selectedCanal || "este canal"}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {selectedCanal && availableBots.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          ⚠️ Não há bots configurados para o canal {selectedCanal}
                        </p>
                      )}
                      {selectedCanal && availableBots.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          ✓ {availableBots.length} bot(s) disponível(is) para {selectedCanal}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="fluxo" className="text-base font-medium">Workflow Omnichannel (Opcional)</Label>
                      <Select value={selectedFluxo} onValueChange={(val) => setSelectedFluxo(val || undefined)}>
                        <SelectTrigger id="fluxo" className="mt-2">
                          <SelectValue placeholder="Selecione um workflow (opcional)" />
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

                    <div>
                      <Label htmlFor="cliente" className="text-base font-medium">Cliente (Opcional)</Label>
                      <Select value={selectedCliente} onValueChange={(val) => setSelectedCliente(val || undefined)}>
                        <SelectTrigger id="cliente" className="mt-2">
                          <SelectValue placeholder="Selecione um cliente (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {clientes?.map((cliente) => (
                            <SelectItem key={cliente.id} value={cliente.id}>
                              {cliente.nome} - {cliente.telefone}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button
                        onClick={startSimulation}
                        disabled={!selectedCanal || simulations.length >= 6}
                        size="lg"
                      >
                        Iniciar Simulação
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 gap-6">
          {/* Main Area */}
          <div>
            <div className="space-y-6">
                {/* Controles e Seletor de Simulações */}
                <Card className="p-4">
                  <div className="flex flex-col gap-4">

                    {/* Tabs de Simulações */}
                    <div className="pt-3">
                      <div className="text-xs text-muted-foreground mb-2 px-1">Simulações Ativas:</div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                        {simulations.map((sim, index) => (
                          <Card 
                            key={sim.id} 
                            className={cn(
                              "relative p-3 cursor-pointer transition-all border-2 hover:shadow-lg",
                              selectedSimulationId === sim.id 
                                ? "border-primary bg-primary/10 shadow-md" 
                                : "border-border hover:border-primary/50"
                            )}
                            onClick={() => {
                              console.log('🔀 Trocando para simulação:', sim.id, sim.name);
                              setSelectedSimulationId(sim.id);
                              toast.info(`Visualizando: ${sim.name}`);
                            }}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSimulation(sim.id);
                              }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                            <div className="text-sm font-semibold mb-1 flex items-center gap-1">
                              {sim.name}
                              {selectedSimulationId === sim.id && (
                                <CheckCircle2 className="w-3 h-3 text-primary" />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground truncate mb-1">
                              {sim.config.canal}
                            </div>
                            {sim.config.botId && (
                              <div className="text-[10px] text-muted-foreground truncate mb-1">
                                Bot: {bots?.find(b => b.id === sim.config.botId)?.name}
                              </div>
                            )}
                            {sim.config.fluxoId && (
                              <div className="text-[10px] text-muted-foreground truncate mb-1">
                                Workflow: {fluxos?.find(f => f.id === sim.config.fluxoId)?.nome}
                              </div>
                            )}
                            <Badge 
                              variant={selectedSimulationId === sim.id ? "default" : "secondary"} 
                              className="mt-1 text-xs"
                            >
                              {sim.chatMessages.length} msgs
                            </Badge>
                          </Card>
                        ))}
                        
                        {/* Slots vazios para mostrar que pode adicionar mais */}
                        {[...Array(Math.max(0, 6 - simulations.length))].map((_, i) => (
                          <Card 
                            key={`empty-${i}`} 
                            className="p-3 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center min-h-[100px] cursor-pointer hover:border-primary/50 transition-all"
                            onClick={() => setConfigDialogOpen(true)}
                          >
                            <div className="text-center">
                              <Plus className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                              <div className="text-xs text-muted-foreground">Adicionar</div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Info da Simulação Selecionada */}
                    {activeSimulation && (
                      <div className="text-sm text-muted-foreground border-t pt-3">
                        Canal: <span className="font-medium text-foreground">{activeSimulation.config.canal}</span>
                        {activeSimulation.config.botId && <> • Bot: <span className="font-medium text-foreground">
                          {bots?.find(b => b.id === activeSimulation.config.botId)?.name}
                        </span></>}
                        {activeSimulation.config.fluxoId && <> • Workflow: <span className="font-medium text-foreground">
                          {fluxos?.find(f => f.id === activeSimulation.config.fluxoId)?.nome}
                        </span></>}
                      </div>
                    )}
                  </div>
                </Card>

                {/* Tabela de Atendentes */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <UserCog className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Controle de Atendentes</h3>
                      <Badge variant="outline">
                        {simulatedAtendentes.length} atendentes
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAtendentesExpanded(!atendentesExpanded)}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronDown className={cn(
                        "w-4 h-4 transition-transform",
                        !atendentesExpanded && "-rotate-90"
                      )} />
                    </Button>
                  </div>

                  {atendentesExpanded && (
                    <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">Atendente</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold">Atividade Atual</TableHead>
                          <TableHead className="font-semibold">Skills</TableHead>
                          <TableHead className="font-semibold text-center">Carga</TableHead>
                          <TableHead className="font-semibold text-center">Aceita Novos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {simulatedAtendentes.map((atendente) => {
                          const carga = conversasAtivas?.filter(c => c.atendente_atual_id === atendente.id).length || 0;
                          const skills = atendente.atendente_skills || [];
                          const chatsEmAtendimento = conversasAtivas?.filter(
                            c => c.atendente_atual_id === atendente.id && c.chat_status === 'em_atendimento'
                          ) || [];
                          
                          return (
                            <TableRow key={atendente.id} className="hover:bg-muted/30">
                              {/* Nome */}
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    "w-2.5 h-2.5 rounded-full flex-shrink-0",
                                    atendente.simulatedStatus === "disponivel" && "bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]",
                                    atendente.simulatedStatus === "ocupado" && "bg-yellow-500 animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.6)]",
                                    atendente.simulatedStatus === "ausente" && "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]",
                                    atendente.simulatedStatus === "offline" && "bg-gray-400"
                                  )} />
                                  <span>{atendente.usuarios?.nome}</span>
                                </div>
                              </TableCell>

                              {/* Status com Dropdown */}
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className={cn(
                                        "w-full justify-between gap-2 h-8 text-xs",
                                        atendente.simulatedStatus === "disponivel" && "border-green-600 text-green-600 bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/40",
                                        atendente.simulatedStatus === "ocupado" && "border-yellow-600 text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100 dark:hover:bg-yellow-950/40",
                                        atendente.simulatedStatus === "ausente" && "border-orange-600 text-orange-600 bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-950/40",
                                        atendente.simulatedStatus === "offline" && "border-gray-400 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-950/30"
                                      )}
                                    >
                                      <span className="capitalize">{atendente.simulatedStatus}</span>
                                      <ChevronDown className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="w-[160px]">
                                    <DropdownMenuItem 
                                      onClick={() => toggleAtendenteStatus(atendente.id, "disponivel")}
                                      className="cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                                      Disponível
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => toggleAtendenteStatus(atendente.id, "ocupado")}
                                      className="cursor-pointer"
                                    >
                                      <Circle className="w-4 h-4 mr-2 text-yellow-600 fill-current" />
                                      Ocupado
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => toggleAtendenteStatus(atendente.id, "ausente")}
                                      className="cursor-pointer"
                                    >
                                      <Clock className="w-4 h-4 mr-2 text-orange-600" />
                                      Ausente
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => toggleAtendenteStatus(atendente.id, "offline")}
                                      className="cursor-pointer"
                                    >
                                      <Circle className="w-4 h-4 mr-2 text-gray-400" />
                                      Offline
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>

                              {/* Atividade Atual */}
                              <TableCell>
                                {chatsEmAtendimento.length > 0 ? (
                                  <div className="space-y-1">
                                    {chatsEmAtendimento.map((chat, idx) => (
                                      <Badge 
                                        key={chat.id} 
                                        variant="secondary" 
                                        className="text-xs bg-primary/10 text-primary"
                                      >
                                        <MessageSquare className="w-3 h-3 mr-1" />
                                        Chat {idx + 1}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">Sem atendimentos</span>
                                )}
                              </TableCell>

                              {/* Skills */}
                              <TableCell>
                                {skills.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {skills.map((skill: any) => (
                                      <Badge 
                                        key={skill.skill_id} 
                                        variant="outline"
                                        className="text-[10px] h-5 px-1.5 border-primary/30"
                                      >
                                        <Zap className="w-2.5 h-2.5 mr-0.5" />
                                        {skill.skills?.nome} <span className="ml-0.5 opacity-70">Nv.{skill.nivel}</span>
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Sem skills</span>
                                )}
                              </TableCell>

                              {/* Carga */}
                              <TableCell className="text-center">
                                <Badge 
                                  variant={carga >= atendente.max_chats_simultaneos ? "destructive" : "default"}
                                  className={cn(
                                    "font-mono text-xs",
                                    carga >= atendente.max_chats_simultaneos 
                                      ? "bg-red-600 hover:bg-red-700" 
                                      : "bg-primary hover:bg-primary/90"
                                  )}
                                >
                                  {carga} / {atendente.max_chats_simultaneos}
                                </Badge>
                              </TableCell>

                              {/* Aceita Novos */}
                              <TableCell className="text-center">
                                <Switch
                                  checked={atendente.simulatedAcceptsNew}
                                  onCheckedChange={() => toggleAtendenteAcceptsNew(atendente.id)}
                                  className="mx-auto"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    {simulatedAtendentes.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Nenhum atendente cadastrado</p>
                      </div>
                    )}
                  </div>
                  )}
                </Card>

                {/* Canvas + Chat */}
                {activeSimulation ? (
                  <>
                    {/* Primeira Linha: Canvas Visual + Resultado do Roteamento (lado esquerdo) + Chat (lado direito) */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      {/* Coluna Esquerda: Canvas + Resultado do Roteamento */}
                      <div className="xl:col-span-2 space-y-6">
                        {/* Canvas Visual - Bot Flow */}
                        <div className="border rounded-lg overflow-hidden bg-background shadow-lg h-[700px]">
                          <FlowSimulationCanvas
                            ref={flowSimulationRef}
                            simulation={activeSimulation}
                            bots={bots || []}
                            fluxos={fluxos || []}
                            onBotMessage={(message) => {
                              addMessageToChat(activeSimulation.id, {
                                id: `bot-${Date.now()}`,
                                sender: 'bot',
                                text: message,
                                timestamp: new Date(),
                              });
                            }}
                            onReset={() => {
                              // Limpar mensagens do chat ao resetar
                              setSimulations(prev => prev.map(sim => 
                                sim.id === activeSimulation.id 
                                  ? { ...sim, chatMessages: [] }
                                  : sim
                              ));
                            }}
                            onOmnichannelTransfer={async (workflowId) => {
                              console.log('🔄 Recebido callback de transferência para workflow:', workflowId);
                              // Atualizar a simulação com o workflow ID
                              setSimulations(prev => prev.map(sim => 
                                sim.id === activeSimulation.id 
                                  ? { 
                                      ...sim, 
                                      config: { ...sim.config, fluxoId: workflowId } 
                                    }
                                  : sim
                              ));
                              
                              // Simular roteamento baseado no workflow
                              const workflow = fluxos?.find(f => f.id === workflowId);
                              if (workflow?.flow_data) {
                                const flowData = typeof workflow.flow_data === 'string' 
                                  ? JSON.parse(workflow.flow_data) 
                                  : workflow.flow_data;
                                
                                // Procurar blocos de fila ou atendente no workflow
                                const filaNode = flowData.nodes?.find((n: any) => n.data?.type === 'fila');
                                const atendenteNode = flowData.nodes?.find((n: any) => n.data?.type === 'atendente');
                                
                                if (filaNode?.data?.config?.filaId) {
                                  const fila = filas?.find(f => f.id === filaNode.data.config.filaId);
                                  setSimulations(prev => prev.map(sim => 
                                    sim.id === activeSimulation.id 
                                      ? { 
                                          ...sim,
                                          routedTo: {
                                            type: 'fila',
                                            filaId: filaNode.data.config.filaId,
                                            filaNome: fila?.nome || 'Fila desconhecida'
                                          }
                                        }
                                      : sim
                                  ));
                                  toast.success(`Roteado para fila: ${fila?.nome || 'Fila'}`);
                                } else if (atendenteNode?.data?.config?.atendenteId) {
                                  const atendenteId = atendenteNode.data.config.atendenteId;
                                  
                                  // Buscar dados atualizados do atendente
                                  const { data: atendenteData } = await supabase
                                    .from('atendentes')
                                    .select('*, usuarios(*)')
                                    .eq('id', atendenteId)
                                    .single();
                                  
                                  if (!atendenteData) {
                                    toast.error('Atendente não encontrado');
                                    return;
                                  }
                                  
                                  // Verificar status do atendente
                                  const status = atendenteData.status;
                                  const isAvailable = status === 'disponivel' || status === 'ocupado';
                                  
                                  if (!isAvailable) {
                                    toast.error(`Atendente ${atendenteData.usuarios?.nome} está ${status}. Roteando para fila...`);
                                    // Tentar rotear para fila padrão
                                    const filasPossiveis = filas?.filter(f => f.ativa) || [];
                                    if (filasPossiveis.length > 0) {
                                      const filaPadrao = filasPossiveis[0];
                                      setSimulations(prev => prev.map(sim => 
                                        sim.id === activeSimulation.id 
                                          ? { 
                                              ...sim,
                                              routedTo: {
                                                type: 'fila',
                                                filaId: filaPadrao.id,
                                                filaNome: filaPadrao.nome
                                              }
                                            }
                                          : sim
                                      ));
                                      toast.info(`Roteado para fila: ${filaPadrao.nome}`);
                                    }
                                    return;
                                  }
                                  
                                  // Verificar se atendente já está em uso em outro simulador
                                  const atendenteEmUso = simulations.some(sim => 
                                    sim.id !== activeSimulation.id && 
                                    sim.routedTo?.type === 'atendente' && 
                                    sim.routedTo?.atendenteId === atendenteId
                                  );
                                  
                                  if (atendenteEmUso) {
                                    toast.warning(`Atendente ${atendenteData.usuarios?.nome} já está em uso em outro simulador. Roteando para fila...`);
                                    // Tentar rotear para fila padrão
                                    const filasPossiveis = filas?.filter(f => f.ativa) || [];
                                    if (filasPossiveis.length > 0) {
                                      const filaPadrao = filasPossiveis[0];
                                      setSimulations(prev => prev.map(sim => 
                                        sim.id === activeSimulation.id 
                                          ? { 
                                              ...sim,
                                              routedTo: {
                                                type: 'fila',
                                                filaId: filaPadrao.id,
                                                filaNome: filaPadrao.nome
                                              }
                                            }
                                          : sim
                                      ));
                                      toast.info(`Roteado para fila: ${filaPadrao.nome}`);
                                    }
                                    return;
                                  }
                                  
                                  // Atendente disponível e não em uso
                                  setSimulations(prev => prev.map(sim => 
                                    sim.id === activeSimulation.id 
                                      ? { 
                                          ...sim,
                                          routedTo: {
                                            type: 'atendente',
                                            atendenteId: atendenteId,
                                            atendenteNome: atendenteData.usuarios?.nome || 'Atendente desconhecido'
                                          }
                                        }
                                      : sim
                                  ));
                                  toast.success(`Roteado para atendente: ${atendenteData.usuarios?.nome || 'Atendente'}`);
                                } else {
                                  toast.info('Workflow transferido, mas nenhum destino específico foi configurado');
                                }
                              }
                            }}
                          />
                        </div>

                      </div>

                      {/* Coluna Direita - Chat Interativo */}
                      <div className="flex flex-col h-[700px] gap-4">
                        <ChannelAdaptedChat
                          messages={activeSimulation.chatMessages}
                          canal={activeSimulation.config.canal}
                        />
                        
                        <Card className="p-4">
                          <div className="flex gap-2">
                            <Input
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              placeholder="Digite uma mensagem..."
                              className="flex-1"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && chatInput.trim()) {
                                  sendUserMessage(chatInput.trim());
                                }
                              }}
                            />
                            <Button 
                              size="icon" 
                              variant="default"
                              onClick={() => {
                                if (chatInput.trim()) {
                                  sendUserMessage(chatInput.trim());
                                }
                              }}
                              disabled={!chatInput.trim()}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      </div>
                    </div>

                    {/* Segunda Linha: Workflow Omnichannel (sempre exibido) */}
                    <Card className="p-0 h-[700px] shadow-lg overflow-hidden mt-6">
                      <div className="flex items-center gap-2 p-4 border-b bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
                        <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                          <Network className="w-5 h-5 text-cyan-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">Workflow Omnichannel</h3>
                          <p className="text-xs text-muted-foreground">
                            {activeSimulation.config.fluxoId 
                              ? fluxos?.find(f => f.id === activeSimulation.config.fluxoId)?.nome || 'Visualização do fluxo'
                              : 'Workflow padrão será criado automaticamente'
                            }
                          </p>
                        </div>
                      </div>
                      <div className="h-[calc(100%-73px)]">
                        {activeSimulation.config.fluxoId ? (
                          <OmnichannelWorkflowViewer
                            fluxoId={activeSimulation.config.fluxoId}
                            fluxos={fluxos || []}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-center px-6">
                            <div>
                              <Network className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                              <h3 className="text-lg font-semibold mb-2">Workflow Não Configurado</h3>
                              <p className="text-sm text-muted-foreground max-w-md">
                                Um workflow padrão será criado automaticamente ao iniciar o roteamento. 
                                Ele será exibido aqui assim que o chat for roteado.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>

                    {/* Terceira Linha: Filas Disponíveis */}
                    <Card className="p-0 shadow-lg overflow-hidden mt-6">
                      <div className="flex items-center gap-2 p-4 border-b bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">Filas Disponíveis</h3>
                          <p className="text-xs text-muted-foreground">
                            {filas?.length || 0} fila(s) configurada(s)
                            {activeSimulation?.routedTo && (
                              <span className="ml-2 font-semibold text-primary">
                                • Roteado: {activeSimulation.routedTo.type === 'fila' 
                                  ? activeSimulation.routedTo.filaNome 
                                  : activeSimulation.routedTo.atendenteNome}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <ScrollArea className="h-[400px] p-4">
                        {/* Exibir destino do roteamento */}
                        {activeSimulation?.routedTo && (
                          <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-2 border-green-500/30">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm text-green-700 dark:text-green-400">
                                  Chat Roteado
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {activeSimulation.routedTo.type === 'fila' 
                                    ? 'Direcionado para fila' 
                                    : 'Direcionado para atendente'}
                                </p>
                              </div>
                            </div>
                            <div className="pl-[52px]">
                              <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
                                {activeSimulation.routedTo.type === 'fila' 
                                  ? `📋 ${activeSimulation.routedTo.filaNome}` 
                                  : `👤 ${activeSimulation.routedTo.atendenteNome}`}
                              </Badge>
                            </div>
                          </div>
                        )}
                        {filas && filas.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filas.map((fila) => (
                              <div
                                key={fila.id}
                                className="flex flex-col gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className="font-medium text-sm mb-1">{fila.nome}</p>
                                    <Badge 
                                      variant={fila.ativa ? "default" : "secondary"}
                                      className="text-xs"
                                    >
                                      {fila.ativa ? "Ativa" : "Inativa"}
                                    </Badge>
                                  </div>
                                  <div className="flex flex-col items-center gap-1">
                                    <Badge variant="outline" className="text-xs">
                                      {conversasAtivas?.filter(c => c.fila_id === fila.id).length || 0}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">na fila</span>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Activity className="w-3 h-3" />
                                    Prioridade: {fila.prioridade || 0}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    Máx por atendente: {fila.max_chats_por_atendente || 0}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Zap className="w-3 h-3" />
                                    Tipo: {fila.tipo_roteamento || "round_robin"}
                                  </span>
                                </div>
                                
                                {/* Atendentes atendendo esta fila */}
                                {(() => {
                                  const chatsDestaFila = conversasAtivas?.filter(
                                    c => c.fila_id === fila.id && c.chat_status === 'em_atendimento' && c.atendente_atual_id
                                  ) || [];
                                  
                                  const atendentesIds = [...new Set(chatsDestaFila.map(c => c.atendente_atual_id))];
                                  const atendentesDestaFila = simulatedAtendentes.filter(a => atendentesIds.includes(a.id));
                                  
                                  if (atendentesDestaFila.length > 0) {
                                    return (
                                      <div className="mt-2 pt-2 border-t">
                                        <p className="text-xs font-medium text-foreground mb-1 flex items-center gap-1">
                                          <UserCog className="w-3 h-3" />
                                          Atendendo agora:
                                        </p>
                                        <div className="flex flex-col gap-1">
                                          {atendentesDestaFila.map(atendente => {
                                            const chatsDoAtendente = chatsDestaFila.filter(c => c.atendente_atual_id === atendente.id).length;
                                            return (
                                              <div key={atendente.id} className="flex items-center justify-between text-xs">
                                                <span className="text-foreground truncate flex-1">
                                                  {atendente.usuarios?.nome || 'Atendente'}
                                                </span>
                                                <Badge variant="outline" className="text-[10px] h-4 px-1">
                                                  {chatsDoAtendente} chat{chatsDoAtendente !== 1 ? 's' : ''}
                                                </Badge>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                            <p className="text-sm text-muted-foreground">
                              Nenhuma fila configurada
                            </p>
                          </div>
                        )}
                      </ScrollArea>
                    </Card>

                  </>
                ) : (
                  <Card className="p-12 text-center">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">Nenhuma Simulação Selecionada</h3>
                    <p className="text-muted-foreground mb-6">
                      Selecione uma simulação existente ou crie uma nova
                    </p>
                    <Button onClick={addNewSimulation} size="lg">
                      <Plus className="w-5 h-5 mr-2" />
                      Criar Nova Simulação
                    </Button>
                  </Card>
                )}
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
