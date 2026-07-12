import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

const PLATFORMS = [
  { id: "google", label: "Google Ads", color: "bg-[#4285F4]" },
  { id: "meta", label: "Meta Ads (Facebook/Instagram)", color: "bg-[#1877F2]" },
  { id: "tiktok", label: "TikTok Ads", color: "bg-black" },
];

export const AdsOAuthButtons: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);

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
      <CardContent className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => (
          <Button key={p.id} variant="outline" disabled={loading === p.id} onClick={() => connect(p.id)}>
            <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${p.color}`} />
            {loading === p.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Conectar {p.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};
