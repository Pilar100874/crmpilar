import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Power, PowerOff, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import type { OmnichannelFlow } from "@/types/omnichannelFlow";

interface OmnichannelFlowsCRUDProps {
  estabelecimentoId?: string;
}

export const OmnichannelFlowsCRUD = ({ estabelecimentoId }: OmnichannelFlowsCRUDProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [flows, setFlows] = useState<OmnichannelFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
      // Se estamos marcando como padrão, primeiro desmarcamos todos os outros
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

  if (loading) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
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
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhum fluxo criado ainda</p>
          <p className="text-sm mt-1">Clique em "Novo Fluxo" para começar</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Padrão</TableHead>
              <TableHead>Blocos</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flows.map((flow) => {
              const flowData = flow.flow_data as any;
              const numBlocos = flowData?.nodes?.length || 0;
              
              return (
                <TableRow key={flow.id} className={flow.is_default ? "bg-accent/50" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {flow.nome}
                      {flow.is_default && (
                        <Star className="h-4 w-4 text-primary fill-primary" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {flow.descricao || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={flow.ativo ? "default" : "secondary"}>
                      {flow.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={flow.is_default || false}
                        onCheckedChange={() => handleToggleDefault(flow.id, flow.is_default || false)}
                        disabled={!flow.ativo}
                      />
                      {flow.is_default && (
                        <span className="text-xs text-muted-foreground">Padrão</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{numBlocos} blocos</span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(flow.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(flow.id, flow.ativo)}
                        title={flow.ativo ? "Desativar" : "Ativar"}
                      >
                        {flow.ativo ? (
                          <PowerOff className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/omnichannel-builder/${flow.id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(flow.id)}
                        disabled={flow.is_default}
                        title={flow.is_default ? "Não é possível excluir o fluxo padrão" : "Excluir"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Fluxo Omnichannel"
        description="Tem certeza que deseja excluir este fluxo? Esta ação não pode ser desfeita."
      />
    </Card>
  );
};
