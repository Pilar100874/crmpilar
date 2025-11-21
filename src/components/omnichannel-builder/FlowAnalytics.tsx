import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BlockStats {
  blockId: string;
  passCount: number;
  errorCount: number;
  avgProcessingTime: number;
  trend: "up" | "down" | "stable";
}

interface FlowAnalyticsProps {
  flowId: string;
  nodes: any[];
}

export const FlowAnalytics = ({ flowId, nodes }: FlowAnalyticsProps) => {
  const [stats, setStats] = useState<BlockStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (flowId) {
      loadStats();
      
      // Atualizar a cada 30 segundos
      const interval = setInterval(loadStats, 30000);
      return () => clearInterval(interval);
    }
  }, [flowId]);

  const loadStats = async () => {
    try {
      // Esta query seria para calcular estatísticas reais
      // Por enquanto, dados de exemplo
      const mockStats: BlockStats[] = nodes
        .filter(n => n.data.type !== "inicio")
        .map(node => ({
          blockId: node.id,
          passCount: Math.floor(Math.random() * 100),
          errorCount: Math.floor(Math.random() * 5),
          avgProcessingTime: Math.random() * 2,
          trend: ["up", "down", "stable"][Math.floor(Math.random() * 3)] as any
        }));

      setStats(mockStats);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  const getNodeStats = (nodeId: string) => {
    return stats.find(s => s.blockId === nodeId);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5" />
        <h3 className="font-semibold">Analytics do Fluxo</h3>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-4">
          Carregando...
        </div>
      ) : (
        <div className="space-y-3">
          {nodes.filter(n => n.data.type !== "inicio").map((node) => {
            const nodeStats = getNodeStats(node.id);
            if (!nodeStats) return null;

            return (
              <div key={node.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm truncate">
                    {node.data.label}
                  </div>
                  {nodeStats.trend === "up" ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : nodeStats.trend === "down" ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Passagens</div>
                    <Badge variant="secondary">{nodeStats.passCount}</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Erros</div>
                    <Badge variant={nodeStats.errorCount > 0 ? "destructive" : "secondary"}>
                      {nodeStats.errorCount}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    Tempo médio: {nodeStats.avgProcessingTime.toFixed(2)}s
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-4 border-t text-xs text-muted-foreground text-center">
        Atualizado há alguns segundos
      </div>
    </Card>
  );
};
