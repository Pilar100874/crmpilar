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


export default function PontoAcordosColetivos() {
  const [lista, setLista] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    nome: "", tipo: "CCT", sindicato_nome: "", sindicato_cnpj: "",
    vigencia_inicio: "", vigencia_fim: "",
    he_multiplicador_50: 1.5, he_multiplicador_100: 2.0,
    adicional_noturno_percentual: 20, banco_horas_prazo_meses: 6,
    sobreaviso_percentual: 33.33,
    he_faixas_customizadas: [] as any[],
  });

  function addFaixa() {
    setForm({
      ...form,
      he_faixas_customizadas: [
        ...(form.he_faixas_customizadas || []),
        { nome: "HE 60%", percentual: 60, multiplicador: 1.6, condicao: "padrao", aplicar_apos_min: 0, limite_diario_min: 120, rubrica_dominio: "" },
      ],
    });
  }
  function updFaixa(i: number, patch: any) {
    const arr = [...(form.he_faixas_customizadas || [])];
    arr[i] = { ...arr[i], ...patch };
    setForm({ ...form, he_faixas_customizadas: arr });
  }
  function rmFaixa(i: number) {
    const arr = [...(form.he_faixas_customizadas || [])];
    arr.splice(i, 1);
    setForm({ ...form, he_faixas_customizadas: arr });
  }

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

            <div className="border-t pt-3 mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Faixas customizadas de HE</Label>
                  <p className="text-xs text-muted-foreground">Adicione percentuais diferentes de 50% e 100% (ex.: 60%, 70%, 75%, 80%) conforme a CCT/ACT.</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addFaixa}><Plus className="h-3 w-3 mr-1" />Faixa</Button>
              </div>
              {(form.he_faixas_customizadas || []).map((f: any, i: number) => (
                <div key={i} className="grid grid-cols-2 md:grid-cols-7 gap-2 items-end border rounded p-2 bg-muted/30">
                  <div className="col-span-2"><Label className="text-xs">Nome</Label><Input value={f.nome} onChange={e => updFaixa(i, { nome: e.target.value })} placeholder="HE 60% sábado" /></div>
                  <div><Label className="text-xs">% adicional</Label><Input type="number" step="0.01" value={f.percentual} onChange={e => updFaixa(i, { percentual: +e.target.value, multiplicador: +(1 + (+e.target.value) / 100).toFixed(4) })} /></div>
                  <div><Label className="text-xs">Multiplicador</Label><Input type="number" step="0.0001" value={f.multiplicador} onChange={e => updFaixa(i, { multiplicador: +e.target.value })} /></div>
                  <div>
                    <Label className="text-xs">Condição</Label>
                    <Select value={f.condicao} onValueChange={v => updFaixa(i, { condicao: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="padrao">Dia útil padrão</SelectItem>
                        <SelectItem value="sabado">Sábado</SelectItem>
                        <SelectItem value="domingo">Domingo</SelectItem>
                        <SelectItem value="feriado">Feriado</SelectItem>
                        <SelectItem value="noturno">Período noturno</SelectItem>
                        <SelectItem value="apos_2h">Após 2h diárias</SelectItem>
                        <SelectItem value="apos_limite">Após limite semanal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Rubrica folha</Label><Input value={f.rubrica_dominio || ""} onChange={e => updFaixa(i, { rubrica_dominio: e.target.value })} placeholder="H60" /></div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => rmFaixa(i)}>Remover</Button>
                </div>
              ))}
              {!(form.he_faixas_customizadas || []).length && (
                <p className="text-xs text-muted-foreground italic">Nenhuma faixa adicional. As HEs usarão apenas 50% e 100% padrão.</p>
              )}
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
                  <Button variant="ghost" size="sm" onClick={() => { if (confirm("Excluir acordo?")) remover(a.id); }}>Excluir</Button>
                </div>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>HE 50%: <b>{a.he_multiplicador_50}x</b></div>
                  <div>HE 100%: <b>{a.he_multiplicador_100}x</b></div>
                  <div>Ad. noturno: <b>{a.adicional_noturno_percentual}%</b></div>
                  <div>Banco horas: <b>{a.banco_horas_prazo_meses}m</b></div>
                  <div>Sobreaviso: <b>{a.sobreaviso_percentual}%</b></div>
                  <div>Intervalo: <b>{a.intervalo_minimo_min}-{a.intervalo_maximo_min}min</b></div>
                  <div>DSR: <b>{a.dsr_percentual}%</b></div>
                  <div>Hora noturna: <b>{a.hora_noturna_minutos}min</b></div>
                </div>
                {Array.isArray(a.he_faixas_customizadas) && a.he_faixas_customizadas.length > 0 && (
                  <div className="border-t pt-2">
                    <p className="font-semibold mb-1">Faixas customizadas:</p>
                    <div className="flex flex-wrap gap-1">
                      {a.he_faixas_customizadas.map((f: any, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {f.nome} · {f.percentual}% · {f.condicao}{f.rubrica_dominio ? ` · ${f.rubrica_dominio}` : ""}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {!lista.length && <p className="text-sm text-muted-foreground">Nenhum acordo registrado.</p>}
      </div>
    </div>
  );
}
