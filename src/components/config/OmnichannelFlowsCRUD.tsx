import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Power, PowerOff, Star, MoreVertical, Copy, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import type { OmnichannelFlow } from "@/types/omnichannelFlow";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
        <Button onClick={() => navigate("/omnichannel-builder", { state: { from: location.pathname + location.search } })}>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {flows.map((flow) => {
            const flowData = flow.flow_data as any;
            const numBlocos = flowData?.nodes?.length || 0;
            
            return (
              <Card 
                key={flow.id} 
                className={`relative ${flow.is_default ? "ring-2 ring-primary" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="truncate">{flow.nome}</span>
                        {flow.is_default && (
                          <Star className="h-4 w-4 text-primary fill-primary flex-shrink-0" />
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">
                        {flow.descricao || "Sem descrição"}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/omnichannel-builder/${flow.id}`, { state: { from: location.pathname + location.search } })}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openRenameDialog(flow)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Renomear
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(flow)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggleActive(flow.id, flow.ativo)}>
                          {flow.ativo ? (
                            <>
                              <PowerOff className="h-4 w-4 mr-2" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <Power className="h-4 w-4 mr-2" />
                              Ativar
                            </>
                          )}
                        </DropdownMenuItem>
                        {flow.ativo && (
                          <DropdownMenuItem onClick={() => handleToggleDefault(flow.id, flow.is_default || false)}>
                            <Star className="h-4 w-4 mr-2" />
                            {flow.is_default ? "Remover Padrão" : "Definir como Padrão"}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteId(flow.id)}
                          disabled={flow.is_default}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={flow.ativo ? "default" : "secondary"}>
                        {flow.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {numBlocos} blocos
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(flow.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
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
    </div>
  );
};
