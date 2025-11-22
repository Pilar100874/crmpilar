import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { FilasManager } from "@/components/atendimento/FilasManager";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/toast-config";
import type { FilaAtendimento } from "@/types/atendimento";

export default function ConfigFilas() {
  const [filas, setFilas] = useState<FilaAtendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFila, setEditingFila] = useState<FilaAtendimento | null>(null);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>("");

  // Form state
  const [formData, setFormData] = useState<{
    nome: string;
    descricao: string;
    tipo_roteamento: FilaAtendimento['tipo_roteamento'];
    max_chats_por_atendente: number;
    prioridade: number;
    ativa: boolean;
    tempo_resposta_esperado: number;
    mensagem_fila: string;
  }>({
    nome: "",
    descricao: "",
    tipo_roteamento: "round_robin",
    max_chats_por_atendente: 5,
    prioridade: 0,
    ativa: true,
    tempo_resposta_esperado: 300,
    mensagem_fila: ""
  });

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const estabId = await getEstabelecimentoId();
    if (estabId) {
      setEstabelecimentoId(estabId);
      loadFilas(estabId);
    }
  };

  const loadFilas = async (estabId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("filas_atendimento")
        .select("*")
        .eq("estabelecimento_id", estabId)
        .order("prioridade", { ascending: false });

      if (error) throw error;
      setFilas(data || []);
    } catch (error) {
      console.error("Erro ao carregar filas:", error);
      toast.error("Erro ao carregar filas");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFila = () => {
    setEditingFila(null);
    setFormData({
      nome: "",
      descricao: "",
      tipo_roteamento: "round_robin",
      max_chats_por_atendente: 5,
      prioridade: 0,
      ativa: true,
      tempo_resposta_esperado: 300,
      mensagem_fila: ""
    });
    setDialogOpen(true);
  };

  const handleEditFila = (fila: FilaAtendimento) => {
    setEditingFila(fila);
    setFormData({
      nome: fila.nome,
      descricao: fila.descricao || "",
      tipo_roteamento: fila.tipo_roteamento,
      max_chats_por_atendente: fila.max_chats_por_atendente,
      prioridade: fila.prioridade,
      ativa: fila.ativa,
      tempo_resposta_esperado: fila.tempo_resposta_esperado,
      mensagem_fila: fila.mensagem_fila || ""
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome da fila é obrigatório");
      return;
    }

    try {
      if (editingFila) {
        // Update
        const { error } = await supabase
          .from("filas_atendimento")
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq("id", editingFila.id);

        if (error) throw error;
        toast.success("Fila atualizada com sucesso");
      } else {
        // Create
        const { error } = await supabase
          .from("filas_atendimento")
          .insert({
            ...formData,
            estabelecimento_id: estabelecimentoId
          });

        if (error) throw error;
        toast.success("Fila criada com sucesso");
      }

      setDialogOpen(false);
      loadFilas(estabelecimentoId);
    } catch (error) {
      console.error("Erro ao salvar fila:", error);
      toast.error("Erro ao salvar fila");
    }
  };

  const handleToggleAtiva = async (filaId: string, ativa: boolean) => {
    try {
      const { error } = await supabase
        .from("filas_atendimento")
        .update({ ativa })
        .eq("id", filaId);

      if (error) throw error;
      
      toast.success(`Fila ${ativa ? 'ativada' : 'desativada'} com sucesso`);
      loadFilas(estabelecimentoId);
    } catch (error) {
      console.error("Erro ao atualizar status da fila:", error);
      toast.error("Erro ao atualizar status da fila");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <FilasManager
        filas={filas}
        onCreateFila={handleCreateFila}
        onEditFila={handleEditFila}
        onToggleAtiva={handleToggleAtiva}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFila ? "Editar Fila" : "Nova Fila"}</DialogTitle>
            <DialogDescription>
              Configure os parâmetros da fila de atendimento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="nome">Nome da Fila *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Suporte Técnico"
              />
            </div>

            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição opcional da fila"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipo_roteamento">Tipo de Roteamento</Label>
                <Select
                  value={formData.tipo_roteamento}
                  onValueChange={(value: any) => setFormData({ ...formData, tipo_roteamento: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round_robin">Circular</SelectItem>
                    <SelectItem value="por_skill">Por Habilidade</SelectItem>
                    <SelectItem value="por_disponibilidade">Por Disponibilidade</SelectItem>
                    <SelectItem value="por_prioridade">Por Prioridade</SelectItem>
                    <SelectItem value="por_carteira">Por Carteira Fixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="max_chats">Máx. Chats por Atendente</Label>
                <Input
                  id="max_chats"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.max_chats_por_atendente}
                  onChange={(e) => setFormData({ ...formData, max_chats_por_atendente: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="prioridade">Prioridade</Label>
                <Input
                  id="prioridade"
                  type="number"
                  min="0"
                  max="10"
                  value={formData.prioridade}
                  onChange={(e) => setFormData({ ...formData, prioridade: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="tempo_resposta">Tempo Resp. Esperado (seg)</Label>
                <Input
                  id="tempo_resposta"
                  type="number"
                  min="30"
                  value={formData.tempo_resposta_esperado}
                  onChange={(e) => setFormData({ ...formData, tempo_resposta_esperado: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="mensagem_fila">Mensagem de Fila</Label>
              <Textarea
                id="mensagem_fila"
                value={formData.mensagem_fila}
                onChange={(e) => setFormData({ ...formData, mensagem_fila: e.target.value })}
                placeholder="Mensagem enviada quando o cliente entra na fila"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="ativa"
                checked={formData.ativa}
                onCheckedChange={(checked) => setFormData({ ...formData, ativa: checked })}
              />
              <Label htmlFor="ativa">Fila Ativa</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingFila ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
