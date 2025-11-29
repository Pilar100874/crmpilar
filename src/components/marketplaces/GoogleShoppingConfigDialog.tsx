import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Key, Save, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GoogleShoppingConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contaId: string;
  contaNome: string;
  currentConfig?: {
    client_id?: string;
    client_secret?: string;
    redirect_uri?: string;
    merchant_id?: string;
  };
  onSaved?: () => void;
}

export function GoogleShoppingConfigDialog({
  open,
  onOpenChange,
  contaId,
  contaNome,
  currentConfig,
  onSaved,
}: GoogleShoppingConfigDialogProps) {
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [config, setConfig] = useState({
    client_id: "",
    client_secret: "",
    redirect_uri: "",
    merchant_id: "",
  });

  useEffect(() => {
    if (currentConfig) {
      setConfig({
        client_id: currentConfig.client_id || "",
        client_secret: currentConfig.client_secret || "",
        redirect_uri: currentConfig.redirect_uri || "",
        merchant_id: currentConfig.merchant_id || "",
      });
    }
  }, [currentConfig, open]);

  const handleSave = async () => {
    if (!config.client_id || !config.client_secret || !config.redirect_uri) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("contas_marketplace")
        .update({
          configuracoes: {
            google_client_id: config.client_id,
            google_client_secret: config.client_secret,
            google_redirect_uri: config.redirect_uri,
            google_merchant_id: config.merchant_id,
          },
        })
        .eq("id", contaId);

      if (error) throw error;

      const { data: contaData } = await supabase
        .from("contas_marketplace")
        .select("estabelecimento_id")
        .eq("id", contaId)
        .single();

      if (contaData?.estabelecimento_id) {
        await supabase.from("marketplace_logs").insert({
          conta_marketplace_id: contaId,
          estabelecimento_id: contaData.estabelecimento_id,
          tipo: "config",
          mensagem: "Credenciais do Google Shopping configuradas",
          sucesso: true,
        });
      }

      toast.success("Configurações salvas com sucesso!");
      onSaved?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Configurar Google Shopping
          </DialogTitle>
          <DialogDescription>
            Configure as credenciais OAuth para {contaNome}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Obtenha essas credenciais no{" "}
              <a
                href="https://console.cloud.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Google Cloud Console
              </a>
              . Ative a Content API for Shopping.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="client_id">Client ID (OAuth 2.0)</Label>
            <Input
              id="client_id"
              value={config.client_id}
              onChange={(e) => setConfig((p) => ({ ...p, client_id: e.target.value }))}
              placeholder="xxx.apps.googleusercontent.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_secret">Client Secret</Label>
            <div className="relative">
              <Input
                id="client_secret"
                type={showSecret ? "text" : "password"}
                value={config.client_secret}
                onChange={(e) => setConfig((p) => ({ ...p, client_secret: e.target.value }))}
                placeholder="••••••••••••••••"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="redirect_uri">Authorized Redirect URI</Label>
            <Input
              id="redirect_uri"
              value={config.redirect_uri}
              onChange={(e) => setConfig((p) => ({ ...p, redirect_uri: e.target.value }))}
              placeholder="https://..."
            />
            <p className="text-xs text-muted-foreground">
              Use exatamente a mesma URL cadastrada no Cloud Console
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="merchant_id">Merchant Center ID (opcional)</Label>
            <Input
              id="merchant_id"
              value={config.merchant_id}
              onChange={(e) => setConfig((p) => ({ ...p, merchant_id: e.target.value }))}
              placeholder="Ex: 123456789"
            />
            <p className="text-xs text-muted-foreground">
              ID da sua conta no Google Merchant Center
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
