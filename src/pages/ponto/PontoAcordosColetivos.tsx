import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Plus } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

export default function PontoAcordosColetivos() {
  const [lista, setLista] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    nome: "", tipo: "CCT", sindicato_nome: "", sindicato_cnpj: "",
    vigencia_inicio: "", vigencia_fim: "",
    he_multiplicador_50: 1.5, he_multiplicador_100: 2.0,
    adicional_noturno_percentual: 20, banco_horas_prazo_meses: 6,
    sobreaviso_percentual: 33.33,
  });

  async function carregar() {
    const { data } = await (supabase as any).from("ponto_acordos_coletivos")
      .select("*").order("vigencia_inicio", { ascending: false });
    setLista(data ?? []);
  }
  useEffect(() => { carregar(); }, []);

  async function salvar() {
    if (!form.nome || !form.vigencia_inicio || !form.vigencia_fim) {
      toast.error("Preencha nome e vigência"); return;
    }
    const { error } = await (supabase as any).from("ponto_acordos_coletivos").insert(form);
    if (error) toast.error(error.message);
    else { toast.success("Acordo registrado"); setOpen(false); carregar(); }
  }
  async function remover(id: string) {
    await (supabase as any).from("ponto_acordos_coletivos").delete().eq("id", id);
    toast.success("Removido"); carregar();
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Convenções e Acordos Coletivos</h1>
          <p className="text-sm text-muted-foreground">CCT, ACT e PCT por sindicato com regras específicas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo acordo</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Novo Acordo Coletivo</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Nome</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CCT">CCT - Convenção</SelectItem>
                    <SelectItem value="ACT">ACT - Acordo</SelectItem>
                    <SelectItem value="PCT">PCT - Programa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Nº Registro MTE</Label><Input onChange={e => setForm({ ...form, numero_registro_mte: e.target.value })} /></div>
              <div><Label>Sindicato (nome)</Label><Input value={form.sindicato_nome} onChange={e => setForm({ ...form, sindicato_nome: e.target.value })} /></div>
              <div><Label>Sindicato (CNPJ)</Label><Input value={form.sindicato_cnpj} onChange={e => setForm({ ...form, sindicato_cnpj: e.target.value })} /></div>
              <div><Label>Vigência início</Label><Input type="date" value={form.vigencia_inicio} onChange={e => setForm({ ...form, vigencia_inicio: e.target.value })} /></div>
              <div><Label>Vigência fim</Label><Input type="date" value={form.vigencia_fim} onChange={e => setForm({ ...form, vigencia_fim: e.target.value })} /></div>
              <div><Label>HE 50% (mult.)</Label><Input type="number" step="0.01" value={form.he_multiplicador_50} onChange={e => setForm({ ...form, he_multiplicador_50: +e.target.value })} /></div>
              <div><Label>HE 100% (mult.)</Label><Input type="number" step="0.01" value={form.he_multiplicador_100} onChange={e => setForm({ ...form, he_multiplicador_100: +e.target.value })} /></div>
              <div><Label>Ad. noturno %</Label><Input type="number" step="0.01" value={form.adicional_noturno_percentual} onChange={e => setForm({ ...form, adicional_noturno_percentual: +e.target.value })} /></div>
              <div><Label>Banco horas (meses)</Label><Input type="number" value={form.banco_horas_prazo_meses} onChange={e => setForm({ ...form, banco_horas_prazo_meses: +e.target.value })} /></div>
              <div><Label>Sobreaviso %</Label><Input type="number" step="0.01" value={form.sobreaviso_percentual} onChange={e => setForm({ ...form, sobreaviso_percentual: +e.target.value })} /></div>
            </div>
            <Button onClick={salvar} className="w-full">Salvar</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {lista.map(a => {
          const ativo = new Date(a.vigencia_fim) >= new Date();
          return (
            <Card key={a.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />{a.nome}
                      <Badge variant="outline">{a.tipo}</Badge>
                      {ativo ? <Badge>vigente</Badge> : <Badge variant="destructive">expirado</Badge>}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.sindicato_nome} · {new Date(a.vigencia_inicio).toLocaleDateString("pt-BR")} → {new Date(a.vigencia_fim).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <DeleteConfirmDialog title="Excluir acordo?" onConfirm={() => remover(a.id)} />
                </div>
              </CardHeader>
              <CardContent className="text-xs grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>HE 50%: <b>{a.he_multiplicador_50}x</b></div>
                <div>HE 100%: <b>{a.he_multiplicador_100}x</b></div>
                <div>Ad. noturno: <b>{a.adicional_noturno_percentual}%</b></div>
                <div>Banco horas: <b>{a.banco_horas_prazo_meses}m</b></div>
                <div>Sobreaviso: <b>{a.sobreaviso_percentual}%</b></div>
                <div>Intervalo: <b>{a.intervalo_minimo_min}-{a.intervalo_maximo_min}min</b></div>
                <div>DSR: <b>{a.dsr_percentual}%</b></div>
                <div>Hora noturna: <b>{a.hora_noturna_minutos}min</b></div>
              </CardContent>
            </Card>
          );
        })}
        {!lista.length && <p className="text-sm text-muted-foreground">Nenhum acordo registrado.</p>}
      </div>
    </div>
  );
}
