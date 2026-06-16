import { useEffect, useMemo, useState } from "react";
import { Settings, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "sonner";
import {
  detectEvolutionOnlyBlocks,
  EVOLUTION_ONLY_BLOCK_LABELS,
} from "@/lib/evolutionOnlyBlocks";

interface BotNumberSettingsDialogProps {
  botId: string | null;
  estabelecimentoId?: string | null;
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
  estabelecimentoId: estabIdProp,
  whatsappNumeroId,
  forwardToNumeroId,
  onSaved,
}: BotNumberSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(estabIdProp ?? null);
  const [numeros, setNumeros] = useState<NumeroOption[]>([]);
  const [numeroId, setNumeroId] = useState<string | null>(whatsappNumeroId);
  const [forwardId, setForwardId] = useState<string | null>(forwardToNumeroId ?? null);
  const [linkedNumero, setLinkedNumero] = useState<NumeroOption | null>(null);
  const [saving, setSaving] = useState(false);
  const [evolutionOnlyTypes, setEvolutionOnlyTypes] = useState<string[]>([]);

  useEffect(() => {
    setNumeroId(whatsappNumeroId);
  }, [whatsappNumeroId]);
  useEffect(() => {
    setForwardId(forwardToNumeroId ?? null);
  }, [forwardToNumeroId]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      let estabId = estabelecimentoId;
      if (!estabId) {
        estabId = await getEstabelecimentoId();
        setEstabelecimentoId(estabId);
      }
      if (!estabId) return;
      const { data, error } = await supabase
        .from("whatsapp_numeros")
        .select("id, nome, provider, numero")
        .eq("estabelecimento_id", estabId)
        .eq("ativo", true)
        .order("nome");
      if (error) {
        toast.error("Erro ao carregar números");
        return;
      }
      setNumeros((data as any[]) || []);
    })();
  }, [open, estabelecimentoId]);

  // Busca o número vinculado ao bot mesmo se estiver inativo
  useEffect(() => {
    if (!open || !numeroId) { setLinkedNumero(null); return; }
    const inList = numeros.find((n) => n.id === numeroId);
    if (inList) { setLinkedNumero(inList); return; }
    (async () => {
      const { data } = await supabase
        .from("whatsapp_numeros")
        .select("id, nome, provider, numero")
        .eq("id", numeroId)
        .maybeSingle();
      if (data) setLinkedNumero(data as any);
    })();
  }, [open, numeroId, numeros]);


  // Detecta blocos Evolution-only no flow do bot
  useEffect(() => {
    if (!open || !botId) return;
    (async () => {
      const { data } = await supabase
        .from("bot_flows")
        .select("flow_data")
        .eq("id", botId)
        .maybeSingle();
      const types = detectEvolutionOnlyBlocks((data as any)?.flow_data);
      setEvolutionOnlyTypes(types);
    })();
  }, [open, botId]);

  const selectedProvider = useMemo(
    () => numeros.find((n) => n.id === numeroId)?.provider,
    [numeros, numeroId],
  );
  const forwardProvider = useMemo(
    () => numeros.find((n) => n.id === forwardId)?.provider,
    [numeros, forwardId],
  );

  const blockedByCloud =
    evolutionOnlyTypes.length > 0 &&
    (selectedProvider === "cloud_api" || forwardProvider === "cloud_api");

  const handleSave = async () => {
    if (blockedByCloud) {
      toast.error("Não é possível vincular este bot a um número Cloud API: ele usa blocos exclusivos da Evolution.");
      return;
    }
    if (!botId) {
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
          {blockedByCloud && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 flex gap-2 text-sm">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-destructive">Vinculação bloqueada</p>
                <p className="text-foreground/90">
                  Este bot usa blocos exclusivos da Evolution API que não funcionam na Cloud API oficial do WhatsApp (Meta):
                </p>
                <ul className="list-disc list-inside text-xs text-foreground/80">
                  {evolutionOnlyTypes.map((t) => (
                    <li key={t}>{EVOLUTION_ONLY_BLOCK_LABELS[t] || t}</li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  Selecione um número Evolution ou remova esses blocos do fluxo antes de salvar.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Número vinculado ao bot</Label>
            {(() => {
              const linked = numeros.find((n) => n.id === numeroId);
              return (
                <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                  {linked ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        {linked.nome}{linked.numero ? ` (${linked.numero})` : ""}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-background border border-border text-muted-foreground">
                        {linked.provider === "cloud_api" ? "Meta" : "Evolution"}
                      </span>
                    </div>
                  ) : numeroId ? (
                    <span className="text-muted-foreground">Carregando número vinculado…</span>
                  ) : (
                    <span className="text-muted-foreground">Nenhum número vinculado a este bot. Vincule um número nos Canais de Atendimento.</span>
                  )}
                </div>
              );
            })()}
            <p className="text-xs text-muted-foreground">
              Este é o número ao qual o bot está vinculado nos Canais de Atendimento. Para alterar, edite o canal correspondente.
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
              Apenas números ativos cadastrados em <span className="font-medium">Canais de Atendimento</span> aparecem aqui. Quando o cliente responder neste bot, a mensagem será encaminhada para o número selecionado.
            </p>

          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || blockedByCloud}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
