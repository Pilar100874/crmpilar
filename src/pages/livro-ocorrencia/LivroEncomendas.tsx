import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { Plus, Pencil, Trash2, Search, Package, PackageCheck } from "lucide-react";

interface Encomenda {
  id: string;
  numero: number;
  data_recebimento: string;
  transportadora: string | null;
  codigo_rastreio: string | null;
  tipo_encomenda: string | null;
  remetente: string | null;
  destinatario: string;
  unidade: string | null;
  descricao: string | null;
  quantidade_volumes: number | null;
  peso: number | null;
  recebido_por: string | null;
  status: string;
  data_entrega: string | null;
  retirado_por: string | null;
  documento_retirada: string | null;
  observacoes: string | null;
}

const TRANSPORTADORAS = ["Correios", "Sedex", "Jadlog", "Loggi", "Total Express", "Mercado Envios", "Amazon", "Uber Flash", "Motoboy", "Retirada Pessoal", "Outra"];
const TIPOS = ["Envelope/Carta", "Caixa Pequena", "Caixa Média", "Caixa Grande", "Sacola", "Documentos", "Alimento/Delivery", "Móvel", "Outro"];
const STATUSES = [
  { v: "aguardando_retirada", label: "Aguardando Retirada", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  { v: "entregue", label: "Entregue", cls: "bg-green-500/10 text-green-600 border-green-500/30" },
  { v: "devolvido", label: "Devolvido", cls: "bg-red-500/10 text-red-600 border-red-500/30" },
];

const empty: any = {
  data_recebimento: new Date().toISOString().slice(0, 16),
  transportadora: "Correios",
  tipo_encomenda: "Caixa Pequena",
  quantidade_volumes: 1,
  status: "aguardando_retirada",
  destinatario: "",
};

export default function LivroEncomendas() {
  const [items, setItems] = useState<Encomenda[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deliverTarget, setDeliverTarget] = useState<Encomenda | null>(null);
  const [deliverData, setDeliverData] = useState({ retirado_por: "", documento_retirada: "", observacoes: "" });
  const [params, setParams] = useSearchParams();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("livro_encomendas" as any).select("*").order("data_recebimento", { ascending: false });
    if (error) toast.error("Erro ao carregar encomendas");
    else setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (params.get("new") === "1") { openNew(); params.delete("new"); setParams(params, { replace: true }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const openNew = () => { setEditing({ ...empty }); setDialogOpen(true); };
  const openEdit = (o: Encomenda) => {
    setEditing({ ...o, data_recebimento: new Date(o.data_recebimento).toISOString().slice(0, 16) });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!editing?.destinatario) { toast.error("Informe o destinatário"); return; }
    const payload: any = {
      ...editing,
      data_recebimento: editing.data_recebimento ? new Date(editing.data_recebimento).toISOString() : new Date().toISOString(),
      quantidade_volumes: Number(editing.quantidade_volumes) || 1,
      peso: editing.peso ? Number(editing.peso) : null,
    };
    delete payload.numero;
    const { error } = editing.id
      ? await supabase.from("livro_encomendas" as any).update(payload).eq("id", editing.id)
      : await supabase.from("livro_encomendas" as any).insert(payload);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Encomenda salva");
    setDialogOpen(false);
    load();
  };

  const remove = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from("livro_encomendas" as any).delete().eq("id", deletingId);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Excluída"); load(); }
    setDeletingId(null);
  };

  const confirmDeliver = async () => {
    if (!deliverTarget) return;
    if (!deliverData.retirado_por) { toast.error("Informe quem retirou"); return; }
    const { error } = await supabase.from("livro_encomendas" as any).update({
      status: "entregue",
      data_entrega: new Date().toISOString(),
      retirado_por: deliverData.retirado_por,
      documento_retirada: deliverData.documento_retirada || null,
      observacoes: deliverData.observacoes || deliverTarget.observacoes,
    }).eq("id", deliverTarget.id);
    if (error) toast.error("Erro ao registrar entrega");
    else { toast.success("Entrega registrada"); load(); }
    setDeliverTarget(null);
    setDeliverData({ retirado_por: "", documento_retirada: "", observacoes: "" });
  };

  const filtered = items.filter((o) => {
    if (statusFilter !== "todas" && o.status !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return [o.destinatario, o.remetente, o.transportadora, o.codigo_rastreio, o.unidade, String(o.numero)]
      .some((f) => (f || "").toLowerCase().includes(s));
  });

  const statusBadge = (v: string) => {
    const s = STATUSES.find((x) => x.v === v) || STATUSES[0];
    return <Badge variant="outline" className={s.cls}>{s.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Encomendas / Correios</h2>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nova Encomenda</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por destinatário, rastreio, transportadora..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos status</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela (md+) */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº</TableHead>
              <TableHead>Recebido em</TableHead>
              <TableHead className="hidden lg:table-cell">Transportadora</TableHead>
              <TableHead className="hidden xl:table-cell">Rastreio</TableHead>
              <TableHead>Destinatário</TableHead>
              <TableHead className="hidden lg:table-cell">Unidade</TableHead>
              <TableHead className="hidden xl:table-cell">Vol.</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Entrega</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Nenhuma encomenda encontrada</TableCell></TableRow>
            ) : filtered.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono">#{o.numero}</TableCell>
                <TableCell className="whitespace-nowrap">{new Date(o.data_recebimento).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="hidden lg:table-cell">{o.transportadora || "-"}</TableCell>
                <TableCell className="hidden xl:table-cell font-mono text-xs">{o.codigo_rastreio || "-"}</TableCell>
                <TableCell className="font-medium">{o.destinatario}</TableCell>
                <TableCell className="hidden lg:table-cell">{o.unidade || "-"}</TableCell>
                <TableCell className="hidden xl:table-cell">{o.quantidade_volumes || 1}</TableCell>
                <TableCell>{statusBadge(o.status)}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  {o.data_entrega ? (
                    <div className="text-xs">
                      <div>{new Date(o.data_entrega).toLocaleString("pt-BR")}</div>
                      <div className="text-muted-foreground">p/ {o.retirado_por}</div>
                    </div>
                  ) : "-"}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {o.status === "aguardando_retirada" && (
                    <Button variant="ghost" size="icon" title="Registrar entrega" onClick={() => setDeliverTarget(o)}>
                      <PackageCheck className="h-4 w-4 text-green-600" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => openEdit(o)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeletingId(o.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Cards (mobile) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">Nenhuma encomenda encontrada</div>
        ) : filtered.map((o) => (
          <div key={o.id} className="border rounded-lg p-3 bg-card space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm text-muted-foreground">#{o.numero}</span>
                  {statusBadge(o.status)}
                </div>
                <div className="mt-1 font-medium truncate">{o.destinatario}</div>
                <div className="text-xs text-muted-foreground">{new Date(o.data_recebimento).toLocaleString("pt-BR")}</div>
              </div>
              <div className="flex shrink-0">
                {o.status === "aguardando_retirada" && (
                  <Button variant="ghost" size="icon" title="Registrar entrega" onClick={() => setDeliverTarget(o)}>
                    <PackageCheck className="h-4 w-4 text-green-600" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => openEdit(o)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setDeletingId(o.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground grid grid-cols-1 gap-0.5">
              {o.transportadora && <div><span className="font-medium text-foreground/70">Transp.:</span> {o.transportadora} · {o.quantidade_volumes || 1} vol.</div>}
              {o.codigo_rastreio && <div className="font-mono truncate"><span className="font-sans font-medium text-foreground/70">Rastreio:</span> {o.codigo_rastreio}</div>}
              {o.unidade && <div><span className="font-medium text-foreground/70">Unidade:</span> {o.unidade}</div>}
              {o.data_entrega && (
                <div><span className="font-medium text-foreground/70">Entregue:</span> {new Date(o.data_entrega).toLocaleString("pt-BR")} p/ {o.retirado_por}</div>
              )}
            </div>
          </div>
        ))}
      </div>


      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? `Editar Encomenda #${editing.numero}` : "Nova Encomenda"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Data/Hora do Recebimento *</Label>
                <Input type="datetime-local" value={editing.data_recebimento} onChange={(e) => setEditing({ ...editing, data_recebimento: e.target.value })} />
              </div>
              <div>
                <Label>Transportadora</Label>
                <Select value={editing.transportadora || ""} onValueChange={(v) => setEditing({ ...editing, transportadora: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TRANSPORTADORAS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Código de Rastreio</Label>
                <Input value={editing.codigo_rastreio || ""} onChange={(e) => setEditing({ ...editing, codigo_rastreio: e.target.value })} placeholder="Ex: BR123456789BR" />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={editing.tipo_encomenda || ""} onValueChange={(v) => setEditing({ ...editing, tipo_encomenda: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Remetente</Label>
                <Input value={editing.remetente || ""} onChange={(e) => setEditing({ ...editing, remetente: e.target.value })} />
              </div>
              <div>
                <Label>Destinatário *</Label>
                <Input value={editing.destinatario || ""} onChange={(e) => setEditing({ ...editing, destinatario: e.target.value })} />
              </div>
              <div>
                <Label>Unidade / Apto / Sala</Label>
                <Input value={editing.unidade || ""} onChange={(e) => setEditing({ ...editing, unidade: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Volumes</Label>
                  <Input type="number" min={1} value={editing.quantidade_volumes || 1} onChange={(e) => setEditing({ ...editing, quantidade_volumes: e.target.value })} />
                </div>
                <div>
                  <Label>Peso (kg)</Label>
                  <Input type="number" step="0.1" value={editing.peso || ""} onChange={(e) => setEditing({ ...editing, peso: e.target.value })} />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label>Descrição / Conteúdo</Label>
                <Textarea rows={2} value={editing.descricao || ""} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} />
              </div>
              <div>
                <Label>Recebido por (Porteiro)</Label>
                <Input value={editing.recebido_por || ""} onChange={(e) => setEditing({ ...editing, recebido_por: e.target.value })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Observações</Label>
                <Textarea rows={2} value={editing.observacoes || ""} onChange={(e) => setEditing({ ...editing, observacoes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de entrega */}
      <Dialog open={!!deliverTarget} onOpenChange={(o) => !o && setDeliverTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Entrega - #{deliverTarget?.numero}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-md text-sm">
              <div><strong>Destinatário:</strong> {deliverTarget?.destinatario}</div>
              {deliverTarget?.unidade && <div><strong>Unidade:</strong> {deliverTarget.unidade}</div>}
              {deliverTarget?.codigo_rastreio && <div><strong>Rastreio:</strong> {deliverTarget.codigo_rastreio}</div>}
            </div>
            <div>
              <Label>Retirado por *</Label>
              <Input value={deliverData.retirado_por} onChange={(e) => setDeliverData({ ...deliverData, retirado_por: e.target.value })} placeholder="Nome completo de quem retirou" />
            </div>
            <div>
              <Label>Documento (RG / CPF)</Label>
              <Input value={deliverData.documento_retirada} onChange={(e) => setDeliverData({ ...deliverData, documento_retirada: e.target.value })} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea rows={2} value={deliverData.observacoes} onChange={(e) => setDeliverData({ ...deliverData, observacoes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliverTarget(null)}>Cancelar</Button>
            <Button onClick={confirmDeliver} className="gap-2"><PackageCheck className="h-4 w-4" /> Confirmar Entrega</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
        onConfirm={remove}
        itemName="esta encomenda"
      />
    </div>
  );
}
