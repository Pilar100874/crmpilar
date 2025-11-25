import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Eye, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/lib/toast-config";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SentimentAlertsProps {
  estabelecimentoId: string;
  onViewChat?: (chatId: string) => void;
}

export default function SentimentAlerts({ estabelecimentoId, onViewChat }: SentimentAlertsProps) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
    
    // Realtime subscription
    const channel = supabase
      .channel('sentiment-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sentiment_alerts',
          filter: `estabelecimento_id=eq.${estabelecimentoId}`
        },
        () => {
          loadAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [estabelecimentoId]);

  const loadAlerts = async () => {
    const { data, error } = await supabase
      .from('sentiment_alerts')
      .select(`
        *,
        conversations:chat_id (
          customer_id,
          customers (nome, telefone)
        ),
        atendentes:atendente_id (
          usuarios (nome)
        )
      `)
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('resolvido', false)
      .order('created_at', { ascending: false });

    if (data) {
      setAlerts(data);
    }
    setLoading(false);
  };

  const markAsResolved = async (alertId: string) => {
    const { error } = await supabase
      .from('sentiment_alerts')
      .update({
        resolvido: true,
        resolvido_em: new Date().toISOString()
      })
      .eq('id', alertId);

    if (error) {
      toast.error("Não foi possível resolver o alerta");
    } else {
      toast.success("Alerta marcado como resolvido");
      loadAlerts();
    }
  };

  const getSeverityColor = (tipo: string) => {
    switch (tipo) {
      case 'sentimento_negativo_persistente':
        return 'destructive';
      case 'mudanca_brusca':
        return 'outline';
      case 'palavras_escalacao':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      'sentimento_negativo_persistente': 'Sentimento Negativo Persistente',
      'mudanca_brusca': 'Mudança Brusca de Sentimento',
      'palavras_escalacao': 'Palavras de Escalação Detectadas',
      'score_muito_baixo': 'Score Muito Baixo'
    };
    return labels[tipo] || tipo;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Alertas de Sentimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando alertas...</p>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Alertas de Sentimento
          </CardTitle>
          <CardDescription>Nenhum alerta ativo no momento</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          Alertas de Sentimento
          <Badge variant="destructive" className="ml-auto">
            {alerts.length}
          </Badge>
        </CardTitle>
        <CardDescription>Alertas ativos que requerem atenção</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getSeverityColor(alert.tipo)}>
                        {getTipoLabel(alert.tipo)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(alert.created_at), { 
                          addSuffix: true,
                          locale: ptBR 
                        })}
                      </span>
                    </div>
                    
                    {alert.conversations?.customers && (
                      <div className="text-sm">
                        <span className="font-medium">Cliente:</span>{' '}
                        {alert.conversations.customers.nome}
                        {alert.conversations.customers.telefone && (
                          <span className="text-muted-foreground ml-2">
                            ({alert.conversations.customers.telefone})
                          </span>
                        )}
                      </div>
                    )}

                    {alert.atendentes?.usuarios && (
                      <div className="text-sm text-muted-foreground">
                        Atendente: {alert.atendentes.usuarios.nome}
                      </div>
                    )}

                    {alert.detalhes && (
                      <p className="text-sm text-muted-foreground">
                        {alert.detalhes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {onViewChat && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewChat(alert.chat_id)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsResolved(alert.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Resolver
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
