import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { CONFIG_PADRAO, lerConfigPotenciais, salvarConfigPotenciais, type ConfigPotenciais } from "@/lib/atendimento/potenciais";

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return <label className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="min-w-0">{rotulo}</span>{children}</label>;
}

export function AutomacoesAtendimentoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [cfg, setCfg] = useState<ConfigPotenciais>(CONFIG_PADRAO);
  const [estab, setEstab] = useState<string | null>(null);
  const [agentes, setAgentes] = useState<{ id: string; nome: string }[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const e = await getEstabelecimentoId(); setEstab(e);
      if (!e) return;
      setCfg(await lerConfigPotenciais(e));
      const { data } = await (supabase as any).from("voz_agentes").select("id, nome").eq("estabelecimento_id", e).order("nome");
      setAgentes(data ?? []);
    })();
  }, [open]);

  const r = cfg.roboIa, p = cfg.plantao;
  const setR = (v: Partial<typeof r>) => setCfg((c) => ({ ...c, roboIa: { ...c.roboIa, ...v } }));
  const setP = (v: Partial<typeof p>) => setCfg((c) => ({ ...c, plantao: { ...c.plantao, ...v } }));

  const salvar = async () => {
    if (!estab) return;
    if (r.ativo && !r.agenteId) { toast.error("Escolha o agente de voz das ligações automáticas."); return; }
    if (p.ativo && !p.texto.trim()) { toast.error("Preencha o texto da resposta fora do horário."); return; }
    setSalvando(true);
    try { await salvarConfigPotenciais(estab, cfg); toast.success("Automações salvas"); onOpenChange(false); }
    catch { toast.error("Não foi possível salvar"); }
    finally { setSalvando(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Automações do atendimento</DialogTitle>
          <DialogDescription>Defina quando a IA liga sozinha para os potenciais e a resposta fora do expediente.</DialogDescription>
        </DialogHeader>

        <section className="space-y-2 rounded-lg border p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><p className="text-sm font-semibold">IA ligando para os Potenciais</p><p className="text-xs text-muted-foreground">Liga todo dia e transfere só quem demonstrar interesse.</p></div>
            <Switch checked={r.ativo} onCheckedChange={(v) => setR({ ativo: v })} aria-label="Ativar ligações automáticas" />
          </div>
          {r.ativo && <div className="space-y-2">
            <Linha rotulo="Horário"><Input type="time" className="h-8 w-28" value={r.horario} onChange={(e) => setR({ horario: e.target.value })} /></Linha>
            <Linha rotulo="Clientes por dia"><Input type="number" min={1} max={200} className="h-8 w-20" value={r.clientesPorDia} onChange={(e) => setR({ clientesPorDia: Math.max(1, Math.min(200, Number(e.target.value) || 1)) })} /></Linha>
            <Linha rotulo="Agente de voz">
              <Select value={r.agenteId} onValueChange={(v) => setR({ agenteId: v })}>
                <SelectTrigger className="h-8 w-48"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{agentes.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent>
              </Select>
            </Linha>
            <Linha rotulo="Se não atender, tentar de novo em"><span className="flex items-center gap-1.5"><Input type="number" min={1} max={30} className="h-8 w-20" value={r.remarcarDias} onChange={(e) => setR({ remarcarDias: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })} /><span className="text-xs text-muted-foreground">dias</span></span></Linha>
            <Linha rotulo="Somente dias úteis"><Switch checked={r.diasUteis} onCheckedChange={(v) => setR({ diasUteis: v })} /></Linha>
          </div>}
        </section>

        <section className="space-y-2 rounded-lg border p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><p className="text-sm font-semibold">Resposta fora do horário (WhatsApp)</p><p className="text-xs text-muted-foreground">Fora do expediente o cliente recebe este texto e o retorno é agendado.</p></div>
            <Switch checked={p.ativo} onCheckedChange={(v) => setP({ ativo: v })} aria-label="Ativar resposta fora do horário" />
          </div>
          {p.ativo && <div className="space-y-2">
            <Linha rotulo="Expediente"><span className="flex items-center gap-1.5"><Input type="time" className="h-8 w-28" value={p.inicio} onChange={(e) => setP({ inicio: e.target.value })} /><span className="text-xs">às</span><Input type="time" className="h-8 w-28" value={p.fim} onChange={(e) => setP({ fim: e.target.value })} /></span></Linha>
            <Linha rotulo="Atende aos sábados"><Switch checked={p.sabado} onCheckedChange={(v) => setP({ sabado: v })} /></Linha>
            <Linha rotulo="Atende aos domingos"><Switch checked={p.domingo} onCheckedChange={(v) => setP({ domingo: v })} /></Linha>
            <Textarea rows={4} value={p.texto} onChange={(e) => setP({ texto: e.target.value })} placeholder="Texto da resposta" />
          </div>}
        </section>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
