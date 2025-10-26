import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Workflow, ArrowRight, MoreVertical, Trash2, Edit, Power } from "lucide-react";
import { SubMenuHeader } from "@/components/SubMenuHeader";
import { useLayout } from "@/contexts/LayoutContext";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function BotCreate() {
  const navigate = useNavigate();
  const { openSubmenu } = useLayout();
  const [bots, setBots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBotDialogOpen, setNewBotDialogOpen] = useState(false);
  const [newBotName, setNewBotName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      
      if (!estabelecimentoId) {
        toast.error("Não foi possível identificar o estabelecimento");
        return;
      }

      const { data, error } = await supabase
        .from("bot_flows")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setBots(data || []);
    } catch (error) {
      console.error("Error loading bots:", error);
      toast.error("Erro ao carregar bots");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBot = async (botId: string, botName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o bot "${botName}"?`)) return;

    try {
      const { error } = await supabase
        .from("bot_flows")
        .delete()
        .eq("id", botId);

      if (error) throw error;

      toast.success("Bot excluído com sucesso!");
      loadBots();
    } catch (error) {
      console.error("Error deleting bot:", error);
      toast.error("Erro ao excluir bot");
    }
  };

  const handleToggleActive = async (botId: string, currentActive: boolean) => {
    try {
      if (!currentActive) {
        await supabase
          .from("bot_flows")
          .update({ active: false })
          .neq("id", botId);
      }

      const { error } = await supabase
        .from("bot_flows")
        .update({ active: !currentActive })
        .eq("id", botId);

      if (error) throw error;

      toast.success(!currentActive ? "Bot ativado!" : "Bot desativado!");
      loadBots();
    } catch (error) {
      console.error("Error toggling bot:", error);
      toast.error("Erro ao atualizar bot");
    }
  };

  const handleCreateNewBot = async () => {
    if (!newBotName.trim()) {
      toast.error("Por favor, informe um nome para o bot");
      return;
    }

    setIsCreating(true);

    try {
      const estabelecimentoId = await getEstabelecimentoId();
      
      if (!estabelecimentoId) {
        toast.error("Não foi possível identificar o estabelecimento");
        return;
      }

      // Verificar se já existe um bot com este nome
      const { data: existingBots } = await supabase
        .from("bot_flows")
        .select("name")
        .eq("estabelecimento_id", estabelecimentoId)
        .ilike("name", newBotName.trim());

      if (existingBots && existingBots.length > 0) {
        toast.error("Já existe um bot com este nome. Por favor, escolha outro nome.");
        setIsCreating(false);
        return;
      }

      // Navegar para o builder com o nome do bot como parâmetro
      navigate(`/bot-builder?name=${encodeURIComponent(newBotName.trim())}`);
      setNewBotDialogOpen(false);
      setNewBotName("");
    } catch (error) {
      console.error("Error creating bot:", error);
      toast.error("Erro ao criar bot");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in bg-white min-h-full">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <SubMenuHeader 
              title="Bot"
              onOpenSubmenu={() => openSubmenu("Bot Test")}
            />
            <h1 className="text-lg font-bold text-foreground">Criar Bot</h1>
          </div>
          <p className="text-muted-foreground">
            Crie e configure novos bots para automação de atendimento
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed border-primary/30" onClick={() => setNewBotDialogOpen(true)}>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Workflow className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Novo Bot de Fluxo</CardTitle>
              <CardDescription>
                Crie um bot usando o editor visual de fluxos. Ideal para automações complexas com múltiplas ramificações.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Criar Novo Bot
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-muted mb-4"></div>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-full"></div>
                </CardHeader>
              </Card>
            ))
          ) : (
            bots.map((bot) => (
              <Card 
                key={bot.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer relative group"
                onClick={() => navigate(`/bot-builder?id=${bot.id}`)}
              >
                <div className="absolute top-4 right-4 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/bot-builder?id=${bot.id}`);
                      }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(bot.id, bot.active);
                      }}>
                        <Power className="w-4 h-4 mr-2" />
                        {bot.active ? "Desativar" : "Ativar"}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBot(bot.id, bot.name);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Workflow className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="flex-1">{bot.name}</CardTitle>
                    {bot.active && (
                      <Badge variant="default" className="bg-green-500">
                        Ativo
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    {bot.flow_data?.nodes?.length || 0} blocos • 
                    Atualizado {formatDistanceToNow(new Date(bot.updated_at), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    <Edit className="w-4 h-4 mr-2" />
                    Abrir Editor
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {!loading && bots.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
              <Workflow className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              Você ainda não tem bots criados. Clique no card acima para criar seu primeiro bot!
            </p>
          </div>
        )}

      {/* Dialog de criar novo bot */}
      <Dialog open={newBotDialogOpen} onOpenChange={setNewBotDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Criar Novo Bot</DialogTitle>
            <DialogDescription>
              Digite um nome único para o novo bot de atendimento.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="bot-name">Nome do Bot</Label>
              <Input
                id="bot-name"
                value={newBotName}
                onChange={(e) => setNewBotName(e.target.value)}
                placeholder="Ex: Bot de Vendas"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newBotName.trim()) {
                    handleCreateNewBot();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNewBotName("");
                setNewBotDialogOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={handleCreateNewBot}
              disabled={!newBotName.trim() || isCreating}
            >
              {isCreating ? "Criando..." : "Criar Bot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
