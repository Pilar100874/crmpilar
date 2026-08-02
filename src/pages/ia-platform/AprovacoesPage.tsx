import { useMemo, useState } from "react";
import { useAipTable, db } from "@/lib/aip/db";
import { AipApproval } from "@/lib/aip/types";
import { AipToolbar } from "@/components/ia-platform/AipToolbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { agentRunner } from "@/lib/aip/runner";

export default function AprovacoesPage() {
  const { items, loading, refetch } = useAipTable<AipApproval>("aip_approvals");
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<"pendente" | "todos">("pendente");
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [selecoes, setSelecoes] = useState<Record<string, string[]>>({});

  const filtrados = useMemo(
    () =>
      items
        .filter((a) => (status === "todos" ? true : a.status === "pendente"))
        .filter((a) => `${a.titulo} ${a.instrucoes ?? ""}`.toLowerCase().includes(busca.toLowerCase())),
    [items, busca, status],
  );

  const decidir = async (a: AipApproval, aprovado: boolean) => {
    const { error } = await db
      .from("aip_approvals")
      .update({
        status: aprovado ? "aprovado" : "rejeitado",
        comentario: comentarios[a.id] ?? null,
        selecionados: selecoes[a.id] ?? [],
        decidido_em: new Date().toISOString(),
      })
      .eq("id", a.id);
    if (error) return toast.error(`Erro: ${error.message}`);
    try {
      await agentRunner.resume(a.execution_id, a.id, {
        aprovado,
        selecionados: selecoes[a.id] ?? [],
        comentario: comentarios[a.id] ?? "",
      });
    } catch (e: any) {
      toast.warning(`Decisão salva, mas o servidor de execução não respondeu: ${e.message}`);
    }
    toast.success(aprovado ? "Aprovado" : "Rejeitado");
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
                {a.status !== "pendente" && a.comentario && (
                  <p className="text-xs text-muted-foreground">Comentário: {a.comentario}</p>
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
