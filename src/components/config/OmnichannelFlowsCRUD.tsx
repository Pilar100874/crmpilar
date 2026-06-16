import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { WorkflowCard, WorkflowCardGrid } from "@/components/ui/workflow-card";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import type { OmnichannelFlow } from "@/types/omnichannelFlow";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WorkflowCreateDialog } from "@/components/workflow/WorkflowCreateDialog";


interface OmnichannelFlowsCRUDProps {
  estabelecimentoId?: string;
}

export const OmnichannelFlowsCRUD = ({ estabelecimentoId }: OmnichannelFlowsCRUDProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [flows, setFlows] = useState<OmnichannelFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [renameFlow, setRenameFlow] = useState<OmnichannelFlow | null>(null);
  const [newName, setNewName] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);


  useEffect(() => {
    if (estabelecimentoId) {
      loadFlows();
    }
  }, [estabelecimentoId]);

  const loadFlows = async () => {
    if (!estabelecimentoId) return;
    
    try {
      const { data, error } = await supabase
        .from("omnichannel_flows")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFlows(data as unknown as OmnichannelFlow[]);
    } catch (error) {
      console.error("Erro ao carregar fluxos:", error);
      toast.error("Erro ao carregar fluxos");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("omnichannel_flows")
        .update({ ativo: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast.success(
        !currentStatus ? "Fluxo ativado com sucesso!" : "Fluxo desativado com sucesso!"
      );
      loadFlows();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const handleToggleDefault = async (id: string, currentDefault: boolean) => {
    try {
      if (!currentDefault) {
        const { error: clearError } = await supabase
          .from("omnichannel_flows")
          .update({ is_default: false })
          .eq("estabelecimento_id", estabelecimentoId);

        if (clearError) throw clearError;
      }

      const { error } = await supabase
        .from("omnichannel_flows")
        .update({ is_default: !currentDefault })
        .eq("id", id);

      if (error) throw error;

      toast.success(
        !currentDefault ? "Definido como fluxo padrão!" : "Removido como fluxo padrão!"
      );
      loadFlows();
    } catch (error) {
      console.error("Erro ao atualizar fluxo padrão:", error);
      toast.error("Erro ao definir fluxo padrão");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("omnichannel_flows")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast.success("Fluxo excluído com sucesso!");
      setDeleteId(null);
      loadFlows();
    } catch (error) {
      console.error("Erro ao excluir fluxo:", error);
      toast.error("Erro ao excluir fluxo");
    }
  };

  const handleRename = async () => {
    if (!renameFlow || !newName.trim()) return;

    try {
      const { error } = await supabase
        .from("omnichannel_flows")
        .update({ nome: newName.trim() })
        .eq("id", renameFlow.id);

      if (error) throw error;

      toast.success("Fluxo renomeado com sucesso!");
      setRenameFlow(null);
      setNewName("");
      loadFlows();
    } catch (error) {
      console.error("Erro ao renomear fluxo:", error);
      toast.error("Erro ao renomear fluxo");
    }
  };

  const handleDuplicate = async (flow: OmnichannelFlow) => {
    try {
      const { error } = await supabase
        .from("omnichannel_flows")
        .insert([{
          nome: `${flow.nome} (Cópia)`,
          descricao: flow.descricao,
          estabelecimento_id: flow.estabelecimento_id,
          flow_data: flow.flow_data as any,
          ativo: false,
          is_default: false,
        }]);

      if (error) throw error;

      toast.success("Fluxo duplicado com sucesso!");
      loadFlows();
    } catch (error) {
      console.error("Erro ao duplicar fluxo:", error);
      toast.error("Erro ao duplicar fluxo");
    }
  };

  const openRenameDialog = (flow: OmnichannelFlow) => {
    setRenameFlow(flow);
    setNewName(flow.nome);
  };

  if (loading) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Workflow Builder Omnichannel</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os fluxos de roteamento de atendimento
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Fluxo
        </Button>

      </div>

      {flows.length === 0 ? (
        <Card className="p-6">
          <div className="text-center py-12 text-muted-foreground">
            <p>Nenhum fluxo criado ainda</p>
            <p className="text-sm mt-1">Clique em "Novo Fluxo" para começar</p>
          </div>
        </Card>
      ) : (
        <WorkflowCardGrid>
          {flows.map((flow) => {
            const flowData = flow.flow_data as any;
            const numBlocos = flowData?.nodes?.length || 0;
            
            return (
              <WorkflowCard
                key={flow.id}
                id={flow.id}
                title={flow.nome}
                description={flow.descricao}
                isActive={flow.ativo}
                isDefault={flow.is_default}
                blocksCount={numBlocos}
                createdAt={flow.created_at}
                onEdit={() => navigate(`/omnichannel-builder/${flow.id}`, { state: { from: location.pathname + location.search } })}
                onRename={() => openRenameDialog(flow)}
                onDuplicate={() => handleDuplicate(flow)}
                onToggleActive={() => handleToggleActive(flow.id, flow.ativo)}
                onToggleDefault={() => handleToggleDefault(flow.id, flow.is_default || false)}
                onDelete={() => setDeleteId(flow.id)}
                onOpenEditor={() => navigate(`/omnichannel-builder/${flow.id}`, { state: { from: location.pathname + location.search } })}
                showDefaultOption={true}
                deleteDisabled={flow.is_default}
              />
            );
          })}
        </WorkflowCardGrid>
      )}

      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Fluxo Omnichannel"
        description="Tem certeza que deseja excluir este fluxo? Esta ação não pode ser desfeita."
      />

      <Dialog open={renameFlow !== null} onOpenChange={(open) => !open && setRenameFlow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Fluxo</DialogTitle>
            <DialogDescription>
              Digite o novo nome para o fluxo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome do fluxo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameFlow(null)}>
              Cancelar
            </Button>
            <Button onClick={handleRename} disabled={!newName.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WorkflowCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title="Novo Fluxo Omnichannel"
        description="Dê um nome e uma descrição para seu novo fluxo antes de começar."
        nameLabel="Nome do fluxo"
        namePlaceholder="Ex: Atendimento Comercial"
        descriptionPlaceholder="Descreva o objetivo deste fluxo (opcional)"
        onConfirm={({ name, description }) => {
          setCreateDialogOpen(false);
          navigate("/omnichannel-builder", {
            state: {
              from: location.pathname + location.search,
              initialName: name,
              initialDescription: description,
            },
          });
        }}
      />
    </div>
  );
};

