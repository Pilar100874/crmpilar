import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle, Copy, Check, ExternalLink, Loader2, Zap, Key, Link2, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "sonner";

const REDIRECT_URI = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ads-oauth-callback`;

type PlatformKey = "google" | "meta" | "tiktok";

type PlatformCfg = {
  id: PlatformKey;
  label: string;
  portal: string;
  fields: { key: string; label: string; type: "text" | "password" }[];
  requiredKeys: string[];
};

const PLATFORMS: Record<PlatformKey, PlatformCfg> = {
  google: {
    id: "google", label: "Google Ads",
    portal: "https://console.cloud.google.com/apis/credentials",
    fields: [
      { key: "google_client_id", label: "Client ID", type: "text" },
      { key: "google_client_secret", label: "Client Secret", type: "password" },
      { key: "google_ads_developer_token", label: "Developer Token", type: "password" },
    ],
    requiredKeys: ["google_client_id", "google_client_secret"],
  },
  meta: {
    id: "meta", label: "Meta Ads (Facebook/Instagram)",
    portal: "https://developers.facebook.com/apps/",
    fields: [
      { key: "meta_app_id", label: "App ID", type: "text" },
      { key: "meta_app_secret", label: "App Secret", type: "password" },
    ],
    requiredKeys: ["meta_app_id", "meta_app_secret"],
  },
  tiktok: {
    id: "tiktok", label: "TikTok Ads",
    portal: "https://business-api.tiktok.com/portal/apps",
    fields: [
      { key: "tiktok_app_id", label: "App ID", type: "text" },
      { key: "tiktok_app_secret", label: "App Secret", type: "password" },
    ],
    requiredKeys: ["tiktok_app_id", "tiktok_app_secret"],
  },
};

type Status = "pending" | "ok" | "error";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  platform: PlatformKey | null;
  onChanged?: () => void;
}

export default function PlatformConnectWizard({ open, onOpenChange, platform, onChanged }: Props) {
  const cfg = platform ? PLATFORMS[platform] : null;
  const [estabId, setEstabId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [accountsCount, setAccountsCount] = useState(0);
  const [stepStatus, setStepStatus] = useState<Record<number, Status>>({});

  const reload = async () => {
    if (!cfg) return;
    setLoading(true);
    try {
      const id = await getEstabelecimentoId();
      setEstabId(id);
      if (!id) return;
      const [apps, accts] = await Promise.all([
        supabase.from("ads_platform_apps" as any).select("*").eq("estabelecimento_id", id).maybeSingle(),
        supabase.from("ad_accounts").select("id, plataforma:ad_platforms(codigo)").eq("estabelecimento_id", id),
      ]);
      const row = ((apps as any).data || {}) as Record<string, string>;
      const only: Record<string, string> = {};
      cfg.fields.forEach((f) => { only[f.key] = row[f.key] || ""; });
      setForm(only);
      const count = ((accts as any).data || []).filter((a: any) => a?.plataforma?.codigo?.replace("_ads", "") === cfg.id).length;
      setAccountsCount(count);
      const hasApp = cfg.requiredKeys.every((k) => !!row[k]);
      setStepStatus({
        2: hasApp ? "ok" : "pending",
        3: count > 0 ? "ok" : "pending",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open && cfg) { reload(); setStepStatus({}); } }, [open, platform]);

  if (!cfg) return null;

  const copyUri = async () => {
    await navigator.clipboard.writeText(REDIRECT_URI);
    setCopied(true);
    setStepStatus((s) => ({ ...s, 1: "ok" }));
    toast.success("Redirect URI copiada");
    setTimeout(() => setCopied(false), 2000);
  };

  const saveKeys = async () => {
    if (!estabId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("ads_platform_apps" as any)
        .upsert({ estabelecimento_id: estabId, ...form }, { onConflict: "estabelecimento_id" });
      if (error) throw error;
      toast.success("Chaves salvas");
      await reload();
      onChanged?.();
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const testKeys = async () => {
    setBusy("test-keys");
    try {
      await reload();
      const ok = cfg.requiredKeys.every((k) => !!form[k]);
      setStepStatus((s) => ({ ...s, 2: ok ? "ok" : "error" }));
      ok ? toast.success("Chaves cadastradas ✓") : toast.error("Faltam campos obrigatórios");
    } finally {
      setBusy(null);
    }
  };

  const startOAuth = async () => {
    setBusy("oauth");
    try {
      const estabelecimento_id = await getEstabelecimentoId();
      const { data, error } = await supabase.functions.invoke("ads-oauth-start", {
        body: { estabelecimento_id, platform: cfg.id, redirect_to: window.location.href },
      });
      if (error) throw error;
      if (!data?.auth_url) throw new Error("URL de autorização não retornada");
      const win = window.open(data.auth_url, "_blank", "width=600,height=700");
      if (!win) { toast.error("Popup bloqueado — libere e tente novamente"); setBusy(null); return; }
      const handler = (ev: MessageEvent) => {
        if (ev.data?.type === "ads-oauth-success") {
          toast.success(`Conectado: ${ev.data.platform}`);
          setStepStatus((s) => ({ ...s, 3: "ok" }));
          reload();
          onChanged?.();
          window.removeEventListener("message", handler);
          setBusy(null);
        }
      };
      window.addEventListener("message", handler);
      setTimeout(() => { setBusy(null); window.removeEventListener("message", handler); }, 120000);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao iniciar OAuth");
      setStepStatus((s) => ({ ...s, 3: "error" }));
      setBusy(null);
    }
  };

  const testConnection = async () => {
    setBusy("test-conn");
    try {
      await reload();
      if (accountsCount > 0) {
        setStepStatus((s) => ({ ...s, 4: "ok" }));
        toast.success(`${accountsCount} conta(s) conectada(s) ✓`);
      } else {
        setStepStatus((s) => ({ ...s, 4: "error" }));
        toast.error("Nenhuma conta conectada ainda");
      }
    } finally {
      setBusy(null);
    }
  };

  const StepHeader = ({ n, title, status, icon: Icon }: any) => (
    <div className="flex items-center gap-3">
      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
        status === "ok" ? "bg-green-500 text-white" :
        status === "error" ? "bg-destructive text-destructive-foreground" :
        "bg-muted text-muted-foreground"
      }`}>
        {status === "ok" ? <CheckCircle2 className="h-4 w-4" /> : n}
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <h4 className="font-medium text-sm truncate">{title}</h4>
      </div>
      {status === "ok" && <Badge variant="secondary" className="ml-auto bg-green-500/10 text-green-700 border-green-500/30">OK</Badge>}
      {status === "error" && <Badge variant="destructive" className="ml-auto">Falhou</Badge>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assistente — {cfg.label}</DialogTitle>
          <DialogDescription>Siga os 4 passos abaixo. Use o botão <b>Testar</b> ao final de cada etapa.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            {/* Step 1 */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <StepHeader n={1} title="Copiar Redirect URI e colar no portal" status={stepStatus[1] || "pending"} icon={Link2} />
                <div className="pl-11 space-y-2">
                  <div className="p-2 rounded bg-muted font-mono text-[11px] break-all">{REDIRECT_URI}</div>
                  <div className="flex flex-wrap gap-2">
                    <a href={cfg.portal} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline"><ExternalLink className="h-3.5 w-3.5 mr-1.5" />Abrir portal</Button>
                    </a>
                    <Button size="sm" onClick={copyUri}>
                      {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                      Testar: Copiar URI
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <StepHeader n={2} title="Cadastrar chaves do App" status={stepStatus[2] || "pending"} icon={Key} />
                <div className="pl-11 space-y-3">
                  {cfg.fields.map((f) => (
                    <div key={f.key} className="space-y-1.5">
                      <Label className="text-xs">{f.label}</Label>
                      <Input
                        type={f.type}
                        value={form[f.key] || ""}
                        onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.label}
                        autoComplete="off"
                      />
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={saveKeys} disabled={saving}>
                      {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />} Salvar chaves
                    </Button>
                    <Button size="sm" variant="outline" onClick={testKeys} disabled={busy === "test-keys"}>
                      {busy === "test-keys" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5 mr-1.5" />}
                      Testar chaves
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <StepHeader n={3} title="Autorizar conta de anúncio (OAuth)" status={stepStatus[3] || "pending"} icon={Zap} />
                <div className="pl-11 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Abre uma janela para você fazer login na plataforma e autorizar acesso. O token é salvo automaticamente.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={startOAuth} disabled={stepStatus[2] !== "ok" || busy === "oauth"}>
                      {busy === "oauth" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1.5" />}
                      Testar: Autorizar agora
                    </Button>
                    {stepStatus[2] !== "ok" && (
                      <span className="text-[11px] text-muted-foreground self-center">Complete o passo 2 antes</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 4 */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <StepHeader n={4} title="Validar conexão" status={stepStatus[4] || "pending"} icon={CheckCircle2} />
                <div className="pl-11 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Contas conectadas: <b>{accountsCount}</b>
                  </p>
                  <Button size="sm" variant="outline" onClick={testConnection} disabled={busy === "test-conn"}>
                    {busy === "test-conn" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5 mr-1.5" />}
                    Testar conexão
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
