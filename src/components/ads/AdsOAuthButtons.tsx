import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Zap, Copy, Check, AlertTriangle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

const REDIRECT_URI = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ads-oauth-callback`;

const PORTALS: Record<string, string> = {
  google: "https://console.cloud.google.com/apis/credentials",
  meta: "https://developers.facebook.com/apps/",
  tiktok: "https://business-api.tiktok.com/portal/apps",
};


export const AdsOAuthButtons: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyUri = async () => {
    await navigator.clipboard.writeText(REDIRECT_URI);
    setCopied(true);
    toast.success("Redirect URI copiada");
    setTimeout(() => setCopied(false), 2000);
  };

  const connect = async (platform: string) => {
    setLoading(platform);
    try {
      const estabelecimento_id = await getEstabelecimentoId();
      const { data, error } = await supabase.functions.invoke("ads-oauth-start", {
        body: { estabelecimento_id, platform, redirect_to: window.location.href },
      });
      if (error) throw error;
      if (!data?.auth_url) throw new Error("URL de autorização não retornada");
      const win = window.open(data.auth_url, "_blank", "width=600,height=700");
      if (!win) toast.error("Popup bloqueado — libere e tente novamente");
      window.addEventListener(
        "message",
        (ev) => {
          if (ev.data?.type === "ads-oauth-success") {
            toast.success(`Conectado: ${ev.data.platform}`);
            setLoading(null);
          }
        },
        { once: true }
      );
    } catch (e: any) {
      toast.error(e?.message || "Falha ao iniciar OAuth");
    } finally {
      setTimeout(() => setLoading(null), 3000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4 text-primary" /> Conexão rápida via OAuth
        </CardTitle>
        <CardDescription>
          Autorize a plataforma diretamente — o token é salvo automaticamente. Requer o App do Desenvolvedor já cadastrado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-sm">Antes de conectar: cadastre a Redirect URI</AlertTitle>
          <AlertDescription className="text-xs space-y-2">
            <p>
              No portal de cada plataforma (Google Cloud, Meta for Developers, TikTok Business), abra seu app e
              adicione <b>exatamente</b> esta URL na lista de <b>Redirect URIs autorizadas</b>:
            </p>
            <div className="flex items-center gap-2 p-2 rounded bg-muted font-mono text-[11px] break-all">
              <span className="flex-1">{REDIRECT_URI}</span>
              <Button size="sm" variant="ghost" onClick={copyUri} className="h-7 shrink-0">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.entries(PORTALS).map(([k, url]) => (
                <a key={k} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  Portal {k} <ExternalLink className="h-3 w-3" />
                </a>
              ))}
              <a
                href="https://github.com/search?q=ADS-OAUTH-GUIA.md+repo%3Aatual&type=code"
                onClick={(e) => { e.preventDefault(); window.open("/ADS-OAUTH-GUIA.md", "_blank"); }}
                className="inline-flex items-center gap-1 text-primary hover:underline ml-auto"
              >
                Ver guia completo <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-muted-foreground">
              Sem isso a plataforma rejeita com <code>redirect_uri_mismatch</code>. A URL deve bater byte-a-byte
              (protocolo, host, path — sem barra final extra).
            </p>
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <Button key={p.id} variant="outline" disabled={loading === p.id} onClick={() => connect(p.id)}>
              <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${p.color}`} />
              {loading === p.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Conectar {p.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const PLATFORMS = [
  { id: "google", label: "Google Ads", color: "bg-[#4285F4]" },
  { id: "meta", label: "Meta Ads (Facebook/Instagram)", color: "bg-[#1877F2]" },
  { id: "tiktok", label: "TikTok Ads", color: "bg-black" },
];
