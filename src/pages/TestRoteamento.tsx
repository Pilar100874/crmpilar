import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, AlertCircle, Play } from "lucide-react";
import { toast } from "@/lib/toast-config";

interface RouteStep {
  step: number;
  type: string;
  description: string;
  detail?: string;
  status: "success" | "warning" | "info";
}

export default function TestRoteamento() {
  const [selectedCanal, setSelectedCanal] = useState<string>("");
  const [selectedBot, setSelectedBot] = useState<string>("");
  const [selectedFluxo, setSelectedFluxo] = useState<string>("");
  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  // Buscar bots disponíveis
  const { data: bots } = useQuery({
    queryKey: ["bots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bot_flows")
        .select("id, name, active")
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
        .select("id, nome, ativo")
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

  // Buscar atendentes
  const { data: atendentes } = useQuery({
    queryKey: ["atendentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atendentes")
        .select("id, usuario_id, status, max_chats_simultaneos, usuarios(nome)")
        .eq("status", "disponivel");
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

  const simulateRouting = async () => {
    if (!selectedCanal) {
      toast.error("Selecione um canal de entrada");
      return;
    }

    setIsSimulating(true);
    setRouteSteps([]);

    const steps: RouteStep[] = [];

    // Passo 1: Canal de entrada
    steps.push({
      step: 1,
      type: "Canal de Entrada",
      description: `Cliente iniciou contato via ${selectedCanal}`,
      detail: selectedCliente ? `Cliente selecionado para teste` : "Cliente novo",
      status: "success",
    });

    // Passo 2: Bot (se selecionado)
    if (selectedBot) {
      const bot = bots?.find((b) => b.id === selectedBot);
      steps.push({
        step: 2,
        type: "Bot Acionado",
        description: `Bot "${bot?.name}" foi acionado`,
        detail: "Bot processou a mensagem inicial",
        status: "success",
      });
    }

    // Passo 3: Fluxo Omnichannel (se selecionado)
    if (selectedFluxo) {
      const fluxo = fluxos?.find((f) => f.id === selectedFluxo);
      steps.push({
        step: steps.length + 1,
        type: "Workflow Omnichannel",
        description: `Fluxo "${fluxo?.nome}" foi executado`,
        detail: "Processando regras de roteamento",
        status: "success",
      });

      // Simular análise de fila
      if (filas && filas.length > 0) {
        const filaEscolhida = filas[0];
        steps.push({
          step: steps.length + 1,
          type: "Seleção de Fila",
          description: `Fila "${filaEscolhida.nome}" selecionada`,
          detail: `Tipo de roteamento: ${filaEscolhida.tipo_roteamento}`,
          status: "info",
        });

        // Simular seleção de atendente
        if (atendentes && atendentes.length > 0) {
          const atendenteEscolhido = atendentes[0];
          steps.push({
            step: steps.length + 1,
            type: "Atendente Selecionado",
            description: `Atendente "${atendenteEscolhido.usuarios?.nome}" designado`,
            detail: `Status: ${atendenteEscolhido.status} | Capacidade: ${atendenteEscolhido.max_chats_simultaneos} chats`,
            status: "success",
          });
        } else {
          steps.push({
            step: steps.length + 1,
            type: "Fila de Espera",
            description: "Nenhum atendente disponível",
            detail: "Chat permanecerá em fila de espera",
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
    } else {
      // Roteamento direto sem fluxo
      steps.push({
        step: steps.length + 1,
        type: "Roteamento Direto",
        description: "Sem workflow omnichannel configurado",
        detail: "Chat será direcionado para fila padrão",
        status: "info",
      });

      if (filas && filas.length > 0) {
        const filaDefault = filas[0];
        steps.push({
          step: steps.length + 1,
          type: "Fila Padrão",
          description: `Direcionado para fila "${filaDefault.nome}"`,
          status: "info",
        });
      }
    }

    setRouteSteps(steps);
    setIsSimulating(false);
  };

  const resetSimulation = () => {
    setSelectedCanal("");
    setSelectedBot("");
    setSelectedFluxo("");
    setSelectedCliente("");
    setRouteSteps([]);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Teste de Roteamento</h1>
        <p className="text-muted-foreground mt-2">
          Simule o fluxo completo de roteamento omnichannel
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <SelectItem value="">Sem bot</SelectItem>
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
                  <SelectItem value="">Sem workflow</SelectItem>
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
