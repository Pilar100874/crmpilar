import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Building2, Plus, Pencil, Trash2, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import { CVPageHeader } from "@/pages/controle-veiculos/CVPageHeader";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { maskWhatsapp, type TranspSetor, type TranspSetorNumero } from "@/lib/transportadoras/dados";

interface SetorForm {
  id: string;
  nome: string;
  observacoes: string;
  numeros: { id?: string; numero: string; descricao: string }[];
}

const vazio: SetorForm = { id: "", nome: "", observacoes: "", numeros: [{ numero: "", descricao: "" }] };

export default function TranspSetores() {
  const [setores, setSetores] = useState<TranspSetor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<SetorForm>(vazio);
  const [open, setOpen] = useState(false);
  const [excluir, setExcluir] = useState<TranspSetor | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("transp_setores")
      .select("id, nome, whatsapp, observacoes, ativo, numeros:transp_setores_numeros(id, setor_id, numero, descricao, ativo)")
      .eq("ativo", true)
      .eq("numeros.ativo", true)
      .order("nome");
    setSetores((data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const salvar = async () => {
    const nome = form.nome.trim().toUpperCase();
    if (!nome) return toast.error("Informe o nome do setor");

    const validos = form.numeros
      .map((n) => ({ ...n, numero: n.numero.replace(/\D/g, "") }))
      .filter((n) => n.numero.length >= 10);
    if (validos.length === 0) return toast.error("Informe ao menos um número de WhatsApp válido");

    setBusy(true);
    const payload = {
      nome,
      whatsapp: validos[0].numero,
      observacoes: form.observacoes.toUpperCase() || null,
    };

    let setorId = form.id;
    let error;
    if (form.id) {
      ({ error } = await supabase.from("transp_setores").update(payload as any).eq("id", form.id));
    } else {
      const estId = await getEstabelecimentoId();
      if (!estId) { setBusy(false); return toast.error("Estabelecimento não encontrado"); }
      const { data, error: insError } = await supabase
        .from("transp_setores")
        .insert({ ...payload, estabelecimento_id: estId, ativo: true } as any)
        .select("id")
        .single();
      error = insError;
      setorId = data?.id ?? "";
    }

    if (!error && setorId) {
      const existentes = form.numeros.filter((n) => n.id).map((n) => n.id as string);
      await supabase.from("transp_setores_numeros").update({ ativo: false } as any).eq("setor_id", setorId);
      const { error: numError } = await supabase.from("transp_setores_numeros").insert(
        validos.map((n) => ({
          setor_id: setorId,
          numero: n.numero,
          descricao: n.descricao.toUpperCase() || null,
          ativo: true,
        }))
      );
      if (numError) error = numError;
    }

    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Setor atualizado" : "Setor cadastrado");
    setOpen(false); setForm(vazio); load();
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    const { error } = await supabase.from("transp_setores").update({ ativo: false } as any).eq("id", excluir.id);
    setExcluir(null);
    if (error) return toast.error(error.message);
    toast.success("Setor excluído");
    load();
  };

  const abrirEdicao = (s: TranspSetor) => {
    const nums = s.numeros?.length
      ? s.numeros.map((n) => ({ id: n.id, numero: maskWhatsapp(n.numero), descricao: n.descricao || "" }))
      : s.whatsapp
      ? [{ id: undefined as any, numero: maskWhatsapp(s.whatsapp), descricao: "" }]
      : [{ numero: "", descricao: "" }];
    setForm({ id: s.id, nome: s.nome, observacoes: s.observacoes ?? "", numeros: nums });
    setOpen(true);
  };

  const updateNumero = (idx: number, campo: "numero" | "descricao", valor: string) => {
    setForm((f) => ({
      ...f,
      numeros: f.numeros.map((n, i) => (i === idx ? { ...n, [campo]: campo === "numero" ? maskWhatsapp(valor) : valor.toUpperCase() } : n)),
    }));
  };

  const addNumero = () => setForm((f) => ({ ...f, numeros: [...f.numeros, { numero: "", descricao: "" }] }));
  const removeNumero = (idx: number) => setForm((f) => ({ ...f, numeros: f.numeros.filter((_, i) => i !== idx) }));

  return (
    <div className="space-y-4">
      <CVPageHeader icon={Building2} title="Setores" subtitle="Setores avisados na chegada dos veículos" />

      <div className="flex justify-end">
        <Button onClick={() => { setForm(vazio); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />Novo setor
        </Button>
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Carregando...</CardContent></Card>
      ) : setores.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
          Nenhum setor cadastrado.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {setores.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold truncate">{s.nome}</p>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => abrirEdicao(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setExcluir(s)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {s.numeros?.length ? s.numeros.map((n) => (
                    <Badge key={n.id} variant="secondary" className="gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {n.descricao ? `${n.descricao}: ` : ""}{maskWhatsapp(n.numero)}
                    </Badge>
                  )) : s.whatsapp ? (
                    <Badge variant="secondary" className="gap-1"><MessageCircle className="h-3 w-3" />{maskWhatsapp(s.whatsapp)}</Badge>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sem WhatsApp cadastrado</p>
                  )}
                </div>
                {s.observacoes && <p className="text-xs text-muted-foreground">{s.observacoes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{form.id ? "Editar setor" : "Novo setor"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value.toUpperCase() })} placeholder="EXPEDIÇÃO" />
            </div>
            <div className="space-y-2">
              <Label>Números de WhatsApp *</Label>
              {form.numeros.map((n, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1.5">
                    <Input value={n.numero} onChange={(e) => updateNumero(idx, "numero", e.target.value)} placeholder="(11) 90000-0000" />
                    <Input value={n.descricao} onChange={(e) => updateNumero(idx, "descricao", e.target.value)} placeholder="Descrição (ex: Recepção)" className="text-xs" />
                  </div>
                  {form.numeros.length > 1 && (
                    <Button variant="ghost" size="icon" className="shrink-0 mt-0.5" onClick={() => removeNumero(idx)}>
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addNumero}><Plus className="h-4 w-4 mr-1" />Adicionar número</Button>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value.toUpperCase() })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={(o) => !o && setExcluir(null)}
        onConfirm={confirmarExclusao}
        itemName={excluir?.nome}
      />
    </div>
  );
}
