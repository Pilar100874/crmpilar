import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, HardDrive, Trash2, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { MaskedInput } from "@/components/ui/masked-input";
import { maskIP, maskCNPJ } from "@/lib/masks";
import { validateIP } from "@/lib/validators";

const TIPOS_RELOGIO = ["REP-A", "REP-C", "REP-P"];
const ACESSOS = [
  { value: "online", label: "Comunicação online" },
  { value: "offline", label: "Coleta manual (offline)" },
  { value: "nuvem", label: "Comunicação via nuvem" },
];
const MODELOS = [
  "Control ID - (IDClass ou IDX)",
  "Control ID - REP iDFace",
  "Henry - Prisma SF",
  "Henry - Vega",
  "Topdata - Inner Rep",
  "ZKTeco - iClock",
  "Madis - MD REP",
  "Outro",
];

const FORM_INICIAL = {
  tipo_relogio: "REP-C",
  codigo: "",
  nome: "",
  cnpj_fornecedor: "",
  filial_id: "",
  acesso_dados: "online",
  modelo: "Control ID - (IDClass ou IDX)",
  marca: "",
  nome_local: "",
  data_inicio_coleta: new Date().toISOString().slice(0, 10),
  ip: "",
  porta: "80",
  usa_https: false,
  numero_fabricacao: "",
  serial: "",
  usuario: "admin",
  senha: "",
  chave_comunicacao: "0",
  emails_notificacao: "",
};

