import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

type Func = {
  id: string;
  nome: string;
  cpf: string;
  matricula: string | null;
  cargo: string | null;
  pis: string | null;
  status: string;
  escala_id: string | null;
  filial_id: string | null;
};

export default function PontoFuncionarios() {
  const { empresaId } = usePontoEmpresa();
  const [items, setItems] = useState<Func[]>([]);
  const [filiais, setFiliais] = useState<any[]>([]);
  const [escalas, setEscalas] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Func | null>(null);
  const [editing, setEditing] = useState<Func | null>(null);
  const [f, setF] = useState({
    nome: "",
    cpf: "",
    matricula: "",
    cargo: "",
    pis: "",
    filial_id: "",
    escala_id: "",
    codigo_dominio: "",
  });

  const load = async () => {
    if (!empresaId) return;
    const [r1, r2, r3] = await Promise.all([
      supabase.from("ponto_funcionarios").select("*").eq("empresa_id", empresaId).order("nome"),
      supabase.from("ponto_filiais").select("id, nome").eq("empresa_id", empresaId),
      supabase.from("ponto_escalas").select("id, nome").eq("empresa_id", empresaId),
    ]);
    setItems((r1.data as any) || []);
    setFiliais(r2.data || []);
    setEscalas(r3.data || []);
  };
  useEffect(() => {
    load();
  }, [empresaId]);

  const openCreate = () => {
    setEditing(null);
    setF({ nome: "", cpf: "", matricula: "", cargo: "", pis: "", filial_id: "", escala_id: "", codigo_dominio: "" });
    setOpen(true);
  };
  const openEdit = (x: any) => {
    setEditing(x);
    setF({
      nome: x.nome,
      cpf: x.cpf,
      matricula: x.matricula ?? "",
      cargo: x.cargo ?? "",
      pis: x.pis ?? "",
      filial_id: x.filial_id ?? "",
      escala_id: x.escala_id ?? "",
      codigo_dominio: x.codigo_dominio ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!empresaId) return toast.error("Selecione uma empresa");
    if (!f.nome || !f.cpf) return toast.error("Nome e CPF obrigatórios");
    const payload: any = {
      empresa_id: empresaId,
      nome: f.nome,
      cpf: f.cpf,
      matricula: f.matricula || null,
      cargo: f.cargo || null,
      pis: f.pis || null,
      filial_id: f.filial_id || null,
      escala_id: f.escala_id || null,
      codigo_dominio: f.codigo_dominio || null,
    };
    const { error } = editing
      ? await supabase.from("ponto_funcionarios").update(payload).eq("id", editing.id)
      : await supabase.from("ponto_funcionarios").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    setOpen(false);
    load();
  };

  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("ponto_funcionarios").delete().eq("id", deleting.id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    setDeleting(null);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Funcionários</h2>
          <p className="text-sm text-muted-foreground">Cadastro de colaboradores</p>
        </div>
        <Button onClick={openCreate} disabled={!empresaId} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Novo
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {empresaId ? "Nenhum funcionário cadastrado." : "Cadastre uma empresa primeiro."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Nome</th>
                <th className="p-3 hidden sm:table-cell">CPF</th>
                <th className="p-3 hidden md:table-cell">Matrícula</th>
                <th className="p-3 hidden lg:table-cell">Cargo</th>
                <th className="p-3">Status</th>
                <th className="p-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id} className="border-t">
                  <td className="p-3 font-medium">{x.nome}</td>
                  <td className="p-3 hidden sm:table-cell">{x.cpf}</td>
                  <td className="p-3 hidden md:table-cell">{x.matricula}</td>
                  <td className="p-3 hidden lg:table-cell">{x.cargo}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                      {x.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(x)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleting(x)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar funcionário" : "Novo funcionário"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nome *</Label>
              <Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
            </div>
            <div>
              <Label>CPF *</Label>
              <Input value={f.cpf} onChange={(e) => setF({ ...f, cpf: e.target.value })} />
            </div>
            <div>
              <Label>PIS</Label>
              <Input value={f.pis} onChange={(e) => setF({ ...f, pis: e.target.value })} />
            </div>
            <div>
              <Label>Matrícula</Label>
              <Input value={f.matricula} onChange={(e) => setF({ ...f, matricula: e.target.value })} />
            </div>
            <div>
              <Label>Cód. Domínio</Label>
              <Input value={f.codigo_dominio} onChange={(e) => setF({ ...f, codigo_dominio: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Cargo</Label>
              <Input value={f.cargo} onChange={(e) => setF({ ...f, cargo: e.target.value })} />
            </div>
            <div>
              <Label>Filial</Label>
              <Select value={f.filial_id} onValueChange={(v) => setF({ ...f, filial_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {filiais.map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Escala</Label>
              <Select value={f.escala_id} onValueChange={(v) => setF({ ...f, escala_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {escalas.map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        onConfirm={remove}
        itemName={deleting?.nome ?? ""}
        title="Excluir funcionário"
      />
    </div>
  );
}
