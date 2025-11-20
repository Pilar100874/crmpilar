import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardAtendenteComponent } from "@/components/atendimento/DashboardAtendente";
import { useAtendimento } from "@/hooks/useAtendimento";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast-config";
import type { AtendenteStatus } from "@/types/atendimento";

export default function DashboardAtendentePage() {
  const [atendenteId, setAtendenteId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<AtendenteStatus>("disponivel");
  const [motivoPausa, setMotivoPausa] = useState("");
  
  const { useDashboardAtendente } = useAtendimento();
  const { dashboard, loading: dashboardLoading } = useDashboardAtendente(atendenteId);

  useEffect(() => {
    loadAtendenteId();
  }, []);

  const loadAtendenteId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Primeiro busca o usuario_id na tabela usuarios usando auth_user_id
      const { data: usuarioData, error: usuarioError } = await supabase
        .from("usuarios")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (usuarioError || !usuarioData) {
        console.error("Usuário não encontrado na tabela usuarios:", usuarioError);
        toast.error("Usuário não encontrado");
        setLoading(false);
        return;
      }

      // Agora busca o atendente usando o usuario_id correto
      const { data: atendenteData, error } = await supabase
        .from("atendentes")
        .select("id")
        .eq("usuario_id", usuarioData.id)
        .single();

      if (error) {
        console.error("Usuário não é atendente:", error);
        toast.error("Você não está cadastrado como atendente");
        return;
      }

      setAtendenteId(atendenteData.id);
    } catch (error) {
      console.error("Erro ao carregar ID do atendente:", error);
      toast.error("Erro ao carregar informações do atendente");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = (status: string) => {
    setNewStatus(status as AtendenteStatus);
    setStatusDialogOpen(true);
  };

  const confirmChangeStatus = async () => {
    try {
      const updateData: any = {
        status: newStatus,
        ultimo_status_mudanca: new Date().toISOString()
      };

      if (newStatus === "pausa") {
        if (!motivoPausa.trim()) {
          toast.error("Informe o motivo da pausa");
          return;
        }
        updateData.motivo_pausa = motivoPausa;
        updateData.tempo_pausa_inicio = new Date().toISOString();
      } else {
        updateData.motivo_pausa = null;
        updateData.tempo_pausa_inicio = null;
      }

      const { error } = await supabase
        .from("atendentes")
        .update(updateData)
        .eq("id", atendenteId);

      if (error) throw error;

      toast.success(`Status alterado para ${newStatus}`);
      setStatusDialogOpen(false);
      setMotivoPausa("");
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status");
    }
  };

  if (loading || dashboardLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Carregando dashboard...</p>
      </div>
    );
  }

  if (!atendenteId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-muted-foreground mb-4">Você não está cadastrado como atendente</p>
        <Button onClick={() => window.location.href = "/"}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <DashboardAtendenteComponent
        dashboard={dashboard}
        onChangeStatus={handleChangeStatus}
      />

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status</DialogTitle>
            <DialogDescription>
              Selecione seu novo status de atendimento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="status">Novo Status</Label>
              <Select
                value={newStatus}
                onValueChange={(value) => setNewStatus(value as AtendenteStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disponivel">Disponível</SelectItem>
                  <SelectItem value="ocupado">Ocupado</SelectItem>
                  <SelectItem value="ausente">Ausente</SelectItem>
                  <SelectItem value="pausa">Pausa</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newStatus === "pausa" && (
              <div>
                <Label htmlFor="motivo">Motivo da Pausa *</Label>
                <Textarea
                  id="motivo"
                  value={motivoPausa}
                  onChange={(e) => setMotivoPausa(e.target.value)}
                  placeholder="Ex: Almoço, Reunião, Treinamento..."
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmChangeStatus}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
