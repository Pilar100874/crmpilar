import { useEffect, useMemo, useRef, useState } from "react";
import { useAipTable, db } from "@/lib/aip/db";
import { AipApproval } from "@/lib/aip/types";
import { AipToolbar } from "@/components/ia-platform/AipToolbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { executarWorkflow } from "@/lib/aip/execute";
import { supabase } from "@/integrations/supabase/client";

/** Identifica o usuário logado (id + nome) para registrar quem aprovou. */
async function usuarioAtual(): Promise<{ id: string | null; nome: string | null }> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return { id: null, nome: null };
  const { data: u } = await supabase
    .from("usuarios")
    .select("nome")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return { id: user.id, nome: (u as any)?.nome ?? user.email ?? null };
}

export default function AprovacoesPage() {
  const { items, loading, refetch } = useAipTable<AipApproval>("aip_approvals");
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<"pendente" | "todos">("pendente");
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [selecoes, setSelecoes] = useState<Record<string, string[]>>({});
  const [retomando, setRetomando] = useState<string | null>(null);
  const jaRetomadas = useRef<Set<string>>(new Set());

  const filtrados = useMemo(
    () =>
      items
        .filter((a) => (status === "todos" ? true : a.status === "pendente"))
        .filter((a) => `${a.titulo} ${a.instrucoes ?? ""}`.toLowerCase().includes(busca.toLowerCase())),
    [items, busca, status],
  );

  /** Retoma a execução a partir do bloco de aprovação. */
  const retomarExecucao = async (a: AipApproval, silencioso = false) => {
    setRetomando(a.id);
    try {
      await executarWorkflow(
        {
          executionId: a.execution_id,
          input: {
            aprovacao: {
              aprovado: true,
              selecionados: a.selecionados ?? [],
              comentario: a.comentario ?? "",
              aprovado_por: a.decidido_por_nome ?? null,
              aprovado_em: a.decidido_em ?? null,
            },
          },
        },
        (ev) => {
          if (ev.evento === "fim") {
            if (ev.status === "erro") toast.error(ev.erro ?? "Falha ao retomar a execução");
            else if (ev.status === "aguardando_aprovacao") toast.info("Nova aprovação pendente");
            else if (ev.status === "cancelada") toast.warning("Execução cancelada");
            else toast.success("Execução retomada e concluída");
          }
        },
      );
    } catch (e: any) {
      if (!silencioso) toast.warning(`Não foi possível retomar a execução: ${e.message}`);
    } finally {
      setRetomando(null);
      refetch();
    }
  };

  /**
   * Retomada automática: aprovações já aprovadas cuja execução continua
   * pausada (ex.: aba fechada durante a retomada) voltam a rodar sozinhas.
   */
  useEffect(() => {
    const aprovadas = items.filter((a) => a.status === "aprovado");
    if (aprovadas.length === 0) return;
    (async () => {
      const ids = [...new Set(aprovadas.map((a) => a.execution_id))];
      const { data: execs } = await db
        .from("aip_executions")
        .select("id,status")
        .in("id", ids)
        .eq("status", "aguardando_aprovacao");
      for (const ex of (execs ?? []) as any[]) {
        if (jaRetomadas.current.has(ex.id)) continue;
        jaRetomadas.current.add(ex.id);
        const alvo = aprovadas.find((a) => a.execution_id === ex.id);
        if (alvo) await retomarExecucao(alvo, true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const decidir = async (a: AipApproval, aprovado: boolean) => {
    const { id: usuarioId, nome } = await usuarioAtual();
    const agora = new Date().toISOString();
    const { error } = await db
      .from("aip_approvals")
      .update({
        status: aprovado ? "aprovado" : "rejeitado",
        comentario: comentarios[a.id] ?? null,
        selecionados: selecoes[a.id] ?? [],
        decidido_em: agora,
        decidido_por: usuarioId,
        decidido_por_nome: nome,
      })
      .eq("id", a.id);
    if (error) return toast.error(`Erro: ${error.message}`);
    if (aprovado) {
      toast.info("Retomando a execução do workflow…");
      jaRetomadas.current.add(a.execution_id);
      await retomarExecucao(
        {
          ...a,
          comentario: comentarios[a.id] ?? "",
          selecionados: selecoes[a.id] ?? [],
          decidido_por_nome: nome,
          decidido_em: agora,
        },
        false,
      );
    } else {
      await db
        .from("aip_executions")
        .update({ status: "cancelada", finalizado_em: agora, erro: `Aprovação rejeitada por ${nome ?? "usuário"}` })
        .eq("id", a.execution_id);
      toast.success("Rejeitado — execução cancelada");
    }
    refetch();
  };

  const toggleItem = (aprovacaoId: string, valor: string) => {
    const atual = selecoes[aprovacaoId] ?? [];
    setSelecoes({
      ...selecoes,
      [aprovacaoId]: atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor],
    });
  };

  return (
    <AipToolbar
      busca={busca}
      onBusca={setBusca}
      loading={loading}
      vazio={filtrados.length === 0}
      vazioTexto="Nenhuma aprovação pendente."
      acoes={
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={status === "pendente" ? "default" : "outline"}
            onClick={() => setStatus("pendente")}
          >
            Pendentes
          </Button>
          <Button size="sm" variant={status === "todos" ? "default" : "outline"} onClick={() => setStatus("todos")}>
            Todas
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 lg:grid-cols-2">
        {filtrados.map((a) => {
          const opcoes: any[] = Array.isArray(a.payload?.itens) ? a.payload.itens : [];
          return (
            <Card key={a.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <Badge
                    variant={
                      a.status === "pendente" ? "secondary" : a.status === "aprovado" ? "default" : "destructive"
                    }
                  >
                    {a.status}
                  </Badge>
                </div>
                {a.instrucoes && <p className="text-sm text-muted-foreground">{a.instrucoes}</p>}

                {a.tipo === "texto" && a.payload?.texto && (
                  <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs">
                    {String(a.payload.texto)}
                  </pre>
                )}

                {opcoes.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {opcoes.map((item: any, i: number) => {
                      const url = typeof item === "string" ? item : item.url;
                      const marcado = (selecoes[a.id] ?? []).includes(url);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleItem(a.id, url)}
                          className={`overflow-hidden rounded-lg border-2 transition-all ${
                            marcado ? "border-primary" : "border-border"
                          }`}
                        >
                          {a.tipo === "video" ? (
                            <video src={url} className="h-24 w-full object-cover" muted />
                          ) : (
                            <img src={url} alt={`Opção ${i + 1}`} className="h-24 w-full object-cover" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {a.status === "pendente" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs">Comentário</Label>
                      <Textarea
                        rows={2}
                        value={comentarios[a.id] ?? ""}
                        onChange={(e) => setComentarios({ ...comentarios, [a.id]: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => decidir(a, true)}>
                        <CheckCircle2 className="mr-1 h-4 w-4" /> Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => decidir(a, false)}
                      >
                        <XCircle className="mr-1 h-4 w-4 text-destructive" /> Rejeitar
                      </Button>
                    </div>
                  </>
                )}
                {a.status !== "pendente" && (
                  <div className="space-y-1 rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">
                    <p>
                      {a.status === "aprovado" ? "Aprovado" : "Rejeitado"} por{" "}
                      <span className="font-medium text-foreground">{a.decidido_por_nome ?? "usuário"}</span>
                      {a.decidido_em && ` em ${new Date(a.decidido_em).toLocaleString("pt-BR")}`}
                    </p>
                    {a.comentario && <p>Comentário: {a.comentario}</p>}
                    {a.status === "aprovado" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-1 h-7"
                        disabled={retomando === a.id}
                        onClick={() => retomarExecucao(a)}
                      >
                        <PlayCircle className="mr-1 h-3.5 w-3.5" />
                        {retomando === a.id ? "Retomando…" : "Retomar execução"}
                      </Button>
                    )}
                  </div>
                )}
                {a.status === "pendente" && opcoes.length > 0 && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox
                      checked={(selecoes[a.id] ?? []).length === opcoes.length}
                      onCheckedChange={(v) =>
                        setSelecoes({
                          ...selecoes,
                          [a.id]: v
                            ? opcoes.map((i: any) => (typeof i === "string" ? i : i.url))
                            : [],
                        })
                      }
                    />
                    Selecionar todos
                  </label>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AipToolbar>
  );
}
