import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Gauge, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface RitmoHumanoConfig {
  ativo: boolean;
  delay_min_seg: number;
  delay_max_seg: number;
  lote_tamanho: number;
  pausa_lote_min_minutos: number;
  pausa_lote_max_minutos: number;
  limite_diario: number;
  respeitar_janela: boolean;
  hora_inicio: number;
  hora_fim: number;
  dias_semana: number[];
  variar_texto: boolean;
}

const PADRAO: RitmoHumanoConfig = {
  ativo: true,
  delay_min_seg: 25,
  delay_max_seg: 55,
  lote_tamanho: 40,
  pausa_lote_min_minutos: 10,
  pausa_lote_max_minutos: 20,
  limite_diario: 250,
  respeitar_janela: true,
  hora_inicio: 9,
  hora_fim: 18,
  dias_semana: [1, 2, 3, 4, 5],
  variar_texto: true,
};

const DIAS = [
  { v: 1, l: "Seg" },
  { v: 2, l: "Ter" },
  { v: 3, l: "Qua" },
  { v: 4, l: "Qui" },
  { v: 5, l: "Sex" },
  { v: 6, l: "Sáb" },
  { v: 0, l: "Dom" },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function RitmoHumanoDialog({ open, onOpenChange }: Props) {
  const [cfg, setCfg] = useState<RitmoHumanoConfig>(PADRAO);
  const [estId, setEstId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enviadosHoje, setEnviadosHoje] = useState<number>(0);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const id = await getEstabelecimentoId();
        if (!id) return;
        setEstId(id);
        const { data } = await supabase
          .from("ritmo_humano_config" as any)
          .select("*")
          .eq("estabelecimento_id", id)
          .maybeSingle();
        if (data) {
          const d = data as any;
          setCfg({
            ativo: !!d.ativo,
            delay_min_seg: d.delay_min_seg,
            delay_max_seg: d.delay_max_seg,
            lote_tamanho: d.lote_tamanho,
            pausa_lote_min_minutos: d.pausa_lote_min_minutos,
            pausa_lote_max_minutos: d.pausa_lote_max_minutos,
            limite_diario: d.limite_diario,
            respeitar_janela: d.respeitar_janela !== false,
            hora_inicio: d.hora_inicio,
            hora_fim: d.hora_fim,
            dias_semana: Array.isArray(d.dias_semana) ? d.dias_semana : PADRAO.dias_semana,
            variar_texto: d.variar_texto !== false,
          });
        }
        const hoje = new Date().toISOString().slice(0, 10);
        const { data: cont } = await supabase
          .from("ritmo_humano_contador" as any)
          .select("enviados")
          .eq("estabelecimento_id", id)
          .eq("dia", hoje);
        setEnviadosHoje(((cont as any[]) || []).reduce((s, c) => s + (c.enviados || 0), 0));
      } catch (e) {
        console.error("Erro ao carregar Ritmo Humano:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const set = <K extends keyof RitmoHumanoConfig>(k: K, v: RitmoHumanoConfig[K]) =>
    setCfg((p) => ({ ...p, [k]: v }));

  const toggleDia = (v: number) =>
    setCfg((p) => ({
      ...p,
      dias_semana: p.dias_semana.includes(v)
        ? p.dias_semana.filter((d) => d !== v)
        : [...p.dias_semana, v].sort(),
    }));

  const salvar = async () => {
    if (!estId) return;
    if (cfg.delay_max_seg < cfg.delay_min_seg) {
      toast.error("O intervalo máximo deve ser maior que o mínimo.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("ritmo_humano_config" as any)
        .upsert({ estabelecimento_id: estId, ...cfg }, { onConflict: "estabelecimento_id" });
      if (error) throw error;
      toast.success("Ritmo Humano salvo — os disparos passarão a respeitar esses limites.");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(`Erro ao salvar: ${e?.message ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  const numero = (
    label: string,
    key: keyof RitmoHumanoConfig,
    min: number,
    max: number,
    sufixo?: string,
  ) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={min}
          max={max}
          value={cfg[key] as number}
          onChange={(e) => set(key, Number(e.target.value) as any)}
          className="h-9"
        />
        {sufixo ? <span className="text-xs text-muted-foreground shrink-0">{sufixo}</span> : null}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            Ritmo Humano
          </DialogTitle>
          <DialogDescription>
            Simula o comportamento de uma pessoa nos disparos de WhatsApp (intervalos aleatórios,
            lotes com pausa, teto diário e janela de horário) para reduzir o risco de bloqueio da linha.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : (
          <div className="space-y-5">
            <Card className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Ativar Ritmo Humano</Label>
                <p className="text-xs text-muted-foreground">
                  Aplica-se a automações de marketing e envios em massa por WhatsApp.
                </p>
              </div>
              <Switch checked={cfg.ativo} onCheckedChange={(v) => set("ativo", v)} />
            </Card>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Mensagens enviadas hoje:
              <Badge variant="secondary">{enviadosHoje}</Badge>
              de {cfg.limite_diario}
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-medium mb-3">Intervalo entre mensagens</h4>
              <div className="grid grid-cols-2 gap-3">
                {numero("Mínimo", "delay_min_seg", 1, 3600, "seg")}
                {numero("Máximo", "delay_max_seg", 1, 3600, "seg")}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                O sistema sorteia um valor aleatório dentro dessa faixa a cada envio.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Lotes e pausas</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {numero("Mensagens por lote", "lote_tamanho", 1, 500, "msgs")}
                {numero("Pausa mínima", "pausa_lote_min_minutos", 1, 240, "min")}
                {numero("Pausa máxima", "pausa_lote_max_minutos", 1, 240, "min")}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Teto diário por linha</h4>
              {numero("Máximo de mensagens por dia", "limite_diario", 1, 5000, "msgs/dia")}
              <p className="text-[11px] text-muted-foreground mt-2">
                Chip novo: comece com 20–30/dia e aumente ~20% ao dia. Chip aquecido: 200–300/dia.
              </p>
            </div>

            <Separator />

            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Respeitar janela de horário</Label>
                  <p className="text-xs text-muted-foreground">
                    Bloqueia disparos fora do horário e dos dias escolhidos.
                  </p>
                </div>
                <Switch
                  checked={cfg.respeitar_janela}
                  onCheckedChange={(v) => set("respeitar_janela", v)}
                />
              </div>

              {cfg.respeitar_janela && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {numero("Início", "hora_inicio", 0, 23, "h")}
                    {numero("Fim", "hora_fim", 1, 24, "h")}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Dias permitidos</Label>
                    <div className="flex flex-wrap gap-2">
                      {DIAS.map((d) => (
                        <Button
                          key={d.v}
                          type="button"
                          size="sm"
                          variant={cfg.dias_semana.includes(d.v) ? "default" : "outline"}
                          onClick={() => toggleDia(d.v)}
                        >
                          {d.l}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </Card>

            <Card className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Variar o texto automaticamente</Label>
                <p className="text-xs text-muted-foreground">
                  Evita mensagens idênticas. Use spintax no texto: {"{Olá|Oi|Bom dia}"}.
                </p>
              </div>
              <Switch checked={cfg.variar_texto} onCheckedChange={(v) => set("variar_texto", v)} />
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={saving || loading}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RitmoHumanoDialog;
