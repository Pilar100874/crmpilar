import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, User, Users } from "lucide-react";
import type { ChatTransferencia } from "@/types/atendimento";

interface HistoricoTransferenciasProps {
  chatId: string;
}

export const HistoricoTransferencias = ({ chatId }: HistoricoTransferenciasProps) => {
  const [transferencias, setTransferencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransferencias();
  }, [chatId]);

  const loadTransferencias = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("chat_transferencias")
        .select(`
          *,
          atendente_origem:atendentes!chat_transferencias_atendente_origem_id_fkey(
            id,
            usuario:usuarios(nome)
          ),
          atendente_destino:atendentes!chat_transferencias_atendente_destino_id_fkey(
            id,
            usuario:usuarios(nome)
          ),
          fila_origem:filas_atendimento!chat_transferencias_fila_origem_id_fkey(nome),
          fila_destino:filas_atendimento!chat_transferencias_fila_destino_id_fkey(nome),
          realizado_por:usuarios(nome)
        `)
        .eq("chat_id", chatId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransferencias(data || []);
    } catch (error) {
      console.error("Erro ao carregar transferências:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando histórico...</div>;
  }

  if (transferencias.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-center text-muted-foreground">
            Nenhuma transferência registrada
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Histórico de Transferências</CardTitle>
        <CardDescription>
          {transferencias.length} transferência{transferencias.length > 1 ? 's' : ''} registrada{transferencias.length > 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {transferencias.map((transferencia) => (
          <div key={transferencia.id} className="border-l-2 border-border pl-4 pb-2">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline">
                {transferencia.tipo === "fila" ? <Users className="h-3 w-3 mr-1" /> : <User className="h-3 w-3 mr-1" />}
                {transferencia.tipo}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(transferencia.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm mb-2">
              <span className="font-medium">
                {transferencia.tipo === "fila" 
                  ? (transferencia.fila_origem?.nome || "Fila origem")
                  : (transferencia.atendente_origem?.usuario?.nome || "Atendente origem")
                }
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {transferencia.tipo === "fila"
                  ? (transferencia.fila_destino?.nome || "Fila destino")
                  : (transferencia.atendente_destino?.usuario?.nome || "Atendente destino")
                }
              </span>
            </div>

            {transferencia.motivo && (
              <p className="text-xs text-muted-foreground mt-1">
                Motivo: {transferencia.motivo}
              </p>
            )}

            {transferencia.realizado_por && (
              <p className="text-xs text-muted-foreground mt-1">
                Por: {transferencia.realizado_por.nome}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
