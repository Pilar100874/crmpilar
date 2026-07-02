import { useState } from "react";
import { Plus, Edit2, Trash2, Search, User, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CVPageHeader } from "@/pages/controle-veiculos/CVPageHeader";
import { useVisitantesControl } from "@/hooks/useVisitantesControl";
import type { Visitor } from "@/types/visitantes";
import { toast } from "sonner";
import { validateCPF, formatCPF, formatWhatsApp } from "./visUtils";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function CVisVisitantes() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Visitor | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", cpf: "", company: "", email: "", whatsapp: "" });

  const { visitors, createVisitor, updateVisitor, deleteVisitor } = useVisitantesControl();

  const filtered = visitors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.cpf.includes(search.replace(/\D/g, "")) ||
    v.company.toLowerCase().includes(search.toLowerCase())
  );

  const reset = () => { setForm({ name: "", cpf: "", company: "", email: "", whatsapp: "" }); setEditing(null); };

  const handleSubmit = async () => {
    if (!form.name || !form.cpf || !form.company) { toast.error("Preencha nome, CPF e empresa"); return; }
    const clean = form.cpf.replace(/\D/g, "");
    if (!validateCPF(clean)) { toast.error("CPF inválido"); return; }
    if (!editing && visitors.find((v) => v.cpf === clean)) { toast.error("CPF já cadastrado"); return; }
    try {
      if (editing) {
        await updateVisitor(editing.id, {
          name: form.name, company: form.company, email: form.email, whatsapp: form.whatsapp.replace(/\D/g, ""),
        });
      } else {
        await createVisitor({
          cpf: clean, name: form.name, company: form.company,
          email: form.email || undefined, whatsapp: form.whatsapp.replace(/\D/g, "") || undefined,
        });
      }
      reset(); setOpen(false);
    } catch {}
  };

  const handleEdit = (v: Visitor) => {
    setEditing(v);
    setForm({
      name: v.name, cpf: formatCPF(v.cpf), company: v.company,
      email: v.email || "", whatsapp: v.whatsapp ? formatWhatsApp(v.whatsapp) : "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-5">
      <CVPageHeader icon={UserCog} title="Cadastro de Visitantes" subtitle="Base completa de visitantes" />

      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar nome, CPF ou empresa..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild>
              <Button className="h-10 font-semibold text-sm">
                <Plus className="h-4 w-4 mr-1.5" /> Novo Visitante
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Visitante" : "Novo Visitante"}</DialogTitle>
                <DialogDescription>{editing ? "Atualize os dados" : "Cadastre um novo visitante"}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label className="text-xs">Nome *</Label>
                  <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">CPF *</Label>
                  <Input value={form.cpf} onChange={(e) => setForm((p) => ({ ...p, cpf: formatCPF(e.target.value) }))}
                    maxLength={14} disabled={!!editing} className="font-mono" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Empresa *</Label>
                  <Input value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">E-mail</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">WhatsApp</Label>
                  <Input value={form.whatsapp} onChange={(e) => setForm((p) => ({ ...p, whatsapp: formatWhatsApp(e.target.value) }))} maxLength={15} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleSubmit}>{editing ? "Atualizar" : "Cadastrar"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <User className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">{search ? "Nenhum resultado" : "Nenhum visitante cadastrado"}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((v) => (
              <Card key={v.id} className="hover:shadow-md transition-all group">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-accent-foreground/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold truncate">{v.name}</h3>
                      <p className="text-xs text-muted-foreground">{v.company}</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{formatCPF(v.cpf)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(v)} className="flex-1 text-xs h-8">
                      <Edit2 className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive h-8 w-8 p-0">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>Excluir <strong>{v.name}</strong>? Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteVisitor(v.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
