import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Workflow, ArrowRight, MoreVertical, Trash2, Edit, Power, Smartphone } from "lucide-react";
import { SubMenuHeader } from "@/components/SubMenuHeader";
import { useLayout } from "@/contexts/LayoutContext";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/lib/toast-config";
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
  const [selectedCanal, setSelectedCanal] = useState<string>("whatsapp");
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

  // WhatsApp Sessions
  const [whatsappSessions, setWhatsappSessions] = useState<any[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<Record<string, string>>({});


  // Fail-safe para fechar overlays caso algo fique preso
  const closeOverlays = () => {
    try {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' } as any));
      (document.activeElement as HTMLElement)?.blur?.();
    } catch {}
  };

  useEffect(() => {
    loadBots();
    loadWhatsAppSessions();
  }, []);

  useEffect(() => {
    // Carrega as sessões selecionadas para cada bot
    const sessions: Record<string, string> = {};
    for (const bot of bots) {
      const session = whatsappSessions.find(s => s.bot_flow_id === bot.id);
      if (session) {
        sessions[bot.id] = session.id;
      }
    }
    setSelectedSessions(sessions);
  }, [whatsappSessions, bots]);

  const loadWhatsAppSessions = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) return;

      const { data, error } = await supabase
        .from("whatsapp_sessions")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId);

      if (error) {
        console.error("Error loading WhatsApp sessions:", error);
      } else if (data) {
        console.log("Loaded WhatsApp sessions:", data);
        setWhatsappSessions(data);
      }
    } catch (error) {
      console.error("Error loading WhatsApp sessions:", error);
    }
  };

  const handleSessionChange = async (botId: string, sessionId: string) => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error("Estabelecimento não encontrado");
        return;
      }

      // Buscar configuração WAHA
      const { data: config } = await supabase
        .from('whatsapp_config')
        .select('waha_url, waha_api_key')
        .eq('estabelecimento_id', estabelecimentoId)
        .maybeSingle();

      // Limpar vinculação anterior
      const previousSession = whatsappSessions.find(s => s.bot_flow_id === botId);
      if (previousSession) {
        await supabase
          .from("whatsapp_sessions")
          .update({ bot_flow_id: null })
          .eq("id", previousSession.id);
      }

      // Atribuir nova sessão
      if (sessionId) {
        const session = whatsappSessions.find(s => s.id === sessionId);
        
        await supabase
          .from("whatsapp_sessions")
          .update({ bot_flow_id: botId })
          .eq("id", sessionId);
        
        // Configurar webhook no WAHA
        if (config?.waha_url && config?.waha_api_key && session) {
          try {
            const webhookUrl = `https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/whatsapp-webhook`;
            
            // Configurar webhook usando a API do WAHA
            const webhookResponse = await fetch(`${config.waha_url}/api/sessions/${session.session_name}/`, {
              method: 'POST',
              headers: {
                'X-Api-Key': config.waha_api_key,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                config: {
                  webhooks: [{ url: webhookUrl, events: ['message'] }]
                }
              })
            });

            if (webhookResponse.ok) {
              console.log("Webhook configurado com sucesso no WAHA");
            } else {
              console.warn("Não foi possível configurar o webhook no WAHA:", await webhookResponse.text());
            }
          } catch (webhookError) {
            console.error("Erro ao configurar webhook no WAHA:", webhookError);
            // Não exibe erro ao usuário pois o bot pode funcionar sem webhook configurado via UI
          }
        }
        
        toast.success("Número WhatsApp associado ao bot!");
      } else {
        toast.success("Número WhatsApp removido do bot!");
      }

      setSelectedSessions(prev => ({ ...prev, [botId]: sessionId }));
      await loadWhatsAppSessions();
    } catch (error) {
      console.error("Error updating session:", error);
      toast.error("Erro ao associar número");
    }
  };

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
      // Se for ativar, aplicar lógica por canal/sessões
      if (!currentActive) {
        const estabelecimentoId = await getEstabelecimentoId();
        if (!estabelecimentoId) {
          toast.error("Não foi possível identificar o estabelecimento");
          return;
        }

        // Carregar o bot que está sendo ativado
        const { data: botToActivate, error: botError } = await supabase
          .from("bot_flows")
          .select("*")
          .eq("id", botId)
          .single();

        if (botError || !botToActivate) {
          toast.error("Erro ao carregar informações do bot");
          return;
        }

        const botCanal = botToActivate.canais?.[0] || "whatsapp";

        // Buscar todos os bots ativos do mesmo estabelecimento e mesmo canal (exceto o atual)
        const { data: activeBots } = await supabase
          .from("bot_flows")
          .select("*")
          .eq("estabelecimento_id", estabelecimentoId)
          .eq("active", true)
          .neq("id", botId);

        // Determinar conflitos por canal/sessão
        const botsToDeactivate: string[] = [];
        for (const activeBot of activeBots || []) {
          const activeBotCanal = activeBot.canais?.[0] || "whatsapp";
          
          if (botCanal === activeBotCanal) {
            if (botCanal === "whatsapp") {
              // Para WhatsApp, permitir múltiplos se tiverem sessões diferentes
              const { data: sessions } = await supabase
                .from("whatsapp_sessions")
                .select("id, bot_flow_id")
                .or(`bot_flow_id.eq.${botId},bot_flow_id.eq.${activeBot.id}`);

              const botSession = sessions?.find((s: any) => s.bot_flow_id === botId);
              const activeBotSession = sessions?.find((s: any) => s.bot_flow_id === activeBot.id);

              if (botSession && activeBotSession && botSession.id !== activeBotSession.id) {
                continue; // sessões diferentes: manter ambos ativos
              }
            }
            botsToDeactivate.push(activeBot.id);
          }
        }

        if (botsToDeactivate.length > 0) {
          await supabase
            .from("bot_flows")
            .update({ active: false })
            .in("id", botsToDeactivate);
        }
      }

      // Alternar status do bot atual
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
      navigate(`/bot-builder?name=${encodeURIComponent(newBotName.trim())}&description=${encodeURIComponent(newBotDescription.trim())}&canais=${encodeURIComponent(JSON.stringify([selectedCanal]))}`);
      setNewBotDialogOpen(false);
      setNewBotName("");
      setNewBotDescription("");
      setSelectedCanal("whatsapp");
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

  const canalLabels: Record<string, string> = {
    whatsapp: 'WhatsApp',
    webchat: 'WebChat',
    telegram: 'Telegram',
    facebook: 'Facebook',
    instagram: 'Instagram'
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

        {/* Card de criar novo bot */}
        <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-dashed border-primary/30" onClick={() => setNewBotDialogOpen(true)}>
          <CardHeader className="p-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Workflow className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Novo Bot de Fluxo</CardTitle>
            <CardDescription>
              Crie um bot usando o editor visual de fluxos. Ideal para automações complexas com múltiplas ramificações.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Button className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Criar Novo Bot
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Loading state */}
        {loading && (
          <div className="grid gap-[1cm] md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse h-full">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-muted mb-4"></div>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-full"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* Agrupamento por canais */}
        {!loading && bots.length > 0 && (
          <>
            {['whatsapp', 'webchat', 'telegram', 'facebook', 'instagram'].map((canal) => {
              const canalBots = bots.filter(bot => bot.canais?.includes(canal));
              if (canalBots.length === 0) return null;

              return (
                <div key={canal} className="space-y-4">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    {canalLabels[canal]}
                    <Badge variant="outline">{canalBots.length}</Badge>
                  </h2>
                  <div className="grid gap-[1cm] md:grid-cols-3 lg:grid-cols-4">
                    {canalBots.map((bot) => (
                      <Card 
                        key={bot.id} 
                        className="hover:shadow-lg transition-all cursor-pointer relative group h-full flex flex-col"
                        onClick={() => navigate(`/bot-builder?id=${bot.id}`)}
                      >
                        <div className="absolute top-4 right-4 z-10">
                          <DropdownMenu open={openMenuId === bot.id} onOpenChange={(open) => setOpenMenuId(open ? bot.id : null)}>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
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
                        
                        <CardHeader className="flex-1 p-4">
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
                          {bot.description && (
                            <p className="text-sm text-muted-foreground mb-2">{bot.description}</p>
                          )}
                          <div className="mb-2">
                            {bot.canais && bot.canais.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {canalLabels[bot.canais[0]] || bot.canais[0]}
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
                        <CardContent className="mt-auto p-4 pt-0 space-y-3">
                          {canal === 'whatsapp' && (
                            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                              <Label className="text-xs flex items-center gap-1">
                                <Smartphone className="h-3 w-3" />
                                Número WhatsApp
                              </Label>
                              <div className="flex gap-2">
                                <Select
                                  value={selectedSessions[bot.id] || "none"}
                                  onValueChange={(value) => handleSessionChange(bot.id, value === "none" ? "" : value)}
                                >
                                  <SelectTrigger className="h-8 text-xs flex-1">
                                    <SelectValue placeholder="Nenhum número" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background z-50">
                                    <SelectItem value="none">Nenhum</SelectItem>
                                    {whatsappSessions
                                      .filter(s => !s.bot_flow_id || s.bot_flow_id === bot.id)
                                      .map(session => (
                                        <SelectItem key={session.id} value={session.id}>
                                          {session.phone_number || session.session_name} ({session.status})
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                          <Button variant="outline" className="w-full">
                            <Edit className="w-4 h-4 mr-2" />
                            Abrir Editor
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}

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
            <div className="grid gap-2">
              <Label htmlFor="bot-canal">Canal de Atendimento *</Label>
              <Select value={selectedCanal} onValueChange={setSelectedCanal}>
                <SelectTrigger id="bot-canal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="webchat">WebChat</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Selecione o canal onde este bot será usado
              </p>
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
              disabled={!newBotName.trim() || !selectedCanal || isCreating}
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
            setSelectedBot(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Duplicar Bot</DialogTitle>
            <DialogDescription>
              Digite um nome único para o bot duplicado.
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
            setSelectedBot(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Renomear Bot</DialogTitle>
            <DialogDescription>
              Digite um novo nome para o bot.
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
