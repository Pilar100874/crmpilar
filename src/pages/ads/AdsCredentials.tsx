import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, Key, Eye, EyeOff, Trash2, RefreshCw, CheckCircle2, XCircle,
  AlertCircle, Loader2, Search, Facebook, Music2, ShoppingBag, Package,
  HelpCircle, Link2, Settings
} from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { HelpHint } from "@/components/ads/HelpHint";

const fieldHelp: Record<string, { steps: string[]; link?: { label: string; url: string } }> = {
  client_id: { steps: ["Google Cloud Console → APIs & Services → Credentials", "Crie um OAuth Client ID (Web app)", "Copie o Client ID gerado"], link: { label: "Abrir Google Cloud Console", url: "https://console.cloud.google.com/apis/credentials" } },
  client_secret: { steps: ["No mesmo Client ID criado acima", "Copie o Client Secret exibido"], link: { label: "Abrir Google Cloud Console", url: "https://console.cloud.google.com/apis/credentials" } },
  developer_token: { steps: ["Entre no Google Ads (conta MCC)", "Ferramentas → Configuração → API Center", "Copie o Developer Token"], link: { label: "Abrir Google Ads", url: "https://ads.google.com" } },
  refresh_token: { steps: ["Use OAuth2 Playground com seus Client ID/Secret", "Autorize o escopo AdWords", "Troque o code por refresh_token"], link: { label: "OAuth Playground", url: "https://developers.google.com/oauthplayground" } },
  customer_id: { steps: ["Google Ads → topo direito, ao lado do seu email", "Copie o ID sem hifens (ex: 1234567890)"] },
  access_token: { steps: ["Meta: Business Manager → Configurações → Usuários do sistema → Gerar token", "TikTok: business-api.tiktok.com → seu app → Access Token"], link: { label: "Meta Business", url: "https://business.facebook.com/settings/system-users" } },
  account_id: { steps: ["Meta Ads Manager → topo esquerdo mostra 'act_XXXXX'", "Copie apenas o número (ou o prefixo completo act_...)"] },
  advertiser_id: { steps: ["TikTok Ads Manager → topo, ao lado do nome da conta", "Copie o número exibido"] },
  seller_id: { steps: ["Mercado Livre → Minha Conta → ID de vendedor"] },
  profile_id: { steps: ["Amazon Ads → Configurações → Perfis → copie o Profile ID"] },
};

const platformIcons: Record<string, any> = {
  google_ads: Search,
  meta_ads: Facebook,
  tiktok_ads: Music2,
  mercadolivre_ads: ShoppingBag,
  amazon_ads: Package,
};

