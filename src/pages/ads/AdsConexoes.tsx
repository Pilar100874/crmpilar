import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info, Key, Link2, CheckCircle2, AlertCircle, Loader2, Zap, Copy, Check, ExternalLink, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "sonner";
import AdsPlatformApps from "./AdsPlatformApps";
import AdsCredentials from "./AdsCredentials";

const REDIRECT_URI = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ads-oauth-callback`;

type PlatformKey = "google" | "meta" | "tiktok";

const PLATFORMS: { id: PlatformKey; label: string; color: string; portal: string; appField: string }[] = [
  { id: "google", label: "Google Ads", color: "bg-[#4285F4]", portal: "https://console.cloud.google.com/apis/credentials", appField: "google_client_id" },
  { id: "meta", label: "Meta Ads (Facebook/Instagram)", color: "bg-[#1877F2]", portal: "https://developers.facebook.com/apps/", appField: "meta_app_id" },
  { id: "tiktok", label: "TikTok Ads", color: "bg-black dark:bg-white", portal: "https://business-api.tiktok.com/portal/apps", appField: "tiktok_app_id" },
];

export default function AdsConexoes() {
  const [tab, setTab] = useState("platforms");
  const [estabId, setEstabId] = useState<string | null>(null);
  const [appsRow, setAppsRow] = useState<any>(null);
  const [accountsByPlatform, setAccountsByPlatform] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const id = await getEstabelecimentoId();
      setEstabId(id);
      if (!id) return;
      const [apps, accts] = await Promise.all([
        supabase.from("ads_platform_apps" as any).select("*").eq("estabelecimento_id", id).maybeSingle(),
        supabase.from("ad_accounts").select("id, plataforma:ad_platforms(codigo)").eq("estabelecimento_id", id),
      ]);
      setAppsRow((apps as any).data || {});
      const counts: Record<string, number> = {};
      ((accts as any).data || []).forEach((a: any) => {
        const c = a?.plataforma?.codigo?.replace("_ads", "");
        if (c) counts[c] = (counts[c] || 0) + 1;
      });
      setAccountsByPlatform(counts);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const copyUri = async () => {
    await navigator.clipboard.writeText(REDIRECT_URI);
    setCopied(true);
    toast.success("Redirect URI copiada");
    setTimeout(() => setCopied(false), 2000);
  };

  const connect = async (platform: PlatformKey) => {
    setConnecting(platform);
    try {
      const estabelecimento_id = await getEstabelecimentoId();
      const { data, error } = await supabase.functions.invoke("ads-oauth-start", {
        body: { estabelecimento_id, platform, redirect_to: window.location.href },
      });
      if (error) throw error;
      if (!data?.auth_url) throw new Error("URL de autorização não retornada");
      const win = window.open(data.auth_url, "_blank", "width=600,height=700");
      if (!win) toast.error("Popup bloqueado — libere e tente novamente");
      const handler = (ev: MessageEvent) => {
        if (ev.data?.type === "ads-oauth-success") {
          toast.success(`Conectado: ${ev.data.platform}`);
          setConnecting(null);
          loadStatus();
          window.removeEventListener("message", handler);
        }
      };
      window.addEventListener("message", handler);
      setTimeout(() => { setConnecting(null); window.removeEventListener("message", handler); }, 120000);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao iniciar OAuth");
      setConnecting(null);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <b>Conectar suas contas de anúncio.</b> Cada plataforma tem 2 passos: primeiro cadastre as chaves do seu <b>App do Desenvolvedor</b> (uma única vez), depois <b>autorize a conta de anúncio</b> — o token é salvo automaticamente. Use a aba <b>Por plataforma</b> para o fluxo guiado.
        </AlertDescription>
      </Alert>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full flex-wrap h-auto">
          <TabsTrigger value="platforms" className="gap-2">
            <Zap className="h-4 w-4" /> Por plataforma
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-2">
            <Link2 className="h-4 w-4" /> Contas (avançado)
          </TabsTrigger>
          <TabsTrigger value="apps" className="gap-2">
            <Key className="h-4 w-4" /> Chaves do App (avançado)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="platforms" className="mt-4 space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs space-y-2">
              <p className="font-medium">Antes de conectar, cadastre esta Redirect URI no portal da plataforma:</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded bg-muted font-mono text-[10px] sm:text-[11px] break-all">
                <span className="flex-1 min-w-0 break-all">{REDIRECT_URI}</span>
                <Button size="sm" variant="ghost" onClick={copyUri} className="h-7 self-end sm:self-auto shrink-0">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span className="ml-1">Copiar</span>
                </Button>
              </div>
            </AlertDescription>
          </Alert>

          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {PLATFORMS.map((p) => {
                const hasApp = !!appsRow?.[p.appField];
                const accountsCount = accountsByPlatform[p.id] || 0;
                const hasAccount = accountsCount > 0;
                const fullyReady = hasApp && hasAccount;
                return (
                  <Card key={p.id} className={fullyReady ? "border-green-500/40" : hasApp ? "border-primary/30" : ""}>
                    <CardHeader className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`inline-block w-3 h-3 rounded-full shrink-0 ${p.color}`} />
                          <CardTitle className="text-sm truncate">{p.label}</CardTitle>
                        </div>
                        {fullyReady && <Badge className="bg-green-500/20 text-green-700 border-green-500/30 shrink-0">Pronto</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3">
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          {hasApp ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                          <span className={hasApp ? "text-muted-foreground" : ""}>1. Chaves do App: {hasApp ? "cadastradas" : "faltam"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasAccount ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                          <span className={hasAccount ? "text-muted-foreground" : ""}>
                            2. Contas conectadas: {accountsCount}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        {!hasApp && (
                          <Button size="sm" variant="secondary" className="w-full" onClick={() => setTab("apps")}>
                            <Key className="h-3.5 w-3.5 mr-1.5" /> Cadastrar chaves do app
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className="w-full"
                          disabled={!hasApp || connecting === p.id}
                          onClick={() => connect(p.id)}
                        >
                          {connecting === p.id ? (
                            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Conectando…</>
                          ) : hasAccount ? (
                            <><Zap className="h-3.5 w-3.5 mr-1.5" /> Conectar outra conta</>
                          ) : (
                            <><Zap className="h-3.5 w-3.5 mr-1.5" /> Autorizar agora</>
                          )}
                        </Button>
                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <a href={p.portal} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                            Portal <ExternalLink className="h-3 w-3" />
                          </a>
                          {hasAccount && (
                            <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground" onClick={() => setTab("accounts")}>
                              <Settings className="h-3 w-3" /> Gerenciar contas
                            </button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="accounts" className="mt-4 space-y-4">
          <AdsCredentials />
        </TabsContent>
        <TabsContent value="apps" className="mt-4">
          <AdsPlatformApps />
        </TabsContent>
      </Tabs>
    </div>
  );
}
