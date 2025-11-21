import { useState, useEffect } from "react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { DashboardSupervisorComponent } from "@/components/atendimento/DashboardSupervisor";
import { useAtendimento } from "@/hooks/useAtendimento";
import { MetricasView } from "@/components/atendimento/MetricasView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { processarFila } from "@/services/roteamentoService";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function DashboardSupervisorPage() {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [processandoFila, setProcessandoFila] = useState(false);
  
  const { useDashboardSupervisor } = useAtendimento();
  const { dashboard, loading: dashboardLoading } = useDashboardSupervisor(estabelecimentoId);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const estabId = await getEstabelecimentoId();
    if (estabId) {
      setEstabelecimentoId(estabId);
    }
    setLoading(false);
  };

  const handleForcarTransferencia = async (chatId: string) => {
    // TODO: Implementar diálogo de transferência forçada
    toast.info("Funcionalidade em desenvolvimento");
  };

  const handleEncerrarChat = async (chatId: string) => {
    try {
      const { error } = await supabase
        .from("conversations")
        .update({
          chat_status: "encerrado",
          tempo_encerramento: new Date().toISOString(),
          motivo_encerramento: "Encerrado pelo supervisor"
        })
        .eq("id", chatId);

      if (error) throw error;
      toast.success("Chat encerrado com sucesso");
    } catch (error) {
      console.error("Erro ao encerrar chat:", error);
      toast.error("Erro ao encerrar chat");
    }
  };

  const handleProcessarFila = async () => {
    if (!estabelecimentoId) return;
    
    try {
      setProcessandoFila(true);
      await processarFila();
      toast.success("Fila processada com sucesso");
    } catch (error) {
      console.error("Erro ao processar fila:", error);
      toast.error("Erro ao processar fila");
    } finally {
      setProcessandoFila(false);
    }
  };

  if (loading || dashboardLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard do Supervisor</h1>
          <p className="text-muted-foreground">Monitore e gerencie toda a operação de atendimento</p>
        </div>
        <Button
          onClick={handleProcessarFila}
          disabled={processandoFila}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${processandoFila ? 'animate-spin' : ''}`} />
          Processar Fila
        </Button>
      </div>

      <Tabs defaultValue="visao-geral" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="mt-6">
          <DashboardSupervisorComponent
            dashboard={dashboard}
            onForcarTransferencia={handleForcarTransferencia}
            onEncerrarChat={handleEncerrarChat}
          />
        </TabsContent>

        <TabsContent value="metricas" className="mt-6">
          <MetricasView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
