import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LifeBuoy, Trash2, Loader2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

interface Ticket {
  id: string;
  tipo: string;
  tela: string | null;
  titulo: string | null;
  descricao: string | null;
  observacao: string | null;
  video_url: string | null;
  status: string;
  prioridade: string;
  resposta_admin: string | null;
  created_at: string;
  usuario_id: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  aberto: "bg-blue-500",
  em_andamento: "bg-yellow-500",
  resolvido: "bg-green-500",
  fechado: "bg-gray-500",
};

export default function SupportTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("todos");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setTickets((data as Ticket[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("support_tickets").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    load();
  };

  const saveResposta = async (id: string) => {
    const { error } = await supabase
      .from("support_tickets")
      .update({ resposta_admin: editing[id] || null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Resposta salva");
    load();
  };

  const doDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("support_tickets").delete().eq("id", deleteId);
    if (error) return toast.error(error.message);
    toast.success("Ticket excluído");
    setDeleteId(null);
    load();
  };

  const filtered = filter === "todos" ? tickets : tickets.filter(t => t.status === filter);

  return (
    <div className="container max-w-5xl py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LifeBuoy className="h-6 w-6" /> Tickets de Suporte
        </h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="aberto">Abertos</SelectItem>
            <SelectItem value="em_andamento">Em andamento</SelectItem>
            <SelectItem value="resolvido">Resolvidos</SelectItem>
            <SelectItem value="fechado">Fechados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>}
      {!loading && filtered.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum ticket encontrado.</CardContent></Card>
      )}

      {filtered.map(t => (
        <Card key={t.id}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base">{t.titulo || "Sem título"}</CardTitle>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(t.created_at).toLocaleString("pt-BR")} · Tela: <code>{t.tela || "—"}</code>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{t.prioridade}</Badge>
              <Badge className={STATUS_COLORS[t.status]}>{t.status}</Badge>
              <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {t.descricao && <div className="text-sm whitespace-pre-wrap">{t.descricao}</div>}
            {t.observacao && (
              <div className="text-sm bg-muted p-2 rounded">
                <strong>Observação:</strong> {t.observacao}
              </div>
            )}
            {t.video_url && (
              <video src={t.video_url} controls className="w-full max-h-96 rounded-lg border" />
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Select value={t.status} onValueChange={(v) => updateStatus(t.id, v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Textarea
                placeholder="Resposta do administrador..."
                defaultValue={t.resposta_admin || ""}
                onChange={(e) => setEditing(p => ({ ...p, [t.id]: e.target.value }))}
                rows={2}
              />
              <Button size="sm" className="mt-2" onClick={() => saveResposta(t.id)}>
                Salvar resposta
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        onConfirm={doDelete}
        title="Excluir ticket?"
        description="Esta ação não pode ser desfeita."
      />
    </div>
  );
}
