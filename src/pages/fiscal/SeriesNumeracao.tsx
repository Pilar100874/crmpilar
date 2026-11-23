import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Hash, Plus } from "lucide-react";
import { toast } from "sonner";
import { useContextoInterno } from "@/lib/estoque/contexto";

const sb = supabase as any;
export default function SeriesNumeracao() {
  const ctx = useContextoInterno();
  const [series, setSeries] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [f, setF] = useState({ unidade_id: "", serie: "1", ambiente: "homologacao", proximo_numero: "1" });
  const carregar = async () => {
    if (!ctx.estabelecimentoId) return;
    const [s, u] = await Promise.all([
      sb.from("nfe_series").select("*").eq("estabelecimento_id", ctx.estabelecimentoId).order("serie"),
      sb.from("unidades").select("id, nome").eq("estabelecimento_id", ctx.estabelecimentoId).order("nome"),
    ]);
    setSeries(s.data ?? []); setUnidades(u.data ?? []);
  };
  useEffect(() => { carregar(); }, [ctx.estabelecimentoId]);
  const salvar = async () => {
    if (!f.unidade_id) return toast.error("Escolha a unidade emitente.");
    const serie = Number(f.serie), num = Number(f.proximo_numero);
    if (!Number.isInteger(serie) || serie < 0 || serie > 999) return toast.error("Série deve ser de 0 a 999.");
    if (!Number.isInteger(num) || num < 1) return toast.error("Próximo número deve ser 1 ou maior.");
    const { error } = await sb.from("nfe_series").insert({ estabelecimento_id: ctx.estabelecimentoId, unidade_id: f.unidade_id, serie, ambiente: f.ambiente, proximo_numero: num });
    if (error) return toast.error(error.code === "23505" ? "Essa série já existe para a unidade e ambiente." : error.message);
    toast.success("Série criada"); carregar();
  };
  const alternar = async (s: any) => { await sb.from("nfe_series").update({ ativa: !s.ativa, updated_at: new Date().toISOString() }).eq("id", s.id); carregar(); };
  const nomeUn = (id: string) => unidades.find((u) => u.id === id)?.nome ?? "Unidade";
  return (
    <div className="max-w-4xl space-y-4 p-3 sm:p-6">
      <div className="flex items-center gap-2"><Hash className="h-6 w-6 text-primary" /><h1 className="text-xl font-semibold sm:text-2xl">Séries e Numeração</h1></div>
      <p className="text-sm text-muted-foreground">Cada número é reservado no banco uma única vez, mesmo com cliques repetidos. Números pulados devem ser inutilizados.</p>
      <Card><CardContent className="grid gap-3 p-4 sm:grid-cols-5 sm:items-end">
        <div className="sm:col-span-2"><Label>Unidade *</Label><Select value={f.unidade_id} onValueChange={(v) => setF({ ...f, unidade_id: v })}><SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger><SelectContent>{unidades.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Série *</Label><Input type="number" value={f.serie} onChange={(e) => setF({ ...f, serie: e.target.value })} /></div>
        <div><Label>Próximo nº *</Label><Input type="number" value={f.proximo_numero} onChange={(e) => setF({ ...f, proximo_numero: e.target.value })} /></div>
        <div><Label>Ambiente *</Label><Select value={f.ambiente} onValueChange={(v) => setF({ ...f, ambiente: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="homologacao">Homologação</SelectItem><SelectItem value="producao">Produção</SelectItem></SelectContent></Select></div>
        <Button className="sm:col-span-5 sm:justify-self-end" onClick={salvar}><Plus className="mr-1 h-4 w-4" />Adicionar série</Button>
      </CardContent></Card>
      <div className="grid gap-3 md:grid-cols-2">{series.map((s) => (
        <Card key={s.id}><CardContent className="flex items-center justify-between gap-2 p-4">
          <div className="min-w-0"><p className="truncate font-medium">{nomeUn(s.unidade_id)} · série {s.serie}</p><p className="text-sm text-muted-foreground">Próximo número {s.proximo_numero}</p><Badge variant="outline">{s.ambiente === "producao" ? "Produção" : "Homologação"}</Badge></div>
          <div className="flex items-center gap-2 text-sm"><span>{s.ativa ? "Ativa" : "Inativa"}</span><Switch checked={s.ativa} onCheckedChange={() => alternar(s)} /></div>
        </CardContent></Card>))}</div>
    </div>
  );
}
