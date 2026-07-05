import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BellRing, BellOff, Smartphone, CheckCircle2, XCircle, TestTube2, AlertTriangle } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";

export default function ConfigNotificacoesPush() {
  const [usuarioId, setUsuarioId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: u } = await supabase
        .from("usuarios")
        .select("id")
        .eq("auth_user_id", data.user.id)
        .maybeSingle();
      setUsuarioId(u?.id || null);
    })();
  }, []);

  const { supported, permission, subscribed, loading, ativar, desativar, testar } =
    usePushNotifications({ usuarioId });

  const handleToggle = async (on: boolean) => {
    if (on) {
      const res = await ativar();
      if (res.ok) toast.success("Push ativado neste dispositivo");
      else toast.error(res.error || "Não foi possível ativar");
    } else {
      await desativar();
      toast.success("Push desativado");
    }
  };

  const handleTest = async () => {
    const res = await testar();
    if (res.ok) toast.success("Push de teste enviado! Verifique sua notificação.");
    else toast.error(res.error || "Falha ao enviar teste");
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center gap-3">
        <BellRing className="w-8 h-8 text-orange-500" />
        <div>
          <h1 className="text-2xl font-bold">Notificações Push</h1>
          <p className="text-sm text-muted-foreground">
            Receba alertas do sistema no celular ou computador, mesmo com o app fechado.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" /> Este dispositivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!supported ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <XCircle className="w-4 h-4" /> Este navegador não suporta push notifications.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                <div>
                  <Label className="text-base">Notificações ativas</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Status: <Badge variant={subscribed ? "default" : "secondary"}>
                      {subscribed ? "ativo" : "desativado"}
                    </Badge>
                    <span className="ml-2">Permissão: <Badge variant="outline">{permission}</Badge></span>
                  </p>
                </div>
                <Switch checked={subscribed} disabled={loading} onCheckedChange={handleToggle} />
              </div>

              {permission === "denied" && (
                <div className="flex gap-2 text-sm text-warning bg-warning/10 p-3 rounded-lg">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Você bloqueou as notificações. Vá nas configurações do site no navegador e libere para "Notificações".</span>
                </div>
              )}

              {subscribed && (
                <Button variant="outline" onClick={handleTest} className="gap-2">
                  <TestTube2 className="w-4 h-4" /> Enviar push de teste
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Como funciona no celular</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><CheckCircle2 className="inline w-4 h-4 text-success mr-2" />
            <b>Android:</b> instale o app (PWA) na tela inicial e ative as notificações aqui.</p>
          <p><CheckCircle2 className="inline w-4 h-4 text-success mr-2" />
            <b>iPhone (iOS 16.4+):</b> abra o site no Safari, toque "Compartilhar → Adicionar à Tela de Início".
            Depois abra pelo ícone do app e ative as notificações.</p>
          <p><BellOff className="inline w-4 h-4 text-muted-foreground mr-2" />
            <b>Nunca em preview:</b> o push só funciona na URL publicada, não no editor do Lovable.</p>
        </CardContent>
      </Card>
    </div>
  );
}
