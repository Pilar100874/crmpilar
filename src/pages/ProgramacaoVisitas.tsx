import React, { useEffect, useState } from "react";
import { MapPin, Plus, Pencil, Trash2, Play, Pause } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Badge } from "@/components/ui/badge";

interface Programacao {
  id: string;
  customer_id: string | null;
  cliente_nome: string;
  endereco: string;
  lat: number | null;
  lng: number | null;
  responsavel_tipo: "usuario" | "filial" | "todos";
  responsavel_usuario_id: string | null;
  filial_id: string | null;
  frequencia_tipo: "dia" | "semana" | "mes" | "intervalo_dias";
  frequencia_qtd: number;
  intervalo_dias: number | null;
  dias_semana: number[];
  hora_inicio: string;
  hora_fim: string;
  data_inicio: string;
  data_fim: string | null;
  regra_monitoramento_id: string | null;
  observacao: string | null;
  ativa: boolean;
}

const empty: Partial<Programacao> = {
  cliente_nome: "",
  endereco: "",
  responsavel_tipo: "usuario",
  frequencia_tipo: "semana",
  frequencia_qtd: 1,
  dias_semana: [1, 2, 3, 4, 5],
  hora_inicio: "08:00",
  hora_fim: "18:00",
  data_inicio: new Date().toISOString().slice(0, 10),
  ativa: true,
};

const DIAS = ["D", "S", "T", "Q", "Q", "S", "S"];

