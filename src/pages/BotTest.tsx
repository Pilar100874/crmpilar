import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RotateCcw, AlertCircle, Power } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { FlowSimulator } from "@/components/flow/FlowSimulator";

import { Node, Edge } from "@xyflow/react";
import { SubMenuHeader } from "@/components/SubMenuHeader";
import { useLayout } from "@/contexts/LayoutContext";

interface BotTestProps {
  embedded?: boolean;
}

export default function BotTest({ embedded = false }: BotTestProps) {
  const { openSubmenu } = useLayout();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [savedBots, setSavedBots] = useState<any[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>("");
  const [selectedBotName, setSelectedBotName] = useState<string>("");
  const [activeBotId, setActiveBotId] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<"whatsapp" | "facebook" | "instagram" | "telegram" | "webchat">("whatsapp");
  const [key, setKey] = useState(0); // Para forçar re-render do simulador

  useEffect(() => {
    loadSavedBots();
  }, []);

  useEffect(() => {
    loadSavedBots();
  }, [selectedChannel]);

  const loadSavedBots = async () => {
    const estabelecimentoId = await getEstabelecimentoId();
    
    console.log("🏢 Estabelecimento ID (BotTest):", estabelecimentoId);
    
    let query = supabase
      .from("bot_flows")
      .select("*")
      .order("updated_at", { ascending: false });
    
    if (estabelecimentoId) {
      query = query.eq("estabelecimento_id", estabelecimentoId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading bots:", error);
      toast.error("Erro ao carregar bots");
    } else {
      setSavedBots(data || []);
      
      // Filtrar bots por canal selecionado
      const filteredBots = (data || []).filter(bot => {
        const canais = bot.canais || [];
        return canais.includes(selectedChannel);
      });

      // Auto-select active bot do canal atual
      const activeBot = filteredBots.find(b => b.active);
      setActiveBotId(activeBot?.id || null);
      
      if (activeBot) {
        setSelectedBotId(activeBot.id);
        setSelectedBotName(activeBot.name);
        loadBot(activeBot.id);
      } else if (selectedBotId) {
        // Verificar se o bot selecionado ainda é válido para o canal atual
        const currentBotValid = filteredBots.find(b => b.id === selectedBotId);
        if (!currentBotValid) {
          setSelectedBotId("");
          setSelectedBotName("");
          setNodes([]);
          setEdges([]);
        }
      }
    }
  };

  const loadBot = async (botId: string) => {
    try {
      const { data: dbFlow, error } = await supabase
        .from("bot_flows")
        .select("*")
        .eq("id", botId)
        .single();

      if (error) throw error;

      if (dbFlow && dbFlow.flow_data) {
        const flowData = dbFlow.flow_data as any;
        setNodes(flowData.nodes || []);
        setEdges(flowData.edges || []);
        setSelectedBotName(dbFlow.name);
        setKey(prev => prev + 1); // Força re-render do simulador
        toast.success(`Bot "${dbFlow.name}" carregado!`);
      }
    } catch (error) {
      console.error("Error loading bot:", error);
      toast.error("Erro ao carregar bot");
      setNodes([]);
      setEdges([]);
    }
  };

  const handleBotChange = (botId: string) => {
    setSelectedBotId(botId);
    loadBot(botId);
  };

  const handleReload = () => {
    if (selectedBotId) {
      loadBot(selectedBotId);
    }
    loadSavedBots(); // Recarregar status de bots ativos
  };

  const handleActivateBot = async (botId: string) => {
    const estabelecimentoId = await getEstabelecimentoId();
    
    if (!estabelecimentoId) {
      toast.error("Não foi possível identificar o estabelecimento");
      return;
    }

    // Buscar o bot que está sendo ativado
    const { data: botToActivate, error: botError } = await supabase
      .from("bot_flows")
      .select("*")
      .eq("id", botId)
      .single();

    if (botError || !botToActivate) {
      toast.error("Erro ao carregar informações do bot");
      return;
    }

    const botCanais = botToActivate.canais || ["whatsapp"];

    // Buscar todos os bots ativos do mesmo estabelecimento
    const { data: activeBots } = await supabase
      .from("bot_flows")
      .select("*")
      .eq("estabelecimento_id", estabelecimentoId)
      .eq("active", true)
      .neq("id", botId);

    // Verificar conflitos de canais
    const botsToDeactivate: string[] = [];
    
    for (const activeBot of activeBots || []) {
      const activeBotCanais = activeBot.canais || ["whatsapp"];
      
      // Verificar se há overlap de canais
      const hasOverlap = botCanais.some(canal => activeBotCanais.includes(canal));
      
      if (hasOverlap) {
        // Para WhatsApp, verificar se há sessões diferentes
        if (botCanais.includes("whatsapp") && activeBotCanais.includes("whatsapp")) {
          // Buscar sessões associadas aos bots
          const { data: sessions } = await supabase
            .from("whatsapp_sessions")
            .select("*")
            .or(`bot_flow_id.eq.${botId},bot_flow_id.eq.${activeBot.id}`);
          
          const botSession = sessions?.find(s => s.bot_flow_id === botId);
          const activeBotSession = sessions?.find(s => s.bot_flow_id === activeBot.id);
          
          // Se ambos têm sessões diferentes, permitir ambos ativos
          if (botSession && activeBotSession && botSession.id !== activeBotSession.id) {
            continue; // Não desativar este bot
          }
        }
        
        // Se chegou aqui, há conflito - desativar o bot ativo
        botsToDeactivate.push(activeBot.id);
      }
    }

    // Desativar bots conflitantes
    if (botsToDeactivate.length > 0) {
      await supabase
        .from("bot_flows")
        .update({ active: false })
        .in("id", botsToDeactivate);
    }

    // Ativar o bot selecionado
    const { error } = await supabase
      .from("bot_flows")
      .update({ active: true })
      .eq("id", botId)
      .eq("estabelecimento_id", estabelecimentoId);

    if (error) {
      console.error("Error activating bot:", error);
      toast.error("Erro ao ativar bot");
    } else {
      const deactivatedCount = botsToDeactivate.length;
      if (deactivatedCount > 0) {
        toast.success(`Bot ativado! ${deactivatedCount} bot(s) conflitante(s) desativado(s).`);
      } else {
        toast.success("Bot ativado com sucesso!");
      }
      loadSavedBots();
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-background dark:bg-card">
        <div className="p-3 sm:p-4 border-b border-border bg-background dark:bg-card shadow-sm flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-3 sm:mb-4">
            <div>
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <SubMenuHeader 
                  title="Bot"
                  onOpenSubmenu={() => openSubmenu("Bot Test")}
                />
                <h2 className="text-base sm:text-lg font-bold text-foreground">TESTE DO BOT</h2>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {selectedBotName ? `Testando: ${selectedBotName}` : "Selecione um bot para testar"}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <Select value={selectedChannel} onValueChange={(value: any) => setSelectedChannel(value)}>
                <SelectTrigger className="w-full sm:w-[160px] md:w-[180px] rounded-full text-xs sm:text-sm h-9 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                  <SelectItem value="facebook">💬 Facebook</SelectItem>
                  <SelectItem value="instagram">📷 Instagram</SelectItem>
                  <SelectItem value="telegram">✈️ Telegram</SelectItem>
                  <SelectItem value="webchat">🌐 WebChat</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedBotId} onValueChange={handleBotChange}>
                <SelectTrigger className="w-full sm:w-[180px] md:w-[200px] rounded-full text-xs sm:text-sm h-9 sm:h-10">
                  <SelectValue placeholder="Selecione um bot" />
                </SelectTrigger>
                <SelectContent>
                  {savedBots
                    .filter(bot => {
                      const canais = bot.canais || [];
                      return canais.includes(selectedChannel);
                    })
                    .map((bot) => (
                      <SelectItem key={bot.id} value={bot.id}>
                        {bot.name} {bot.active && "⭐"}
                      </SelectItem>
                    ))}
                  {savedBots.filter(bot => {
                    const canais = bot.canais || [];
                    return canais.includes(selectedChannel);
                  }).length === 0 && (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      Nenhum bot configurado para este canal
                    </div>
                  )}
                </SelectContent>
              </Select>
              {selectedBotId && selectedBotId !== activeBotId && (
                <Button 
                  onClick={() => handleActivateBot(selectedBotId)}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-4"
                  size="sm"
                >
                  <Power className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Ativar Bot</span>
                  <span className="sm:hidden">Ativar</span>
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReload}
                disabled={!selectedBotId}
                className="rounded-full text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-4"
              >
                <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Recarregar</span>
                <span className="sm:hidden">Reload</span>
              </Button>
            </div>
          </div>
          
          {!activeBotId && savedBots.length > 0 && (
            <Alert className="bg-orange-50 border-orange-200 mt-3 sm:mt-0">
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
              <AlertDescription className="text-orange-900 text-xs sm:text-sm">
                <strong>⚠️ Nenhum bot ativo!</strong> Selecione um bot acima e clique em "Ativar Bot" para que ele responda nos canais.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden p-3 sm:p-4">
          {nodes.length > 0 ? (
            <div className="h-full min-h-0 flex flex-col bg-muted rounded-2xl overflow-hidden shadow-lg">
              <FlowSimulator 
                key={key}
                nodes={nodes} 
                edges={edges}
                channel={selectedChannel}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p className="text-base sm:text-lg mb-2">⚠️ Nenhum fluxo carregado</p>
                <p className="text-xs sm:text-sm px-4">Selecione um bot acima ou crie um novo no Bot Builder</p>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}
