import { useEffect, useState } from "react";
import { Plus, Building, Trash2, Pencil, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { MaskedInput } from "@/components/ui/masked-input";
import { UfSelect } from "@/components/ui/uf-select";
import { CidadeSelect } from "@/components/ui/cidade-select";
import { maskCNPJ, maskCEP } from "@/lib/masks";
import { validateCNPJ, validateCEP } from "@/lib/validators";
import { fetchCep } from "@/lib/brAddress";

type Filial = {
  id: string;
  nome: string;
  cnpj: string | null;
  cep: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  gps_lat: number | null;
  gps_lon: number | null;
  raio_metros: number | null;
  ativo: boolean;
};

const emptyForm = {
  nome: "",
  cnpj: "",
  cep: "",
  endereco: "",
  cidade: "",
  uf: "",
  gps_lat: "",
  gps_lon: "",
  raio_metros: "150",
};

export default function PontoFiliais() {
  const { empresaId } = usePontoEmpresa();
  const [items, setItems] = useState<Filial[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Filial | null>(null);
  const [deleting, setDeleting] = useState<Filial | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loadingCep, setLoadingCep] = useState(false);
  const [locating, setLocating] = useState(false);

  const load = async () => {
    if (!empresaId) return;
    const { data } = await supabase
      .from("ponto_filiais").select("*").eq("empresa_id", empresaId).order("nome");
    setItems((data as any) || []);
  };
  useEffect(() => { load(); }, [empresaId]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (x: Filial) => {
    setEditing(x);
    setForm({
      nome: x.nome,
      cnpj: maskCNPJ(x.cnpj ?? ""),
      cep: maskCEP(x.cep ?? ""),
      endereco: x.endereco ?? "",
      cidade: x.cidade ?? "",
      uf: x.uf ?? "",
      gps_lat: x.gps_lat?.toString() ?? "",
      gps_lon: x.gps_lon?.toString() ?? "",
      raio_metros: x.raio_metros?.toString() ?? "150",
    });
    setOpen(true);
  };

  const onCepBlur = async () => {
    const clean = form.cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setLoadingCep(true);
    const data = await fetchCep(clean);
    setLoadingCep(false);
    if (!data) return toast.error("CEP não encontrado");
    setForm((f) => ({
      ...f,
      endereco: [data.logradouro, data.bairro].filter(Boolean).join(", ") || f.endereco,
      uf: data.uf || f.uf,
      cidade: data.localidade || f.cidade,
    }));
  };

  const locateMe = () => {
    if (!navigator.geolocation) return toast.error("Geolocalização indisponível");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          gps_lat: pos.coords.latitude.toFixed(6),
          gps_lon: pos.coords.longitude.toFixed(6),
        }));
        toast.success("Posição capturada");
        setLocating(false);
      },
      (err) => { toast.error(err.message); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const save = async () => {
    if (!empresaId) return toast.error("Selecione uma empresa");
    if (!form.nome.trim()) return toast.error("Nome obrigatório");
    if (form.cnpj && !validateCNPJ(form.cnpj)) return toast.error("CNPJ inválido");
    if (form.cep && !validateCEP(form.cep)) return toast.error("CEP inválido");
    const lat = form.gps_lat ? parseFloat(form.gps_lat) : null;
    const lon = form.gps_lon ? parseFloat(form.gps_lon) : null;
    if (lat !== null && (isNaN(lat) || lat < -90 || lat > 90)) return toast.error("Latitude inválida");
    if (lon !== null && (isNaN(lon) || lon < -180 || lon > 180)) return toast.error("Longitude inválida");
    const raio = form.raio_metros ? parseInt(form.raio_metros) : null;
    if (raio !== null && (isNaN(raio) || raio < 10 || raio > 5000)) return toast.error("Raio inválido (10-5000m)");

    const payload = {
      empresa_id: empresaId,
      nome: form.nome.trim(),
      cnpj: form.cnpj.replace(/\D/g, "") || null,
      cep: form.cep.replace(/\D/g, "") || null,
      endereco: form.endereco.trim() || null,
      cidade: form.cidade || null,
      uf: form.uf || null,
      gps_lat: lat,
      gps_lon: lon,
      raio_metros: raio,
    };

    const { error } = editing
      ? await supabase.from("ponto_filiais").update(payload).eq("id", editing.id)
      : await supabase.from("ponto_filiais").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    setOpen(false);
    load();
  };

  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("ponto_filiais").delete().eq("id", deleting.id);
    if (error) return toast.error(error.message);
    toast.success("Excluído"); setDeleting(null); load();
  };

  const cnpjInvalid = !!form.cnpj && !validateCNPJ(form.cnpj);
  const cepInvalid = !!form.cep && !validateCEP(form.cep);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Filiais</h2>
          <p className="text-sm text-muted-foreground">Unidades / centros de custo da empresa</p>
        </div>
        <Button onClick={openCreate} disabled={!empresaId} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Nova filial
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Building className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {empresaId ? "Nenhuma filial cadastrada." : "Cadastre uma empresa primeiro."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((x) => (
            <Card key={x.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{x.nome}</h3>
                    {x.cnpj && (
                      <p className="truncate text-xs text-muted-foreground">{maskCNPJ(x.cnpj)}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(x)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleting(x)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {(x.cidade || x.uf) && (
                  <p className="text-xs text-muted-foreground">
                    {x.cidade}{x.uf ? ` / ${x.uf}` : ""}
                  </p>
                )}
                {x.gps_lat && x.gps_lon && (
                  <p className="text-xs">
                    <MapPin className="mr-1 inline h-3 w-3" />
                    {x.gps_lat.toFixed(4)}, {x.gps_lon.toFixed(4)}
                    {x.raio_metros ? ` • ${x.raio_metros}m` : ""}
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
            <DialogTitle>{editing ? "Editar filial" : "Nova filial"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>CNPJ</Label>
              <MaskedInput
                mask={maskCNPJ}
                value={form.cnpj}
                onValueChange={(v) => setForm({ ...form, cnpj: v })}
                invalid={cnpjInvalid}
                placeholder="00.000.000/0000-00"
              />
              {cnpjInvalid && <p className="mt-1 text-xs text-destructive">CNPJ inválido</p>}
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
              {cepInvalid && <p className="mt-1 text-xs text-destructive">CEP inválido</p>}
            </div>
            <div className="sm:col-span-4">
              <Label>Endereço</Label>
              <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>UF</Label>
              <UfSelect value={form.uf} onChange={(v) => setForm({ ...form, uf: v, cidade: "" })} />
            </div>
            <div className="sm:col-span-4">
              <Label>Cidade</Label>
              <CidadeSelect uf={form.uf} value={form.cidade} onChange={(v) => setForm({ ...form, cidade: v })} />
            </div>

            <div className="sm:col-span-6 mt-2 flex items-center justify-between">
              <Label className="text-sm font-medium">Cerca virtual (geofence)</Label>
              <Button type="button" size="sm" variant="outline" onClick={locateMe} disabled={locating}>
                {locating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                Usar minha localização
              </Button>
            </div>
            <div className="sm:col-span-2">
              <Label>Latitude</Label>
              <Input
                type="number"
                step="0.000001"
                value={form.gps_lat}
                onChange={(e) => setForm({ ...form, gps_lat: e.target.value })}
                placeholder="-23.550520"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Longitude</Label>
              <Input
                type="number"
                step="0.000001"
                value={form.gps_lon}
                onChange={(e) => setForm({ ...form, gps_lon: e.target.value })}
                placeholder="-46.633308"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Raio (m)</Label>
              <Input
                type="number"
                min={10}
                max={5000}
                value={form.raio_metros}
                onChange={(e) => setForm({ ...form, raio_metros: e.target.value })}
              />
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
        title="Excluir filial"
      />
    </div>
  );
}
