import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowRight, ArrowLeft, Play, Send, Bot, User, Zap, 
  Users, Activity, CheckCircle2, AlertCircle, Circle, Network, MessageSquare, Plus, X
} from "lucide-react";
import { toast } from "@/lib/toast-config";
import { cn } from "@/lib/utils";
import FlowSimulationCanvas from "@/components/routing/FlowSimulationCanvas";
import OmnichannelWorkflowViewer from "@/components/routing/OmnichannelWorkflowViewer";

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
}

export default function TestRoteamento() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCanal, setSelectedCanal] = useState<string | undefined>();
  const [selectedBot, setSelectedBot] = useState<string | undefined>();
  const [selectedFluxo, setSelectedFluxo] = useState<string | undefined>();
  const [selectedCliente, setSelectedCliente] = useState<string | undefined>();
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [selectedSimulationId, setSelectedSimulationId] = useState<string | null>(null);
  const [simulatedAtendentes, setSimulatedAtendentes] = useState<any[]>([]);
  
  const activeSimulation = simulations.find(s => s.id === selectedSimulationId) || null;

  // Buscar dados
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

  const { data: conversasAtivas } = useQuery({
    queryKey: ["active-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, atendente_atual_id, chat_status")
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

  const addMessageToChat = (text: string) => {
    if (!selectedSimulationId) return;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date(),
    };

    setSimulations(prev => prev.map(sim => 
      sim.id === selectedSimulationId 
        ? { ...sim, chatMessages: [...sim.chatMessages, newMessage] }
        : sim
    ));
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
            
            {/* Stepper */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all",
                  currentStep === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  1
                </div>
                <span className={cn(
                  "text-sm font-medium",
                  currentStep === 1 ? "text-foreground" : "text-muted-foreground"
                )}>
                  Configuração
                </span>
              </div>
              
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
              
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all",
                  currentStep === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  2
                </div>
                <span className={cn(
                  "text-sm font-medium",
                  currentStep === 2 ? "text-foreground" : "text-muted-foreground"
                )}>
                  Simulação
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Sidebar - Status & Controles */}
          <div className="xl:col-span-1 space-y-6">
            {/* Status do Sistema */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Status do Sistema</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium">Disponíveis</span>
                  </div>
                  <Badge variant="default" className="bg-green-600">
                    {simulatedAtendentes.filter(a => a.simulatedStatus === "disponivel" && a.simulatedAcceptsNew).length}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="text-sm font-medium">Ocupados</span>
                  </div>
                  <Badge variant="outline" className="border-yellow-600 text-yellow-600">
                    {simulatedAtendentes.filter(a => a.simulatedStatus === "ocupado").length}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                    <span className="text-sm font-medium">Offline</span>
                  </div>
                  <Badge variant="outline">
                    {simulatedAtendentes.filter(a => a.simulatedStatus === "offline").length}
                  </Badge>
                </div>

                <div className="pt-3 border-t">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Chats Ativos</span>
                    <span className="font-medium">{conversasAtivas?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Atendentes</span>
                    <span className="font-medium">{simulatedAtendentes.length}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Controle de Atendentes */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Atendentes</h3>
              </div>

              <ScrollArea className="h-[600px]">
                <div className="space-y-3 pr-3">
                  {simulatedAtendentes.map((atendente) => {
                    const carga = conversasAtivas?.filter(c => c.atendente_atual_id === atendente.id).length || 0;
                    
                    return (
                      <Card key={atendente.id} className="p-4 bg-muted/30">
                        <div className="font-medium mb-3 flex items-center gap-2">
                          <Circle className={cn(
                            "w-3 h-3 fill-current",
                            atendente.simulatedStatus === "disponivel" && "text-green-500",
                            atendente.simulatedStatus === "ocupado" && "text-yellow-500",
                            atendente.simulatedStatus === "ausente" && "text-orange-500",
                            atendente.simulatedStatus === "offline" && "text-gray-400"
                          )} />
                          {atendente.usuarios?.nome}
                        </div>
                        
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

                        <div className="flex items-center gap-2 p-2 bg-background rounded text-xs">
                          <Switch
                            checked={atendente.simulatedAcceptsNew}
                            onCheckedChange={() => toggleAtendenteAcceptsNew(atendente.id)}
                          />
                          <span>Aceita novos chats</span>
                        </div>

                        <div className="mt-3 text-xs text-muted-foreground">
                          Carga: {carga}/{atendente.max_chats_simultaneos}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* Main Area */}
          <div className="xl:col-span-3">
            {currentStep === 1 ? (
              /* PASSO 1: Configuração */
              <Card className="p-8">
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">Configure sua Simulação</h2>
                    <p className="text-muted-foreground">
                      Selecione os parâmetros para testar o roteamento
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="canal" className="text-base font-medium">Canal *</Label>
                      <Select value={selectedCanal} onValueChange={setSelectedCanal}>
                        <SelectTrigger id="canal" className="mt-2">
                          <SelectValue placeholder="Selecione o canal de entrada" />
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
                      <Label htmlFor="bot" className="text-base font-medium">Bot (Opcional)</Label>
                      <Select value={selectedBot} onValueChange={(val) => setSelectedBot(val || undefined)}>
                        <SelectTrigger id="bot" className="mt-2">
                          <SelectValue placeholder="Selecione um bot (opcional)" />
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
                  </div>

                  <div className="flex justify-between items-center pt-6">
                    {simulations.length > 0 && (
                      <Button
                        onClick={() => setCurrentStep(2)}
                        variant="outline"
                        size="lg"
                      >
                        Ver Simulações Ativas ({simulations.length})
                      </Button>
                    )}
                    <Button
                      onClick={startSimulation}
                      disabled={!selectedCanal}
                      size="lg"
                      className="min-w-[200px] ml-auto"
                    >
                      {simulations.length > 0 ? "Adicionar" : "Iniciar"} Simulação
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              /* PASSO 2: Simulação */
              <div className="space-y-6">
                {/* Controles e Seletor de Simulações */}
                <Card className="p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button
                          onClick={addNewSimulation}
                          variant="default"
                          size="sm"
                          disabled={simulations.length >= 6}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Nova Simulação ({simulations.length}/6)
                        </Button>
                        <Button
                          onClick={resetAllSimulations}
                          variant="outline"
                          size="sm"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Limpar Todas
                        </Button>
                      </div>
                    </div>

                    {/* Tabs de Simulações */}
                    <div className="border-t pt-3">
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
                            onClick={addNewSimulation}
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

                {/* Canvas + Chat */}
                {activeSimulation ? (
                  <>
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      {/* Canvas Visual */}
                      <div className="xl:col-span-2 border rounded-lg overflow-hidden bg-background shadow-lg">
                        <FlowSimulationCanvas
                          simulation={activeSimulation}
                          bots={bots || []}
                          fluxos={fluxos || []}
                        />
                      </div>

                      {/* Chat Interativo */}
                      <Card className="p-0 flex flex-col h-[700px] shadow-lg overflow-hidden">
                        <div className="flex items-center gap-2 p-4 border-b bg-gradient-to-r from-primary/10 to-primary/5">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <Send className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">Chat da Simulação</h3>
                            <p className="text-xs text-muted-foreground">
                              {activeSimulation.chatMessages.length} mensagens
                            </p>
                          </div>
                        </div>

                        <ScrollArea className="flex-1 p-4">
                          <div className="space-y-3">
                            {activeSimulation.chatMessages.map((msg) => (
                              <div
                                key={msg.id}
                                className={cn(
                                  "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                                  msg.sender === "user" && "flex-row-reverse"
                                )}
                              >
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                  msg.sender === "system" && "bg-orange-100 dark:bg-orange-950/40",
                                  msg.sender === "bot" && "bg-blue-100 dark:bg-blue-950/40",
                                  msg.sender === "user" && "bg-primary"
                                )}>
                                  {msg.sender === "system" && <Zap className="w-4 h-4 text-orange-600" />}
                                  {msg.sender === "bot" && <Bot className="w-4 h-4 text-blue-600" />}
                                  {msg.sender === "user" && <User className="w-4 h-4 text-primary-foreground" />}
                                </div>
                                
                                <div className={cn(
                                  "flex-1 space-y-1",
                                  msg.sender === "user" && "flex flex-col items-end"
                                )}>
                                  <div className={cn(
                                    "inline-block px-4 py-2.5 rounded-2xl text-sm max-w-[85%] break-words shadow-sm",
                                    msg.sender === "system" && "bg-orange-50 dark:bg-orange-950/30 text-orange-900 dark:text-orange-100",
                                    msg.sender === "bot" && "bg-muted text-foreground",
                                    msg.sender === "user" && "bg-primary text-primary-foreground"
                                  )}>
                                    {msg.text}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground px-2">
                                    {msg.timestamp.toLocaleTimeString('pt-BR', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>

                        <div className="p-4 border-t bg-muted/30">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Digite uma mensagem..."
                              className="flex-1 bg-background"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && e.currentTarget.value.trim()) {
                                  addMessageToChat(e.currentTarget.value.trim());
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

                    {/* Workflow Omnichannel */}
                    {activeSimulation.config.fluxoId && (
                      <Card className="p-0 h-[450px] shadow-lg overflow-hidden">
                        <div className="flex items-center gap-2 p-4 border-b bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
                          <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                            <Network className="w-5 h-5 text-cyan-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">Workflow Omnichannel</h3>
                            <p className="text-xs text-muted-foreground">
                              {fluxos?.find(f => f.id === activeSimulation.config.fluxoId)?.nome || 'Visualização do fluxo'}
                            </p>
                          </div>
                        </div>
                        <div className="h-[calc(100%-73px)]">
                          <OmnichannelWorkflowViewer
                            fluxoId={activeSimulation.config.fluxoId}
                            fluxos={fluxos || []}
                          />
                        </div>
                      </Card>
                    )}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
