import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Key, Save, Eye, EyeOff, AlertCircle, Copy } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CarrefourConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contaId: string;
  contaNome: string;
  currentConfig?: {
    carrefour_client_id?: string;
    carrefour_client_secret?: string;
    carrefour_redirect_uri?: string;
  };
  redirectUri: string;
  onSaved?: () => void;
}

export function CarrefourConfigDialog({
  open,
  onOpenChange,
  contaId,
  contaNome,
  currentConfig,
  redirectUri,
  onSaved,
}: CarrefourConfigDialogProps) {
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [config, setConfig] = useState({
    client_id: "",
    client_secret: "",
  });

  useEffect(() => {
    if (currentConfig) {
      setConfig({
        client_id: currentConfig.carrefour_client_id || "",
        client_secret: currentConfig.carrefour_client_secret || "",
      });
    }
  }, [currentConfig, open]);

  const handleSave = async () => {
    if (!config.client_id || !config.client_secret) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("contas_marketplace")
        .update({
          configuracoes: {
            carrefour_client_id: config.client_id,
            carrefour_client_secret: config.client_secret,
            carrefour_redirect_uri: redirectUri,
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
          mensagem: "Credenciais Carrefour configuradas",
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
            Configurar Carrefour Marketplace
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
                href="https://marketplace.carrefour.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Portal Carrefour Marketplace
              </a>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="client_id">Client ID</Label>
            <Input
              id="client_id"
              value={config.client_id}
              onChange={(e) => setConfig((p) => ({ ...p, client_id: e.target.value }))}
              placeholder="Seu Client ID"
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
