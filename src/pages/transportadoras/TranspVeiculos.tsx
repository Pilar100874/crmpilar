import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Truck, Search, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { CVPageHeader } from "@/pages/controle-veiculos/CVPageHeader";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  TIPOS_VEICULO_TRANSP, maskPlaca, normalizePlaca,
  type TranspVeiculo,
} from "@/lib/transportadoras/dados";

const empty = { placa: "", tipo_veiculo: "", observacoes: "", ativo: true };

export default function TranspVeiculos() {
  const [rows, setRows] = useState<TranspVeiculo[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [excluir, setExcluir] = useState<TranspVeiculo | null>(null);


  const load = async () => {
    const { data, error } = await supabase.from("transp_veiculos").select("*").order("placa");
    if (error) return toast.error(error.message);
    setRows((data ?? []) as any);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!normalizePlaca(form.placa)) return toast.error("Placa obrigatória");
    if (!form.tipo_veiculo) return toast.error("Tipo de veículo obrigatório");
    const payload = {
      transportadora_id: idTransportadora(form.transportadora_id),
      placa: maskPlaca(form.placa),
      descricao: form.descricao?.toUpperCase() || null,
      tipo_veiculo: form.tipo_veiculo,
      observacoes: form.observacoes || null,
      ativo: form.ativo,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from("transp_veiculos").update(payload as any).eq("id", editing));
    } else {
      const estId = await getEstabelecimentoId();
      if (!estId) return toast.error("Estabelecimento não encontrado");
      ({ error } = await supabase.from("transp_veiculos").insert({ ...payload, estabelecimento_id: estId } as any));
    }
    if (error) return toast.error(error.message);
    toast.success("Salvo"); setOpen(false); load();
  };

  const remove = async () => {
    if (!excluir) return;
    const { error } = await supabase.from("transp_veiculos").delete().eq("id", excluir.id);
    setExcluir(null);
    if (error) return toast.error(error.message);
    toast.success("Excluído"); load();
  };

  const toggle = async (v: TranspVeiculo) => {
    await supabase.from("transp_veiculos").update({ ativo: !v.ativo } as any).eq("id", v.id);
    load();
  };

  const qNorm = normalizePlaca(q);
  const filtered = rows.filter((v) =>
    !qNorm || normalizePlaca(v.placa).includes(qNorm) || (v.descricao ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <CVPageHeader
        icon={Truck}
        title="Veículos de Transportadoras"
        subtitle={`${rows.length} cadastrados • ${rows.filter((r) => r.ativo).length} ativos`}
        actions={<Button onClick={() => { setForm(empty); setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Novo Veículo</Button>}
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar placa..." value={q} onChange={(e) => setQ(maskPlaca(e.target.value))} />
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Truck className="h-12 w-12 mx-auto mb-3 opacity-40" />Nenhum veículo cadastrado.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((v) => (
            <Card key={v.id} className="hover:shadow-md hover:-translate-y-0.5 transition-all">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
                    <Truck className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Badge variant="outline" className="font-mono text-xs">{maskPlaca(v.placa)}</Badge>
                    <p className="text-sm mt-1 truncate">{v.tipo_veiculo || "—"}</p>
                    {v.ativo
                      ? <Badge className="mt-1 h-5 bg-emerald-500/15 text-emerald-600 border-0">Ativo</Badge>
                      : <Badge variant="secondary" className="mt-1 h-5">Inativo</Badge>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {nomeTransportadora(empresas.find((e) => e.id === v.transportadora_id))}
                </p>
                <div className="flex items-center justify-end gap-0.5 pt-2 border-t">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    setForm({
                      transportadora_id: v.transportadora_id ?? SEM_TRANSPORTADORA, placa: v.placa, descricao: v.descricao ?? "",
                      tipo_veiculo: v.tipo_veiculo ?? "", observacoes: v.observacoes ?? "", ativo: v.ativo,
                    });
                    setEditing(v.id); setOpen(true);
                  }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggle(v)}>
                    {v.ativo ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setExcluir(v)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} Veículo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <Label>Transportadora</Label>
                <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => setNovaEmpresa(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Nova
                </Button>
              </div>
              <Select value={form.transportadora_id} onValueChange={(v) => setForm({ ...form, transportadora_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value={SEM_TRANSPORTADORA}>Sem transportadora (avulso)</SelectItem>
                  {empresas.map((e) => <SelectItem key={e.id} value={e.id}>{nomeTransportadora(e)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Placa *</Label><Input value={form.placa} onChange={(e) => setForm({ ...form, placa: maskPlaca(e.target.value) })} maxLength={8} /></div>

            <div>
              <Label>Tipo *</Label>
              <Select value={form.tipo_veiculo} onValueChange={(v) => setForm({ ...form, tipo_veiculo: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {TIPOS_VEICULO_TRANSP.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Observações</Label><Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /><Label>Ativo</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NovaTransportadoraDialog
        open={novaEmpresa}
        onOpenChange={setNovaEmpresa}
        onCreated={(e) => { setEmpresas((p) => [...p, e]); setForm((f: any) => ({ ...f, transportadora_id: e.id })); }}
      />

      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={(o) => !o && setExcluir(null)}
        onConfirm={remove}
        itemName={excluir?.placa}
      />
    </div>
  );
}
