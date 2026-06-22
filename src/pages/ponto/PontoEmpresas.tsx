import { useEffect, useState } from "react";
import { Plus, Building2, Trash2, Pencil, Loader2, Search } from "lucide-react";
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
import { MaskedInput } from "@/components/ui/masked-input";
import { UfSelect } from "@/components/ui/uf-select";
import { CidadeSelect } from "@/components/ui/cidade-select";
import { maskCNPJ, maskCEP, maskIE } from "@/lib/masks";
import { validateCNPJ, validateCEP, validateInscricaoEstadual } from "@/lib/validators";
import { fetchCep, fetchCnpj } from "@/lib/brAddress";

type Empresa = {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  cidade: string | null;
  uf: string | null;
  codigo_dominio: string | null;
  cep: string | null;
  endereco: string | null;
  inscricao_estadual: string | null;
  ativo: boolean;
};

const emptyForm = {
  razao_social: "",
  nome_fantasia: "",
  cnpj: "",
  cep: "",
  endereco: "",
  cidade: "",
  uf: "",
  inscricao_estadual: "",
  codigo_dominio: "",
};

export default function PontoEmpresas() {
  const [items, setItems] = useState<Empresa[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Empresa | null>(null);
  const [deleting, setDeleting] = useState<Empresa | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);

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
    setForm(emptyForm);
    setOpen(true);
  };
  const openEdit = (e: Empresa) => {
    setEditing(e);
    setForm({
      razao_social: e.razao_social,
      nome_fantasia: e.nome_fantasia ?? "",
      cnpj: maskCNPJ(e.cnpj ?? ""),
      cep: maskCEP(e.cep ?? ""),
      endereco: e.endereco ?? "",
      cidade: e.cidade ?? "",
      uf: e.uf ?? "",
      inscricao_estadual: e.inscricao_estadual ?? "",
      codigo_dominio: e.codigo_dominio ?? "",
    });
    setOpen(true);
  };

  const onCepBlur = async () => {
    const clean = form.cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setLoadingCep(true);
    const data = await fetchCep(clean);
    setLoadingCep(false);
    if (!data) {
      toast.error("CEP não encontrado");
      return;
    }
    setForm((f) => ({
      ...f,
      endereco: [data.logradouro, data.bairro].filter(Boolean).join(", ") || f.endereco,
      uf: data.uf || f.uf,
      cidade: data.localidade || f.cidade,
    }));
  };

  const onCnpjLookup = async () => {
    if (!validateCNPJ(form.cnpj)) {
      toast.error("CNPJ inválido");
      return;
    }
    setLoadingCnpj(true);
    const data = await fetchCnpj(form.cnpj);
    setLoadingCnpj(false);
    if (!data) {
      toast.error("CNPJ não encontrado na Receita");
      return;
    }
    setForm((f) => ({
      ...f,
      razao_social: data.razao_social || f.razao_social,
      nome_fantasia: data.nome_fantasia || f.nome_fantasia,
      cep: maskCEP(data.cep || f.cep),
      endereco:
        [data.logradouro, data.numero, data.bairro].filter(Boolean).join(", ") ||
        f.endereco,
      cidade: data.municipio || f.cidade,
      uf: data.uf || f.uf,
    }));
    toast.success("Dados preenchidos da Receita");
  };

  const save = async () => {
    if (!form.razao_social || !form.cnpj) {
      toast.error("Razão social e CNPJ são obrigatórios");
      return;
    }
    if (!validateCNPJ(form.cnpj)) {
      toast.error("CNPJ inválido");
      return;
    }
    if (form.cep && !validateCEP(form.cep)) {
      toast.error("CEP inválido");
      return;
    }
    if (form.inscricao_estadual && !validateInscricaoEstadual(form.inscricao_estadual)) {
      toast.error("Inscrição estadual inválida");
      return;
    }

    const payload = {
      razao_social: form.razao_social.trim(),
      nome_fantasia: form.nome_fantasia.trim() || null,
      cnpj: form.cnpj.replace(/\D/g, ""),
      cep: form.cep.replace(/\D/g, "") || null,
      endereco: form.endereco.trim() || null,
      cidade: form.cidade || null,
      uf: form.uf || null,
      inscricao_estadual: form.inscricao_estadual.replace(/\D/g, "") || null,
      codigo_dominio: form.codigo_dominio.trim() || null,
    };

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
        .update(payload)
        .eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Empresa atualizada");
    } else {
      const { error } = await supabase
        .from("ponto_empresas")
        .insert({ ...payload, estabelecimento_id: usuario.estabelecimento_id });
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

  const cnpjInvalid = !!form.cnpj && !validateCNPJ(form.cnpj);
  const cepInvalid = !!form.cep && !validateCEP(form.cep);

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
                      {maskCNPJ(e.cnpj)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar empresa" : "Nova empresa"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <Label>CNPJ *</Label>
              <div className="flex gap-2">
                <MaskedInput
                  mask={maskCNPJ}
                  value={form.cnpj}
                  onValueChange={(v) => setForm({ ...form, cnpj: v })}
                  invalid={cnpjInvalid}
                  placeholder="00.000.000/0000-00"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onCnpjLookup}
                  disabled={loadingCnpj || !form.cnpj}
                  title="Buscar dados na Receita"
                >
                  {loadingCnpj ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {cnpjInvalid && (
                <p className="mt-1 text-xs text-destructive">CNPJ inválido</p>
              )}
            </div>
            <div className="sm:col-span-3">
              <Label>Inscrição Estadual</Label>
              <MaskedInput
                mask={maskIE}
                value={form.inscricao_estadual}
                onValueChange={(v) => setForm({ ...form, inscricao_estadual: v })}
                placeholder="Somente números"
              />
            </div>
            <div className="sm:col-span-6">
              <Label>Razão social *</Label>
              <Input
                value={form.razao_social}
                onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
              />
            </div>
            <div className="sm:col-span-4">
              <Label>Nome fantasia</Label>
              <Input
                value={form.nome_fantasia}
                onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Código Domínio</Label>
              <Input
                value={form.codigo_dominio}
                onChange={(e) => setForm({ ...form, codigo_dominio: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>CEP</Label>
              <div className="relative">
                <MaskedInput
                  mask={maskCEP}
                  value={form.cep}
                  onValueChange={(v) => setForm({ ...form, cep: v })}
                  onBlur={onCepBlur}
                  invalid={cepInvalid}
                  placeholder="00000-000"
                />
                {loadingCep && (
                  <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              {cepInvalid && (
                <p className="mt-1 text-xs text-destructive">CEP inválido</p>
              )}
            </div>
            <div className="sm:col-span-4">
              <Label>Endereço</Label>
              <Input
                value={form.endereco}
                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                placeholder="Rua, número, bairro"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>UF</Label>
              <UfSelect
                value={form.uf}
                onChange={(v) => setForm({ ...form, uf: v, cidade: "" })}
              />
            </div>
            <div className="sm:col-span-4">
              <Label>Cidade</Label>
              <CidadeSelect
                uf={form.uf}
                value={form.cidade}
                onChange={(v) => setForm({ ...form, cidade: v })}
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
