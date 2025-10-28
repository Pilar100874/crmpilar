import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { UnidadesCRUD } from "./UnidadesCRUD";
import { SegmentosCRUD } from "./SegmentosCRUD";
import { GruposAcessoCRUD } from "./GruposAcessoCRUD";
import { UsuariosCRUD } from "./UsuariosCRUD";
import { ClientesCRUD } from "./ClientesCRUD";
import { RedesSociaisCRUD } from "./RedesSociaisCRUD";
import QuickRepliesCRUD from "./QuickRepliesCRUD";
import QuickAttachmentsCRUD from "./QuickAttachmentsCRUD";
import { APIGeneratorCRUD } from "./APIGeneratorCRUD";
import { WebhooksCRUD } from "./WebhooksCRUD";
import { CanaisAtendimentoCRUD } from "./CanaisAtendimentoCRUD";
import { NotificacoesCRUD } from "./NotificacoesCRUD";
import { SegurancaCRUD } from "./SegurancaCRUD";
import { ProdutosCRUD } from "./ProdutosCRUD";
import { ProdutoCategoriasCRUD } from "./ProdutoCategoriasCRUD";
import { ProdutoGruposCRUD } from "./ProdutoGruposCRUD";
import { CondicoesPagamentoCRUD } from "./CondicoesPagamentoCRUD";
import { TabelasPrecoCRUD } from "./TabelasPrecoCRUD";
import { TiposPagamentoCRUD } from "./TiposPagamentoCRUD";
import { Users, Building2, Tag, FolderTree, UserCog, Share2, MessageSquare, Link as LinkIcon, Globe, Webhook, Key, Bell, Shield, Mail, Package, FolderOpen, Layers, CreditCard, DollarSign, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, AlertCircle, ExternalLink, Eye, EyeOff } from "lucide-react";
import { toast as sonnerToast } from "sonner";

interface EstabelecimentoDetalhesProps {
  estabelecimentoId: string;
  estabelecimentoNome: string;
}

