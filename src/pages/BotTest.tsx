import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotateCcw, MessageSquare, Smartphone, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FlowSimulator } from "@/components/flow/FlowSimulator";
import { WhatsAppQRCode } from "@/components/WhatsAppQRCode";
import { TwilioSandbox } from "@/components/TwilioSandbox";
import { Node, Edge } from "@xyflow/react";

export default function BotTest() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [savedBots, setSavedBots] = useState<any[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>("");
  const [selectedBotName, setSelectedBotName] = useState<string>("");
  const [key, setKey] = useState(0); // Para forçar re-render do simulador

  useEffect(() => {
    loadSavedBots();
  }, []);

  const loadSavedBots = async () => {
    const { data, error } = await supabase
      .from("bot_flows")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error loading bots:", error);
      toast.error("Erro ao carregar bots");
    } else {
      setSavedBots(data || []);
      // Auto-select active bot
      const activeBot = data?.find(b => b.active);
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
  };

  return (
    <Layout>
      <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-between shadow-lg">
          <div>
            <h2 className="text-2xl font-bold text-white">TESTE DO BOT</h2>
            <p className="text-sm text-slate-400">
              {selectedBotName ? `Testando: ${selectedBotName}` : "Selecione um bot para testar"}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Select value={selectedBotId} onValueChange={handleBotChange}>
              <SelectTrigger className="w-[200px] bg-slate-800 border-slate-700 text-slate-200">
                <SelectValue placeholder="Selecione um bot" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                {savedBots.map((bot) => (
                  <SelectItem key={bot.id} value={bot.id} className="text-white">
                    {bot.name} {bot.active && "⭐"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReload}
              disabled={!selectedBotId}
              className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Recarregar
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="simulator" className="h-full flex flex-col">
            <div className="px-4 pt-4">
              <TabsList className="bg-slate-800 border-slate-700">
                <TabsTrigger value="simulator" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Simulador Web
                </TabsTrigger>
                <TabsTrigger value="twilio" className="data-[state=active]:bg-red-700 data-[state=active]:text-white">
                  <Zap className="w-4 h-4 mr-2" />
                  Twilio Sandbox
                </TabsTrigger>
                <TabsTrigger value="whatsapp" className="data-[state=active]:bg-green-700 data-[state=active]:text-white">
                  <Smartphone className="w-4 h-4 mr-2" />
                  WhatsApp Oficial
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="simulator" className="flex-1 m-0 p-4">
              {nodes.length > 0 ? (
                <div className="h-full bg-slate-900 rounded-lg overflow-hidden">
                  <FlowSimulator 
                    key={key}
                    nodes={nodes} 
                    edges={edges} 
                  />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-slate-400">
                    <p className="text-lg mb-2">⚠️ Nenhum fluxo carregado</p>
                    <p className="text-sm">Selecione um bot acima ou crie um novo no Bot Builder</p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="twilio" className="flex-1 m-0 overflow-auto">
              <div className="max-w-3xl mx-auto p-4">
                <div className="mb-4 text-center">
                  <h3 className="text-xl font-bold text-white mb-2">
                    ⚡ Teste Grátis com Twilio Sandbox
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Método RECOMENDADO - 100% gratuito e sem risco de ban
                  </p>
                </div>
                <TwilioSandbox />
              </div>
            </TabsContent>

            <TabsContent value="whatsapp" className="flex-1 m-0 overflow-auto">
              <div className="max-w-3xl mx-auto p-4">
                <div className="mb-4 text-center">
                  <h3 className="text-xl font-bold text-white mb-2">
                    📱 WhatsApp Business API Oficial
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Para uso em produção com aprovação do Facebook
                  </p>
                </div>
                <WhatsAppQRCode />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
