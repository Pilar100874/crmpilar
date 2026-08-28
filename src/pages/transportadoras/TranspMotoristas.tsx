import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Users, Search, ToggleLeft, ToggleRight, IdCard, Phone, User, Camera, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { CVPageHeader } from "@/pages/controle-veiculos/CVPageHeader";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { maskWhatsapp, maskCpf, validarCpf, type TranspMotorista } from "@/lib/transportadoras/dados";

const empty = { nome: "", cpf: "", whatsapp: "", observacoes: "", ativo: true, cnh_foto_url: null as string | null };

const CNH_BUCKET = "cv-vehicle-photos";

async function uploadCnhFoto(file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `cnh/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(CNH_BUCKET).upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export default function TranspMotoristas() {
  const [rows, setRows] = useState<TranspMotorista[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [excluir, setExcluir] = useState<TranspMotorista | null>(null);
  const [cnhFile, setCnhFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("transp_motoristas").select("*").order("nome");
    if (error) return toast.error(error.message);
    setRows((data ?? []) as any);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.nome) return toast.error("Nome obrigatório");
    const cpfLimpo = (form.cpf || "").replace(/\D/g, "");
    if (!cpfLimpo) return toast.error("CPF obrigatório");
    if (cpfLimpo.length !== 11) return toast.error("CPF deve ter 11 dígitos");
    if (!validarCpf(cpfLimpo)) return toast.error("CPF inválido");
    if (!cnhFile && !form.cnh_foto_url) return toast.error("A foto da CNH é obrigatória");
    setSaving(true);
    try {
      let cnh_foto_url: string | null = form.cnh_foto_url ?? null;
      if (cnhFile) cnh_foto_url = await uploadCnhFoto(cnhFile);
      const payload = {
        transportadora_id: null,
        nome: form.nome.toUpperCase(),
        cpf: cpfLimpo,
        cnh: null,
        cnh_foto_url,
        whatsapp: (form.whatsapp || "").replace(/\D/g, "") || null,
        observacoes: form.observacoes || null,
        ativo: form.ativo,
      };
      let error;
      if (editing) {
        ({ error } = await supabase.from("transp_motoristas").update(payload as any).eq("id", editing));
      } else {
        const estId = await getEstabelecimentoId();
        if (!estId) { setSaving(false); return toast.error("Estabelecimento não encontrado"); }
        ({ error } = await supabase.from("transp_motoristas").insert({ ...payload, estabelecimento_id: estId } as any));
      }
      if (error) return toast.error(error.message);
      toast.success("Salvo"); setOpen(false); setCnhFile(null); load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao enviar foto da CNH");
    } finally {
      setSaving(false);
    }
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
    !q || `${m.nome} ${m.cpf ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <CVPageHeader
        icon={Users}
        title="Motoristas de Transportadoras"
        subtitle={`${rows.length} cadastrados • ${rows.filter((r) => r.ativo).length} ativos`}
        actions={<Button onClick={() => { setForm(empty); setCnhFile(null); setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Novo Motorista</Button>}
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar nome ou CPF..." value={q} onChange={(e) => setQ(e.target.value)} />
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
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {m.ativo
                        ? <Badge className="h-5 bg-emerald-500/15 text-emerald-600 border-0">Ativo</Badge>
                        : <Badge variant="secondary" className="h-5">Inativo</Badge>}
                      {(m as any).cnh_foto_url
                        ? <Badge className="h-5 bg-sky-500/15 text-sky-600 border-0">CNH ✓</Badge>
                        : <Badge variant="outline" className="h-5 text-amber-600 border-amber-400/60">Sem foto CNH</Badge>}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><IdCard className="h-4 w-4" /><span className="font-mono truncate">{m.cpf ? maskCpf(m.cpf) : "—"}</span></div>
                  <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /><span className="truncate">{m.whatsapp ? maskWhatsapp(m.whatsapp) : "—"}</span></div>
                </div>
                <div className="flex items-center justify-end gap-0.5 pt-2 border-t">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    setForm({
                      nome: m.nome, cpf: m.cpf ?? "",
                      whatsapp: m.whatsapp ?? "", observacoes: m.observacoes ?? "", ativo: m.ativo,
                      cnh_foto_url: (m as any).cnh_foto_url ?? null,
                    });
                    setCnhFile(null);
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
            <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value.toUpperCase() })} /></div>
            <div><Label>CPF *</Label><Input value={maskCpf(form.cpf)} onChange={(e) => setForm({ ...form, cpf: e.target.value.replace(/\D/g, "").slice(0, 11) })} inputMode="numeric" placeholder="000.000.000-00" /></div>
            <div><Label>WhatsApp *</Label><Input value={maskWhatsapp(form.whatsapp)} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="(11) 90000-0000" /></div>
            <div>
              <Label>Foto da CNH *</Label>
              <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-muted/40 px-3 py-4 text-sm text-muted-foreground hover:bg-muted/60 transition-colors">
                {cnhFile || form.cnh_foto_url ? <ImageIcon className="h-5 w-5 text-primary" /> : <Camera className="h-5 w-5" />}
                <span className="truncate">
                  {cnhFile ? cnhFile.name : form.cnh_foto_url ? "Foto da CNH anexada — toque para trocar" : "Toque para anexar a foto da CNH"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (f && !f.type.startsWith("image/")) return toast.error("Envie uma imagem da CNH");
                    setCnhFile(f);
                  }}
                />
              </label>
              {cnhFile && (
                <img src={URL.createObjectURL(cnhFile)} alt="Prévia da CNH" className="mt-2 h-28 w-full rounded-md object-cover border" />
              )}
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /><Label>Ativo</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
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
        itemName={excluir?.nome}
      />
    </div>
  );
}
