import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import type { FilaAtendimento, Atendente } from "@/types/atendimento";

interface TransferenciaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
  estabelecimentoId: string;
  currentFilaId?: string | null;
  currentAtendenteId?: string | null;
}

export const TransferenciaDialog = ({
  open,
  onOpenChange,
  chatId,
  estabelecimentoId,
  currentFilaId,
  currentAtendenteId
}: TransferenciaDialogProps) => {
  const [tipoTransferencia, setTipoTransferencia] = useState<"fila" | "atendente">("fila");
  const [filas, setFilas] = useState<FilaAtendimento[]>([]);
  const [atendentes, setAtendentes] = useState<Atendente[]>([]);
  const [selectedFilaId, setSelectedFilaId] = useState("");
  const [selectedAtendenteId, setSelectedAtendenteId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadFilas();
      loadAtendentes();
    }
  }, [open, estabelecimentoId]);

  const loadFilas = async () => {
    try {
      const { data, error } = await supabase
        .from("filas_atendimento")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("ativa", true)
        .order("nome");

      if (error) throw error;
      setFilas(data || []);
    } catch (error) {
      console.error("Erro ao carregar filas:", error);
    }
  };

  const loadAtendentes = async () => {
    try {
      const { data, error } = await supabase
        .from("atendentes")
        .select("*, usuario:usuarios(nome, email)")
        .eq("estabelecimento_id", estabelecimentoId)
        .in("status", ["disponivel", "ocupado"]);

      if (error) throw error;
      setAtendentes(data || []);
    } catch (error) {
      console.error("Erro ao carregar atendentes:", error);
    }
  };

  const handleTransferir = async () => {
    if (tipoTransferencia === "fila" && !selectedFilaId) {
      toast.error("Selecione uma fila de destino");
      return;
    }

    if (tipoTransferencia === "atendente" && !selectedAtendenteId) {
      toast.error("Selecione um atendente de destino");
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Registrar transferência
      const transferData: any = {
        chat_id: chatId,
        tipo: tipoTransferencia,
        motivo: motivo || null,
        realizada_por: user.id
      };

      if (tipoTransferencia === "fila") {
        transferData.fila_origem_id = currentFilaId;
        transferData.fila_destino_id = selectedFilaId;
        transferData.atendente_origem_id = currentAtendenteId;
      } else {
        transferData.atendente_origem_id = currentAtendenteId;
        transferData.atendente_destino_id = selectedAtendenteId;
      }

      const { error: transferError } = await supabase
        .from("chat_transferencias")
        .insert(transferData);

      if (transferError) throw transferError;

      // Atualizar conversa
      const updateData: any = {
        chat_status: tipoTransferencia === "fila" ? "em_fila" : "transferido",
        tempo_espera_inicio: tipoTransferencia === "fila" ? new Date().toISOString() : null
      };

      if (tipoTransferencia === "fila") {
        updateData.fila_id = selectedFilaId;
        updateData.atendente_atual_id = null;
      } else {
        updateData.atendente_atual_id = selectedAtendenteId;
      }

      const { error: updateError } = await supabase
        .from("conversations")
        .update(updateData)
        .eq("id", chatId);

      if (updateError) throw updateError;

      toast.success("Chat transferido com sucesso");
      onOpenChange(false);
      setMotivo("");
    } catch (error) {
      console.error("Erro ao transferir chat:", error);
      toast.error("Erro ao transferir chat");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir Chat</DialogTitle>
          <DialogDescription>
            Transfira este chat para outra fila ou atendente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Tipo de Transferência</Label>
            <RadioGroup
              value={tipoTransferencia}
              onValueChange={(value) => setTipoTransferencia(value as "fila" | "atendente")}
              className="flex gap-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fila" id="fila" />
                <Label htmlFor="fila" className="cursor-pointer">Para Fila</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="atendente" id="atendente" />
                <Label htmlFor="atendente" className="cursor-pointer">Para Atendente</Label>
              </div>
            </RadioGroup>
          </div>

          {tipoTransferencia === "fila" ? (
            <div>
              <Label htmlFor="fila-destino">Fila de Destino *</Label>
              <Select value={selectedFilaId} onValueChange={setSelectedFilaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma fila" />
                </SelectTrigger>
                <SelectContent>
                  {filas.map((fila) => (
                    <SelectItem key={fila.id} value={fila.id}>
                      {fila.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label htmlFor="atendente-destino">Atendente de Destino *</Label>
              <Select value={selectedAtendenteId} onValueChange={setSelectedAtendenteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um atendente" />
                </SelectTrigger>
                <SelectContent>
                  {atendentes.map((atendente: any) => (
                    <SelectItem key={atendente.id} value={atendente.id}>
                      {atendente.usuario?.nome || "Sem nome"} - {atendente.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="motivo">Motivo (opcional)</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo da transferência..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleTransferir} disabled={loading}>
            {loading ? "Transferindo..." : "Transferir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
