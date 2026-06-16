import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Play } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { WorkflowCreateDialog } from "@/components/workflow/WorkflowCreateDialog";


interface AutomacaoVenda {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  prioridade: number;
  created_at: string;
  updated_at: string;
}

export default function AutomacoesVendas() {
  const navigate = useNavigate();
  const location = useLocation();
  const [automacoes, setAutomacoes] = useState<AutomacaoVenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAutomacaoId, setSelectedAutomacaoId] = useState<string | null>(null);

  useEffect(() => {
    loadAutomacoes();
  }, []);

  const loadAutomacoes = async () => {
    try {
      setLoading(true);
      const estabelecimentoId = await getEstabelecimentoId();
      
      if (!estabelecimentoId) {
        toast({
          title: "Erro",
          description: "Estabelecimento não encontrado",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from("automacoes_vendas")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("prioridade", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      setAutomacoes(data || []);
    } catch (error) {
      console.error("Erro ao carregar automações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as automações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAtivo = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("automacoes_vendas")
        .update({ ativo: !currentValue })
        .eq("id", id);

      if (error) throw error;

      setAutomacoes(prev =>
        prev.map(item =>
          item.id === id ? { ...item, ativo: !currentValue } : item
        )
      );

      toast({
        title: "Sucesso",
        description: `Regra ${!currentValue ? "ativada" : "desativada"} com sucesso`,
      });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedAutomacaoId) return;

    try {
      const { error } = await supabase
        .from("automacoes_vendas")
        .delete()
        .eq("id", selectedAutomacaoId);

      if (error) throw error;

      setAutomacoes(prev => prev.filter(item => item.id !== selectedAutomacaoId));
      
      toast({
        title: "Sucesso",
        description: "Regra excluída com sucesso",
      });
    } catch (error) {
      console.error("Erro ao excluir automação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a regra",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedAutomacaoId(null);
    }
  };

  const openDeleteDialog = (id: string) => {
    setSelectedAutomacaoId(id);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Regras para o Orçamento</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie regras automáticas de desconto e promoções
          </p>
        </div>
        <Button onClick={() => navigate("/editor-regras", { state: { from: location.pathname + location.search } })} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Nova Regra
        </Button>
      </div>

      {/* Lista de Automações */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Carregando automações...
        </div>
      ) : automacoes.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Play className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Nenhuma regra criada</h3>
              <p className="text-muted-foreground mb-4">
                Crie sua primeira regra para o orçamento
              </p>
              <Button onClick={() => navigate("/editor-regras", { state: { from: location.pathname + location.search } })}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira regra
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {automacoes.map((automacao) => (
            <Card key={automacao.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground truncate">
                      {automacao.nome}
                    </h3>
                    <Badge variant={automacao.ativo ? "default" : "secondary"}>
                      {automacao.ativo ? "Ativa" : "Inativa"}
                    </Badge>
                    <Badge variant="outline">
                      Prioridade: {automacao.prioridade}
                    </Badge>
                  </div>
                  {automacao.descricao && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {automacao.descricao}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      Criada em: {new Date(automacao.created_at).toLocaleDateString()}
                    </span>
                    <span>
                      Atualizada em: {new Date(automacao.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Switch
                      checked={automacao.ativo}
                      onCheckedChange={() => handleToggleAtivo(automacao.id, automacao.ativo)}
                    />
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/editor-regras?id=${automacao.id}`, { state: { from: location.pathname + location.search } })}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openDeleteDialog(automacao.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta regra? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
