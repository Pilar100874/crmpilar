import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { 
  Circle, 
  CircleDot, 
  Moon, 
  CircleSlash, 
  Coffee,
  ChevronDown 
} from "lucide-react";
import type { AtendenteStatus } from "@/types/atendimento";

interface AtendenteStatusSelectorProps {
  atendenteId: string;
  currentStatus: AtendenteStatus;
  onStatusChange?: () => void;
}

export const AtendenteStatusSelector = ({
  atendenteId,
  currentStatus,
  onStatusChange
}: AtendenteStatusSelectorProps) => {
  const [status, setStatus] = useState<AtendenteStatus>(currentStatus);
  const [pausaDialogOpen, setPausaDialogOpen] = useState(false);
  const [motivoPausa, setMotivoPausa] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  const getStatusIcon = (status: AtendenteStatus) => {
    const icons = {
      disponivel: <Circle className="h-4 w-4 fill-green-500 text-green-500" />,
      ocupado: <CircleDot className="h-4 w-4 fill-red-500 text-red-500" />,
      ausente: <Moon className="h-4 w-4 fill-gray-500 text-gray-500" />,
      offline: <CircleSlash className="h-4 w-4 fill-gray-400 text-gray-400" />,
      pausa: <Coffee className="h-4 w-4 fill-yellow-500 text-yellow-500" />
    };
    return icons[status];
  };

  const getStatusLabel = (status: AtendenteStatus) => {
    const labels = {
      disponivel: "Disponível",
      ocupado: "Ocupado",
      ausente: "Ausente",
      offline: "Offline",
      pausa: "Em Pausa"
    };
    return labels[status];
  };

  const getStatusVariant = (status: AtendenteStatus) => {
    const variants = {
      disponivel: "default",
      ocupado: "destructive",
      ausente: "secondary",
      offline: "outline",
      pausa: "secondary"
    } as const;
    return variants[status];
  };

  const handleStatusClick = async (newStatus: AtendenteStatus) => {
    if (loading) return;
    
    if (newStatus === "pausa") {
      setPausaDialogOpen(true);
      return;
    }

    await updateStatus(newStatus, null);
  };

  const confirmPausa = async () => {
    if (!motivoPausa.trim()) {
      toast.error("Informe o motivo da pausa");
      return;
    }

    await updateStatus("pausa", motivoPausa);
    setPausaDialogOpen(false);
    setMotivoPausa("");
  };

  const updateStatus = async (newStatus: AtendenteStatus, motivo: string | null) => {
    if (loading) return;
    
    setLoading(true);
    
    try {
      const updateData: any = {
        status: newStatus,
        ultimo_status_mudanca: new Date().toISOString()
      };

      if (newStatus === "pausa") {
        updateData.motivo_pausa = motivo;
        updateData.tempo_pausa_inicio = new Date().toISOString();
      } else {
        updateData.motivo_pausa = null;
        updateData.tempo_pausa_inicio = null;
      }

      // Primeiro atualizar o status para feedback imediato
      const { error } = await supabase
        .from("atendentes")
        .update(updateData)
        .eq("id", atendenteId);

      if (error) throw error;

      // Atualizar estado local imediatamente
      setStatus(newStatus);
      toast.success(`Status alterado para ${getStatusLabel(newStatus)}`);

      // Se estava em pausa, calcular tempo total de pausa em background
      if (status === "pausa" && newStatus !== "pausa") {
        // Executar em background sem bloquear
        (async () => {
          try {
            const { data: atendenteData } = await supabase
              .from("atendentes")
              .select("tempo_pausa_inicio")
              .eq("id", atendenteId)
              .maybeSingle();

            if (atendenteData?.tempo_pausa_inicio) {
              const tempoPausaInicio = new Date(atendenteData.tempo_pausa_inicio);
              const tempoPausaSegundos = Math.floor((Date.now() - tempoPausaInicio.getTime()) / 1000);
              
              const hoje = new Date().toISOString().split('T')[0];
              const { data: metricaExistente } = await supabase
                .from("metricas_atendente")
                .select("id, tempo_pausa")
                .eq("atendente_id", atendenteId)
                .eq("data", hoje)
                .maybeSingle();

              if (metricaExistente) {
                await supabase
                  .from("metricas_atendente")
                  .update({
                    tempo_pausa: (metricaExistente.tempo_pausa || 0) + tempoPausaSegundos
                  })
                  .eq("id", metricaExistente.id);
              } else {
                await supabase
                  .from("metricas_atendente")
                  .insert({
                    atendente_id: atendenteId,
                    data: hoje,
                    tempo_pausa: tempoPausaSegundos
                  });
              }
            }
          } catch (err) {
            console.error("Erro ao atualizar métricas de pausa:", err);
          }
        })();
      }

      // Chamar callback após atualização principal
      onStatusChange?.();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2" disabled={loading}>
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              getStatusIcon(status)
            )}
            {getStatusLabel(status)}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleStatusClick("disponivel")} disabled={loading}>
            <Circle className="h-4 w-4 mr-2 fill-green-500 text-green-500" />
            Disponível
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusClick("ocupado")} disabled={loading}>
            <CircleDot className="h-4 w-4 mr-2 fill-red-500 text-red-500" />
            Ocupado
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusClick("ausente")} disabled={loading}>
            <Moon className="h-4 w-4 mr-2 fill-gray-500 text-gray-500" />
            Ausente
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusClick("pausa")} disabled={loading}>
            <Coffee className="h-4 w-4 mr-2 fill-yellow-500 text-yellow-500" />
            Pausa
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusClick("offline")} disabled={loading}>
            <CircleSlash className="h-4 w-4 mr-2 fill-gray-400 text-gray-400" />
            Offline
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={pausaDialogOpen} onOpenChange={setPausaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da Pausa</DialogTitle>
            <DialogDescription>
              Informe o motivo para entrar em pausa
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="motivo">Motivo *</Label>
            <Textarea
              id="motivo"
              value={motivoPausa}
              onChange={(e) => setMotivoPausa(e.target.value)}
              placeholder="Ex: Almoço, Reunião, Treinamento..."
              rows={3}
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPausaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmPausa}>
              Confirmar Pausa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