const ProgramacaoVisitas: React.FC = () => {
  const [estabId, setEstabId] = useState<string | null>(null);
  const [rows, setRows] = useState<Programacao[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [regras, setRegras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Programacao>>(empty);
  const [toDelete, setToDelete] = useState<Programacao | null>(null);

  useEffect(() => { (async () => setEstabId(await getEstabelecimentoId()))(); }, []);
  useEffect(() => { if (estabId) load(); }, [estabId]);

  async function load() {
    setLoading(true);
    const [{ data: progs }, { data: cs }, { data: us }, { data: rg }] = await Promise.all([
      supabase.from("visita_programacoes").select("*").order("created_at", { ascending: false }),
      supabase.from("customers").select("id, nome").order("nome").limit(500),
      supabase.from("usuarios").select("id, nome").order("nome"),
      supabase.from("visita_regras_monitoramento").select("id, nome").eq("ativa", true),
    ]);
    setRows((progs as Programacao[]) || []);
    setCustomers(cs || []);
    setUsuarios(us || []);
    setRegras(rg || []);
    setLoading(false);
  }

  function openNew() { setForm(empty); setOpen(true); }
  function openEdit(r: Programacao) { setForm(r); setOpen(true); }

  function toggleDia(d: number) {
    const arr = new Set(form.dias_semana || []);
    if (arr.has(d)) arr.delete(d); else arr.add(d);
    setForm({ ...form, dias_semana: Array.from(arr).sort() });
  }

  async function save() {
    if (!form.cliente_nome?.trim()) { toast.error("Informe o cliente"); return; }
    if (!form.endereco?.trim()) { toast.error("Informe o endereço"); return; }
    const payload: any = { ...form, estabelecimento_id: estabId };
    const { error } = form.id
      ? await supabase.from("visita_programacoes").update(payload).eq("id", form.id)
      : await supabase.from("visita_programacoes").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Programação salva");
    setOpen(false); load();
  }

  async function togglePause(r: Programacao) {
    await supabase.from("visita_programacoes").update({ ativa: !r.ativa }).eq("id", r.id);
    load();
  }

  async function remove() {
    if (!toDelete) return;
    const { error } = await supabase.from("visita_programacoes").delete().eq("id", toDelete.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Excluída"); setToDelete(null); load();
  }

  function selectCustomer(id: string) {
    const c = customers.find(x => x.id === id);
    setForm({
      ...form,
      customer_id: id,
      cliente_nome: c?.nome || form.cliente_nome || "",
    });
  }

  function freqLabel(r: Programacao) {
    if (r.frequencia_tipo === "intervalo_dias") return `A cada ${r.intervalo_dias || 1} dias`;
    return `${r.frequencia_qtd}x por ${r.frequencia_tipo}`;
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-5 w-5" /> Programação de Visitas
          </h1>
          <p className="text-sm text-muted-foreground">
            Cadastre visitas cíclicas a clientes com verificação automática de presença.
          </p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Nova Programação</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Programações cadastradas</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-muted-foreground">Carregando...</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Frequência</TableHead>
                  <TableHead>Janela</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.cliente_nome}</TableCell>
                    <TableCell className="max-w-xs truncate">{r.endereco}</TableCell>
                    <TableCell>
                      {r.responsavel_tipo === "usuario"
                        ? usuarios.find(u => u.id === r.responsavel_usuario_id)?.nome || "—"
                        : r.responsavel_tipo}
                    </TableCell>
                    <TableCell>{freqLabel(r)}</TableCell>
                    <TableCell>{r.hora_inicio}–{r.hora_fim}</TableCell>
                    <TableCell>{r.ativa ? <Badge>Ativa</Badge> : <Badge variant="secondary">Pausada</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => togglePause(r)}>
                        {r.ativa ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setToDelete(r)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhuma programação cadastrada
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar" : "Nova"} Programação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Cliente (opcional — selecione da base)</Label>
              <Select value={form.customer_id || ""} onValueChange={selectCustomer}>
                <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome do cliente</Label>
                <Input value={form.cliente_nome || ""} onChange={e => setForm({ ...form, cliente_nome: e.target.value })} />
              </div>
              <div>
                <Label>Endereço</Label>
                <Input value={form.endereco || ""} onChange={e => setForm({ ...form, endereco: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Latitude</Label>
                <Input type="number" step="any" value={form.lat ?? ""} onChange={e => setForm({ ...form, lat: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input type="number" step="any" value={form.lng ?? ""} onChange={e => setForm({ ...form, lng: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Responsável</Label>
                <Select value={form.responsavel_tipo} onValueChange={v => setForm({ ...form, responsavel_tipo: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usuario">Usuário específico</SelectItem>
                    <SelectItem value="filial">Toda a filial</SelectItem>
                    <SelectItem value="todos">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.responsavel_tipo === "usuario" && (
                <div>
                  <Label>Usuário</Label>
                  <Select value={form.responsavel_usuario_id || ""} onValueChange={v => setForm({ ...form, responsavel_usuario_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Frequência</Label>
                <Select value={form.frequencia_tipo} onValueChange={v => setForm({ ...form, frequencia_tipo: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dia">Por dia</SelectItem>
                    <SelectItem value="semana">Por semana</SelectItem>
                    <SelectItem value="mes">Por mês</SelectItem>
                    <SelectItem value="intervalo_dias">A cada N dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.frequencia_tipo !== "intervalo_dias" ? (
                <div>
                  <Label>Quantidade</Label>
                  <Input type="number" min={1} value={form.frequencia_qtd ?? 1} onChange={e => setForm({ ...form, frequencia_qtd: Number(e.target.value) })} />
                </div>
              ) : (
                <div>
                  <Label>Intervalo (dias)</Label>
                  <Input type="number" min={1} value={form.intervalo_dias ?? 7} onChange={e => setForm({ ...form, intervalo_dias: Number(e.target.value) })} />
                </div>
              )}
              <div>
                <Label>Regra de Monitoramento</Label>
                <Select value={form.regra_monitoramento_id || ""} onValueChange={v => setForm({ ...form, regra_monitoramento_id: v || null })}>
                  <SelectTrigger><SelectValue placeholder="(usar regra global)" /></SelectTrigger>
                  <SelectContent>
                    {regras.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Dias da semana</Label>
              <div className="flex gap-2 mt-1">
                {DIAS.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDia(i)}
                    className={`w-9 h-9 rounded-md border text-sm ${form.dias_semana?.includes(i) ? "bg-primary text-primary-foreground" : "bg-background"}`}
                  >{d}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hora início</Label>
                <Input type="time" value={form.hora_inicio || "08:00"} onChange={e => setForm({ ...form, hora_inicio: e.target.value })} />
              </div>
              <div>
                <Label>Hora fim</Label>
                <Input type="time" value={form.hora_fim || "18:00"} onChange={e => setForm({ ...form, hora_fim: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data início</Label>
                <Input type="date" value={form.data_inicio || ""} onChange={e => setForm({ ...form, data_inicio: e.target.value })} />
              </div>
              <div>
                <Label>Data fim (opcional)</Label>
                <Input type="date" value={form.data_fim || ""} onChange={e => setForm({ ...form, data_fim: e.target.value || null })} />
              </div>
            </div>

            <div>
              <Label>Observação</Label>
              <Textarea value={form.observacao || ""} onChange={e => setForm({ ...form, observacao: e.target.value })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Ativa</Label>
              <Switch checked={form.ativa ?? true} onCheckedChange={v => setForm({ ...form, ativa: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!toDelete}
        onOpenChange={o => !o && setToDelete(null)}
        onConfirm={remove}
        itemName={toDelete?.cliente_nome}
      />
    </div>
  );
};

export default ProgramacaoVisitas;
