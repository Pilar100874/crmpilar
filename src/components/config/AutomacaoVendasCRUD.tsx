import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Power, PowerOff } from "lucide-react";
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
import { useNavigate } from "react-router-dom";

interface AutomacaoVendasCRUDProps {
  estabelecimentoId?: string;
}

interface AutomacaoVenda {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  prioridade: number;
  flow_data: any;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export const AutomacaoVendasCRUD = ({ estabelecimentoId }: AutomacaoVendasCRUDProps) => {
  const navigate = useNavigate();
  const [automacoes, setAutomacoes] = useState<AutomacaoVenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (estabelecimentoId) {
      loadAutomacoes();
    }
  }, [estabelecimentoId]);

  const loadAutomacoes = async () => {
    if (!estabelecimentoId) return;
    
    try {
      const { data, error } = await supabase
        .from("automacoes_vendas")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("prioridade", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAutomacoes(data as AutomacaoVenda[]);
    } catch (error) {
      console.error("Erro ao carregar automações:", error);
      toast.error("Erro ao carregar automações");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("automacoes_vendas")
        .update({ ativo: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast.success(
        !currentStatus ? "Regra ativada com sucesso!" : "Regra desativada com sucesso!"
      );
      loadAutomacoes();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("automacoes_vendas")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast.success("Regra excluída com sucesso!");
      setDeleteId(null);
      loadAutomacoes();
    } catch (error) {
      console.error("Erro ao excluir regra:", error);
      toast.error("Erro ao excluir regra");
    }
  };

  if (loading) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Automações de Vendas</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie regras automáticas de desconto e promoções
          </p>
        </div>
        <Button onClick={() => navigate("/editor-regras")} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova Regra
        </Button>
      </div>

      {automacoes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhuma regra criada ainda</p>
          <p className="text-sm mt-1">Clique em "Nova Regra" para começar</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Blocos</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {automacoes.map((automacao) => {
              const flowData = automacao.flow_data as any;
              const numBlocos = flowData?.nodes?.length || 0;
              
              return (
                <TableRow key={automacao.id}>
                  <TableCell className="font-medium">
                    {automacao.nome}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {automacao.descricao || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={automacao.ativo ? "default" : "secondary"}>
                      {automacao.ativo ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {automacao.prioridade}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{numBlocos} blocos</span>
                  </TableCell>
                  <TableCell>
                    {automacao.expires_at ? (
                      <span className="text-sm">
                        {new Date(automacao.expires_at).toLocaleDateString()}
                      </span>
                    ) : (
                      <Badge variant="outline">Indeterminado</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(automacao.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(automacao.id, automacao.ativo)}
                        title={automacao.ativo ? "Desativar" : "Ativar"}
                      >
                        {automacao.ativo ? (
                          <PowerOff className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/editor-regras?id=${automacao.id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(automacao.id)}
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
        title="Excluir Regra de Automação"
        description="Tem certeza que deseja excluir esta regra? Esta ação não pode ser desfeita."
      />
    </Card>
  );
};
