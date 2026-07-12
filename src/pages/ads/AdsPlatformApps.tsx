import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, ExternalLink, Facebook, Search, Music2, Info } from "lucide-react";
import { toast } from "sonner";

type Row = {
  meta_app_id?: string; meta_app_secret?: string;
  google_client_id?: string; google_client_secret?: string; google_ads_developer_token?: string;
  tiktok_app_id?: string; tiktok_app_secret?: string;
};

const fieldGroups = [
  {
    key: "meta", title: "Meta Ads (Facebook / Instagram)", Icon: Facebook, color: "#1877F2",
    docsUrl: "https://developers.facebook.com/apps/",
    hint: "Crie um App em developers.facebook.com > Meus Apps, adicione o produto 'Marketing API' e copie App ID / App Secret.",
    fields: [
      { key: "meta_app_id", label: "App ID", type: "text" },
      { key: "meta_app_secret", label: "App Secret", type: "password" },
    ],
  },
  {
    key: "google", title: "Google Ads", Icon: Search, color: "#4285F4",
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    hint: "No Google Cloud Console crie credenciais OAuth 2.0 (Web). Solicite o Developer Token em ads.google.com > Ferramentas > API Center.",
    fields: [
      { key: "google_client_id", label: "Client ID", type: "text" },
      { key: "google_client_secret", label: "Client Secret", type: "password" },
      { key: "google_ads_developer_token", label: "Developer Token", type: "password" },
    ],
  },
  {
    key: "tiktok", title: "TikTok Ads", Icon: Music2, color: "#000000",
    docsUrl: "https://business-api.tiktok.com/portal",
    hint: "Acesse o TikTok for Business Developer Portal, crie um App e copie App ID / App Secret.",
    fields: [
      { key: "tiktok_app_id", label: "App ID", type: "text" },
      { key: "tiktok_app_secret", label: "App Secret", type: "password" },
    ],
  },
] as const;

export default function AdsPlatformApps() {
  const [estabId, setEstabId] = useState<string | null>(null);
  const [form, setForm] = useState<Row>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const id = await getEstabelecimentoId();
        setEstabId(id);
        const { data } = await supabase
          .from("ads_platform_apps" as any)
          .select("*")
          .eq("estabelecimento_id", id)
          .maybeSingle();
        if (data) setForm(data as any);
      } catch (e: any) {
        toast.error("Erro ao carregar: " + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    if (!estabId) return;
    setSaving(true);
    try {
      const payload = { estabelecimento_id: estabId, ...form };
      const { error } = await supabase
        .from("ads_platform_apps" as any)
        .upsert(payload, { onConflict: "estabelecimento_id" });
      if (error) throw error;
      toast.success("Credenciais salvas");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Credenciais das Plataformas de Anúncios</h1>
        <p className="text-muted-foreground">
          Cadastre uma vez os apps de desenvolvedor de cada plataforma. Depois basta conectar cada conta de anúncio em <b>Ads &gt; Credenciais</b>.
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Estes valores são usados pelo sistema para renovar tokens automaticamente e chamar as APIs oficiais em pause/resume/orçamento/lance. Sem eles, o sistema segue funcionando apenas com tokens já colados manualmente.
        </AlertDescription>
      </Alert>

      {fieldGroups.map((g) => (
        <Card key={g.key}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md" style={{ backgroundColor: `${g.color}20` }}>
                  <g.Icon className="h-5 w-5" style={{ color: g.color }} />
                </div>
                <div>
                  <CardTitle>{g.title}</CardTitle>
                  <CardDescription>{g.hint}</CardDescription>
                </div>
              </div>
              <a href={g.docsUrl} target="_blank" rel="noreferrer">
                <Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4 mr-1" /> Portal</Button>
              </a>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {g.fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Input
                  type={f.type}
                  value={(form as any)[f.key] || ""}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.label}
                  autoComplete="off"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end sticky bottom-4">
        <Button size="lg" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar credenciais
        </Button>
      </div>
    </div>
  );
}
