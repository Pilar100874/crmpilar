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
import { Plus, Pencil, Trash2, Users, Search, ToggleLeft, ToggleRight, IdCard, Phone, User } from "lucide-react";
import { toast } from "sonner";
import { CVPageHeader } from "@/pages/controle-veiculos/CVPageHeader";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  listarTransportadoras, maskWhatsapp, nomeTransportadora,
  type TranspEmpresa, type TranspMotorista,
} from "@/lib/transportadoras/dados";

const empty = { transportadora_id: "", nome: "", cpf: "", cnh: "", whatsapp: "", observacoes: "", ativo: true };

export default function TranspMotoristas() {
  const [rows, setRows] = useState<TranspMotorista[]>([]);
  const [empresas, setEmpresas] = useState<TranspEmpresa[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [excluir, setExcluir] = useState<TranspMotorista | null>(null);

  const load = async () => {
    const [emp, { data, error }] = await Promise.all([
      listarTransportadoras(),
      supabase.from("transp_motoristas").select("*").order("nome"),
    ]);
    setEmpresas(emp);
    if (error) return toast.error(error.message);
    setRows((data ?? []) as any);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.nome) return toast.error("Nome obrigatório");
    const payload = {
      transportadora_id: form.transportadora_id || null,
      nome: form.nome.toUpperCase(),
      cpf: form.cpf || null,
      cnh: form.cnh || null,
      whatsapp: (form.whatsapp || "").replace(/\D/g, "") || null,
      observacoes: form.observacoes || null,
      ativo: form.ativo,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from("transp_motoristas").update(payload as any).eq("id", editing));
    } else {
      const estId = await getEstabelecimentoId();
      if (!estId) return toast.error("Estabelecimento não encontrado");
      ({ error } = await supabase.from("transp_motoristas").insert({ ...payload, estabelecimento_id: estId } as any));
    }
    if (error) return toast.error(error.message);
    toast.success("Salvo"); setOpen(false); load();
  };

  const remove = async () => {
    if (!excluir) return;
    const { error } = await supabase.from("transp_motoristas").delete().eq("id", excluir.id);
    setExcluir(null);
    if (error) return toast.error(error.message);
    toast.success("Excluído"); load();
  };

  const toggle = async (m: TranspMotorista) => {
    await supabase.from("transp_motoristas").update({ ativo: !m.ativo } as any).eq("id", m.id);
    load();
  };

  const filtered = rows.filter((m) =>
    !q || `${m.nome} ${m.cpf ?? ""} ${m.cnh ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <CVPageHeader
        icon={Users}
        title="Motoristas de Transportadoras"
        subtitle={`${rows.length} cadastrados • ${rows.filter((r) => r.ativo).length} ativos`}
        actions={<Button onClick={() => { setForm(empty); setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Novo Motorista</Button>}
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar nome, CPF ou CNH..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />Nenhum motorista cadastrado.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((m) => (
            <Card key={m.id} className="hover:shadow-md hover:-translate-y-0.5 transition-all">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{m.nome}</p>
                    {m.ativo
                      ? <Badge className="mt-1 h-5 bg-emerald-500/15 text-emerald-600 border-0">Ativo</Badge>
                      : <Badge variant="secondary" className="mt-1 h-5">Inativo</Badge>}
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><IdCard className="h-4 w-4" /><span className="font-mono truncate">{m.cnh || m.cpf || "—"}</span></div>
                  <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /><span className="truncate">{m.whatsapp ? maskWhatsapp(m.whatsapp) : "—"}</span></div>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {nomeTransportadora(empresas.find((e) => e.id === m.transportadora_id))}
                </p>
                <div className="flex items-center justify-end gap-0.5 pt-2 border-t">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    setForm({
                      transportadora_id: m.transportadora_id ?? "", nome: m.nome, cpf: m.cpf ?? "",
                      cnh: m.cnh ?? "", whatsapp: m.whatsapp ?? "", observacoes: m.observacoes ?? "", ativo: m.ativo,
                    });
                    setEditing(m.id); setOpen(true);
                  }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggle(m)}>
                    {m.ativo ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setExcluir(m)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} Motorista</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Transportadora</Label>
              <Select value={form.transportadora_id} onValueChange={(v) => setForm({ ...form, transportadora_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {empresas.map((e) => <SelectItem key={e.id} value={e.id}>{nomeTransportadora(e)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value.toUpperCase() })} /></div>
            <div><Label>CPF</Label><Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></div>
            <div><Label>CNH</Label><Input value={form.cnh} onChange={(e) => setForm({ ...form, cnh: e.target.value })} /></div>
            <div><Label>WhatsApp</Label><Input value={maskWhatsapp(form.whatsapp)} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="(11) 90000-0000" /></div>
            <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /><Label>Ativo</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={(o) => !o && setExcluir(null)}
        onConfirm={remove}
        itemName={excluir?.nome}
      />
    </div>
  );
}
