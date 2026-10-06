import { useEffect, useState } from "react";
import { format, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Clock3, Edit, History, Loader2, Mail, MessageSquare, MoreVertical, Phone, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CustomerHistoryTimeline } from "@/components/atendimento/agenda/CustomerHistoryTimeline";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { abrirChatDoContato, abrirHistoricoDoContato, novoEmailParaContato } from "@/lib/atendimento/navegacaoContato";
import { ligarPeloPabx } from "@/lib/telefonia/clickToCall";

interface SidebarTask {
  id: string;
  title: string;
  description?: string;
  date: Date;
  time?: string;
  isAllDay?: boolean;
  status: "pending" | "completed";
  userId?: string;
  userName?: string;
  contactId?: string;
  contactName?: string;
}

interface Props {
  task: SidebarTask;
  origem: string;
  usuarios: Array<{ id: string; nome: string }>;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<SidebarTask>) => Promise<boolean>;
}

interface Contact { id: string; nome: string; telefone: string | null; tel: string | null; email: string | null; empresa?: string }

export function TaskDetailsSidebar({ task, origem, usuarios, onClose, onEdit, onDelete, onUpdate }: Props) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setContact(null);
    setShowHistory(false);
    setError(false);
    setLoading(Boolean(task.contactId));
    async function load() {
      try {
        const id = await getEstabelecimentoId();
        if (cancelled) return;
        setEstabelecimentoId(id);
        if (!task.contactId || !id) return;
        const { data, error: queryError } = await supabase.from("customers")
          .select("id, nome, telefone, tel, email, customer_empresas(is_primary, empresas(nome, nome_fantasia))")
          .eq("id", task.contactId).eq("estabelecimento_id", id).maybeSingle();
        if (cancelled) return;
        if (queryError) { setError(true); return; }
        if (data) {
          const links = data.customer_empresas || [];
          const company = (links.find(link => link.is_primary) || links[0])?.empresas;
          setContact({ id: data.id, nome: data.nome, telefone: data.telefone, tel: data.tel, email: data.email, empresa: company?.nome_fantasia || company?.nome || undefined });
        }
      } catch { if (!cancelled) setError(true); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [task.contactId, task.id]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  async function update(updates: Partial<SidebarTask>) {
    setSaving(true);
    try { await onUpdate(updates); } finally { setSaving(false); }
  }
  const late = task.status === "pending" && (isBefore(task.date, startOfDay(new Date())) || (format(task.date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") && Boolean(task.time && task.time < format(new Date(), "HH:mm"))));
  const name = contact?.nome || task.contactName || "Sem contato vinculado";
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const phone = contact?.tel || contact?.telefone;
  const channels = [
    { label: "WhatsApp", Icon: MessageSquare, enabled: Boolean(contact?.telefone), tone: "bg-success text-success-foreground hover:bg-success/90", action: () => { if (contact?.telefone) { onClose(); abrirChatDoContato({ customerId: contact.id, nome: contact.nome, whatsapp: contact.telefone }); } } },
    { label: "Ligar", Icon: Phone, enabled: Boolean(phone), tone: "bg-primary text-primary-foreground hover:bg-primary/90", action: () => { if (phone) void ligarPeloPabx(phone, name); } },
    { label: "E-mail", Icon: Mail, enabled: Boolean(contact?.email), tone: "bg-info text-info-foreground hover:bg-info/90", action: () => { if (contact?.email) { onClose(); novoEmailParaContato({ customerId: contact.id, nome: contact.nome, email: contact.email }); } } },
  ];
  return (
    <aside aria-label="Detalhes da tarefa" className="absolute inset-y-0 right-0 z-30 flex w-full max-w-[360px] flex-col border-l border-border bg-background shadow-lg lg:relative lg:z-auto lg:w-[340px] lg:shrink-0 lg:shadow-none">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 px-4">
        <h2 className="text-base font-bold">Tarefa</h2>
        <div className="flex items-center gap-1">
          <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Opções da tarefa selecionada"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end"><DropdownMenuItem onClick={onEdit}><Edit className="mr-2 h-4 w-4" />Editar tarefa</DropdownMenuItem><DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Excluir tarefa</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Fechar detalhes da tarefa" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
      </header>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        <div className="space-y-2 rounded-md bg-info/5 p-3">
          <div className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-info" /><h3 className="min-w-0 flex-1 break-words text-sm font-semibold text-info">{task.title}</h3>{late && <Badge className="shrink-0 border-destructive/20 bg-destructive/10 text-destructive">Atrasado</Badge>}</div>
          <p className="flex items-start gap-2 text-xs"><Clock3 className="h-4 w-4 shrink-0 text-muted-foreground" />{format(task.date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })} · {task.time || (task.isAllDay ? "Dia todo" : "Sem horário")}</p>
        </div>
        <section>
          <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Contato</h3>{task.contactId && <Button variant="link" className="h-auto p-0 text-xs text-info" onClick={() => { onClose(); abrirHistoricoDoContato({ customerId: task.contactId, nome: name }); }}>Ver no CRM</Button>}</div>
          <div className="flex min-w-0 items-center gap-2 rounded-md border border-border p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{initials}</div>
            <div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{name}</p>{contact?.empresa && <p className="break-words text-xs text-muted-foreground">{contact.empresa}</p>}{loading && <Loader2 className="mt-1 h-3 w-3 animate-spin text-muted-foreground" />}{error && <p className="text-xs text-destructive">Não foi possível carregar o contato.</p>}</div>
          </div>
        </section>
        <section className="space-y-2">
          <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2"><span className="text-xs text-muted-foreground">Status</span><Select disabled={saving} value={task.status} onValueChange={value => void update({ status: value as SidebarTask["status"] })}><SelectTrigger className="h-8" aria-label="Status da tarefa"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pendente</SelectItem><SelectItem value="completed">Concluída</SelectItem></SelectContent></Select></div>
          <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2"><span className="text-xs text-muted-foreground">Responsável</span><Select disabled={saving} value={task.userId || "sem-responsavel"} onValueChange={value => void update({ userId: value, userName: usuarios.find(user => user.id === value)?.nome })}><SelectTrigger className="h-8" aria-label="Responsável da tarefa"><SelectValue /></SelectTrigger><SelectContent>{!task.userId && <SelectItem value="sem-responsavel" disabled>Não informado</SelectItem>}{task.userId && !usuarios.some(user => user.id === task.userId) && <SelectItem value={task.userId}>{task.userName || "Responsável atual"}</SelectItem>}{usuarios.map(user => <SelectItem key={user.id} value={user.id}>{user.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2"><span className="text-xs text-muted-foreground">Origem</span><span className="rounded-md border border-border px-3 py-1.5 text-xs">{origem}</span></div>
        </section>
        <section><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Descrição</h3><Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Editar descrição da tarefa" onClick={onEdit}><Edit className="h-3.5 w-3.5" /></Button></div><p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{task.description || "Sem descrição"}</p></section>
        <section><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Histórico</h3>{task.contactId && <Button variant="link" className="h-auto p-0 text-xs text-info" onClick={() => setShowHistory(value => !value)}>{showHistory ? "Recolher" : "Ver todos"}</Button>}</div>
          {showHistory && estabelecimentoId && task.contactId ? <CustomerHistoryTimeline contactId={task.contactId} estabelecimentoId={estabelecimentoId} /> : <Button variant="ghost" className="h-auto w-full justify-start gap-2 whitespace-normal py-2 text-xs text-muted-foreground" disabled={!task.contactId} onClick={() => setShowHistory(true)}><History className="h-4 w-4 shrink-0" />{task.contactId ? "Histórico do contato" : "Sem contato vinculado"}</Button>}
        </section>
      </div>
      <footer className="shrink-0 space-y-2 border-t border-border bg-background p-3">
        <div className="grid grid-cols-3 gap-1.5">{channels.map(({ label, Icon, enabled, tone, action }) => <Button key={label} disabled={!enabled} onClick={action} className={`h-9 gap-1 px-1 text-xs ${tone}`} title={enabled ? label : `${label}: contato sem dados cadastrados`}><Icon className="h-3.5 w-3.5 shrink-0" />{label}</Button>)}</div>
        <Button variant="outline" className="h-9 w-full gap-2 border-primary text-primary hover:bg-primary/5" onClick={onEdit}><CalendarDays className="h-4 w-4" />Reagendar</Button>
      </footer>
    </aside>
  );
}