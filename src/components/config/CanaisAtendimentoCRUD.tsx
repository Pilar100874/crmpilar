import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { WhatsAppQRCode } from "@/components/WhatsAppQRCode";
import { MessageSquare, Facebook, Instagram, Send, Globe, Radio } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface CanaisAtendimentoCRUDProps {
  estabelecimentoId?: string;
}

interface WhatsAppSession {
  id: string;
  session_name: string;
  status: string;
  qr_code: string | null;
  estabelecimento_id: string;
  bot_flow_id: string | null;
  created_at: string;
}

// WhatsApp WAHA Config Component (extracted from EstabelecimentoDetalhes)
function WhatsAppWAHAConfig({ estabelecimentoId }: { estabelecimentoId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  
  const [wahaUrl, setWahaUrl] = useState("");
  const [wahaApiKey, setWahaApiKey] = useState("");
  const [newSessionName, setNewSessionName] = useState("");

  useEffect(() => {
    loadConfig();
    const interval = setInterval(() => {
      refreshSessions();
    }, 5000);
    return () => clearInterval(interval);
  }, [estabelecimentoId]);

  const loadConfig = async () => {
    try {
      const { data: configData } = await supabase
        .from("whatsapp_config")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .maybeSingle();

      if (configData?.waha_url) {
        setConfig(configData);
        setWahaUrl(configData.waha_url);
        setWahaApiKey(configData.waha_api_key || "");
      }

      await refreshSessions();
    } catch (error) {
      console.error("Error loading config:", error);
    }
  };

  const refreshSessions = async () => {
    const { data: sessionsData } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("estabelecimento_id", estabelecimentoId)
      .order("created_at", { ascending: false });

    if (sessionsData) {
      setSessions(sessionsData);
    }
  };

  const saveConfig = async () => {
    if (!wahaUrl) {
      toast({
        title: "Erro",
        description: "URL do servidor WAHA é obrigatória",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: existingConfig } = await supabase
        .from("whatsapp_config")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .maybeSingle();

      if (existingConfig) {
        await supabase
          .from("whatsapp_config")
          .update({
            waha_url: wahaUrl,
            waha_api_key: wahaApiKey || null,
          })
          .eq("id", existingConfig.id);
      } else {
        await supabase
          .from("whatsapp_config")
          .insert({
            estabelecimento_id: estabelecimentoId,
            waha_url: wahaUrl,
            waha_api_key: wahaApiKey || null,
          });
      }
      
      toast({
        title: "✓ Configuração salva!",
        description: "Servidor WAHA configurado com sucesso.",
      });
      await loadConfig();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Servidor WAHA</CardTitle>
          <CardDescription>Configure a conexão com seu servidor WAHA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="waha-url">URL do Servidor WAHA</Label>
            <Input
              id="waha-url"
              placeholder="https://waha.exemplo.com"
              value={wahaUrl}
              onChange={(e) => setWahaUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="waha-key">Chave de API (opcional)</Label>
            <Input
              id="waha-key"
              type="password"
              placeholder="sua-chave-api"
              value={wahaApiKey}
              onChange={(e) => setWahaApiKey(e.target.value)}
            />
          </div>
          <Button onClick={saveConfig} disabled={loading} className="w-full">
            {loading ? "Salvando..." : "Salvar Configuração"}
          </Button>
        </CardContent>
      </Card>

      {config && (
        <Card>
          <CardHeader>
            <CardTitle>Sessões WAHA</CardTitle>
            <CardDescription>
              {sessions.length} sessão(ões) configurada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Acesse a tela "Configurações Gerais" para gerenciar as sessões WAHA em detalhes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Facebook Messenger Config
function FacebookConfig({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [pageId, setPageId] = useState("");
  const [pageAccessToken, setPageAccessToken] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    if (!pageId || !pageAccessToken) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Configuração do Facebook salva!" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Facebook Messenger</CardTitle>
        <CardDescription>Configure a integração com o Facebook Messenger</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fb-page-id">Page ID *</Label>
          <Input
            id="fb-page-id"
            placeholder="123456789012345"
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fb-token">Page Access Token *</Label>
          <Input
            id="fb-token"
            type="password"
            placeholder="EAAxxxxxxxxxx"
            value={pageAccessToken}
            onChange={(e) => setPageAccessToken(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fb-secret">App Secret (opcional)</Label>
          <Input
            id="fb-secret"
            type="password"
            placeholder="abc123..."
            value={appSecret}
            onChange={(e) => setAppSecret(e.target.value)}
          />
        </div>
        <Button onClick={handleSave} disabled={loading} className="w-full">
          Salvar Configuração
        </Button>
      </CardContent>
    </Card>
  );
}

// Instagram Config
function InstagramConfig({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [instagramAccountId, setInstagramAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    if (!instagramAccountId || !accessToken) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Configuração do Instagram salva!" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Instagram Direct</CardTitle>
        <CardDescription>Configure a integração com o Instagram</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ig-account">Instagram Business Account ID *</Label>
          <Input
            id="ig-account"
            placeholder="17841400000000000"
            value={instagramAccountId}
            onChange={(e) => setInstagramAccountId(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ig-token">Access Token *</Label>
          <Input
            id="ig-token"
            type="password"
            placeholder="IGxxxxxxxxxx"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
          />
        </div>
        <Button onClick={handleSave} disabled={loading} className="w-full">
          Salvar Configuração
        </Button>
      </CardContent>
    </Card>
  );
}

// Telegram Config
function TelegramConfig({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [botToken, setBotToken] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    if (!botToken) {
      toast({
        title: "Erro",
        description: "Token do bot é obrigatório",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Configuração do Telegram salva!" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Telegram Bot</CardTitle>
        <CardDescription>Configure a integração com o Telegram</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tg-token">Bot Token *</Label>
          <Input
            id="tg-token"
            type="password"
            placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Obtenha seu token com o @BotFather no Telegram
          </p>
        </div>
        <Button onClick={handleSave} disabled={loading} className="w-full">
          Salvar Configuração
        </Button>
      </CardContent>
    </Card>
  );
}

// WebChat Config
function WebChatConfig({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [widgetColor, setWidgetColor] = useState("#10b981");
  const [welcomeMessage, setWelcomeMessage] = useState("Olá! Como posso ajudar?");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    toast({ title: "Configuração do WebChat salva!" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>WebChat Widget</CardTitle>
        <CardDescription>Configure o widget de chat para seu site</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="widget-color">Cor do Widget</Label>
          <div className="flex gap-2">
            <Input
              id="widget-color"
              type="color"
              value={widgetColor}
              onChange={(e) => setWidgetColor(e.target.value)}
              className="w-20 h-10"
            />
            <Input
              value={widgetColor}
              onChange={(e) => setWidgetColor(e.target.value)}
              placeholder="#10b981"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="welcome-msg">Mensagem de Boas-vindas</Label>
          <Input
            id="welcome-msg"
            placeholder="Olá! Como posso ajudar?"
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
          />
        </div>
        <Button onClick={handleSave} disabled={loading} className="w-full">
          Salvar Configuração
        </Button>
      </CardContent>
    </Card>
  );
}

export const CanaisAtendimentoCRUD = ({ estabelecimentoId: propEstabId }: CanaisAtendimentoCRUDProps) => {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>("");

  useEffect(() => {
    const loadEstabelecimento = async () => {
      const estabId = await getEstabelecimentoId(propEstabId);
      if (estabId) {
        setEstabelecimentoId(estabId);
      }
    };
    loadEstabelecimento();
  }, [propEstabId]);

  if (!estabelecimentoId) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Canais de Atendimento</h2>
        <p className="text-muted-foreground">
          Configure os canais de comunicação integrados ao sistema
        </p>
      </div>

      <Tabs defaultValue="whatsapp" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="facebook" className="flex items-center gap-2">
            <Facebook className="w-4 h-4" />
            Facebook
          </TabsTrigger>
          <TabsTrigger value="instagram" className="flex items-center gap-2">
            <Instagram className="w-4 h-4" />
            Instagram
          </TabsTrigger>
          <TabsTrigger value="telegram" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Telegram
          </TabsTrigger>
          <TabsTrigger value="webchat" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            WebChat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="space-y-4">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="whatsapp-meta">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-green-600" />
                  WhatsApp Business API (Meta)
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <WhatsAppQRCode />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="whatsapp-waha">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-blue-600" />
                  WhatsApp WAHA
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <WhatsAppWAHAConfig estabelecimentoId={estabelecimentoId} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        <TabsContent value="facebook">
          <FacebookConfig estabelecimentoId={estabelecimentoId} />
        </TabsContent>

        <TabsContent value="instagram">
          <InstagramConfig estabelecimentoId={estabelecimentoId} />
        </TabsContent>

        <TabsContent value="telegram">
          <TelegramConfig estabelecimentoId={estabelecimentoId} />
        </TabsContent>

        <TabsContent value="webchat">
          <WebChatConfig estabelecimentoId={estabelecimentoId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
