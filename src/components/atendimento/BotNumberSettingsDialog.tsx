import { useEffect, useMemo, useState } from "react";
import { Settings, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  telefone?: string | null;
  session_name?: string | null;
}

interface BotOption {
  id: string;
  name: string;
  active: boolean;
}

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
  const [linkedNumero, setLinkedNumero] = useState<NumeroOption | null>(null);
  const [effectiveWhatsappNumeroId, setEffectiveWhatsappNumeroId] = useState<string | null>(whatsappNumeroId);
  const [linkedSession, setLinkedSession] = useState<{ id: string; session_name: string; phone_number: string | null; status: string | null } | null>(null);
  const [bots, setBots] = useState<BotOption[]>([]);
  const [forwardEnabled, setForwardEnabled] = useState(false);
  const [forwardBotId, setForwardBotId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [evolutionOnlyTypes, setEvolutionOnlyTypes] = useState<string[]>([]);

  // Carregar config atual do bot ao abrir
  useEffect(() => {
    if (!open || !botId) return;
    (async () => {
      const { data } = await supabase
        .from("bot_flows")
        .select("flow_data, forward_to_bot_id, forward_to_bot_enabled, whatsapp_numero_id, estabelecimento_id")
        .eq("id", botId)
        .maybeSingle();
      if (data) {
        setForwardEnabled(Boolean((data as any).forward_to_bot_enabled));
        setForwardBotId((data as any).forward_to_bot_id ?? null);
        setEffectiveWhatsappNumeroId((data as any).whatsapp_numero_id ?? whatsappNumeroId ?? null);
        if ((data as any).estabelecimento_id) setEstabelecimentoId((data as any).estabelecimento_id);
        const types = detectEvolutionOnlyBlocks((data as any).flow_data);
        setEvolutionOnlyTypes(types);

        if (!(data as any).whatsapp_numero_id) {
          const { data: sessionData } = await supabase
            .from("whatsapp_sessions")
            .select("id, session_name, phone_number, status")
            .eq("bot_flow_id", botId)
            .maybeSingle();
          setLinkedSession((sessionData as any) ?? null);
        } else {
          setLinkedSession(null);
        }
      }
    })();
  }, [open, botId, whatsappNumeroId]);

  // Carrega lista de números ativos (para exibir o vinculado se estiver na lista)
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
        .select("id, nome, provider, telefone, session_name")
        .eq("estabelecimento_id", estabId)
        .eq("ativo", true)
        .order("nome");
      if (error) {
        console.error("[BotNumberSettings] erro ao carregar números:", error);
        toast.error("Erro ao carregar números: " + error.message);
        return;
      }
      setNumeros((data as any[]) || []);
    })();
  }, [open, estabelecimentoId]);

  // Carrega lista de bots disponíveis para encaminhamento
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
        .from("bot_flows")
        .select("id, name, active")
        .eq("estabelecimento_id", estabId)
        .order("name");
      if (error) {
        console.error("[BotNumberSettings] erro ao carregar bots:", error);
        return;
      }
      setBots(((data as any[]) || []).filter((b) => b.id !== botId));
    })();
  }, [open, estabelecimentoId, botId]);

  // Busca o número vinculado ao bot mesmo se estiver inativo
  useEffect(() => {
    const normalizePhone = (phone?: string | null) => (phone || "").replace(/\D/g, "");
    const targetNumeroId = effectiveWhatsappNumeroId ?? whatsappNumeroId;

    if (!open || !targetNumeroId) {
      if (linkedSession) {
        const matchedNumero = numeros.find((n) =>
          (linkedSession.session_name && n.session_name === linkedSession.session_name) ||
          (!!normalizePhone(linkedSession.phone_number) && normalizePhone(n.telefone) === normalizePhone(linkedSession.phone_number))
        );
        if (matchedNumero) {
          setLinkedNumero(matchedNumero);
          setEffectiveWhatsappNumeroId(matchedNumero.id);
        } else {
          setLinkedNumero({
            id: linkedSession.id,
            nome: linkedSession.session_name,
            telefone: linkedSession.phone_number,
            provider: "waha",
            session_name: linkedSession.session_name,
          });
        }
        return;
      }
      setLinkedNumero(null);
      return;
    }

    const inList = numeros.find((n) => n.id === targetNumeroId);
    if (inList) { setLinkedNumero(inList); return; }
    (async () => {
      const { data, error } = await supabase
        .from("whatsapp_numeros")
        .select("id, nome, provider, telefone, session_name")
        .eq("id", targetNumeroId)
        .maybeSingle();
      if (error) console.error("[BotNumberSettings] erro ao buscar número vinculado:", error);
      if (data) setLinkedNumero(data as any);
    })();
  }, [open, whatsappNumeroId, effectiveWhatsappNumeroId, numeros, linkedSession]);

  const selectedProvider = useMemo(
    () => linkedNumero?.provider,
    [linkedNumero],
  );

  const blockedByCloud =
    evolutionOnlyTypes.length > 0 && selectedProvider === "cloud_api";

  const handleSave = async () => {
    if (blockedByCloud) {
      toast.error("Este bot usa blocos exclusivos da Evolution e está vinculado a um número Cloud API.");
      return;
    }
    if (forwardEnabled && !forwardBotId) {
      toast.error("Selecione o bot de destino para o encaminhamento.");
      return;
    }
    if (!botId) {
      onSaved(effectiveWhatsappNumeroId ?? whatsappNumeroId, null);
      setOpen(false);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("bot_flows")
      .update({
        forward_to_bot_id: forwardEnabled ? forwardBotId : null,
        forward_to_bot_enabled: forwardEnabled,
      } as any)
      .eq("id", botId);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    onSaved(effectiveWhatsappNumeroId ?? whatsappNumeroId, null);
    toast.success("Configurações salvas");
    setOpen(false);
  };

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
          <DialogTitle>Configurações do bot</DialogTitle>
          <DialogDescription>
            Veja o número vinculado e configure o encaminhamento das respostas para outro bot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {blockedByCloud && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 flex gap-2 text-sm">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-destructive">Atenção</p>
                <p className="text-foreground/90">
                  Este bot usa blocos exclusivos da Evolution API que não funcionam na Cloud API oficial (Meta):
                </p>
                <ul className="list-disc list-inside text-xs text-foreground/80">
                  {evolutionOnlyTypes.map((t) => (
                    <li key={t}>{EVOLUTION_ONLY_BLOCK_LABELS[t] || t}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Número vinculado ao bot</Label>
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              {linkedNumero ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {linkedNumero.nome}{linkedNumero.telefone ? ` (${linkedNumero.telefone})` : ""}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-background border border-border text-muted-foreground">
                    {linkedNumero.provider === "cloud_api" ? "Meta" : "Evolution"}
                  </span>
                </div>
              ) : whatsappNumeroId ? (
                <span className="text-muted-foreground">Carregando número vinculado…</span>
              ) : (
                <span className="text-muted-foreground">Nenhum número vinculado. Vincule um número nos Canais de Atendimento.</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Para alterar, edite o canal correspondente em Canais de Atendimento.
            </p>
          </div>

          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-primary" />
                  Encaminhar respostas para outro bot
                </Label>
                <p className="text-xs text-muted-foreground">
                  Quando ativado, qualquer resposta recebida neste bot será transferida automaticamente para o bot escolhido abaixo.
                </p>
              </div>
              <Switch checked={forwardEnabled} onCheckedChange={setForwardEnabled} />
            </div>

            {forwardEnabled && (
              <div className="space-y-2 pt-1">
                <Label>Bot de destino</Label>
                <Select
                  value={forwardBotId ?? ""}
                  onValueChange={(v) => setForwardBotId(v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um bot" />
                  </SelectTrigger>
                  <SelectContent>
                    {bots.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum outro bot disponível</div>
                    ) : (
                      bots.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} {b.active ? "" : "· inativo"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
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
