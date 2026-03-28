import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Package, Truck, CheckCircle2, Clock, PackageCheck, Send, CircleDot, Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const iconMap: Record<string, any> = {
  Package, Truck, CheckCircle2, Clock, PackageCheck, Send, CircleDot
};

export default function RastreioPedido() {
  const { token } = useParams();
  const [pedido, setPedido] = useState<any>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [statusConfig, setStatusConfig] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchToken, setSearchToken] = useState("");

  const loadPedido = async (tk: string) => {
    setLoading(true);
    setError("");
    try {
      const { data: pedidoData, error: pedidoError } = await supabase
        .from("pedido_tracking")
        .select("*")
        .eq("token_rastreamento", tk)
        .single();

      if (pedidoError || !pedidoData) {
        setError("Pedido não encontrado. Verifique o código de rastreamento.");
        setLoading(false);
        return;
      }
      setPedido(pedidoData);

      const { data: histData } = await supabase
        .from("pedido_tracking_historico")
        .select("*")
        .eq("pedido_tracking_id", pedidoData.id)
        .order("created_at", { ascending: true });
      setHistorico(histData || []);

      const { data: configData } = await supabase
        .from("pedido_tracking_status_config")
        .select("*")
        .eq("estabelecimento_id", pedidoData.estabelecimento_id)
        .eq("ativo", true)
        .order("ordem");
      setStatusConfig(configData || []);
    } catch {
      setError("Erro ao carregar rastreamento.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) loadPedido(token);
  }, [token]);

  const handleSearch = () => {
    if (searchToken.trim()) {
      window.location.href = `/rastreio/${searchToken.trim()}`;
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Package className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2">Rastreie seu Pedido</h1>
              <p className="text-muted-foreground">Cole o código de rastreamento abaixo</p>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Código de rastreamento..."
                value={searchToken}
                onChange={(e) => setSearchToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="rounded-lg"
              />
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <Package className="h-12 w-12 mx-auto text-primary mb-4 animate-bounce" />
          <p className="text-muted-foreground">Carregando rastreamento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Package className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold">Oops!</h2>
            <p className="text-muted-foreground">{error}</p>
            <div className="flex gap-2">
              <Input
                placeholder="Tente outro código..."
                value={searchToken}
                onChange={(e) => setSearchToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="rounded-lg"
              />
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStatusInfo = statusConfig.find(s => s.nome === pedido?.status_atual);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-2xl mx-auto p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Pedido #{pedido?.numero_pedido}</h1>
              <p className="text-sm text-muted-foreground">{pedido?.nome_cliente}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Current Status */}
        {currentStatusInfo && (
          <Card className="overflow-hidden">
            <div className="h-2" style={{ backgroundColor: currentStatusInfo.cor }} />
            <CardContent className="p-6 text-center">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: currentStatusInfo.cor + "20", color: currentStatusInfo.cor }}
              >
                {(() => { const Icon = iconMap[currentStatusInfo.icone || "Package"] || Package; return <Icon className="h-8 w-8" />; })()}
              </div>
              <h2 className="text-2xl font-bold mb-1">{currentStatusInfo.label}</h2>
              <p className="text-muted-foreground text-sm">
                Última atualização: {historico.length > 0 && format(new Date(historico[historico.length - 1].created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Progress Bar */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              {statusConfig.map((status, index) => {
                const isCompleted = historico.some(h => h.status === status.nome);
                const isCurrent = pedido?.status_atual === status.nome;
                const Icon = iconMap[status.icone || "Package"] || Package;

                return (
                  <div key={status.nome} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isCurrent ? "ring-4 ring-offset-2 scale-110" : ""
                        }`}
                        style={{
                          backgroundColor: isCompleted || isCurrent ? status.cor : "#e5e7eb",
                          color: isCompleted || isCurrent ? "#fff" : "#9ca3af",
                          ringColor: isCurrent ? status.cor + "40" : undefined,
                        }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className={`text-xs mt-2 text-center max-w-[80px] ${isCompleted || isCurrent ? "font-semibold" : "text-muted-foreground"}`}>
                        {status.label}
                      </span>
                    </div>
                    {index < statusConfig.length - 1 && (
                      <div className="flex-1 mx-1">
                        <div
                          className="h-1 rounded-full transition-colors"
                          style={{ backgroundColor: isCompleted ? status.cor : "#e5e7eb" }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Timeline Detail */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Histórico Detalhado</h3>
            <div className="space-y-0">
              {historico.map((entry, index) => {
                const statusInfo = statusConfig.find(s => s.nome === entry.status) || { label: entry.status, cor: "#6b7280", icone: "Package" };
                const Icon = iconMap[statusInfo.icone || "Package"] || Package;

                return (
                  <div key={entry.id} className="flex items-start gap-3 relative">
                    {index < historico.length - 1 && (
                      <div
                        className="absolute left-[19px] top-[40px] w-0.5 h-[calc(100%-8px)]"
                        style={{ backgroundColor: statusInfo.cor }}
                      />
                    )}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: statusInfo.cor, color: "#fff" }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="pb-6 flex-1">
                      <p className="font-medium">{statusInfo.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      {entry.descricao && (
                        <p className="text-sm text-muted-foreground mt-1">{entry.descricao}</p>
                      )}
                      {entry.observacao && (
                        <p className="text-sm text-muted-foreground/80 mt-1 italic">📝 {entry.observacao}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-xs text-muted-foreground">
        Rastreamento atualizado automaticamente
      </div>
    </div>
  );
}
