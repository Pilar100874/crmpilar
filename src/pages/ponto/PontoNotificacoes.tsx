import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
const supabase = supabaseTyped as any;
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Zap, BarChart3, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Link } from "react-router-dom";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

const EVENTOS = [
  { key: "atraso", label: "Atrasos" },
  { key: "falta", label: "Faltas" },
  { key: "he_pendente", label: "Hora extra pendente" },
  { key: "atestado_pendente", label: "Atestado pendente" },
  { key: "bh_expirar", label: "Banco de horas expirando" },
  { key: "fraude", label: "Alerta de fraude" },
];

export default function PontoNotificacoes() {
  const nav = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [nome, setNome] = useState("");
  const [evento, setEvento] = useState("falta");
  const [toDelete, setToDelete] = useState<any>(null);

  async function load() {
    setLoading(true);
    const est = await getEstabelecimentoId();
    const { data } = await supabase.from("ponto_notif_workflows")
      .select("*").eq("estabelecimento_id", est).order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function criar() {
    if (!nome.trim()) { toast.error("Informe um nome"); return; }
    const est = await getEstabelecimentoId();
    const startNodeId = crypto.randomUUID();
    const flow_data = {
      nodes: [
        {
          id: startNodeId, type: "custom", position: { x: 250, y: 80 },
          data: { type: "trigger", label: `Gatilho: ${EVENTOS.find(e => e.key === evento)?.label}`, config: { evento_gatilho: evento } },
        },
      ],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
    const { data, error } = await supabase.from("ponto_notif_workflows")
      .insert({ estabelecimento_id: est, nome, evento_gatilho: evento, flow_data, ativo: true })
      .select().single();
    if (error) { toast.error(error.message); return; }
    setOpenNew(false); setNome("");
    nav(`/ponto/notificacoes/${data.id}`);
  }

  async function toggleAtivo(row: any) {
    await supabase.from("ponto_notif_workflows").update({ ativo: !row.ativo }).eq("id", row.id);
    load();
  }

  async function remover() {
    if (!toDelete) return;
    await supabase.from("ponto_notif_workflows").delete().eq("id", toDelete.id);
    setToDelete(null); load();
    toast.success("Workflow removido");
  }

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Zap className="w-6 h-6 text-primary" /> Workflows de Notificação — Ponto</h1>
          <p className="text-sm text-muted-foreground">Cada workflow reage a um evento específico (falta, atraso, fraude, HE...) e envia por Push/WhatsApp/SMS/E-mail com condições e escalonamento.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/ponto/notificacoes/entregabilidade"><BarChart3 className="w-4 h-4 mr-2" /> Entregabilidade</Link>
          </Button>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Novo workflow</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo workflow de notificação</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nome</Label>
                  <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Avisar líder sobre faltas" />
                </div>
                <div>
                  <Label>Evento que dispara</Label>
                  <Select value={evento} onValueChange={setEvento}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EVENTOS.map(e => <SelectItem key={e.key} value={e.key}>{e.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
                <Button onClick={criar}>Criar e abrir builder</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          Nenhum workflow criado. Clique em <b>Novo workflow</b> para começar.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map(r => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{r.nome}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{EVENTOS.find(e => e.key === r.evento_gatilho)?.label || r.evento_gatilho}</Badge>
                    <Badge variant={r.ativo ? "default" : "outline"}>{r.ativo ? "Ativo" : "Inativo"}</Badge>
                    <span className="text-xs text-muted-foreground">{(r.flow_data?.nodes?.length || 0)} blocos</span>
                  </div>
                </div>
                <Switch checked={r.ativo} onCheckedChange={() => toggleAtivo(r)} />
              </CardHeader>
              <CardContent className="flex items-center gap-2 pt-2">
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/ponto/notificacoes/${r.id}`}><Pencil className="w-4 h-4 mr-1" /> Editar workflow</Link>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setToDelete(r)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
                <div className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" /> atualizado {new Date(r.updated_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DeleteConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        onConfirm={remover}
        itemName={toDelete?.nome || ""}
      />
    </div>
  );
}