function WhatsAppConfigSection({ estabelecimentoId }: { estabelecimentoId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);
  
  const [whatsappToken, setWhatsappToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [configId, setConfigId] = useState<string | null>(null);
  const [webhookUrl] = useState(
    "https://kiuztueouxtyqiecgdxk.supabase.co/functions/v1/whatsapp-webhook"
  );

  useEffect(() => {
    loadWhatsAppConfig();
  }, [estabelecimentoId]);

  const loadWhatsAppConfig = async () => {
    try {
      const { data } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .single();

      if (data) {
        setConfigId(data.id);
        setWhatsappToken(data.business_token || "");
        setPhoneNumberId(data.phone_number_id || "");
        setBusinessAccountId(data.business_account_id || "");
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  const handleSave = async () => {
    if (!whatsappToken || !phoneNumberId) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o Token e Phone Number ID",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (configId) {
        const { error } = await supabase
          .from('whatsapp_config')
          .update({
            business_token: whatsappToken,
            phone_number_id: phoneNumberId,
            business_account_id: businessAccountId || null,
          })
          .eq('id', configId);

        if (error) throw error;
        toast({
          title: "✓ Configuração atualizada!",
          description: "WhatsApp Business API configurado com sucesso.",
        });
      } else {
        const { data, error } = await supabase
          .from('whatsapp_config')
          .insert({
            estabelecimento_id: estabelecimentoId,
            business_token: whatsappToken,
            phone_number_id: phoneNumberId,
            business_account_id: businessAccountId || null,
          })
          .select()
          .single();

        if (error) throw error;
        setConfigId(data.id);
        toast({
          title: "✓ Configuração salva!",
          description: "WhatsApp Business API configurado com sucesso.",
        });
      }

      loadWhatsAppConfig();
    } catch (error: any) {
      console.error('Erro ao salvar configuração:', error);
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-5 w-5" />
            WhatsApp Business API
          </CardTitle>
          <CardDescription>
            Configure as credenciais da API Oficial do WhatsApp Business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="whatsapp-token">WhatsApp Business Token *</Label>
            <div className="flex gap-2">
              <Input
                id="whatsapp-token"
                type={showToken ? "text" : "password"}
                placeholder="EAAxxxxxxxxxx..."
                value={whatsappToken}
                onChange={(e) => setWhatsappToken(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Token de acesso permanente do WhatsApp Business
            </p>
          </div>

          <div>
            <Label htmlFor="phone-number-id">Phone Number ID *</Label>
            <Input
              id="phone-number-id"
              placeholder="123456789012345"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
            />
            <p className="text-sm text-muted-foreground mt-1">
              ID do número de telefone do WhatsApp Business
            </p>
          </div>

          <div>
            <Label htmlFor="business-account-id">Business Account ID (opcional)</Label>
            <Input
              id="business-account-id"
              placeholder="123456789012345"
              value={businessAccountId}
              onChange={(e) => setBusinessAccountId(e.target.value)}
            />
            <p className="text-sm text-muted-foreground mt-1">
              ID da conta de negócios do Meta
            </p>
          </div>

          <Button onClick={handleSave} className="w-full" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhook URL</CardTitle>
          <CardDescription>
            Configure este URL no WAHA para receber mensagens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>URL do Webhook</Label>
            <div className="flex gap-2 mt-1">
              <Input value={webhookUrl} readOnly />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(webhookUrl);
                  sonnerToast.success("URL copiada!");
                }}
              >
                Copiar
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Use esta URL como webhook no WAHA para receber mensagens
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como Configurar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <h3 className="font-semibold mb-1">1. Crie uma Conta Meta Business</h3>
              <p className="text-muted-foreground">
                Acesse business.facebook.com e crie uma conta de negócios
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">2. Configure WhatsApp Business</h3>
              <p className="text-muted-foreground">
                No Meta Business, adicione WhatsApp Business e configure seu número
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">3. Gere Token de Acesso</h3>
              <p className="text-muted-foreground">
                Em Configurações do App, gere um token de acesso permanente
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">4. Configure Webhook</h3>
              <p className="text-muted-foreground">
                Use a URL de webhook acima nas configurações do WhatsApp Business
              </p>
            </div>

            <Button variant="outline" className="w-full" asChild>
              <a
                href="https://developers.facebook.com/docs/whatsapp/cloud-api"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Documentação WhatsApp Business API
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ResendConfigSection({ estabelecimentoId }: { estabelecimentoId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [configId, setConfigId] = useState<string | null>(null);

  useEffect(() => {
    loadResendConfig();
  }, [estabelecimentoId]);

  const loadResendConfig = async () => {
    try {
      const { data } = await supabase
        .from('resend_config')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .single();

      if (data) {
        setConfigId(data.id);
        setApiKey(data.api_key);
        setFromEmail(data.from_email);
        setFromName(data.from_name);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey || !fromEmail || !fromName) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (configId) {
        const { error } = await supabase
          .from('resend_config')
          .update({
            api_key: apiKey,
            from_email: fromEmail,
            from_name: fromName,
          })
          .eq('id', configId);

        if (error) throw error;
        toast({
          title: "✓ Configuração atualizada!",
          description: "As configurações do Resend foram atualizadas.",
        });
      } else {
        const { data, error } = await supabase
          .from('resend_config')
          .insert({
            estabelecimento_id: estabelecimentoId,
            api_key: apiKey,
            from_email: fromEmail,
            from_name: fromName,
          })
          .select()
          .single();

        if (error) throw error;
        setConfigId(data.id);
        toast({
          title: "✓ Configuração salva!",
          description: "As configurações do Resend foram salvas.",
        });
      }

      loadResendConfig();
    } catch (error: any) {
      console.error('Erro ao salvar configuração:', error);
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-5 w-5" />
          Configuração Resend (Envio de Email)
        </CardTitle>
        <CardDescription>
          Configure o serviço Resend para envio de emails deste estabelecimento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p className="font-semibold text-sm">Como obter as credenciais:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs ml-2">
              <li>
                Acesse{" "}
                <a 
                  href="https://resend.com/signup" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  resend.com/signup
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                Verifique seu domínio em{" "}
                <a 
                  href="https://resend.com/domains" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Domains
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                Gere uma API Key em{" "}
                <a 
                  href="https://resend.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  API Keys
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ol>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="api-key">
              API Key *
            </Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="re_xxxxxxxxxxxx"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="from-email">
              Email Remetente *
            </Label>
            <Input
              id="from-email"
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="noreply@seudominio.com"
            />
          </div>

          <div>
            <Label htmlFor="from-name">
              Nome do Remetente *
            </Label>
            <Input
              id="from-name"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Minha Empresa"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Salvando..." : configId ? "Atualizar" : "Salvar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function EstabelecimentoDetalhes({ estabelecimentoId, estabelecimentoNome }: EstabelecimentoDetalhesProps) {
  const [userEstabId, setUserEstabId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (user) {
          const { data, error } = await supabase.rpc('get_user_estabelecimento_id', { _user_id: user.id });
          if (!error) setUserEstabId(data);
        }
      } catch (e) {
        console.error('Erro ao obter estabelecimento do usuário:', e);
      }
    })();
  }, [estabelecimentoId]);

  return (
    <div className="space-y-4 pl-4 border-l-2 border-primary/20">
      <div className="text-sm font-medium text-muted-foreground mb-4">
        Gerenciando dados de: <span className="text-primary font-semibold">{estabelecimentoNome}</span>
      </div>

      {userEstabId && userEstabId !== estabelecimentoId && (
        <Alert variant="destructive">
          <AlertDescription>
            Você não tem permissão para salvar neste estabelecimento. Selecione o estabelecimento vinculado ao seu usuário.
          </AlertDescription>
        </Alert>
      )}

      <Accordion type="single" collapsible className="space-y-2">
        <AccordionItem value="whatsapp-config" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="font-medium">Configuração WhatsApp Business API</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <WhatsAppConfigSection estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="resend-config" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <span className="font-medium">Configuração Resend (Email)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <ResendConfigSection estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="redes-sociais" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-primary" />
              <span className="font-medium">Redes Sociais</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <RedesSociaisCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cadastro-clientes" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="font-medium">Campos do Cadastro de Cliente</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <ClientesCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cadastro-unidades" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="font-medium">Cadastro de Unidades</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <UnidadesCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cadastro-segmentos" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              <span className="font-medium">Cadastro de Segmentos</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <SegmentosCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="grupos-acesso" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-primary" />
              <span className="font-medium">Grupos de Acesso</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <GruposAcessoCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cadastro-usuarios" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-primary" />
              <span className="font-medium">Cadastro de Usuários</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <UsuariosCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="textos-prontos" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="font-medium">Textos Prontos Globais</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <QuickRepliesCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="anexos-rapidos" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-primary" />
              <span className="font-medium">Anexos Rápidos Globais</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <QuickAttachmentsCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="gerador-api" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <span className="font-medium">Gerador de APIs</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <APIGeneratorCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cadastro-webhooks" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Webhook className="w-4 h-4 text-primary" />
              <span className="font-medium">Cadastro de Webhooks</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <WebhooksCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="canais" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              <span className="font-medium">Canais de Atendimento</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <CanaisAtendimentoCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="notificacoes" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="font-medium">Notificações</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <NotificacoesCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="seguranca" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="font-medium">Segurança e LGPD</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <SegurancaCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="produtos" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <span className="font-medium">Cadastro de Produtos</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <ProdutosCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="produto-categorias" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-primary" />
              <span className="font-medium">Categorias de Produtos</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <ProdutoCategoriasCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="produto-grupos" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span className="font-medium">Grupos de Produtos</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <ProdutoGruposCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="condicoes-pagamento" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              <span className="font-medium">Condições de Pagamento</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <CondicoesPagamentoCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tabelas-preco" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="font-medium">Tabelas de Preço</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <TabelasPrecoCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tipos-pagamento" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="font-medium">Tipos de Pagamento</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <TiposPagamentoCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
