import { useState } from "react";
import { Plus, Edit2, Trash2, MessageCircle, Contact } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CVPageHeader } from "@/pages/controle-veiculos/CVPageHeader";
import { useVisitantesControl } from "@/hooks/useVisitantesControl";
import type { ContactPerson } from "@/types/visitantes";
import { toast } from "sonner";
import { validateCPF, formatCPF, formatWhatsApp } from "./visUtils";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function CVisContatos() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ContactPerson | null>(null);
  const [form, setForm] = useState({ name: "", whatsapp: "", cpf: "" });

  const { contactPersons, createContactPerson, updateContactPerson, deleteContactPerson } = useVisitantesControl();

  const reset = () => { setForm({ name: "", whatsapp: "", cpf: "" }); setEditing(null); };

  const handleSubmit = async () => {
    if (!form.name || !form.whatsapp || !form.cpf) { toast.error("Preencha nome, WhatsApp e CPF"); return; }
    const wa = form.whatsapp.replace(/\D/g, "");
    if (wa.length !== 11) { toast.error("WhatsApp deve ter 11 dígitos com DDD"); return; }
    const cpf = form.cpf.replace(/\D/g, "");
    if (!validateCPF(cpf)) { toast.error("CPF inválido"); return; }
    try {
      if (editing) await updateContactPerson(editing.id, { name: form.name, whatsapp: wa, cpf });
      else await createContactPerson({ name: form.name, whatsapp: wa, cpf });
      reset(); setOpen(false);
    } catch (e: any) {
      toast.error(String(e?.message || "").includes("duplicate") ? "CPF já cadastrado" : "Erro ao salvar");
    }
  };

  const handleEdit = (c: ContactPerson) => {
    setEditing(c);
    setForm({ name: c.name, whatsapp: formatWhatsApp(c.whatsapp), cpf: formatCPF(c.cpf) });
    setOpen(true);
  };

  const openWhats = (wa: string) => window.open(`https://web.whatsapp.com/send?phone=55${wa}`, "_blank");

  return (
    <div className="space-y-5">
      <CVPageHeader icon={Contact} title="Pessoas de Contato" subtitle="Quem pode receber visitantes" />

      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild>
              <Button className="h-10 font-semibold text-sm">
                <Plus className="h-4 w-4 mr-1.5" /> Novo Contato
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Contato" : "Novo Contato"}</DialogTitle>
                <DialogDescription>{editing ? "Atualize os dados" : "Cadastre uma pessoa para receber visitantes"}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label className="text-xs">Nome *</Label>
                  <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">WhatsApp *</Label>
                  <Input value={form.whatsapp} onChange={(e) => setForm((p) => ({ ...p, whatsapp: formatWhatsApp(e.target.value) }))} maxLength={15} /></div>
                <div className="space-y-1.5"><Label className="text-xs">CPF *</Label>
                  <Input value={form.cpf} onChange={(e) => setForm((p) => ({ ...p, cpf: formatCPF(e.target.value) }))}
                    maxLength={14} className="font-mono" /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleSubmit}>{editing ? "Atualizar" : "Cadastrar"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {contactPersons.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <p className="text-sm text-muted-foreground">Nenhuma pessoa cadastrada</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {contactPersons.map((c) => (
              <Card key={c.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-bold">{c.name}</h3>
                    <p className="text-xs text-muted-foreground">{formatWhatsApp(c.whatsapp)}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{formatCPF(c.cpf)}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => openWhats(c.whatsapp)}
                      className="flex-1 text-xs h-8 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
                      <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(c)} className="h-8 w-8 p-0">
                      <Edit2 className="h-3 w-3" />
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
                          <AlertDialogDescription>Excluir <strong>{c.name}</strong>?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteContactPerson(c.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
