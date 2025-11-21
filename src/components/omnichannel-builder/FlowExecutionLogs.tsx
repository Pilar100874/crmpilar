import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, X, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ExecutionLog {
  id: string;
  conversation_id: string;
  customer_name: string;
  timestamp: string;
  block_id: string;
  block_label: string;
  block_type: string;
  status: "success" | "error" | "skipped";
  details?: string;
}

interface FlowExecutionLogsProps {
  flowId: string;
  nodes: any[];
  onHighlightNode: (nodeId: string) => void;
}

export const FlowExecutionLogs = ({ flowId, nodes, onHighlightNode }: FlowExecutionLogsProps) => {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Carregar logs iniciais
    loadLogs();

    // Setup realtime listener
    const channel = supabase
      .channel(`flow_execution_${flowId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "omnichannel_execution_logs",
          filter: `flow_id=eq.${flowId}`
        },
        (payload) => {
          const newLog = payload.new as any;
          setLogs(prev => [
            {
              id: newLog.id,
              conversation_id: newLog.conversation_id,
              customer_name: newLog.customer_name || "Cliente",
              timestamp: newLog.created_at,
              block_id: newLog.block_id,
              block_label: newLog.block_label,
              block_type: newLog.block_type,
              status: newLog.status,
              details: newLog.details
            },
            ...prev
          ].slice(0, 50)); // Manter apenas últimos 50
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [flowId, isOpen]);

  const loadLogs = async () => {
    try {
      // Esta query seria para uma tabela de logs que ainda precisa ser criada
      // Por enquanto, apenas inicializa vazio
      setLogs([]);
    } catch (error) {
      console.error("Erro ao carregar logs:", error);
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 shadow-lg"
      >
        <Activity className="h-4 w-4 mr-2" />
        Logs ({logs.length})
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-[500px] z-50 shadow-2xl flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <h3 className="font-semibold">Logs de Execução</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        {logs.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Circle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum log ainda</p>
            <p className="text-xs mt-1">Os logs aparecerão aqui em tempo real</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                onClick={() => onHighlightNode(log.block_id)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="font-medium text-sm truncate">
                    {log.customer_name}
                  </div>
                  <Badge
                    variant={
                      log.status === "success"
                        ? "default"
                        : log.status === "error"
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    {log.status}
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <div>
                    <span className="font-medium">Bloco:</span> {log.block_label}
                  </div>
                  <div>
                    <span className="font-medium">Tipo:</span> {log.block_type}
                  </div>
                  <div>
                    {formatDistanceToNow(new Date(log.timestamp), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </div>
                  {log.details && (
                    <div className="mt-2 pt-2 border-t text-xs">
                      {log.details}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};
