import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Check, Trash2, RefreshCw, Search, MessageCircleQuestion } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface KbLacunasCRUDProps {
  estabelecimentoId: string;
}

interface Lacuna {
  id: string;
  agent_id: string | null;
  agent_nome: string | null;
  pergunta: string;
  motivo: string;
  resposta_sugerida: string | null;
  resposta_editada: string | null;
  status: string;
  created_at: string;
}

interface AgentInfo {
  id: string;
  nome: string;
  knowledge_base_type: string | null;
}

export default function KbLacunasCRUD({ estabelecimentoId }: KbLacunasCRUDProps) {
  const [lacunas, setLacunas] = useState<Lacuna[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pendente");
  const [agentFilter, setAgentFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");

  // Dialog de revisão / aprovação
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lacuna | null>(null);
  const [respostaTexto, setRespostaTexto] = useState("");
  const [tituloKb, setTituloKb] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, [estabelecimentoId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [{ data: lacs }, { data: ags }] = await Promise.all([
        supabase
          .from("kb_lacunas")
          .select("*")
          .eq("estabelecimento_id", estabelecimentoId)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("chat_agents")
          .select("id, nome, knowledge_base_type")
          .eq("estabelecimento_id", estabelecimentoId),
      ]);
      setLacunas((lacs as Lacuna[]) || []);
      setAgents((ags as AgentInfo[]) || []);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar lacunas");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return lacunas.filter((l) => {
      if (statusFilter !== "todos" && l.status !== statusFilter) return false;
      if (agentFilter !== "todos" && l.agent_id !== agentFilter) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        if (
          !l.pergunta.toLowerCase().includes(s) &&
          !(l.agent_nome || "").toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
  }, [lacunas, statusFilter, agentFilter, search]);

  const openReview = (l: Lacuna) => {
    setEditing(l);
    setRespostaTexto(l.resposta_editada || l.resposta_sugerida || "");
    setTituloKb(l.pergunta.slice(0, 120));
    setOpen(true);
  };

  const generateSuggestion = async () => {
    if (!editing) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("kb-lacuna-suggest", {
        body: { lacuna_id: editing.id },
      });
      if (error) throw error;
      const sugestao = (data as any)?.resposta_sugerida || "";
      setRespostaTexto(sugestao);
      setLacunas((prev) =>
        prev.map((l) => (l.id === editing.id ? { ...l, resposta_sugerida: sugestao } : l))
      );
      toast.success("Resposta sugerida gerada pela IA");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Falha ao gerar resposta com IA");
    } finally {
      setGenerating(false);
    }
  };

  const approveAndAdd = async () => {
    if (!editing) return;
    if (!respostaTexto.trim()) {
      toast.error("Escreva ou gere a resposta antes de aprovar");
      return;
    }
    if (!editing.agent_id) {
      toast.error("Lacuna sem agente associado");
      return;
    }
    setSaving(true);
    try {
      // Buscar usuario_id atual
      const { data: authData } = await supabase.auth.getUser();
      let usuarioId: string | null = null;
      if (authData?.user?.id) {
        const { data: u } = await supabase
          .from("usuarios")
          .select("id")
          .eq("auth_user_id", authData.user.id)
          .maybeSingle();
        usuarioId = u?.id || null;
      }

      // Buscar dominio do agente
      const { data: agentRow } = await supabase
        .from("chat_agents")
        .select("dominio")
        .eq("id", editing.agent_id)
        .maybeSingle();

      const conteudoFinal = `Pergunta: ${editing.pergunta}\n\nResposta: ${respostaTexto.trim()}`;

      const { data: kbInserted, error: kbErr } = await supabase
        .from("agent_knowledge_bases")
        .insert({
          estabelecimento_id: estabelecimentoId,
          dominio: (agentRow as any)?.dominio || "geral",
          titulo: tituloKb.trim() || editing.pergunta.slice(0, 120),
          conteudo: conteudoFinal,
          tipo: "qa",
          ativo: true,
        })
        .select("id")
        .single();

      if (kbErr) throw kbErr;

      const { error: updErr } = await supabase
        .from("kb_lacunas")
        .update({
          resposta_editada: respostaTexto.trim(),
          status: "aprovada",
          kb_id_criada: (kbInserted as any).id,
          aprovada_por: usuarioId,
          aprovada_em: new Date().toISOString(),
        })
        .eq("id", editing.id);

      if (updErr) throw updErr;

      toast.success("Resposta adicionada à base de conhecimento");
      setOpen(false);
      setEditing(null);
      await loadAll();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao aprovar lacuna");
    } finally {
      setSaving(false);
    }
  };

  const ignoreLacuna = async (l: Lacuna) => {
    if (!confirm("Marcar esta pergunta como ignorada?")) return;
    const { error } = await supabase
      .from("kb_lacunas")
      .update({ status: "ignorada" })
      .eq("id", l.id);
    if (error) {
      toast.error("Erro ao atualizar");
      return;
    }
    toast.success("Lacuna ignorada");
    loadAll();
  };

  const deleteLacuna = async (l: Lacuna) => {
    if (!confirm("Remover esta lacuna definitivamente?")) return;
    const { error } = await supabase.from("kb_lacunas").delete().eq("id", l.id);
    if (error) {
      toast.error("Erro ao remover");
      return;
    }
    toast.success("Removida");
    loadAll();
  };

  const statusBadge = (s: string) => {
    if (s === "pendente") return <Badge variant="secondary">Pendente</Badge>;
    if (s === "aprovada") return <Badge className="bg-primary text-primary-foreground">Aprovada</Badge>;
    return <Badge variant="outline">Ignorada</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pergunta ou agente..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="aprovada">Aprovadas</SelectItem>
            <SelectItem value="ignorada">Ignoradas</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os agentes</SelectItem>
            {agents.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={loadAll} title="Atualizar">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[35%]">Pergunta</TableHead>
              <TableHead>Agente</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  <MessageCircleQuestion className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  Nenhuma lacuna encontrada com os filtros atuais.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="align-top">
                    <div className="line-clamp-3 text-sm">{l.pergunta}</div>
                  </TableCell>
                  <TableCell className="align-top text-sm">{l.agent_nome || "-"}</TableCell>
                  <TableCell className="align-top text-xs">
                    <Badge variant="outline">{l.motivo === "fallback" ? "Sem resposta" : l.motivo}</Badge>
                  </TableCell>
                  <TableCell className="align-top">{statusBadge(l.status)}</TableCell>
                  <TableCell className="align-top text-xs text-muted-foreground">
                    {format(new Date(l.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <div className="flex justify-end gap-1">
                      {l.status === "pendente" && (
                        <Button size="sm" variant="default" onClick={() => openReview(l)}>
                          <Sparkles className="h-3.5 w-3.5 mr-1" />
                          Revisar
                        </Button>
                      )}
                      {l.status === "pendente" && (
                        <Button size="sm" variant="ghost" onClick={() => ignoreLacuna(l)} title="Ignorar">
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => deleteLacuna(l)} title="Remover">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revisar e adicionar à base</DialogTitle>
            <DialogDescription>
              Gere uma sugestão com IA, edite o conteúdo e aprove para incluir na base de
              conhecimento do agente.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Pergunta original</Label>
                <div className="rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap">
                  {editing.pergunta}
                </div>
              </div>

              <div>
                <Label htmlFor="kb-titulo">Título na base</Label>
                <Input
                  id="kb-titulo"
                  value={tituloKb}
                  onChange={(e) => setTituloKb(e.target.value)}
                  placeholder="Ex: Sugestão de papel para interfolha"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="resposta">Resposta</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={generateSuggestion}
                    disabled={generating}
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    {generating ? "Gerando..." : "Gerar com IA"}
                  </Button>
                </div>
                <Textarea
                  id="resposta"
                  rows={8}
                  value={respostaTexto}
                  onChange={(e) => setRespostaTexto(e.target.value)}
                  placeholder="Edite a resposta que será incluída na base de conhecimento..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={approveAndAdd} disabled={saving}>
              <Check className="h-4 w-4 mr-1" />
              {saving ? "Salvando..." : "Aprovar e adicionar à base"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
