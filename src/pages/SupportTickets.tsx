import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LifeBuoy, Trash2, Loader2, Send, Building2, User, Lock, RotateCcw, CheckCircle2 } from "lucide-react";
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
  created_at: string;
  closed_at: string | null;
  last_admin_message_at: string | null;
  last_user_message_at: string | null;
  auto_close_after_days: number;
  usuario_id: string | null;
  estabelecimento_id: string | null;
  usuarios?: { nome: string | null; email: string | null } | null;
  estabelecimentos?: { nome: string | null } | null;
}

interface Msg {
  id: string;
  ticket_id: string;
  autor_tipo: string;
  autor_nome: string | null;
  mensagem: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  aberto: "bg-blue-500",
  em_andamento: "bg-yellow-500",
  resolvido: "bg-green-500",
  fechado: "bg-gray-500",
};

const STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  resolvido: "Resolvido",
  fechado: "Fechado",
};

export default function SupportTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [msgs, setMsgs] = useState<Record<string, Msg[]>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ativos");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reply, setReply] = useState<Record<string, string>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    // Aplica auto-fechamento por inatividade
    try { await (supabase.rpc as any)("auto_close_support_tickets"); } catch {}

    const { data, error } = await supabase
      .from("support_tickets")
      .select("*, usuarios:usuario_id(nome,email), estabelecimentos:estabelecimento_id(nome)")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setTickets((data as any) || []);
    setLoading(false);
  };

  const loadMsgs = async (ticketId: string) => {
    const { data } = await supabase
      .from("support_ticket_mensagens")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setMsgs((p) => ({ ...p, [ticketId]: (data as any) || [] }));
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "fechado") patch.closed_at = new Date().toISOString();
    if (status !== "fechado") patch.closed_at = null;
    const { error } = await supabase.from("support_tickets").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    load();
  };

  const sendReply = async (t: Ticket) => {
    const text = (reply[t.id] || "").trim();
    if (!text) return;
    const { data: userRes } = await supabase.auth.getUser();
    const authId = userRes.user?.id;
    let nome = "Administrador";
    let usuarioId: string | null = null;
    if (authId) {
      const { data: u } = await supabase.from("usuarios").select("id,nome").eq("auth_user_id", authId).maybeSingle();
      if (u) { usuarioId = u.id; nome = u.nome || nome; }
    }
    const { error } = await supabase.from("support_ticket_mensagens").insert({
      ticket_id: t.id,
      autor_tipo: "admin",
      autor_usuario_id: usuarioId,
      autor_nome: nome,
      mensagem: text,
    });
    if (error) return toast.error(error.message);
    setReply((p) => ({ ...p, [t.id]: "" }));
    await loadMsgs(t.id);
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

  const filtered = tickets.filter((t) => {
    if (filter === "todos") return true;
    if (filter === "ativos") return t.status !== "fechado";
    return t.status === filter;
  });

  return (
    <div className="container max-w-5xl py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LifeBuoy className="h-6 w-6" /> Tickets de Suporte
        </h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ativos">Ativos</SelectItem>
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

      {filtered.map((t) => {
        const isOpen = openId === t.id;
        const isClosed = t.status === "fechado";
        return (
          <Card key={t.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{t.titulo || "Sem título"}</h3>
                    <Badge variant="outline">{t.prioridade}</Badge>
                    <Badge className={STATUS_COLORS[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{t.usuarios?.nome || "—"}{t.usuarios?.email ? ` (${t.usuarios.email})` : ""}</span>
                    <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{t.estabelecimentos?.nome || "—"}</span>
                    <span>{new Date(t.created_at).toLocaleString("pt-BR")}</span>
                    <span>Tela: <code>{t.tela || "—"}</code></span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              {t.descricao && <div className="text-sm whitespace-pre-wrap bg-muted/40 p-2 rounded">{t.descricao}</div>}
              {t.observacao && <div className="text-sm"><strong>Observação:</strong> {t.observacao}</div>}
              {(() => {
                const anexos: any[] = Array.isArray((t as any).anexos) ? (t as any).anexos : [];
                const videoAnexos = anexos.filter((a) => (a?.type || "").startsWith("video/") || /\.webm($|\?)/i.test(a?.url || ""));
                const docAnexos = anexos.filter((a) => !videoAnexos.includes(a));
                const allVideos = [
                  ...(t.video_url ? [{ name: "Gravação 1.webm", url: t.video_url }] : []),
                  ...videoAnexos.map((a, i) => ({ name: a.name || `Gravação ${i + 2}.webm`, url: a.url })),
                ];
                return (
                  <>
                    {allVideos.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {allVideos.map((v, i) => (
                          <div key={i} className="rounded-lg border bg-card overflow-hidden flex flex-col">
                            <div className="px-2 py-1 text-xs font-medium border-b bg-muted/40">{v.name}</div>
                            <video src={v.url} controls className="w-full aspect-video object-contain bg-black" />
                          </div>
                        ))}
                      </div>
                    )}
                    {docAnexos.length > 0 && (
                      <div className="space-y-1">
                        {docAnexos.map((a, i) => (
                          <a key={i} href={a.url} target="_blank" rel="noreferrer" className="text-xs underline block truncate">
                            📎 {a.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => { setOpenId(isOpen ? null : t.id); if (!isOpen) loadMsgs(t.id); }}>
                  {isOpen ? "Ocultar conversa" : "Abrir conversa"}
                </Button>
                {!isClosed && (
                  <>
                    <Select value={t.status} onValueChange={(v) => updateStatus(t.id, v)}>
                      <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aberto">Aberto</SelectItem>
                        <SelectItem value="em_andamento">Em andamento</SelectItem>
                        <SelectItem value="resolvido">Resolvido</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="secondary" onClick={() => updateStatus(t.id, "fechado")}>
                      <Lock className="h-3 w-3 mr-1" /> Fechar
                    </Button>
                  </>
                )}
                {isClosed && (
                  <Button size="sm" variant="default" onClick={() => updateStatus(t.id, "em_andamento")}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Reabrir
                  </Button>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  Auto-fecha após {t.auto_close_after_days}d sem retorno do usuário
                </span>
              </div>

              {isOpen && (
                <div className="border rounded-lg p-3 space-y-3 bg-background">
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {(msgs[t.id] || []).length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-4">Nenhuma mensagem ainda.</div>
                    )}
                    {(msgs[t.id] || []).map((m) => (
                      <div key={m.id} className={`flex ${m.autor_tipo === "admin" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.autor_tipo === "admin" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <div className="text-[10px] opacity-70 mb-0.5">{m.autor_nome || (m.autor_tipo === "admin" ? "Admin" : "Usuário")} · {new Date(m.created_at).toLocaleString("pt-BR")}</div>
                          <div className="whitespace-pre-wrap">{m.mensagem}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {!isClosed ? (
                    <div className="flex gap-2">
                      <Textarea
                        value={reply[t.id] || ""}
                        onChange={(e) => setReply((p) => ({ ...p, [t.id]: e.target.value }))}
                        rows={2}
                        placeholder="Responder ao usuário..."
                        className="flex-1"
                      />
                      <Button onClick={() => sendReply(t)} disabled={!reply[t.id]?.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Ticket fechado. Reabra para responder.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

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
