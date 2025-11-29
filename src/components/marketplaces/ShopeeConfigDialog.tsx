import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Key, Save, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ShopeeConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contaId: string;
  contaNome: string;
  currentConfig?: {
    partner_id?: string;
    partner_key?: string;
  };
  onSaved?: () => void;
}

export function ShopeeConfigDialog({
  open,
  onOpenChange,
  contaId,
  contaNome,
  currentConfig,
  onSaved,
}: ShopeeConfigDialogProps) {
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [config, setConfig] = useState({
    partner_id: "",
    partner_key: "",
  });

  useEffect(() => {
    if (currentConfig) {
      setConfig({
        partner_id: currentConfig.partner_id || "",
        partner_key: currentConfig.partner_key || "",
      });
    }
  }, [currentConfig, open]);

  const handleSave = async () => {
    if (!config.partner_id || !config.partner_key) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("contas_marketplace")
        .update({
          configuracoes: {
            shopee_partner_id: config.partner_id,
            shopee_partner_key: config.partner_key,
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
          mensagem: "Credenciais da Shopee configuradas",
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
            Configurar Shopee
          </DialogTitle>
          <DialogDescription>
            Configure as credenciais do Partner para {contaNome}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Obtenha essas credenciais no{" "}
              <a
                href="https://open.shopee.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Shopee Open Platform
              </a>
              . Você precisa de uma conta de desenvolvedor aprovada.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="partner_id">Partner ID</Label>
            <Input
              id="partner_id"
              value={config.partner_id}
              onChange={(e) => setConfig((p) => ({ ...p, partner_id: e.target.value }))}
              placeholder="Ex: 123456"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="partner_key">Partner Key</Label>
            <div className="relative">
              <Input
                id="partner_key"
                type={showKey ? "text" : "password"}
                value={config.partner_key}
                onChange={(e) => setConfig((p) => ({ ...p, partner_key: e.target.value }))}
                placeholder="••••••••••••••••"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
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
