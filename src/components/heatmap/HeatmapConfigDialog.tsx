import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Scope = "sistema" | "ecommerce";

interface Cfg {
  enabled: boolean;
  track_click: boolean;
  track_move: boolean;
  track_scroll: boolean;
  track_rage_click: boolean;
  track_dead_click: boolean;
  track_quick_back: boolean;
  track_form_field: boolean;
}

const DEFAULT: Cfg = {
  enabled: true,
  track_click: true,
  track_move: true,
  track_scroll: true,
  track_rage_click: true,
  track_dead_click: true,
  track_quick_back: true,
  track_form_field: true,
};

const FEATURES: { key: keyof Cfg; label: string; desc: string }[] = [
  { key: "track_click", label: "Mapa de cliques", desc: "Registra onde os usuários clicam" },
  { key: "track_move", label: "Mapa de movimento", desc: "Movimento do cursor (amostrado)" },
  { key: "track_scroll", label: "Profundidade de scroll", desc: "Até onde rolaram a página" },
  { key: "track_rage_click", label: "Rage clicks", desc: "Cliques repetidos no mesmo elemento" },
  { key: "track_dead_click", label: "Dead clicks", desc: "Cliques sem resposta da interface" },
  { key: "track_quick_back", label: "Quick backs", desc: "Saídas rápidas (<3s) de uma tela" },
  { key: "track_form_field", label: "Campos de formulário", desc: "Foco em inputs e selects" },
];

export function HeatmapConfigDialog({ scope, estabelecimentoId }: { scope: Scope; estabelecimentoId: string | null }) {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<Cfg>(DEFAULT);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !estabelecimentoId) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("heatmap_config" as any)
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("scope", scope)
        .maybeSingle();
      if (data) setCfg({ ...DEFAULT, ...(data as any) });
      else setCfg(DEFAULT);
      setLoading(false);
    })();
  }, [open, scope, estabelecimentoId]);

  const save = async () => {
    if (!estabelecimentoId) return;
    setSaving(true);
    const { error } = await supabase
      .from("heatmap_config" as any)
      .upsert(
        { estabelecimento_id: estabelecimentoId, scope, ...cfg },
        { onConflict: "estabelecimento_id,scope" }
      );
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar configurações");
      return;
    }
    toast.success("Configurações salvas");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" /> Configurar recursos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Recursos do Mapa de Calor — {scope === "sistema" ? "Sistema" : "E-commerce"}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-base font-semibold">Ativar mapeamento</Label>
                <p className="text-xs text-muted-foreground">Liga ou desliga toda a captura de eventos</p>
              </div>
              <Switch checked={cfg.enabled} onCheckedChange={(v) => setCfg({ ...cfg, enabled: v })} />
            </div>

            <Separator />

            <div className="space-y-3 opacity-100" style={{ opacity: cfg.enabled ? 1 : 0.5 }}>
              {FEATURES.map((f) => (
                <div key={f.key} className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <Label>{f.label}</Label>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                  <Switch
                    disabled={!cfg.enabled}
                    checked={cfg[f.key] as boolean}
                    onCheckedChange={(v) => setCfg({ ...cfg, [f.key]: v })}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || loading}>{saving ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
