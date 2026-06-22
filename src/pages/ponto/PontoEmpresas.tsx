import { useEffect, useState } from "react";
import { Plus, Building2, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

type Empresa = {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  cidade: string | null;
  uf: string | null;
  codigo_dominio: string | null;
  ativo: boolean;
};

export default function PontoEmpresas() {
  const [items, setItems] = useState<Empresa[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Empresa | null>(null);
  const [deleting, setDeleting] = useState<Empresa | null>(null);
  const [form, setForm] = useState({
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    cidade: "",
    uf: "",
    codigo_dominio: "",
  });

  const load = async () => {
    const { data } = await supabase
      .from("ponto_empresas")
      .select("*")
      .order("razao_social");
    setItems((data as any) || []);
  };
  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      razao_social: "",
      nome_fantasia: "",
      cnpj: "",
      cidade: "",
      uf: "",
      codigo_dominio: "",
    });
    setOpen(true);
  };
  const openEdit = (e: Empresa) => {
    setEditing(e);
    setForm({
      razao_social: e.razao_social,
      nome_fantasia: e.nome_fantasia ?? "",
      cnpj: e.cnpj,
      cidade: e.cidade ?? "",
      uf: e.uf ?? "",
      codigo_dominio: e.codigo_dominio ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.razao_social || !form.cnpj) {
      toast.error("Razão social e CNPJ são obrigatórios");
      return;
    }
    // resolve estabelecimento_id
    const { data: u } = await supabase.auth.getUser();
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("estabelecimento_id")
      .eq("auth_user_id", u.user?.id)
      .maybeSingle();
    if (!usuario?.estabelecimento_id) {
      toast.error("Sem estabelecimento vinculado ao usuário");
      return;
    }
    if (editing) {
      const { error } = await supabase
        .from("ponto_empresas")
        .update(form)
        .eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Empresa atualizada");
    } else {
      const { error } = await supabase
        .from("ponto_empresas")
        .insert({ ...form, estabelecimento_id: usuario.estabelecimento_id });
      if (error) return toast.error(error.message);
      toast.success("Empresa criada");
    }
    setOpen(false);
    load();
  };

  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabase
      .from("ponto_empresas")
      .delete()
      .eq("id", deleting.id);
    if (error) return toast.error(error.message);
    toast.success("Empresa excluída");
    setDeleting(null);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Empresas</h2>
          <p className="text-sm text-muted-foreground">
            Cadastro de empresas do controle de ponto
          </p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nova empresa
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma empresa cadastrada. Crie a primeira para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((e) => (
            <Card key={e.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{e.razao_social}</h3>
                    <p className="truncate text-xs text-muted-foreground">
                      {e.cnpj}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(e)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleting(e)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {(e.cidade || e.uf) && (
                  <p className="text-xs text-muted-foreground">
                    {e.cidade}
                    {e.uf ? ` / ${e.uf}` : ""}
                  </p>
                )}
                {e.codigo_dominio && (
                  <p className="text-xs">
                    <span className="text-muted-foreground">Cód. Domínio:</span>{" "}
                    {e.codigo_dominio}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar empresa" : "Nova empresa"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Razão social *</Label>
              <Input
                value={form.razao_social}
                onChange={(e) =>
                  setForm({ ...form, razao_social: e.target.value })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Nome fantasia</Label>
              <Input
                value={form.nome_fantasia}
                onChange={(e) =>
                  setForm({ ...form, nome_fantasia: e.target.value })
                }
              />
            </div>
            <div>
              <Label>CNPJ *</Label>
              <Input
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
              />
            </div>
            <div>
              <Label>Código Domínio</Label>
              <Input
                value={form.codigo_dominio}
                onChange={(e) =>
                  setForm({ ...form, codigo_dominio: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input
                value={form.cidade}
                onChange={(e) => setForm({ ...form, cidade: e.target.value })}
              />
            </div>
            <div>
              <Label>UF</Label>
              <Input
                value={form.uf}
                maxLength={2}
                onChange={(e) =>
                  setForm({ ...form, uf: e.target.value.toUpperCase() })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        onConfirm={remove}
        itemName={deleting?.razao_social ?? ""}
        title="Excluir empresa"
      />
    </div>
  );
}
