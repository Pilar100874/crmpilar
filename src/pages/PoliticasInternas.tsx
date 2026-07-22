import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  BookOpen,
  Search,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Link2,
  Paperclip,
  Send,
  Loader2,
  ShieldCheck,
  X,
  FolderPlus,
} from "lucide-react";
import { toast } from "sonner";

type Category = { id: string; name: string; ordem: number };
type Policy = {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  category_id: string | null;
  responsible: string | null;
  keywords: string[];
  status: "ativa" | "inativa";
  ordem: number;
  updated_at: string;
  policy_categories?: { name: string } | null;
};
type Attachment = {
  id: string;
  policy_id: string;
  file_name: string;
  file_url: string;
  mime_type: string | null;
};
type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    policy_id: string;
    title: string;
    category: string | null;
    updated_at: string;
    responsible: string | null;
    snippet: string;
    index: number;
  }>;
};

const SUGGESTED = [
  "Posso trabalhar de casa?",
  "Como funciona o reembolso de viagens?",
  "Qual é a regra para criação de senhas?",
  "Como denunciar uma situação de assédio?",
  "O que preciso fazer para solicitar férias?",
];

export default function PoliticasInternas() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [readingPolicy, setReadingPolicy] = useState<Policy | null>(null);

  // Admin
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Policy> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  // Chat IA
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { data: role } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", u.user.id)
          .eq("role", "admin")
          .maybeSingle();
        setIsAdmin(!!role);
      }
      await loadAll();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, asking]);

  async function loadAll() {
    const [{ data: cats }, { data: pols }, { data: atts }] = await Promise.all([
      supabase.from("policy_categories").select("*").order("ordem"),
      supabase
        .from("policies")
        .select("*, policy_categories(name)")
        .order("ordem")
        .order("title"),
      supabase.from("policy_attachments").select("*"),
    ]);
    setCategories((cats as Category[]) ?? []);
    setPolicies((pols as Policy[]) ?? []);
    setAttachments((atts as Attachment[]) ?? []);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return policies
      .filter((p) => (isAdmin ? true : p.status === "ativa"))
      .filter((p) => (categoryFilter === "all" ? true : p.category_id === categoryFilter))
      .filter((p) => {
        if (!q) return true;
        return (
          p.title.toLowerCase().includes(q) ||
          (p.summary || "").toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          (p.keywords || []).some((k) => k.toLowerCase().includes(q)) ||
          (p.policy_categories?.name || "").toLowerCase().includes(q)
        );
      });
  }, [policies, search, categoryFilter, isAdmin]);

  async function askAI(text?: string) {
    const q = (text ?? question).trim();
    if (!q || asking) return;
    setMessages((m) => [...m, { role: "user", content: q }]);
    setQuestion("");
    setAsking(true);
    try {
      const { data, error } = await supabase.functions.invoke("policies-ai-ask", {
        body: { question: q },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.answer, sources: data.sources ?? [] },
      ]);
    } catch (e: any) {
      toast.error(e.message || "Erro ao consultar a IA");
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Não foi possível consultar as políticas agora. Tente novamente.",
        },
      ]);
    } finally {
      setAsking(false);
    }
  }

  function copyLink(policyId: string) {
    const url = `${window.location.origin}/politicas-internas?id=${policyId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  }

  // ---------- Admin actions ----------
  function openNew() {
    setEditing({
      title: "",
      summary: "",
      content: "",
      category_id: categories[0]?.id ?? null,
      responsible: "",
      keywords: [],
      status: "ativa",
      ordem: policies.length,
    });
    setEditorOpen(true);
  }
  function openEdit(p: Policy) {
    setEditing({ ...p });
    setEditorOpen(true);
  }

  async function savePolicy() {
    if (!editing?.title) {
      toast.error("Título é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: editing.title,
        summary: editing.summary ?? "",
        content: editing.content ?? "",
        category_id: editing.category_id ?? null,
        responsible: editing.responsible ?? "",
        keywords: editing.keywords ?? [],
        status: (editing.status as "ativa" | "inativa") ?? "ativa",
        ordem: editing.ordem ?? 0,
      };
      let policyId = editing.id as string | undefined;
      if (policyId) {
        const { error } = await supabase.from("policies").update(payload).eq("id", policyId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("policies")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        policyId = data.id;
      }
      // Reindex embeddings
      supabase.functions
        .invoke("policies-embed", { body: { policyId } })
        .catch((e) => console.warn("embed falhou", e));

      toast.success("Política salva");
      setEditorOpen(false);
      setEditing(null);
      await loadAll();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deletingId) return;
    try {
      const { error } = await supabase.from("policies").delete().eq("id", deletingId);
      if (error) throw error;
      toast.success("Política excluída");
      setDeletingId(null);
      await loadAll();
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir");
    }
  }

  async function toggleStatus(p: Policy) {
    const next = p.status === "ativa" ? "inativa" : "ativa";
    const { error } = await supabase.from("policies").update({ status: next }).eq("id", p.id);
    if (error) return toast.error(error.message);
    supabase.functions
      .invoke("policies-embed", { body: { policyId: p.id } })
      .catch(() => {});
    await loadAll();
  }

  async function uploadAttachment(policyId: string, file: File) {
    const path = `${policyId}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage
      .from("policy-attachments")
      .upload(path, file, { upsert: false });
    if (upErr) return toast.error(upErr.message);
    const { data: signed } = await supabase.storage
      .from("policy-attachments")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    const url = signed?.signedUrl ?? path;
    const { error } = await supabase.from("policy_attachments").insert({
      policy_id: policyId,
      file_name: file.name,
      file_url: url,
      mime_type: file.type,
      file_size: file.size,
    });
    if (error) return toast.error(error.message);
    toast.success("Anexo enviado");
    await loadAll();
  }

  async function removeAttachment(a: Attachment) {
    const { error } = await supabase.from("policy_attachments").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    await loadAll();
  }

  async function addCategory() {
    if (!newCatName.trim()) return;
    const { error } = await supabase
      .from("policy_categories")
      .insert({ name: newCatName.trim(), ordem: categories.length });
    if (error) return toast.error(error.message);
    setNewCatName("");
    await loadAll();
  }
  async function removeCategory(id: string) {
    const inUse = policies.some((p) => p.category_id === id);
    if (inUse) return toast.error("Categoria em uso por políticas");
    const { error } = await supabase.from("policy_categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await loadAll();
  }

  const editingAttachments = editing?.id
    ? attachments.filter((a) => a.policy_id === editing.id)
    : [];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow">
            <BookOpen className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Políticas Internas</h1>
            <p className="text-sm text-muted-foreground">
              Consulte, pesquise e pergunte sobre as políticas da empresa.
            </p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="w-3 h-3" /> Administrador
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const active = policies.filter((p) => p.status === "ativa");
                toast.info(`Reindexando ${active.length} políticas...`);
                let ok = 0;
                for (const p of active) {
                  try {
                    await supabase.functions.invoke("policies-embed", {
                      body: { policyId: p.id },
                    });
                    ok++;
                  } catch (e) {
                    console.warn("embed erro", p.id, e);
                  }
                }
                toast.success(`Reindexação concluída (${ok}/${active.length})`);
              }}
            >
              <Sparkles className="w-4 h-4 mr-1" /> Reindexar IA
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCatManagerOpen(true)}>
              <FolderPlus className="w-4 h-4 mr-1" /> Categorias
            </Button>
            <Button size="sm" onClick={openNew}>
              <Plus className="w-4 h-4 mr-1" /> Nova política
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="consultar" className="w-full">
        <TabsList>
          <TabsTrigger value="consultar">
            <Search className="w-4 h-4 mr-1" /> Consultar
          </TabsTrigger>
          <TabsTrigger value="ia">
            <Sparkles className="w-4 h-4 mr-1" /> Pergunte à IA
          </TabsTrigger>
        </TabsList>

        {/* ===================== CONSULTAR ===================== */}
        <TabsContent value="consultar" className="space-y-4">
          <Card className="p-3 flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por título, categoria, palavra-chave..."
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="md:w-64">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>

          {filtered.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              Nenhuma política encontrada.
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <Card
                  key={p.id}
                  className="p-4 hover:shadow-md transition cursor-pointer flex flex-col gap-2 min-h-[180px] overflow-hidden"
                  onClick={() => setReadingPolicy(p)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight line-clamp-2 break-words">
                      {p.title}
                    </h3>
                    {p.status === "inativa" && (
                      <Badge variant="secondary" className="shrink-0">
                        Inativa
                      </Badge>
                    )}
                  </div>
                  {p.policy_categories?.name && (
                    <Badge variant="outline" className="w-fit max-w-full truncate">
                      {p.policy_categories.name}
                    </Badge>
                  )}
                  {p.summary && (
                    <p className="text-sm text-muted-foreground line-clamp-3 break-words">
                      {p.summary}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground mt-auto">
                    Atualizada em {new Date(p.updated_at).toLocaleDateString("pt-BR")}
                  </div>
                  {isAdmin && (
                    <div
                      className="flex flex-wrap gap-1 pt-2 border-t"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                        <Pencil className="w-3 h-3 mr-1" /> Editar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleStatus(p)}>
                        {p.status === "ativa" ? "Desativar" : "Ativar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive ml-auto"
                        onClick={() => setDeletingId(p.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>

          )}
        </TabsContent>

        {/* ===================== IA ===================== */}
        <TabsContent value="ia" className="space-y-3">
          <Card className="p-4 flex flex-col h-[65vh]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Pergunte sobre as políticas</h3>
              </div>
              {messages.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setMessages([])}>
                  <X className="w-3 h-3 mr-1" /> Limpar
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {messages.length === 0 && (
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Faça uma pergunta em português. Sugestões:</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED.map((s) => (
                      <Button
                        key={s}
                        variant="outline"
                        size="sm"
                        onClick={() => askAI(s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-border/40 space-y-2">
                        <div className="text-xs font-semibold opacity-80">Fontes:</div>
                        {m.sources.map((s) => (
                          <div
                            key={s.policy_id}
                            className="text-xs bg-background rounded p-2 border"
                          >
                            <div className="font-medium">
                              [Fonte {s.index}] {s.title}
                            </div>
                            <div className="text-muted-foreground">
                              {s.category ?? "Sem categoria"} · Atualizada em{" "}
                              {new Date(s.updated_at).toLocaleDateString("pt-BR")}
                            </div>
                            <div className="mt-1 italic line-clamp-2">"{s.snippet}"</div>
                            <Button
                              size="sm"
                              variant="link"
                              className="h-auto p-0 mt-1"
                              onClick={() => {
                                const pol = policies.find((p) => p.id === s.policy_id);
                                if (pol) setReadingPolicy(pol);
                              }}
                            >
                              Abrir política completa →
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {asking && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Consultando políticas...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="flex gap-2 pt-3 border-t mt-3">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !asking && askAI()}
                placeholder="Faça uma pergunta sobre as políticas..."
                disabled={asking}
              />
              <Button onClick={() => askAI()} disabled={asking || !question.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ==================== LEITURA ==================== */}
      <Dialog open={!!readingPolicy} onOpenChange={(o) => !o && setReadingPolicy(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {readingPolicy && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <DialogTitle className="text-xl">{readingPolicy.title}</DialogTitle>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
                      {readingPolicy.policy_categories?.name && (
                        <Badge variant="outline">{readingPolicy.policy_categories.name}</Badge>
                      )}
                      {readingPolicy.responsible && (
                        <span className="text-muted-foreground">
                          Responsável: {readingPolicy.responsible}
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        Atualizada em{" "}
                        {new Date(readingPolicy.updated_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyLink(readingPolicy.id)}
                  >
                    <Link2 className="w-3 h-3 mr-1" /> Copiar link
                  </Button>
                </div>
              </DialogHeader>
              {readingPolicy.summary && (
                <p className="text-sm text-muted-foreground border-l-2 border-primary pl-3 italic">
                  {readingPolicy.summary}
                </p>
              )}
              <div
                className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap"
                dangerouslySetInnerHTML={{
                  __html: readingPolicy.content
                    .replace(/</g, "&lt;")
                    .replace(/\n/g, "<br/>"),
                }}
              />
              {attachments.filter((a) => a.policy_id === readingPolicy.id).length > 0 && (
                <div className="border-t pt-3 space-y-2">
                  <div className="text-sm font-semibold">Anexos</div>
                  {attachments
                    .filter((a) => a.policy_id === readingPolicy.id)
                    .map((a) => (
                      <a
                        key={a.id}
                        href={a.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Paperclip className="w-3 h-3" /> {a.file_name}
                      </a>
                    ))}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== EDITOR ADMIN ==================== */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
            <DialogTitle>
              {editing?.id ? "Editar política" : "Nova política"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">

          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Título *</Label>
                <Input
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Categoria</Label>
                  <Select
                    value={editing.category_id ?? ""}
                    onValueChange={(v) => setEditing({ ...editing, category_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Responsável</Label>
                  <Input
                    value={editing.responsible ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, responsible: e.target.value })
                    }
                    placeholder="Ex: RH, Compliance..."
                  />
                </div>
              </div>
              <div>
                <Label>Resumo</Label>
                <Textarea
                  rows={2}
                  value={editing.summary ?? ""}
                  onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
                />
              </div>
              <div>
                <Label>Conteúdo completo *</Label>
                <Textarea
                  rows={14}
                  value={editing.content ?? ""}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  placeholder="Escreva a política. Formatação simples: use quebras de linha, listas com - ou 1., **negrito** etc."
                />
              </div>
              <div>
                <Label>Palavras-chave (separadas por vírgula)</Label>
                <Input
                  value={(editing.keywords ?? []).join(", ")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      keywords: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={(editing.status ?? "ativa") === "ativa"}
                  onCheckedChange={(v) =>
                    setEditing({ ...editing, status: v ? "ativa" : "inativa" })
                  }
                />
                <Label>Política ativa</Label>
              </div>

              {editing.id && (
                <div className="border-t pt-3 space-y-2">
                  <Label>Anexos</Label>
                  <input
                    type="file"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && editing.id) uploadAttachment(editing.id, f);
                      e.target.value = "";
                    }}
                  />
                  {editingAttachments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between text-sm border rounded p-2"
                    >
                      <a
                        href={a.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <Paperclip className="w-3 h-3" /> {a.file_name}
                      </a>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => removeAttachment(a)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          </div>
          <DialogFooter className="px-6 py-3 border-t shrink-0 bg-background">
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={savePolicy} disabled={saving}>
              {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* ==================== CATEGORIAS ==================== */}
      <Dialog open={catManagerOpen} onOpenChange={setCatManagerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar categorias</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Nome da nova categoria"
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
            />
            <Button onClick={addCategory}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2 border rounded"
              >
                <span className="text-sm">{c.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => removeCategory(c.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
        onConfirm={confirmDelete}
        title="Excluir política"
        description="Esta ação não pode ser desfeita. Os anexos e a indexação de IA também serão removidos."
      />
    </div>
  );
}
