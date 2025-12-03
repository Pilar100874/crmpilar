import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, CalendarIcon, Settings, Copy, MoreVertical, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";

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
  const location = useLocation();
  const [automacoes, setAutomacoes] = useState<AutomacaoVenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [config, setConfig] = useState<any>({ nao_acumular_descontos: false });
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedAutomacao, setSelectedAutomacao] = useState<AutomacaoVenda | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renameDescription, setRenameDescription] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (estabelecimentoId) {
      loadAutomacoes();
      loadConfig();
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

  const loadConfig = async () => {
    if (!estabelecimentoId) return;
    
    try {
      const { data, error } = await supabase
        .from("estabelecimentos")
        .select("automacao_vendas_config")
        .eq("id", estabelecimentoId)
        .single();

      if (error) throw error;
      
      if (data?.automacao_vendas_config) {
        setConfig(data.automacao_vendas_config);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
  };

  const updateConfig = async (newConfig: any) => {
    if (!estabelecimentoId) return;
    
    try {
      const { error } = await supabase
        .from("estabelecimentos")
        .update({ automacao_vendas_config: newConfig })
        .eq("id", estabelecimentoId);

      if (error) throw error;
      
      setConfig(newConfig);
      toast.success("Configuração atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar configuração:", error);
      toast.error("Erro ao atualizar configuração");
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

  const handleDuplicate = async (regra: AutomacaoVenda) => {
    if (!estabelecimentoId) return;

    try {
      const { error } = await supabase
        .from("automacoes_vendas")
        .insert({
          estabelecimento_id: estabelecimentoId,
          nome: `${regra.nome} (Cópia)`,
          descricao: regra.descricao,
          ativo: false, // Duplicatas começam desativadas
          prioridade: regra.prioridade,
          flow_data: regra.flow_data,
          expires_at: null // Remove data de vencimento da cópia
        });

      if (error) throw error;

      toast.success("Regra duplicada com sucesso!");
      loadAutomacoes();
    } catch (error) {
      console.error("Erro ao duplicar regra:", error);
      toast.error("Erro ao duplicar regra");
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
        <Button onClick={() => navigate("/editor-regras", { state: { from: location.pathname + location.search } })} size="sm" className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Nova Regra
        </Button>
      </div>

      {/* Configurações Globais */}
      <div className="p-6 border-b bg-muted/30">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Configurações Globais</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 p-4 bg-background rounded-lg border">
            <div className="flex-1">
              <Label htmlFor="nao-acumular" className="text-base font-medium cursor-pointer">
                Não acumular descontos
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Quando ativado, apenas o maior desconto será aplicado ao invés de acumular múltiplos descontos
              </p>
            </div>
            <Switch
              id="nao-acumular"
              checked={config.nao_acumular_descontos || false}
              onCheckedChange={(checked) => 
                updateConfig({ ...config, nao_acumular_descontos: checked })
              }
            />
          </div>
        </div>
      </div>

      {automacoes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhuma regra criada ainda</p>
          <p className="text-sm mt-1">Clique em "Nova Regra" para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
          {automacoes.map((automacao) => {
            const flowData = automacao.flow_data as any;
            const numBlocos = flowData?.nodes?.length || 0;
            
            return (
              <Card key={automacao.id} className="p-4 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  {/* Cabeçalho com Switch */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{automacao.nome}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {automacao.descricao || "Sem descrição"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={automacao.ativo}
                        onCheckedChange={() => handleToggleActive(automacao.id, automacao.ativo)}
                      />
                      <span className={cn(
                        "text-xs font-medium",
                        automacao.ativo ? "text-green-600" : "text-muted-foreground"
                      )}>
                        {automacao.ativo ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                  </div>

                  {/* Informações */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Prioridade:</span>
                      <Badge variant="outline">{automacao.prioridade}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Blocos:</span>
                      <span className="font-medium">{numBlocos}</span>
                    </div>
                  </div>

                  {/* Vencimento */}
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground">Vencimento:</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "w-full justify-start text-left font-normal",
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
                  </div>

                  {/* Data de criação */}
                  <div className="text-xs text-muted-foreground">
                    Criado em {new Date(automacao.created_at).toLocaleDateString()}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/editor-regras?id=${automacao.id}`, { state: { from: location.pathname + location.search } })}
                      title="Editar regra"
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicate(automacao)}
                      title="Duplicar regra"
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteId(automacao.id)}
                      title="Excluir regra"
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
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
