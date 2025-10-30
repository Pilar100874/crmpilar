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
import { Plus, Workflow, ArrowRight, MoreVertical, Trash2, Edit, Power, Smartphone, QrCode } from "lucide-react";
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

  // WhatsApp Sessions
  const [whatsappSessions, setWhatsappSessions] = useState<any[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<Record<string, string>>({});
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [selectedQRSession, setSelectedQRSession] = useState<any>(null);
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [isLoadingQR, setIsLoadingQR] = useState(false);


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
            const webhookResponse = await fetch(`${config.waha_url}/api/webhooks`, {
              method: 'POST',
              headers: {
                'X-Api-Key': config.waha_api_key,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                url: webhookUrl,
                events: ['message'],
                session: session.session_name
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

  const handleShowQRCode = async (sessionId: string) => {
    const session = whatsappSessions.find(s => s.id === sessionId);
    if (!session) return;

    setSelectedQRSession(session);
    setShowQRDialog(true);
    setIsLoadingQR(true);

    try {
      // Busca a configuração WAHA
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error("Estabelecimento não encontrado");
        setShowQRDialog(false);
        return;
      }

      const { data: config } = await supabase
        .from('whatsapp_config')
        .select('waha_url, waha_api_key')
        .eq('estabelecimento_id', estabelecimentoId)
        .maybeSingle();

      if (!config?.waha_url || !config?.waha_api_key) {
        toast.error("Configure o servidor WAHA primeiro em Configurações > Estabelecimento");
        setShowQRDialog(false);
        return;
      }

      // Se a sessão está conectada, informa ao usuário
      if (session.status === 'WORKING') {
        toast.success("WhatsApp já está conectado!");
        setShowQRDialog(false);
        return;
      }

      console.log(`Verificando sessão "${session.session_name}" no WAHA...`);

      // Verifica se a sessão existe no WAHA
      const checkResponse = await fetch(
        `${config.waha_url}/api/sessions/${session.session_name}`,
        {
          headers: {
            'X-Api-Key': config.waha_api_key
          }
        }
      );

      // Se a sessão não existe, cria ela
      if (!checkResponse.ok) {
        console.log(`Sessão "${session.session_name}" não encontrada. Criando...`);
        
        const createResponse = await fetch(`${config.waha_url}/api/sessions/`, {
          method: 'POST',
          headers: {
            'X-Api-Key': config.waha_api_key,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: session.session_name,
            config: {
              webhooks: [{
                url: `https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/whatsapp-webhook`,
                events: ['message']
              }]
            }
          })
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error("Erro ao criar sessão:", errorText);
          throw new Error(`Não foi possível criar a sessão no WAHA: ${errorText}`);
        }

        console.log("Sessão criada com sucesso!");
        // Aguarda a sessão ser inicializada
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        // Verifica o status da sessão existente
        const sessionData = await checkResponse.json();
        console.log("Status da sessão no WAHA:", sessionData.status);
        
        // Se a sessão está parada, inicia ela
        if (sessionData.status === 'STOPPED') {
          console.log("Iniciando sessão...");
          await fetch(`${config.waha_url}/api/sessions/${session.session_name}/start`, {
            method: 'POST',
            headers: {
              'X-Api-Key': config.waha_api_key,
              'Content-Type': 'application/json'
            }
          });
          
          // Aguarda inicialização
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      // Tenta buscar o QR code com retry
      let attempts = 0;
      let qrData = null;
      
      while (attempts < 5 && !qrData) {
        attempts++;
        console.log(`Tentativa ${attempts} de buscar QR code...`);
        
        const qrResponse = await fetch(
          `${config.waha_url}/api/sessions/${session.session_name}/auth/qr`,
          {
            headers: {
              'X-Api-Key': config.waha_api_key
            }
          }
        );

        if (qrResponse.ok) {
          const data = await qrResponse.json();
          if (data.qr) {
            qrData = data;
            break;
          }
        }
        
        // Aguarda antes de tentar novamente
        if (attempts < 5) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      if (qrData?.qr) {
        setQrCodeData(qrData.qr);
        
        // Salva o QR code no banco
        await supabase
          .from('whatsapp_sessions')
          .update({ 
            qr_code: qrData.qr,
            status: 'SCAN_QR_CODE'
          })
          .eq('id', session.id);

        await loadWhatsAppSessions();
        toast.success("QR Code carregado! Escaneie com seu WhatsApp.");
      } else {
        throw new Error(`QR code não disponível após ${attempts} tentativas. Verifique se o nome da sessão "${session.session_name}" está correto no WAHA.`);
      }
    } catch (error) {
      console.error("Error loading QR code:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(errorMessage);
      setShowQRDialog(false);
    } finally {
      setIsLoadingQR(false);
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

        <div className="grid gap-[1cm] md:grid-cols-3 lg:grid-cols-4">
          <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-dashed border-primary/30 h-full flex flex-col" onClick={() => setNewBotDialogOpen(true)}>
              <CardHeader className="flex-1 p-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Workflow className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Novo Bot de Fluxo</CardTitle>
              <CardDescription>
                Crie um bot usando o editor visual de fluxos. Ideal para automações complexas com múltiplas ramificações.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto p-4 pt-0">
              <Button className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Criar Novo Bot
                <ArrowRight className="w-4 h-4 ml-2" />
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
            bots.map((bot) => (
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
                  <CardDescription>
                    {bot.flow_data?.nodes?.length || 0} blocos • 
                    Atualizado {formatDistanceToNow(new Date(bot.updated_at), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto p-4 pt-0 space-y-3">
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
                      {selectedSessions[bot.id] && selectedSessions[bot.id] !== "none" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShowQRCode(selectedSessions[bot.id]);
                          }}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
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

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>
              Escaneie o QR code com seu WhatsApp para conectar
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            {isLoadingQR ? (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Gerando QR code...</p>
              </div>
            ) : qrCodeData ? (
              <>
                <div className="bg-white p-4 rounded-lg">
                  <img 
                    src={qrCodeData} 
                    alt="QR Code WhatsApp" 
                    className="w-64 h-64"
                  />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium">
                    Sessão: {selectedQRSession?.session_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Status: {selectedQRSession?.status}
                  </p>
                  <div className="mt-4 p-3 bg-muted rounded-lg text-xs space-y-1">
                    <p className="font-medium">Como conectar:</p>
                    <ol className="list-decimal list-inside space-y-1 text-left">
                      <li>Abra o WhatsApp no seu celular</li>
                      <li>Toque em Menu ou Configurações</li>
                      <li>Toque em Dispositivos conectados</li>
                      <li>Toque em Conectar um dispositivo</li>
                      <li>Aponte seu celular para esta tela para escanear o QR code</li>
                    </ol>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                QR code não disponível
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
