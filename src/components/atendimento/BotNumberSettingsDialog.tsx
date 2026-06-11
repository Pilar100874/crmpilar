import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BotNumberSettingsDialogProps {
  botId: string | null;
  estabelecimentoId: string | null;
  whatsappNumeroId: string | null;
  forwardToNumeroId?: string | null;
  onSaved: (whatsappNumeroId: string | null, forwardToNumeroId: string | null) => void;
}

interface NumeroOption {
  id: string;
  nome: string;
  provider: string;
  numero?: string | null;
}

const NONE = "__none__";

export function BotNumberSettingsDialog({
  botId,
  estabelecimentoId,
  whatsappNumeroId,
  forwardToNumeroId,
  onSaved,
}: BotNumberSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [numeros, setNumeros] = useState<NumeroOption[]>([]);
  const [numeroId, setNumeroId] = useState<string | null>(whatsappNumeroId);
  const [forwardId, setForwardId] = useState<string | null>(forwardToNumeroId ?? null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNumeroId(whatsappNumeroId);
  }, [whatsappNumeroId]);
  useEffect(() => {
    setForwardId(forwardToNumeroId ?? null);
  }, [forwardToNumeroId]);

  useEffect(() => {
    if (!open || !estabelecimentoId) return;
    (async () => {
      const { data, error } = await supabase
        .from("whatsapp_numeros")
        .select("id, nome, provider, numero")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("ativo", true)
        .order("nome");
      if (error) {
        toast.error("Erro ao carregar números");
        return;
      }
      setNumeros((data as any[]) || []);
    })();
  }, [open, estabelecimentoId]);

  const handleSave = async () => {
    if (!botId) {
      // Sem bot salvo ainda: só atualiza estado local
      onSaved(numeroId, forwardId);
      setOpen(false);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("bot_flows")
      .update({
        whatsapp_numero_id: numeroId,
        forward_to_numero_id: forwardId,
      } as any)
      .eq("id", botId);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    onSaved(numeroId, forwardId);
    toast.success("Configurações salvas");
    setOpen(false);
  };

  const renderOption = (n: NumeroOption) => (
    <SelectItem key={n.id} value={n.id}>
      {n.nome} {n.numero ? `(${n.numero})` : ""} · {n.provider === "cloud_api" ? "Meta" : "Evolution"}
    </SelectItem>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-2" title="Configurações de número">
          <Settings className="h-4 w-4 xl:mr-1.5" />
          <span className="hidden xl:inline">Número</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurações de número do bot</DialogTitle>
          <DialogDescription>
            Defina qual número WhatsApp este bot usa e, opcionalmente, para qual número as respostas devem ser encaminhadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Número vinculado ao bot</Label>
            <Select
              value={numeroId ?? NONE}
              onValueChange={(v) => setNumeroId(v === NONE ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um número" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Usar número padrão do estabelecimento —</SelectItem>
                {numeros.map(renderOption)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              As mensagens enviadas por este bot sairão por este número.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Encaminhar respostas para outro número</Label>
            <Select
              value={forwardId ?? NONE}
              onValueChange={(v) => setForwardId(v === NONE ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem encaminhamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Sem encaminhamento —</SelectItem>
                {numeros
                  .filter((n) => n.id !== numeroId)
                  .map(renderOption)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Quando o cliente responder neste bot (Canal A), um novo contato será criado no Canal B
              e a mensagem será reenviada para lá.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
