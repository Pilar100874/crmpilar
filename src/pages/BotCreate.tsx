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
  const [newBotDescription, setNewBotDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  // Dialogs para duplicar e renomear
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState<any>(null);
  const [duplicateName, setDuplicateName] = useState("");
  const [duplicateDescription, setDuplicateDescription] = useState("");
  const [renameName, setRenameName] = useState("");
  const [renameDescription, setRenameDescription] = useState("");
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);


  // Fail-safe para fechar overlays caso algo fique preso
  const closeOverlays = () => {
    try {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' } as any));
      (document.activeElement as HTMLElement)?.blur?.();
    } catch {}
  };

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
      navigate(`/bot-builder?name=${encodeURIComponent(newBotName.trim())}&description=${encodeURIComponent(newBotDescription.trim())}`);
      setNewBotDialogOpen(false);
      setNewBotName("");
      setNewBotDescription("");
    } catch (error) {
      console.error("Error creating bot:", error);
      toast.error("Erro ao criar bot");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDuplicateBot = async () => {
    if (!duplicateName.trim()) {
      toast.error("Por favor, informe um nome para o bot duplicado");
      return;
    }

    if (!selectedBot) return;

    setIsDuplicating(true);

    try {
      const estabelecimentoId = await getEstabelecimentoId();
      
      if (!estabelecimentoId) {
        toast.error("Não foi possível identificar o estabelecimento");
        setIsDuplicating(false);
        return;
      }

      // Verificar se já existe um bot com este nome
      const { data: existingBots } = await supabase
        .from("bot_flows")
        .select("name")
        .eq("estabelecimento_id", estabelecimentoId)
        .ilike("name", duplicateName.trim());

      if (existingBots && existingBots.length > 0) {
        toast.error("Já existe um bot com este nome. Por favor, escolha outro nome.");
        setIsDuplicating(false);
        return;
      }

      // Duplicar o bot
      const { error } = await supabase
        .from("bot_flows")
        .insert({
          name: duplicateName.trim(),
          description: duplicateDescription.trim(),
          flow_data: selectedBot.flow_data,
          active: false,
          estabelecimento_id: estabelecimentoId,
        });

      if (error) throw error;

      toast.success("Bot duplicado com sucesso!");
      setDuplicateDialogOpen(false);
      setDuplicateName("");
      setDuplicateDescription("");
      setSelectedBot(null);
      closeOverlays();
      await loadBots();
    } catch (error) {
      console.error("Error duplicating bot:", error);
      toast.error("Erro ao duplicar bot");
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleRenameBot = async () => {
    if (!renameName.trim()) {
      toast.error("Por favor, informe um novo nome para o bot");
      return;
    }

    if (!selectedBot) return;

    setIsRenaming(true);

    try {
      const estabelecimentoId = await getEstabelecimentoId();
      
      if (!estabelecimentoId) {
        toast.error("Não foi possível identificar o estabelecimento");
        setIsRenaming(false);
        return;
      }

      // Verificar se já existe outro bot com este nome
      const { data: existingBots } = await supabase
        .from("bot_flows")
        .select("id, name")
        .eq("estabelecimento_id", estabelecimentoId)
        .ilike("name", renameName.trim());

      if (existingBots && existingBots.length > 0 && existingBots[0].id !== selectedBot.id) {
        toast.error("Já existe um bot com este nome. Por favor, escolha outro nome.");
        setIsRenaming(false);
        return;
      }

      // Renomear o bot
      const { error } = await supabase
        .from("bot_flows")
        .update({ 
          name: renameName.trim(),
          description: renameDescription.trim()
        })
        .eq("id", selectedBot.id);

      if (error) throw error;

      toast.success("Bot renomeado com sucesso!");
      setRenameDialogOpen(false);
      setRenameName("");
      setRenameDescription("");
      setSelectedBot(null);
      closeOverlays();
      await loadBots();
    } catch (error) {
      console.error("Error renaming bot:", error);
      toast.error("Erro ao renomear bot");
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-6 animate-fade-in bg-background min-h-full">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <SubMenuHeader 
              title="Bot"
              onOpenSubmenu={() => openSubmenu("Bot Test")}
            />
            <h1 className="text-2xl font-semibold text-foreground">Bots</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Gerencie seus bots de atendimento
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                {loading ? "Carregando..." : `${bots.length} ${bots.length === 1 ? 'bot' : 'bots'}`}
              </h2>
            </div>
            <Button onClick={() => setNewBotDialogOpen(true)} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Bot
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse border border-border rounded-lg p-4 bg-card">
                  <div className="h-5 bg-muted rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-muted rounded w-full mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              ))
            ) : (
              bots.map((bot) => (
                <div 
                  key={bot.id} 
                  className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer relative group bg-card"
                  onClick={() => navigate(`/bot-builder?id=${bot.id}`)}
                >
                  <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu open={openMenuId === bot.id} onOpenChange={(open) => setOpenMenuId(open ? bot.id : null)}>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          navigate(`/bot-builder?id=${bot.id}`);
                        }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          setSelectedBot(bot);
                          setRenameName(bot.name);
                          setRenameDescription(bot.description || "");
                          setRenameDialogOpen(true);
                        }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Renomear
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          setSelectedBot(bot);
                          setDuplicateName(`${bot.name} (cópia)`);
                          setDuplicateDescription(bot.description || "");
                          setDuplicateDialogOpen(true);
                        }}>
                          <Plus className="w-4 h-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          handleToggleActive(bot.id, bot.active);
                        }}>
                          <Power className="w-4 h-4 mr-2" />
                          {bot.active ? "Desativar" : "Ativar"}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
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
                  
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground truncate">{bot.name}</h3>
                        {bot.active && (
                          <Badge variant="default" className="bg-success text-success-foreground text-xs px-1.5 py-0">
                            Ativo
                          </Badge>
                        )}
                      </div>
                      {bot.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{bot.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Workflow className="w-3 h-3" />
                      {bot.flow_data?.nodes?.length || 0} blocos
                    </span>
                    <span>
                      {formatDistanceToNow(new Date(bot.updated_at), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {!loading && bots.length === 0 && (
            <div className="text-center py-16">
              <Workflow className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Nenhum bot criado ainda
              </p>
              <Button onClick={() => setNewBotDialogOpen(true)} size="sm" variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Criar primeiro bot
              </Button>
            </div>
          )}
        </div>

      {/* Dialog de criar novo bot */}
      <Dialog open={newBotDialogOpen} onOpenChange={setNewBotDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Novo Bot</DialogTitle>
            <DialogDescription>
              Crie um novo bot de atendimento
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
            <div className="grid gap-2">
              <Label htmlFor="bot-description">Descrição (opcional)</Label>
              <Input
                id="bot-description"
                value={newBotDescription}
                onChange={(e) => setNewBotDescription(e.target.value)}
                placeholder="Ex: Automatiza atendimento de vendas"
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
                setNewBotDescription("");
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

      {/* Dialog de duplicar bot */}
      <Dialog 
        open={duplicateDialogOpen} 
        onOpenChange={(open) => {
          setDuplicateDialogOpen(open);
          if (!open) {
            setDuplicateName("");
            setDuplicateDescription("");
            setSelectedBot(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Duplicar Bot</DialogTitle>
            <DialogDescription>
              Criar uma cópia do bot
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="duplicate-name">Nome do Bot</Label>
              <Input
                id="duplicate-name"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder="Ex: Bot de Vendas (cópia)"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && duplicateName.trim()) {
                    handleDuplicateBot();
                  }
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="duplicate-description">Descrição (opcional)</Label>
              <Input
                id="duplicate-description"
                value={duplicateDescription}
                onChange={(e) => setDuplicateDescription(e.target.value)}
                placeholder="Ex: Automatiza atendimento de vendas"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && duplicateName.trim()) {
                    handleDuplicateBot();
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
                setDuplicateName("");
                setDuplicateDescription("");
                setDuplicateDialogOpen(false);
                setSelectedBot(null);
              }}
              disabled={isDuplicating}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={handleDuplicateBot}
              disabled={!duplicateName.trim() || isDuplicating}
            >
              {isDuplicating ? "Duplicando..." : "Duplicar Bot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de renomear bot */}
      <Dialog 
        open={renameDialogOpen} 
        onOpenChange={(open) => {
          setRenameDialogOpen(open);
          if (!open) {
            setRenameName("");
            setRenameDescription("");
            setSelectedBot(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Renomear Bot</DialogTitle>
            <DialogDescription>
              Alterar nome e descrição
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rename-name">Nome do Bot</Label>
              <Input
                id="rename-name"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="Ex: Bot de Vendas"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && renameName.trim()) {
                    handleRenameBot();
                  }
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rename-description">Descrição (opcional)</Label>
              <Input
                id="rename-description"
                value={renameDescription}
                onChange={(e) => setRenameDescription(e.target.value)}
                placeholder="Ex: Automatiza atendimento de vendas"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && renameName.trim()) {
                    handleRenameBot();
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
                setRenameName("");
                setRenameDescription("");
                setRenameDialogOpen(false);
                setSelectedBot(null);
              }}
              disabled={isRenaming}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={handleRenameBot}
              disabled={!renameName.trim() || isRenaming}
            >
              {isRenaming ? "Renomeando..." : "Renomear Bot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
