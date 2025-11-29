import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Key, Save, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MagaluConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contaId: string;
  contaNome: string;
  currentConfig?: {
    client_id?: string;
    client_secret?: string;
    redirect_uri?: string;
  };
  onSaved?: () => void;
}

export function MagaluConfigDialog({
  open,
  onOpenChange,
  contaId,
  contaNome,
  currentConfig,
  onSaved,
}: MagaluConfigDialogProps) {
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [config, setConfig] = useState({
    client_id: "",
    client_secret: "",
    redirect_uri: "",
  });

  useEffect(() => {
    if (currentConfig) {
      setConfig({
        client_id: currentConfig.client_id || "",
        client_secret: currentConfig.client_secret || "",
        redirect_uri: currentConfig.redirect_uri || "",
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
            magalu_client_id: config.client_id,
            magalu_client_secret: config.client_secret,
            magalu_redirect_uri: config.redirect_uri,
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
          mensagem: "Credenciais do Magazine Luiza configuradas",
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
            Configurar Magazine Luiza
          </DialogTitle>
          <DialogDescription>
            Configure as credenciais da API para {contaNome}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Obtenha essas credenciais no{" "}
              <a
                href="https://dev.magalu.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Portal de Desenvolvedores Magalu
              </a>
              .
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
            <Label htmlFor="redirect_uri">Redirect URI</Label>
            <Input
              id="redirect_uri"
              value={config.redirect_uri}
              onChange={(e) => setConfig((p) => ({ ...p, redirect_uri: e.target.value }))}
              placeholder="https://..."
            />
            <p className="text-xs text-muted-foreground">
              Use exatamente a mesma URL cadastrada na aplicação
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