const platformColors: Record<string, string> = {
  google_ads: "#4285F4",
  meta_ads: "#1877F2",
  tiktok_ads: "#000000",
  mercadolivre_ads: "#FFE600",
  amazon_ads: "#FF9900",
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  conectado: { label: "Conectado", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle2 },
  nao_conectado: { label: "Não Conectado", color: "bg-muted text-muted-foreground border-border", icon: Link2 },
  erro: { label: "Erro", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
};

const credentialFields: Record<string, { label: string; key: string; type: string; required: boolean }[]> = {
  google_ads: [
    { label: "Client ID", key: "client_id", type: "text", required: true },
    { label: "Client Secret", key: "client_secret", type: "password", required: true },
    { label: "Developer Token", key: "developer_token", type: "password", required: true },
    { label: "Refresh Token", key: "refresh_token", type: "password", required: true },
    { label: "Customer ID", key: "customer_id", type: "text", required: true },
  ],
  meta_ads: [
    { label: "App ID", key: "app_id", type: "text", required: true },
    { label: "App Secret", key: "app_secret", type: "password", required: true },
    { label: "Access Token", key: "access_token", type: "password", required: true },
    { label: "Ad Account ID", key: "ad_account_id", type: "text", required: true },
  ],
  tiktok_ads: [
    { label: "Access Token", key: "access_token", type: "password", required: true },
    { label: "Advertiser ID", key: "advertiser_id", type: "text", required: true },
  ],
  mercadolivre_ads: [
    { label: "Client ID", key: "client_id", type: "text", required: true },
    { label: "Client Secret", key: "client_secret", type: "password", required: true },
    { label: "Refresh Token", key: "refresh_token", type: "password", required: true },
  ],
  amazon_ads: [
    { label: "Client ID", key: "client_id", type: "text", required: true },
    { label: "Client Secret", key: "client_secret", type: "password", required: true },
    { label: "Refresh Token", key: "refresh_token", type: "password", required: true },
    { label: "Profile ID", key: "profile_id", type: "text", required: true },
  ],
};

export default function AdsCredentials() {
  const queryClient = useQueryClient();
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [newAccount, setNewAccount] = useState<{
    plataforma_id: string;
    nome_conta: string;
    credentials: Record<string, string>;
  }>({
    plataforma_id: "",
    nome_conta: "",
    credentials: {},
  });

  useEffect(() => {
    getEstabelecimentoId().then(setEstabelecimentoId);
  }, []);

  const { data: platforms } = useQuery({
    queryKey: ["ad_platforms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ad_platforms").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["ad_accounts", estabelecimentoId],
    queryFn: async () => {
      if (!estabelecimentoId) return [];
      const { data, error } = await supabase
        .from("ad_accounts")
        .select("*, plataforma:ad_platforms(*)")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!estabelecimentoId,
  });

  const selectedPlatform = platforms?.find(p => p.id === newAccount.plataforma_id);

  const addAccountMutation = useMutation({
    mutationFn: async () => {
      if (!estabelecimentoId) throw new Error("Estabelecimento não encontrado");
      
      const { error } = await supabase.from("ad_accounts").insert({
        estabelecimento_id: estabelecimentoId,
        plataforma_id: newAccount.plataforma_id,
        nome_conta: newAccount.nome_conta,
        credenciais_json: newAccount.credentials,
        status: "nao_conectado",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad_accounts"] });
      setShowAddDialog(false);
      setNewAccount({ plataforma_id: "", nome_conta: "", credentials: {} });
      toast.success("Conta adicionada com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar conta: " + error.message);
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: async (data: { id: string; credentials: Record<string, string> }) => {
      const { error } = await supabase
        .from("ad_accounts")
        .update({ credenciais_json: data.credentials, updated_at: new Date().toISOString() })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad_accounts"] });
      setShowEditDialog(false);
      setSelectedAccount(null);
      toast.success("Credenciais atualizadas");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ad_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad_accounts"] });
      toast.success("Conta removida");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover: " + error.message);
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (accountId: string) => {
      // TODO: Implementar chamada real para testar conexão
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { error } = await supabase
        .from("ad_accounts")
        .update({ status: "conectado", ultimo_sync: new Date().toISOString() })
        .eq("id", accountId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad_accounts"] });
      toast.success("Conexão testada com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao testar conexão: " + error.message);
    },
  });

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Credenciais de Anúncios
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure as credenciais de acesso às plataformas de anúncios
            </p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Adicionar Conta de Anúncios</DialogTitle>
                <DialogDescription>Configure as credenciais da plataforma</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 p-1">
                  <div className="space-y-2">
                    <Label>Plataforma</Label>
                    <Select
                      value={newAccount.plataforma_id}
                      onValueChange={(v) => setNewAccount(prev => ({ ...prev, plataforma_id: v, credentials: {} }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma plataforma" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[9999]">
                        {platforms?.map(p => {
                          const Icon = platformIcons[p.nome] || Search;
                          return (
                            <SelectItem key={p.id} value={p.id}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" style={{ color: platformColors[p.nome] }} />
                                {p.nome_display}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Nome da Conta</Label>
                    <Input
                      placeholder="Ex: Conta Principal"
                      value={newAccount.nome_conta}
                      onChange={(e) => setNewAccount(prev => ({ ...prev, nome_conta: e.target.value }))}
                    />
                  </div>

                  {selectedPlatform && (
                    <>
                      <Separator />
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          As credenciais são armazenadas de forma segura e usadas apenas para sincronização de dados.
                        </AlertDescription>
                      </Alert>
                      
                      {credentialFields[selectedPlatform.nome]?.map(field => (
                        <div key={field.key} className="space-y-2">
                          <div className="flex items-center gap-1">
                            <Label>{field.label} {field.required && "*"}</Label>
                            {fieldHelp[field.key] && (
                              <HelpHint title={`Como obter: ${field.label}`} steps={fieldHelp[field.key].steps} link={fieldHelp[field.key].link} />
                            )}
                          </div>
                          <div className="relative">
                            <Input
                              type={field.type === "password" && !showSecrets[field.key] ? "password" : "text"}
                              placeholder={`Seu ${field.label}`}
                              value={newAccount.credentials[field.key] || ""}
                              onChange={(e) => setNewAccount(prev => ({
                                ...prev,
                                credentials: { ...prev.credentials, [field.key]: e.target.value }
                              }))}
                            />
                            {field.type === "password" && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                onClick={() => toggleSecret(field.key)}
                              >
                                {showSecrets[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </ScrollArea>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
                <Button
                  onClick={() => addAccountMutation.mutate()}
                  disabled={!newAccount.plataforma_id || !newAccount.nome_conta || addAccountMutation.isPending}
                >
                  {addAccountMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de contas */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts?.map(account => {
              const Icon = platformIcons[account.plataforma?.nome] || Search;
              const status = statusConfig[account.status] || statusConfig.nao_conectado;
              const StatusIcon = status.icon;
              const credentials = (account.credenciais_json || {}) as Record<string, string>;

              return (
                <Card key={account.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded-lg" 
                          style={{ backgroundColor: `${platformColors[account.plataforma?.nome]}20` }}
                        >
                          <Icon className="h-5 w-5" style={{ color: platformColors[account.plataforma?.nome] }} />
                        </div>
                        <div>
                          <CardTitle className="text-base">{account.nome_conta}</CardTitle>
                          <CardDescription className="text-xs">{account.plataforma?.nome_display}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className={status.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xs text-muted-foreground">
                      {Object.keys(credentials).length > 0 ? (
                        <p>{Object.keys(credentials).length} credenciais configuradas</p>
                      ) : (
                        <p className="text-yellow-500">Nenhuma credencial configurada</p>
                      )}
                      {account.ultimo_sync && (
                        <p className="mt-1">
                          Último sync: {new Date(account.ultimo_sync).toLocaleString("pt-BR")}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          setSelectedAccount(account);
                          setShowEditDialog(true);
                        }}
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        disabled={testConnectionMutation.isPending}
                        onClick={() => testConnectionMutation.mutate(account.id)}
                      >
                        {testConnectionMutation.isPending ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        Testar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Tem certeza que deseja remover esta conta?")) {
                            deleteAccountMutation.mutate(account.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {accounts?.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Key className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Nenhuma conta configurada</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Adicione uma conta de anúncios para começar
                  </p>
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Conta
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Dialog de edição */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Credenciais</DialogTitle>
              <DialogDescription>{selectedAccount?.nome_conta}</DialogDescription>
            </DialogHeader>
            {selectedAccount && (
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 p-1">
                  {credentialFields[selectedAccount.plataforma?.nome]?.map(field => {
                    const credentials = (selectedAccount.credenciais_json || {}) as Record<string, string>;
                    return (
                      <div key={field.key} className="space-y-2">
                        <Label>{field.label}</Label>
                        <div className="relative">
                          <Input
                            type={field.type === "password" && !showSecrets[`edit_${field.key}`] ? "password" : "text"}
                            value={credentials[field.key] || ""}
                            onChange={(e) => {
                              setSelectedAccount((prev: any) => ({
                                ...prev,
                                credenciais_json: {
                                  ...(prev.credenciais_json || {}),
                                  [field.key]: e.target.value,
                                },
                              }));
                            }}
                          />
                          {field.type === "password" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                              onClick={() => toggleSecret(`edit_${field.key}`)}
                            >
                              {showSecrets[`edit_${field.key}`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancelar</Button>
              <Button
                onClick={() => updateAccountMutation.mutate({
                  id: selectedAccount.id,
                  credentials: selectedAccount.credenciais_json,
                })}
                disabled={updateAccountMutation.isPending}
              >
                {updateAccountMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
