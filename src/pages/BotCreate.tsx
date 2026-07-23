import { useNavigate, useLocation } from "react-router-dom";
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
import { Plus, Workflow, ArrowRight, Smartphone } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { SubMenuHeader } from "@/components/SubMenuHeader";
import { useLayout } from "@/contexts/LayoutContext";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast-config";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { WorkflowCard, WorkflowCardGrid } from "@/components/ui/workflow-card";

interface BotCreateProps {
  embedded?: boolean;
}

// Cache em memória para evitar "reload" visível ao revisitar a tela
const botsCache: {
  bots: any[];
  sessions: any[];
  numeros: any[];
  loaded: boolean;
} = { bots: [], sessions: [], numeros: [], loaded: false };

export default function BotCreate({ embedded = false }: BotCreateProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { openSubmenu } = useLayout();
  const [bots, setBots] = useState<any[]>(botsCache.bots);
  const [loading, setLoading] = useState(!botsCache.loaded);
  const [newBotDialogOpen, setNewBotDialogOpen] = useState(false);
  const [newBotName, setNewBotName] = useState("");
  const [newBotDescription, setNewBotDescription] = useState("");
  const [selectedCanal, setSelectedCanal] = useState<string>("whatsapp");
  const [selectedWhatsAppType, setSelectedWhatsAppType] = useState<string>("waha");
  const [isCreating, setIsCreating] = useState(false);
  
  // Dialogs para duplicar e renomear
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState<any>(null);
  const [duplicateName, setDuplicateName] = useState("");
  const [duplicateDescription, setDuplicateDescription] = useState("");
  const [duplicateCanal, setDuplicateCanal] = useState<string>("whatsapp");
  const [duplicateWhatsAppType, setDuplicateWhatsAppType] = useState<string>("waha");
  const [renameName, setRenameName] = useState("");
  const [renameDescription, setRenameDescription] = useState("");
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [botToDelete, setBotToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // WhatsApp Sessions
  const [whatsappSessions, setWhatsappSessions] = useState<any[]>(botsCache.sessions);
  const [selectedSessions, setSelectedSessions] = useState<Record<string, string>>({});

  // Números de WhatsApp cadastrados
  const [whatsappNumeros, setWhatsappNumeros] = useState<any[]>(botsCache.numeros);
  const [selectedNumeroId, setSelectedNumeroId] = useState<string>("");
  const [duplicateNumeroId, setDuplicateNumeroId] = useState<string>("");


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
    loadWhatsAppNumeros();
    // Garante que nenhum overlay/dialog/popover fica preso ao montar (especialmente embedded)
    if (embedded) {
      setNewBotDialogOpen(false);
      setDuplicateDialogOpen(false);
      setRenameDialogOpen(false);
      setOpenMenuId(null);
      // Remove qualquer atributo data-scroll-locked deixado por Radix em casos extremos
      try {
        document.body.style.pointerEvents = '';
        document.body.removeAttribute('data-scroll-locked');
      } catch {}
    }
  }, [embedded]);

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
        botsCache.sessions = data;
        setWhatsappSessions(data);
      }
    } catch (error) {
      console.error("Error loading WhatsApp sessions:", error);
    }
  };

  const loadWhatsAppNumeros = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) return;
      const { data, error } = await supabase
        .from("whatsapp_numeros")
        .select("id, nome, telefone, provider, ativo, is_default")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("ativo", true)
        .order("is_default", { ascending: false })
        .order("nome", { ascending: true });
      if (error) {
        console.error("Error loading whatsapp_numeros:", error);
      } else {
        botsCache.numeros = data || [];
        setWhatsappNumeros(data || []);
      }
    } catch (e) {
      console.error("Error loading whatsapp_numeros:", e);
    }
  };

  const handleSessionChange = async (botId: string, sessionId: string) => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error("Estabelecimento não encontrado");
        return;
      }

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
        
        // Configurar webhook/status na Evolution pelo backend seguro
        if (session) {
          try {
            const { data, error } = await supabase.functions.invoke('waha-manager', {
              body: {
                action: 'status',
                estabelecimentoId,
                sessionId,
                sessionName: session.session_name,
              },
            });
            if (error || (data as any)?.error) {
              console.warn("Não foi possível sincronizar a Evolution:", error?.message || (data as any)?.error);
            }
          } catch (webhookError) {
            console.error("Erro ao sincronizar Evolution:", webhookError);
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
      
      console.log("🏢 Estabelecimento ID:", estabelecimentoId);
      
      if (!estabelecimentoId) {
        console.warn("⚠️ Estabelecimento não identificado, buscando todos os bots");
        // Se não há estabelecimento (admin sem seleção), buscar todos
        const { data, error } = await supabase
          .from("bot_flows")
          .select("*")
          .order("updated_at", { ascending: false });

        if (error) throw error;
        console.log("📋 Bots encontrados:", data?.length || 0);
        botsCache.bots = data || [];
        botsCache.loaded = true;
        setBots(data || []);
      } else {
        const { data, error } = await supabase
          .from("bot_flows")
          .select("*")
          .eq("estabelecimento_id", estabelecimentoId)
          .order("updated_at", { ascending: false });

        if (error) throw error;
        console.log("📋 Bots encontrados para estabelecimento:", data?.length || 0);
        botsCache.bots = data || [];
        botsCache.loaded = true;
        setBots(data || []);
      }
    } catch (error) {
      console.error("Error loading bots:", error);
      toast.error("Erro ao carregar bots");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBot = (botId: string, botName: string) => {
    setBotToDelete({ id: botId, name: botName });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDeleteBot = async () => {
    if (!botToDelete) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from("bot_flows")
        .delete()
        .eq("id", botToDelete.id);

      if (error) throw error;

      toast.success("Bot excluído com sucesso!");
      loadBots();
    } catch (error) {
      console.error("Error deleting bot:", error);
      toast.error("Erro ao excluir bot");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setBotToDelete(null);
      // Workaround Radix AlertDialog pointer-events bug
      setTimeout(() => {
        document.body.style.pointerEvents = "";
      }, 100);
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
      const whatsappTypeParam = selectedCanal === 'whatsapp' ? `&whatsapp_type=${selectedWhatsAppType}` : '';
      const numeroParam = selectedCanal === 'whatsapp' && selectedNumeroId ? `&whatsapp_numero_id=${encodeURIComponent(selectedNumeroId)}` : '';
      openBuilder(`/bot-builder?name=${encodeURIComponent(newBotName.trim())}&description=${encodeURIComponent(newBotDescription.trim())}&canais=${encodeURIComponent(JSON.stringify([selectedCanal]))}${whatsappTypeParam}${numeroParam}`);
      setNewBotDialogOpen(false);
      setNewBotName("");
      setNewBotDescription("");
      setSelectedCanal("whatsapp");
      setSelectedWhatsAppType("waha");
      setSelectedNumeroId("");
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
      const botInsertData: any = {
        name: duplicateName.trim(),
        description: duplicateDescription.trim(),
        flow_data: selectedBot.flow_data,
        active: false,
        estabelecimento_id: estabelecimentoId,
        canais: [duplicateCanal],
      };
      
      // Adicionar whatsapp_type apenas se o canal for WhatsApp
      if (duplicateCanal === 'whatsapp') {
        botInsertData.whatsapp_type = duplicateWhatsAppType;
      }
      
      const { error } = await supabase
        .from("bot_flows")
        .insert(botInsertData);

      if (error) throw error;

      toast.success("Bot duplicado com sucesso!");
      setDuplicateDialogOpen(false);
      setDuplicateName("");
      setDuplicateDescription("");
      setDuplicateCanal("whatsapp");
      setDuplicateWhatsAppType("waha");
      setSelectedBot(null);
      closeOverlays();
      // Garantir que pointer-events do body seja restaurado (workaround Radix Dialog + Select)
      setTimeout(() => {
        document.body.style.pointerEvents = "";
      }, 100);
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
    instagram: 'Instagram',
    marketing_automation: 'Automação de Marketing'
  };

  const getBuilderOrigin = () => embedded ? '/atendimento-config?tab=bot-criar' : `${location.pathname}${location.search}`;

  const openBuilder = (url: string) => {
    navigate(url, { state: { from: getBuilderOrigin() } });
  };

  return (
    <div className={`${embedded ? '' : 'p-4 sm:p-6 md:p-8 '}space-y-4 md:space-y-8 animate-fade-in bg-background dark:bg-background min-h-full`}>
        {!embedded && (
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <SubMenuHeader 
                title="Bot"
                onOpenSubmenu={() => openSubmenu("Bot Test")}
              />
              <h1 className="text-base sm:text-lg font-bold text-foreground">Criar Bot</h1>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground">
              Crie e configure novos bots para automação de atendimento
            </p>
          </div>
        )}

        {/* Card de criar novo bot */}
        <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-dashed border-primary/30" onClick={() => setNewBotDialogOpen(true)}>
          <CardHeader className="p-3 sm:p-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
              <Workflow className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <CardTitle className="text-base sm:text-lg">Novo Bot de Fluxo</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Crie um bot usando o editor visual de fluxos. Ideal para automações complexas com múltiplas ramificações.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <Button className="w-full text-sm sm:text-base h-9 sm:h-10">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Criar Novo Bot
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Loading state */}
        {loading && (
          <div className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse h-full">
                <CardHeader className="p-3 sm:p-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-muted mb-3 sm:mb-4"></div>
                  <div className="h-5 sm:h-6 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 sm:h-4 bg-muted rounded w-full"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* Agrupamento por canais */}
        {!loading && bots.length > 0 && (
          <>
            {['whatsapp', 'webchat', 'telegram', 'facebook', 'instagram', 'marketing_automation'].map((canal) => {
              const canalBots = bots.filter(bot => bot.canais?.includes(canal));
              if (canalBots.length === 0) return null;

              return (
                <div key={canal} className="space-y-3 sm:space-y-4">
                  <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                    {canalLabels[canal]}
                    <Badge variant="outline" className="text-xs">{canalBots.length}</Badge>
                  </h2>
                  <WorkflowCardGrid>
                    {canalBots.map((bot) => (
                      <WorkflowCard
                        key={bot.id}
                        id={bot.id}
                        title={bot.name}
                        description={bot.description}
                        isActive={bot.active}
                        blocksCount={bot.flow_data?.nodes?.length || 0}
                        menuOpen={openMenuId === bot.id}
                        onMenuOpenChange={(open) => setOpenMenuId(open ? bot.id : null)}
                        onEdit={() => openBuilder(`/bot-builder?id=${bot.id}`)}
                        onRename={() => {
                          setSelectedBot(bot);
                          setRenameName(bot.name);
                          setRenameDescription(bot.description || "");
                          setRenameDialogOpen(true);
                        }}
                        onDuplicate={() => {
                          setSelectedBot(bot);
                          setDuplicateName(`${bot.name} (cópia)`);
                          setDuplicateDescription(bot.description || "");
                          setDuplicateCanal(bot.canais?.[0] || "whatsapp");
                          setDuplicateWhatsAppType(bot.whatsapp_type || "waha");
                          setDuplicateDialogOpen(true);
                        }}
                        onToggleActive={() => handleToggleActive(bot.id, bot.active)}
                        onDelete={() => handleDeleteBot(bot.id, bot.name)}
                        onOpenEditor={() => openBuilder(`/bot-builder?id=${bot.id}`)}
                        customContent={
                          <>
                            <div className="flex items-center gap-2 flex-wrap">
                              {bot.canais && bot.canais.length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {canalLabels[bot.canais[0]] || bot.canais[0]}
                                </Badge>
                              )}
                              {bot.canais && bot.canais.includes('whatsapp') && (
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    bot.whatsapp_type === 'business' 
                                      ? 'bg-green-500/10 text-green-700 border-green-500/20' 
                                      : 'bg-primary/10 text-primary border-primary/20'
                                  }`}
                                >
                                  {bot.whatsapp_type === 'business' ? 'Business' : 'Evolution'}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Atualizado {formatDistanceToNow(new Date(bot.updated_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </div>
                            {(canal === 'whatsapp' || canal === 'marketing_automation') && (
                              <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                <Label className="text-xs flex items-center gap-1">
                                  <Smartphone className="h-3 w-3" />
                                  Número WhatsApp
                                </Label>
                                <Select
                                  value={selectedSessions[bot.id] || "none"}
                                  onValueChange={(value) => handleSessionChange(bot.id, value === "none" ? "" : value)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
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
                            )}
                          </>
                        }
                      />
                    ))}
                  </WorkflowCardGrid>
                </div>
              );
            })}
          </>
        )}

        {!loading && bots.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-muted mx-auto mb-3 sm:mb-4 flex items-center justify-center">
              <Workflow className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
            </div>
            <p className="text-sm sm:text-base text-muted-foreground px-4">
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
              <Label htmlFor="bot-canal">Setor de Disparo *</Label>
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
                  <SelectItem value="marketing_automation">Automação de Marketing</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Selecione o canal onde este bot será usado
              </p>
            </div>
            
            {selectedCanal === 'whatsapp' && (
              <div className="grid gap-2">
                <Label htmlFor="bot-whatsapp-type">Tipo de WhatsApp *</Label>
                <Select value={selectedWhatsAppType} onValueChange={(v) => { setSelectedWhatsAppType(v); setSelectedNumeroId(""); }}>
                  <SelectTrigger id="bot-whatsapp-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="waha">WhatsApp Evolution</SelectItem>
                    <SelectItem value="business">WhatsApp Business (Meta)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Evolution: servidor próprio | Business: API oficial Meta
                </p>
              </div>
            )}

            {selectedCanal === 'whatsapp' && (() => {
              const expectedProvider = selectedWhatsAppType === 'business' ? 'cloud_api' : 'evolution';
              const filtered = whatsappNumeros.filter((n) => n.provider === expectedProvider);
              return (
                <div className="grid gap-2">
                  <Label htmlFor="bot-whatsapp-numero">Número do WhatsApp</Label>
                  <Select value={selectedNumeroId || "__default__"} onValueChange={(v) => setSelectedNumeroId(v === "__default__" ? "" : v)}>
                    <SelectTrigger id="bot-whatsapp-numero">
                      <SelectValue placeholder="Usar número padrão" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">Usar número padrão</SelectItem>
                      {filtered.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.nome}{n.telefone ? ` · ${n.telefone}` : ""}{n.is_default ? " (padrão)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {filtered.length === 0
                      ? "Nenhum número cadastrado para esse tipo. Cadastre em Configurações de Atendimento → Canais."
                      : "Mensagens deste bot serão enviadas pelo número selecionado."}
                  </p>
                </div>
              );
            })()}
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
            setDuplicateDescription("");
            setDuplicateCanal("whatsapp");
            setDuplicateWhatsAppType("waha");
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
            <div className="grid gap-2">
              <Label htmlFor="duplicate-canal">Setor de Disparo *</Label>
              <Select value={duplicateCanal} onValueChange={setDuplicateCanal}>
                <SelectTrigger id="duplicate-canal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="webchat">WebChat</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="marketing_automation">Automação de Marketing</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Selecione o canal onde este bot será usado
              </p>
            </div>
            
            {duplicateCanal === 'whatsapp' && (
              <div className="grid gap-2">
                <Label htmlFor="duplicate-whatsapp-type">Tipo de WhatsApp *</Label>
                <Select value={duplicateWhatsAppType} onValueChange={setDuplicateWhatsAppType}>
                  <SelectTrigger id="duplicate-whatsapp-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="waha">WhatsApp Evolution</SelectItem>
                    <SelectItem value="business">WhatsApp Business (Meta)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Evolution: servidor próprio | Business: API oficial Meta
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDuplicateName("");
                setDuplicateDescription("");
                setDuplicateCanal("whatsapp");
                setDuplicateWhatsAppType("waha");
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
              disabled={!duplicateName.trim() || !duplicateCanal || isDuplicating}
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

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDeleteBot}
        itemName={botToDelete?.name}
        isLoading={isDeleting}
      />

    </div>
  );
}
