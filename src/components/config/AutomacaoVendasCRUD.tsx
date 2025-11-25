import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Power, PowerOff, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
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

  const handleUpdateExpiration = async (id: string, expiresAt: Date | null) => {
    try {
      const { error } = await supabase
        .from("automacoes_vendas")
        .update({ expires_at: expiresAt ? expiresAt.toISOString() : null })
        .eq("id", id);

      if (error) throw error;

      toast.success("Vencimento atualizado com sucesso!");
      loadAutomacoes();
    } catch (error) {
      console.error("Erro ao atualizar vencimento:", error);
      toast.error("Erro ao atualizar vencimento");
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
    <Card className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-b">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold">Regras para o Orçamento</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie regras automáticas de desconto e promoções
          </p>
        </div>
        <Button onClick={() => navigate("/editor-regras")} size="sm" className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Nova Regra
        </Button>
      </div>

      {automacoes.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center py-12 text-muted-foreground">
          <div>
            <p>Nenhuma regra criada ainda</p>
            <p className="text-sm mt-1">Clique em "Nova Regra" para começar</p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-6">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Nome</TableHead>
                    <TableHead className="hidden md:table-cell min-w-[200px]">Descrição</TableHead>
                    <TableHead className="min-w-[80px]">Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Prioridade</TableHead>
                    <TableHead className="hidden lg:table-cell">Blocos</TableHead>
                    <TableHead className="hidden xl:table-cell min-w-[150px]">Vencimento</TableHead>
                    <TableHead className="hidden xl:table-cell">Criado em</TableHead>
                    <TableHead className="text-right min-w-[120px]">Ações</TableHead>
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
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {automacao.descricao || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={automacao.ativo ? "default" : "secondary"} className="whitespace-nowrap">
                            {automacao.ativo ? "Ativa" : "Inativa"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="outline">
                            {automacao.prioridade}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm whitespace-nowrap">{numBlocos} blocos</span>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "h-8 justify-start text-left font-normal whitespace-nowrap",
                                  !automacao.expires_at && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {automacao.expires_at ? (
                                  format(new Date(automacao.expires_at), "dd/MM/yyyy")
                                ) : (
                                  "Indeterminado"
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={automacao.expires_at ? new Date(automacao.expires_at) : undefined}
                                onSelect={(date) => handleUpdateExpiration(automacao.id, date || null)}
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                                disabled={(date) => date < new Date()}
                              />
                              {automacao.expires_at && (
                                <div className="p-3 border-t">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleUpdateExpiration(automacao.id, null)}
                                    className="w-full"
                                  >
                                    Remover vencimento
                                  </Button>
                                </div>
                              )}
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-sm whitespace-nowrap">
                          {new Date(automacao.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
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
            </div>
          </div>
        </ScrollArea>
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
