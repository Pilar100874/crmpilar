import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RotateCcw, MessageSquare, Smartphone, AlertCircle, Power } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { FlowSimulator } from "@/components/flow/FlowSimulator";
import { WhatsAppQRCode } from "@/components/WhatsAppQRCode";

import { Node, Edge } from "@xyflow/react";
import { SubMenuHeader } from "@/components/SubMenuHeader";
import { useLayout } from "@/contexts/LayoutContext";

export default function BotTest() {
  const { openSubmenu } = useLayout();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [savedBots, setSavedBots] = useState<any[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>("");
  const [selectedBotName, setSelectedBotName] = useState<string>("");
  const [activeBotId, setActiveBotId] = useState<string | null>(null);
  const [key, setKey] = useState(0); // Para forçar re-render do simulador

  useEffect(() => {
    loadSavedBots();
  }, []);

  const loadSavedBots = async () => {
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

    if (error) {
      console.error("Error loading bots:", error);
      toast.error("Erro ao carregar bots");
    } else {
      setSavedBots(data || []);
      // Auto-select active bot
      const activeBot = data?.find(b => b.active);
      setActiveBotId(activeBot?.id || null);
      if (activeBot) {
        setSelectedBotId(activeBot.id);
        setSelectedBotName(activeBot.name);
        loadBot(activeBot.id);
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
    <div className="h-full flex flex-col bg-white">
        <div className="p-4 border-b border-border bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <SubMenuHeader 
                  title="Bot"
                  onOpenSubmenu={() => openSubmenu("Bot Test")}
                />
                <h2 className="text-lg font-bold text-foreground">TESTE DO BOT</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedBotName ? `Testando: ${selectedBotName}` : "Selecione um bot para testar"}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <Select value={selectedBotId} onValueChange={handleBotChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione um bot" />
                </SelectTrigger>
                <SelectContent>
                  {savedBots.map((bot) => (
                    <SelectItem key={bot.id} value={bot.id}>
                      {bot.name} {bot.active && "⭐"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBotId && selectedBotId !== activeBotId && (
                <Button 
                  onClick={() => handleActivateBot(selectedBotId)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <Power className="w-4 h-4 mr-2" />
                  Ativar Bot
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReload}
                disabled={!selectedBotId}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Recarregar
              </Button>
            </div>
          </div>
          
          {!activeBotId && savedBots.length > 0 && (
            <Alert className="bg-orange-50 border-orange-200">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-900 text-sm">
                <strong>⚠️ Nenhum bot ativo!</strong> Selecione um bot acima e clique em "Ativar Bot" para que ele responda no WhatsApp.
              </AlertDescription>
            </Alert>
          )}
          
          {activeBotId && selectedBotId === activeBotId && (
            <Alert className="bg-green-50 border-green-200">
              <Power className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900 text-sm">
                <strong>✅ Bot Ativo!</strong> Este bot está respondendo mensagens no WhatsApp.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="simulator" className="h-full flex flex-col">
            <div className="px-4 pt-4">
              <TabsList>
                <TabsTrigger value="simulator">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Simulador Web
                </TabsTrigger>
                <TabsTrigger value="whatsapp">
                  <Smartphone className="w-4 h-4 mr-2" />
                  WhatsApp Oficial
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="simulator" className="flex-1 m-0 p-4">
              {nodes.length > 0 ? (
                <div className="h-full bg-muted rounded-lg overflow-hidden">
                  <FlowSimulator 
                    key={key}
                    nodes={nodes} 
                    edges={edges} 
                  />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <p className="text-lg mb-2">⚠️ Nenhum fluxo carregado</p>
                    <p className="text-sm">Selecione um bot acima ou crie um novo no Bot Builder</p>
                  </div>
                </div>
              )}
            </TabsContent>


            <TabsContent value="whatsapp" className="flex-1 m-0 overflow-auto">
              <div className="max-w-3xl mx-auto p-4">
                <div className="mb-4 text-center">
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    📱 WhatsApp Business API Oficial
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Para uso em produção com aprovação do Facebook
                  </p>
                </div>
                <WhatsAppQRCode />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
  );
}
