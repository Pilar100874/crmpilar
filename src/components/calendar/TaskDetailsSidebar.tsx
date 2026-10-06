import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { format, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Clock3, Loader2, MoreVertical, Trash2, X, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { abrirHistoricoDoContato } from "@/lib/atendimento/navegacaoContato";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

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
  editor?: ReactNode;
  creating?: boolean;
  /** Altura da barra fixa do topo (título + datas): o painel abre abaixo dela, sem sobrepor. */
  topOffset?: number;
  onUpdate: (updates: Partial<SidebarTask>) => Promise<boolean>;
}

interface Contact { id: string; nome: string; telefone: string | null; tel: string | null; email: string | null; empresa?: string }

/** Painel lateral fixo da tarefa, ancorado à direita como a aba de detalhes do cliente. */
export function TaskDetailsSidebar({ task, onClose, onEdit, onDelete, onUpdate, editor, creating, topOffset = 0 }: Props) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setContact(null);
    setError(false);
    setLoading(Boolean(task.contactId));
    async function load() {
      try {
        const id = await getEstabelecimentoId();
        if (cancelled) return;
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
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function update(updates: Partial<SidebarTask>) {
    setSaving(true);
    try { await onUpdate(updates); } finally { setSaving(false); }
  }
  const late = task.status === "pending" && (isBefore(task.date, startOfDay(new Date())) || (format(task.date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") && Boolean(task.time && task.time < format(new Date(), "HH:mm"))));
  const name = contact?.nome || task.contactName || "Sem contato vinculado";
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();

  return (
    <aside className="flex h-full w-full shrink-0 flex-col overflow-hidden border-l border-border bg-card sm:w-80 md:w-64 lg:w-[400px]">
      <div className="flex items-center gap-3 border-b border-border/60 bg-gradient-to-r from-orange-50 to-transparent px-4 py-3 dark:from-orange-950/20">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
          <CalendarDays className="h-4.5 w-4.5 text-orange-600 dark:text-orange-400" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">{creating ? "Nova Tarefa" : "Editar Tarefa"}</p>
          <p className="text-xs text-muted-foreground">
            {format(task.date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })} · {task.time || (task.isAllDay ? "Dia todo" : "Sem horário")}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {!creating && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Opções da tarefa selecionada"><MoreVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}><Edit className="mr-2 h-4 w-4" />Editar tarefa</DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Excluir tarefa</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose} aria-label="Fechar painel da tarefa"><X className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {!creating && <div className="space-y-2 rounded-md bg-info/5 p-3">
          <div className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-info" /><h3 className="min-w-0 flex-1 break-words text-sm font-semibold text-info">{task.title}</h3>{late && <Badge className="shrink-0 border-destructive/20 bg-destructive/10 text-destructive">Atrasado</Badge>}</div>
          <p className="flex items-start gap-2 text-xs"><Clock3 className="h-4 w-4 shrink-0 text-muted-foreground" />{format(task.date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })} · {task.time || (task.isAllDay ? "Dia todo" : "Sem horário")}</p>
        </div>}
        {editor}
        {!editor && <section>
          <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Contato</h3>{task.contactId && <Button variant="link" className="h-auto p-0 text-xs text-info" onClick={() => { onClose(); abrirHistoricoDoContato({ customerId: task.contactId, nome: name }); }}>Ver no CRM</Button>}</div>
          <div className="flex min-w-0 items-center gap-2 rounded-md border border-border p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{initials}</div>
            <div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{name}</p>{contact?.empresa && <p className="break-words text-xs text-muted-foreground">{contact.empresa}</p>}{loading && <Loader2 className="mt-1 h-3 w-3 animate-spin text-muted-foreground" />}{error && <p className="text-xs text-destructive">Não foi possível carregar o contato.</p>}</div>
          </div>
        </section>}
        {!creating && <section className="space-y-2">
          <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2"><span className="text-xs text-muted-foreground">Status</span><Select disabled={saving} value={task.status} onValueChange={value => void update({ status: value as SidebarTask["status"] })}><SelectTrigger className="h-8" aria-label="Status da tarefa"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pendente</SelectItem><SelectItem value="completed">Concluída</SelectItem></SelectContent></Select></div>
        </section>}
      </div>
    </aside>,
    document.body
  );
}
