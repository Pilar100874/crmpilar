import { SubMenuHeader } from "@/components/SubMenuHeader";
import { useLayout } from "@/contexts/LayoutContext";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Zap, MoreVertical, Edit, Trash2, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import NovaAutomacaoDialog from "@/components/marketing/NovaAutomacaoDialog";

export default function MarketingAutomacoes() {
  const { openSubmenu } = useLayout();
  const [automacoes, setAutomacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    loadAutomacoes();
  }, []);

  const loadAutomacoes = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error("Não foi possível identificar o estabelecimento");
        return;
      }

      const { data, error } = await supabase
        .from("marketing_automations")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAutomacoes(data || []);
    } catch (error) {
      console.error("Erro ao carregar automações:", error);
      toast.error("Erro ao carregar automações");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("marketing_automations")
        .update({ active: !currentActive })
        .eq("id", id);

      if (error) throw error;
      toast.success(!currentActive ? "Automação ativada!" : "Automação desativada!");
      loadAutomacoes();
    } catch (error) {
      console.error("Erro ao atualizar automação:", error);
      toast.error("Erro ao atualizar automação");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir a automação "${name}"?`)) return;

    try {
      const { error } = await supabase
        .from("marketing_automations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Automação excluída com sucesso!");
      loadAutomacoes();
    } catch (error) {
      console.error("Erro ao excluir automação:", error);
      toast.error("Erro ao excluir automação");
    }
  };

  const getTipoDisparoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      manual: "Manual",
      automatico: "Automático",
      data: "Por Data",
    };
    return labels[tipo] || tipo;
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in bg-white min-h-full">
      <div>
        <div className="flex items-center gap-3 mb-3">
          <SubMenuHeader 
            title="Marketing"
            onOpenSubmenu={() => openSubmenu("Marketing")}
          />
          <h1 className="text-lg font-bold text-foreground">Automações de Marketing</h1>
        </div>
        <p className="text-muted-foreground">
          Configure automações de marketing para diferentes contextos
        </p>
      </div>

      <div className="grid gap-[1cm] md:grid-cols-3 lg:grid-cols-4">
        <Card 
          className="hover:shadow-lg transition-all cursor-pointer border-2 border-dashed border-primary/30 h-full flex flex-col"
          onClick={() => setDialogOpen(true)}
        >
          <CardHeader className="flex-1 p-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Criar Nova Automação</CardTitle>
            <CardDescription>
              Configure uma nova automação de marketing com webhooks e triggers personalizados
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto p-4 pt-0">
            <Button className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Criar Automação
            </Button>
          </CardContent>
        </Card>

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse h-full">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-muted mb-4"></div>
                <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
              </CardHeader>
            </Card>
          ))
        ) : (
          automacoes.map((automacao) => (
            <Card
              key={automacao.id}
              className="hover:shadow-lg transition-all relative group h-full flex flex-col"
            >
              <div className="absolute top-4 right-4 z-10">
                <DropdownMenu open={openMenuId === automacao.id} onOpenChange={(open) => setOpenMenuId(open ? automacao.id : null)}>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(null);
                      handleToggleActive(automacao.id, automacao.active);
                    }}>
                      <Power className="w-4 h-4 mr-2" />
                      {automacao.active ? "Desativar" : "Ativar"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(null);
                        handleDelete(automacao.id, automacao.name);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <CardHeader className="flex-1 p-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="flex-1">{automacao.name}</CardTitle>
                  {automacao.active && (
                    <Badge variant="default" className="bg-green-500">
                      Ativa
                    </Badge>
                  )}
                </div>
                {automacao.description && (
                  <p className="text-sm text-muted-foreground mb-2">{automacao.description}</p>
                )}
                <CardDescription>
                  {getTipoDisparoLabel(automacao.config?.tipo_disparo)} • 
                  Criada {formatDistanceToNow(new Date(automacao.created_at), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </CardDescription>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {!loading && automacoes.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
            <Zap className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            Você ainda não tem automações criadas. Clique no card acima para criar sua primeira automação!
          </p>
        </div>
      )}

      <NovaAutomacaoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadAutomacoes}
      />
    </div>
  );
}
