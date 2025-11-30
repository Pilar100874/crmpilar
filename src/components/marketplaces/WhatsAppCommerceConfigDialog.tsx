import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Key, Save, Eye, EyeOff, AlertCircle, Copy } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WhatsAppCommerceConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contaId: string;
  contaNome: string;
  currentConfig?: {
    whatsapp_app_id?: string;
    whatsapp_app_secret?: string;
    whatsapp_redirect_uri?: string;
  };
  redirectUri: string;
  onSaved?: () => void;
}

export function WhatsAppCommerceConfigDialog({
  open,
  onOpenChange,
  contaId,
  contaNome,
  currentConfig,
  redirectUri,
  onSaved,
}: WhatsAppCommerceConfigDialogProps) {
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [config, setConfig] = useState({
    app_id: "",
    app_secret: "",
  });

  useEffect(() => {
    if (currentConfig) {
      setConfig({
        app_id: currentConfig.whatsapp_app_id || "",
        app_secret: currentConfig.whatsapp_app_secret || "",
      });
    }
  }, [currentConfig, open]);

  const handleSave = async () => {
    if (!config.app_id || !config.app_secret) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("contas_marketplace")
        .update({
          configuracoes: {
            whatsapp_app_id: config.app_id,
            whatsapp_app_secret: config.app_secret,
            whatsapp_redirect_uri: redirectUri,
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
          mensagem: "Credenciais WhatsApp Commerce configuradas",
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

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    toast.success("URI copiada!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Configurar WhatsApp Commerce
          </DialogTitle>
          <DialogDescription>
            Configure as credenciais do Meta Business para {contaNome}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Obtenha essas credenciais no{" "}
              <a
                href="https://developers.facebook.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Meta for Developers
              </a>
              . Configure um app com WhatsApp Business e Catalog Management.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="app_id">App ID</Label>
            <Input
              id="app_id"
              value={config.app_id}
              onChange={(e) => setConfig((p) => ({ ...p, app_id: e.target.value }))}
              placeholder="Seu App ID do Meta"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="app_secret">App Secret</Label>
            <div className="relative">
              <Input
                id="app_secret"
                type={showSecret ? "text" : "password"}
                value={config.app_secret}
                onChange={(e) => setConfig((p) => ({ ...p, app_secret: e.target.value }))}
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
            <Label>Redirect URI (use esta URL)</Label>
            <div className="flex gap-2">
              <Input value={redirectUri} readOnly className="text-xs bg-muted" />
              <Button variant="outline" size="icon" onClick={copyRedirectUri}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
