import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { Zap } from "lucide-react";

interface BotTriggerSelectorProps {
  flowId: string;
  currentBotId?: string;
  onUpdate?: (botId: string | undefined) => void;
}

export const BotTriggerSelector = ({ flowId, currentBotId, onUpdate }: BotTriggerSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [bots, setBots] = useState<any[]>([]);
  const [selectedBotId, setSelectedBotId] = useState(currentBotId);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadBots();
    }
  }, [open]);

  const loadBots = async () => {
    try {
      const { data, error } = await supabase
        .from("bot_flows")
        .select("id, name")
        .eq("active", true)
        .order("name");

      if (error) throw error;
      setBots(data || []);
    } catch (error) {
      console.error("Erro ao carregar bots:", error);
      toast.error("Erro ao carregar bots");
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("omnichannel_flows")
        .update({ trigger_bot_id: selectedBotId || null })
        .eq("id", flowId);

      if (error) throw error;
      
      // Notificar o componente pai sobre a mudança
      if (onUpdate) {
        onUpdate(selectedBotId || undefined);
      }
      
      toast.success("Trigger configurado com sucesso");
      setOpen(false);
    } catch (error) {
      console.error("Erro ao salvar trigger:", error);
      toast.error("Erro ao configurar trigger");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Zap className="h-4 w-4" />
        Trigger Bot
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Integração com Bot Builder</DialogTitle>
            <DialogDescription>
              Escolha um bot que acionará este fluxo omnichannel
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Bot de Origem</Label>
              <Select value={selectedBotId || "none"} onValueChange={(val) => setSelectedBotId(val === "none" ? undefined : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um bot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (desativar trigger)</SelectItem>
                  {bots.filter(bot => bot.id && bot.id.trim() !== '').map((bot) => (
                    <SelectItem key={bot.id} value={bot.id}>
                      {bot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              <p className="font-medium mb-1">Como funciona:</p>
              <p>
                Quando o bot selecionado executar uma ação de "Transferir para Omnichannel",
                este fluxo será acionado automaticamente para rotear o chat.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
