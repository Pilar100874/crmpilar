// Card no Perfil para ativar/desativar o envio de localização (LGPD).
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, ShieldAlert } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { isLocationConsentGranted, setLocationConsent } from "@/components/BackgroundLocationManager";

export default function LocationConsentCard() {
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<PermissionState | "unknown">("unknown");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setAuthUserId(uid);
      setEnabled(isLocationConsentGranted(uid));
    });
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: "geolocation" as PermissionName })
        .then((p) => {
          setPermission(p.state);
          p.onchange = () => setPermission(p.state);
        })
        .catch(() => {});
    }
  }, []);

  const solicitarPermissao = () =>
    new Promise<boolean>((resolve) => {
      if (!navigator.geolocation) return resolve(false);
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        () => resolve(false),
        { timeout: 10000 },
      );
    });

  const handleToggle = async (checked: boolean) => {
    if (!authUserId) {
      toast.error("Sessão não encontrada");
      return;
    }
    if (checked) {
      const ok = await solicitarPermissao();
      if (!ok) {
        toast.error("Permissão de localização negada pelo navegador");
        return;
      }
    }
    setLocationConsent(authUserId, checked);
    setEnabled(checked);
    toast.success(checked ? "Envio de localização ativado" : "Envio de localização desativado");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Envio de Localização
        </CardTitle>
        <CardDescription>
          Permite que o CRM envie sua localização em segundo plano para validar
          automaticamente as visitas programadas a clientes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Ativar envio de localização</Label>
            <p className="text-xs text-muted-foreground">
              Enquanto o CRM estiver aberto, sua posição é enviada a cada minuto.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggle} />
        </div>

        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription className="text-xs leading-relaxed">
            <strong>Aviso LGPD:</strong> Sua localização será registrada apenas para
            verificação de visitas do módulo de Vendas, associada ao seu usuário e
            estabelecimento. Você pode desativar a qualquer momento. Dados usados
            somente para fins operacionais internos.
          </AlertDescription>
        </Alert>

        {permission === "denied" && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs">
              Permissão de localização bloqueada no navegador. Libere o acesso nas
              configurações do site para ativar o envio.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
