import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, HelpCircle, ChevronDown, ChevronUp, ExternalLink, Save, Eye, EyeOff } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface OAuthConfig {
  id?: string;
  provider: 'google' | 'microsoft';
  client_id: string;
  client_secret: string;
  enabled: boolean;
}

interface EmailOAuthConfigProps {
  estabelecimentoId?: string;
}

export function EmailOAuthConfig({ estabelecimentoId: propEstabelecimentoId }: EmailOAuthConfigProps) {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [googleConfig, setGoogleConfig] = useState<OAuthConfig>({
    provider: 'google',
    client_id: '',
    client_secret: '',
    enabled: false
  });
  const [microsoftConfig, setMicrosoftConfig] = useState<OAuthConfig>({
    provider: 'microsoft',
    client_id: '',
    client_secret: '',
    enabled: false
  });
  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [showMicrosoftSecret, setShowMicrosoftSecret] = useState(false);
  const [googleHelpOpen, setGoogleHelpOpen] = useState(false);
  const [microsoftHelpOpen, setMicrosoftHelpOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadEstabelecimento = async () => {
      const id = await getEstabelecimentoId(propEstabelecimentoId);
      setEstabelecimentoId(id);
    };
    loadEstabelecimento();
  }, [propEstabelecimentoId]);

  useEffect(() => {
    if (estabelecimentoId) {
      loadConfigs();
    }
  }, [estabelecimentoId]);

  const loadConfigs = async () => {
    if (!estabelecimentoId) return;
    
    try {
      const { data, error } = await supabase
        .from('email_oauth_config' as any)
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId);

      if (error) throw error;

      (data as any[])?.forEach((config: any) => {
        if (config.provider === 'google') {
          setGoogleConfig({
            id: config.id,
            provider: 'google',
            client_id: config.client_id || '',
            client_secret: config.client_secret || '',
            enabled: config.enabled || false
          });
        } else if (config.provider === 'microsoft') {
          setMicrosoftConfig({
            id: config.id,
            provider: 'microsoft',
            client_id: config.client_id || '',
            client_secret: config.client_secret || '',
            enabled: config.enabled || false
          });
        }
      });
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const saveConfig = async (config: OAuthConfig) => {
    if (!estabelecimentoId) {
      toast.error('Selecione um estabelecimento');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        estabelecimento_id: estabelecimentoId,
        provider: config.provider,
        client_id: config.client_id,
        client_secret: config.client_secret,
        enabled: config.enabled,
        updated_at: new Date().toISOString()
      };

      if (config.id) {
        const { error } = await supabase
          .from('email_oauth_config' as any)
          .update(payload)
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_oauth_config' as any)
          .insert(payload);
        if (error) throw error;
      }

      toast.success(`Configuração ${config.provider === 'google' ? 'Gmail' : 'Microsoft'} salva com sucesso`);
      loadConfigs();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Mail className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-semibold">Integração de Email OAuth</h2>
          <p className="text-sm text-muted-foreground">
            Configure as APIs do Gmail e Microsoft para leitura e envio de emails
          </p>
        </div>
      </div>

      {/* Google/Gmail Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              <div>
                <CardTitle>Gmail API</CardTitle>
                <CardDescription>Integração com contas Google/Gmail</CardDescription>
              </div>
            </div>
            <Switch
              checked={googleConfig.enabled}
              onCheckedChange={(checked) => setGoogleConfig(prev => ({ ...prev, enabled: checked }))}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="google-client-id">Client ID</Label>
              <Input
                id="google-client-id"
                placeholder="xxxx.apps.googleusercontent.com"
                value={googleConfig.client_id}
                onChange={(e) => setGoogleConfig(prev => ({ ...prev, client_id: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="google-client-secret">Client Secret</Label>
              <div className="relative">
                <Input
                  id="google-client-secret"
                  type={showGoogleSecret ? "text" : "password"}
                  placeholder="GOCSPX-..."
                  value={googleConfig.client_secret}
                  onChange={(e) => setGoogleConfig(prev => ({ ...prev, client_secret: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowGoogleSecret(!showGoogleSecret)}
                >
                  {showGoogleSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => saveConfig(googleConfig)} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>

          <Collapsible open={googleHelpOpen} onOpenChange={setGoogleHelpOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Como configurar o Gmail API
                </span>
                {googleHelpOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-4 text-sm">
                <h4 className="font-semibold">Passo a passo para configurar o Gmail API:</h4>
                
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                    <div>
                      <p className="font-medium">Acesse o Google Cloud Console</p>
                      <a 
                        href="https://console.cloud.google.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        console.cloud.google.com <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                    <div>
                      <p className="font-medium">Crie um novo projeto ou selecione um existente</p>
                      <p className="text-muted-foreground">Clique no seletor de projetos no topo e crie um novo</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                    <div>
                      <p className="font-medium">Ative a Gmail API</p>
                      <p className="text-muted-foreground">Vá em "APIs e Serviços" → "Biblioteca" → Pesquise "Gmail API" → Clique em "Ativar"</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>
                    <div>
                      <p className="font-medium">Configure a Tela de Consentimento OAuth</p>
                      <p className="text-muted-foreground">Vá em "APIs e Serviços" → "Tela de consentimento OAuth" → Selecione "Externo" → Preencha as informações básicas</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</span>
                    <div>
                      <p className="font-medium">Adicione os escopos necessários</p>
                      <p className="text-muted-foreground">Na tela de escopos, adicione:</p>
                      <ul className="list-disc list-inside text-muted-foreground ml-2">
                        <li>https://www.googleapis.com/auth/gmail.readonly</li>
                        <li>https://www.googleapis.com/auth/gmail.send</li>
                        <li>https://www.googleapis.com/auth/gmail.modify</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">6</span>
                    <div>
                      <p className="font-medium">Crie as credenciais OAuth 2.0</p>
                      <p className="text-muted-foreground">Vá em "APIs e Serviços" → "Credenciais" → "Criar Credenciais" → "ID do cliente OAuth"</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">7</span>
                    <div>
                      <p className="font-medium">Selecione "Aplicativo da Web"</p>
                      <p className="text-muted-foreground">Adicione a URI de redirecionamento autorizada:</p>
                      <code className="block bg-background px-2 py-1 rounded mt-1 text-xs">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/auth/google/callback
                      </code>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">8</span>
                    <div>
                      <p className="font-medium">Copie as credenciais</p>
                      <p className="text-muted-foreground">Copie o "ID do cliente" e "Chave secreta do cliente" e cole nos campos acima</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <p className="text-yellow-800 dark:text-yellow-200 text-xs">
                    <strong>Importante:</strong> Enquanto o app estiver em modo de teste, apenas usuários adicionados como "Usuários de teste" poderão se conectar. Para produção, será necessário verificar o app com o Google.
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Microsoft Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg viewBox="0 0 23 23" className="h-6 w-6">
                  <path fill="#f35325" d="M1 1h10v10H1z"/>
                  <path fill="#81bc06" d="M12 1h10v10H12z"/>
                  <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                  <path fill="#ffba08" d="M12 12h10v10H12z"/>
                </svg>
              </div>
              <div>
                <CardTitle>Microsoft Graph API</CardTitle>
                <CardDescription>Integração com contas Outlook/Hotmail/Microsoft 365</CardDescription>
              </div>
            </div>
            <Switch
              checked={microsoftConfig.enabled}
              onCheckedChange={(checked) => setMicrosoftConfig(prev => ({ ...prev, enabled: checked }))}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="ms-client-id">Application (Client) ID</Label>
              <Input
                id="ms-client-id"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={microsoftConfig.client_id}
                onChange={(e) => setMicrosoftConfig(prev => ({ ...prev, client_id: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ms-client-secret">Client Secret</Label>
              <div className="relative">
                <Input
                  id="ms-client-secret"
                  type={showMicrosoftSecret ? "text" : "password"}
                  placeholder="xxxxxxxx..."
                  value={microsoftConfig.client_secret}
                  onChange={(e) => setMicrosoftConfig(prev => ({ ...prev, client_secret: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowMicrosoftSecret(!showMicrosoftSecret)}
                >
                  {showMicrosoftSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => saveConfig(microsoftConfig)} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>

          <Collapsible open={microsoftHelpOpen} onOpenChange={setMicrosoftHelpOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Como configurar o Microsoft Graph API
                </span>
                {microsoftHelpOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-4 text-sm">
                <h4 className="font-semibold">Passo a passo para configurar o Microsoft Graph API:</h4>
                
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                    <div>
                      <p className="font-medium">Acesse o Azure Portal</p>
                      <a 
                        href="https://portal.azure.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        portal.azure.com <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                    <div>
                      <p className="font-medium">Acesse o Azure Active Directory</p>
                      <p className="text-muted-foreground">No menu lateral, clique em "Microsoft Entra ID" (antigo Azure AD)</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                    <div>
                      <p className="font-medium">Registre um novo aplicativo</p>
                      <p className="text-muted-foreground">Vá em "Registros de aplicativo" → "Novo registro"</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>
                    <div>
                      <p className="font-medium">Configure o aplicativo</p>
                      <ul className="list-disc list-inside text-muted-foreground ml-2">
                        <li>Nome: Escolha um nome para identificar o app</li>
                        <li>Tipos de conta: "Contas em qualquer diretório organizacional e contas pessoais da Microsoft"</li>
                        <li>URI de redirecionamento: Selecione "Web" e adicione:</li>
                      </ul>
                      <code className="block bg-background px-2 py-1 rounded mt-1 text-xs">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/auth/microsoft/callback
                      </code>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</span>
                    <div>
                      <p className="font-medium">Copie o Application (Client) ID</p>
                      <p className="text-muted-foreground">Na página de visão geral do app, copie o "ID do aplicativo (cliente)"</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">6</span>
                    <div>
                      <p className="font-medium">Crie um Client Secret</p>
                      <p className="text-muted-foreground">Vá em "Certificados e segredos" → "Novo segredo do cliente" → Defina uma descrição e expiração → Copie o "Valor" gerado</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">7</span>
                    <div>
                      <p className="font-medium">Configure as permissões da API</p>
                      <p className="text-muted-foreground">Vá em "Permissões de API" → "Adicionar uma permissão" → "Microsoft Graph" → "Permissões delegadas":</p>
                      <ul className="list-disc list-inside text-muted-foreground ml-2">
                        <li>Mail.Read</li>
                        <li>Mail.Send</li>
                        <li>Mail.ReadWrite</li>
                        <li>User.Read</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">8</span>
                    <div>
                      <p className="font-medium">Cole as credenciais nos campos acima</p>
                      <p className="text-muted-foreground">Cole o Application ID e Client Secret nos campos correspondentes</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <p className="text-blue-800 dark:text-blue-200 text-xs">
                    <strong>Dica:</strong> O Client Secret expira após o período definido. Lembre-se de renová-lo antes da expiração para evitar interrupções no serviço.
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
}