export default function PontoEquipamentos() {
  const { empresaId } = usePontoEmpresa();
  const [items, setItems] = useState<any[]>([]);
  const [filiais, setFiliais] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [f, setF] = useState({ ...FORM_INICIAL });

  const load = async () => {
    if (!empresaId) return;
    const { data } = await supabase
      .from("ponto_equipamentos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nome");
    setItems(data || []);
    const { data: fs } = await supabase
      .from("ponto_filiais")
      .select("id, nome")
      .eq("empresa_id", empresaId)
      .order("nome");
    setFiliais(fs || []);
  };
  useEffect(() => { load(); }, [empresaId]);

  const openNew = () => {
    setEditingId(null);
    setF({ ...FORM_INICIAL });
    setOpen(true);
  };

  const openEdit = (e: any) => {
    setEditingId(e.id);
    setF({
      tipo_relogio: e.tipo_relogio || "REP-C",
      codigo: e.codigo || "",
      nome: e.nome || "",
      cnpj_fornecedor: e.cnpj_fornecedor || "",
      filial_id: e.filial_id || "",
      acesso_dados: e.acesso_dados || "online",
      modelo: e.modelo || "",
      marca: e.marca || "",
      nome_local: e.nome_local || "",
      data_inicio_coleta: e.data_inicio_coleta || new Date().toISOString().slice(0, 10),
      ip: e.ip || "",
      porta: e.porta?.toString() || "4370",
      numero_fabricacao: e.numero_fabricacao || "",
      serial: e.serial || "",
      usuario: e.usuario || "",
      senha: e.senha || "",
      chave_comunicacao: e.chave_comunicacao || "",
      emails_notificacao: e.emails_notificacao || "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!empresaId) return;
    if (!f.tipo_relogio) return toast.error("Tipo de relógio obrigatório");
    if (!f.nome) return toast.error("Nome do relógio obrigatório");
    if (!f.modelo) return toast.error("Modelo obrigatório");
    if (f.acesso_dados === "online" && !f.ip) return toast.error("IP obrigatório para comunicação online");
    if (f.ip && !validateIP(f.ip)) return toast.error("IP inválido");
    const porta = parseInt(f.porta);
    if (f.porta && (isNaN(porta) || porta < 1 || porta > 65535))
      return toast.error("Porta inválida (1-65535)");

    const payload: any = {
      empresa_id: empresaId,
      tipo_relogio: f.tipo_relogio,
      codigo: f.codigo || null,
      nome: f.nome,
      cnpj_fornecedor: f.cnpj_fornecedor || null,
      filial_id: f.filial_id || null,
      acesso_dados: f.acesso_dados,
      modelo: f.modelo,
      marca: f.marca || null,
      nome_local: f.nome_local || null,
      data_inicio_coleta: f.data_inicio_coleta || null,
      ip: f.ip || null,
      porta: porta || null,
      numero_fabricacao: f.numero_fabricacao || null,
      serial: f.serial || null,
      usuario: f.usuario || null,
      senha: f.senha || null,
      chave_comunicacao: f.chave_comunicacao || null,
      emails_notificacao: f.emails_notificacao || null,
    };

    const { error } = editingId
      ? await supabase.from("ponto_equipamentos").update(payload).eq("id", editingId)
      : await supabase.from("ponto_equipamentos").insert(payload);

    if (error) return toast.error(error.message);
    toast.success(editingId ? "Equipamento atualizado" : "Equipamento criado");
    setOpen(false);
    load();
  };

  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("ponto_equipamentos").delete().eq("id", deleting.id);
    if (error) return toast.error(error.message);
    toast.success("Excluído"); setDeleting(null); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Relógios / Equipamentos</h2>
          <p className="text-sm text-muted-foreground">Relógios físicos sincronizados pelo Coletor Desktop</p>
        </div>
        <Button onClick={openNew} disabled={!empresaId} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Novo
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <HardDrive className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum equipamento cadastrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((e) => (
            <Card key={e.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {e.codigo && <Badge variant="outline">{e.codigo}</Badge>}
                      <h3 className="font-semibold">{e.nome}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {e.tipo_relogio} · {e.modelo || e.marca}
                    </p>
                  </div>
                  <Badge variant={e.status === "online" ? "default" : "secondary"}>
                    {e.status}
                  </Badge>
                </div>
                {e.nome_local && <p className="text-xs">📍 {e.nome_local}</p>}
                {e.ip && <p className="text-xs">IP: {e.ip}:{e.porta}</p>}
                {e.numero_fabricacao && (
                  <p className="text-xs text-muted-foreground">Nº fabricação: {e.numero_fabricacao}</p>
                )}
                {e.ultima_sync && (
                  <p className="text-xs text-muted-foreground">
                    Última sync: {new Date(e.ultima_sync).toLocaleString("pt-BR")}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(e)}>
                    <Pencil className="mr-1 h-4 w-4" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(e)}>
                    <Trash2 className="mr-1 h-4 w-4 text-destructive" /> Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar equipamento" : "Novo equipamento"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Tipo de relógio *</Label>
              <Select value={f.tipo_relogio} onValueChange={(v) => setF({ ...f, tipo_relogio: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_RELOGIO.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-2">
              <div>
                <Label>Código</Label>
                <Input value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })} placeholder="01" />
              </div>
              <div>
                <Label>Nome do relógio ponto *</Label>
                <Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="EMBU MATRIZ" />
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label>CNPJ/CPF do fornecedor</Label>
              <MaskedInput
                mask={maskCNPJ}
                value={f.cnpj_fornecedor}
                onValueChange={(v) => setF({ ...f, cnpj_fornecedor: v })}
                placeholder="Digite o CNPJ/CPF"
              />
            </div>

            <div>
              <Label>Unidade de negócio (Filial)</Label>
              <Select value={f.filial_id} onValueChange={(v) => setF({ ...f, filial_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {filiais.map((fi) => <SelectItem key={fi.id} value={fi.id}>{fi.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Acesso aos dados *</Label>
              <Select value={f.acesso_dados} onValueChange={(v) => setF({ ...f, acesso_dados: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACESSOS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Label>Modelo do equipamento *</Label>
              <Select value={f.modelo} onValueChange={(v) => setF({ ...f, modelo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODELOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nome do local</Label>
              <Input value={f.nome_local} onChange={(e) => setF({ ...f, nome_local: e.target.value })} placeholder="EMBU SP" />
            </div>
            <div>
              <Label>Data para início da coleta *</Label>
              <Input
                type="date"
                value={f.data_inicio_coleta}
                onChange={(e) => setF({ ...f, data_inicio_coleta: e.target.value })}
              />
            </div>

            <div>
              <Label>Endereço IP {f.acesso_dados === "online" && "*"}</Label>
              <MaskedInput
                mask={maskIP}
                value={f.ip}
                onValueChange={(v) => setF({ ...f, ip: v })}
                invalid={!!f.ip && !validateIP(f.ip)}
                placeholder="192.168.0.10"
              />
            </div>
            <div>
              <Label>Porta TCP *</Label>
              <Input
                type="number"
                min={1}
                max={65535}
                value={f.porta}
                onChange={(e) => setF({ ...f, porta: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <Label>Número de fabricação</Label>
              <Input
                value={f.numero_fabricacao}
                onChange={(e) => setF({ ...f, numero_fabricacao: e.target.value })}
                placeholder="00014003750157902"
              />
            </div>

            <div>
              <Label>Usuário *</Label>
              <Input value={f.usuario} onChange={(e) => setF({ ...f, usuario: e.target.value })} />
            </div>
            <div>
              <Label>Senha *</Label>
              <Input
                type="password"
                value={f.senha}
                onChange={(e) => setF({ ...f, senha: e.target.value })}
              />
            </div>

            <div>
              <Label>Chave de comunicação *</Label>
              <Input value={f.chave_comunicacao} onChange={(e) => setF({ ...f, chave_comunicacao: e.target.value })} />
            </div>
            <div>
              <Label>Serial</Label>
              <Input value={f.serial} onChange={(e) => setF({ ...f, serial: e.target.value })} />
            </div>

            <div className="sm:col-span-2">
              <Label>E-mail(s) para notificação *</Label>
              <Input
                value={f.emails_notificacao}
                onChange={(e) => setF({ ...f, emails_notificacao: e.target.value })}
                placeholder="email1@empresa.com, email2@empresa.com"
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
        title="Excluir equipamento"
      />
    </div>
  );
}
