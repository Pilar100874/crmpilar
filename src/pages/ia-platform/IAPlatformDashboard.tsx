import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { db, useEstabelecimento } from "@/lib/aip/db";
import { Link } from "react-router-dom";
import {
  Bot,
  PlayCircle,
  Coins,
  DollarSign,
  Boxes,
  Workflow,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface Metricas {
  agentes: number;
  execucoesHoje: number;
  tokens: number;
  custo: number;
  recursos: number;
  workflows: number;
  emAndamento: number;
  aprovacoesPendentes: number;
  errosRecentes: any[];
}

const CARDS = [
  { key: "agentes", label: "Agentes", icon: Bot, to: "agentes" },
  { key: "execucoesHoje", label: "Execuções hoje", icon: PlayCircle, to: "execucoes" },
  { key: "tokens", label: "Tokens utilizados", icon: Coins, to: "historico" },
  { key: "custo", label: "Custos", icon: DollarSign, to: "historico", moeda: true },
  { key: "recursos", label: "Recursos cadastrados", icon: Boxes, to: "recursos" },
  { key: "workflows", label: "Workflows", icon: Workflow, to: "workflows" },
  { key: "emAndamento", label: "Execuções em andamento", icon: Loader2, to: "execucoes" },
  { key: "aprovacoesPendentes", label: "Aprovações pendentes", icon: CheckCircle2, to: "aprovacoes" },
] as const;

export default function IAPlatformDashboard() {
  const estabelecimentoId = useEstabelecimento();
  const [m, setM] = useState<Metricas | null>(null);

  useEffect(() => {
    if (!estabelecimentoId) return;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const isoHoje = hoje.toISOString();

    const count = async (table: string, filtros: Record<string, unknown> = {}, gte?: [string, string]) => {
      let q = db.from(table).select("id", { count: "exact", head: true }).eq("estabelecimento_id", estabelecimentoId);
      Object.entries(filtros).forEach(([k, v]) => (q = q.eq(k, v)));
      if (gte) q = q.gte(gte[0], gte[1]);
      const { count: c } = await q;
      return c ?? 0;
    };

    (async () => {
      const [agentes, execucoesHoje, workflows, emAndamento, aprovacoesPendentes] = await Promise.all([
        count("aip_agents", { ativo: true }),
        count("aip_executions", {}, ["created_at", isoHoje]),
        count("aip_workflows", { ativo: true }),
        count("aip_executions", { status: "executando" }),
        count("aip_approvals", { status: "pendente" }),
      ]);

      const { data: uso } = await db
        .from("aip_executions")
        .select("tokens_input, tokens_output, custo")
        .eq("estabelecimento_id", estabelecimentoId)
        .gte("created_at", isoHoje);

      const { count: recursos } = await db
        .from("aip_resources")
        .select("id", { count: "exact", head: true })
        .eq("estabelecimento_id", estabelecimentoId);

      const { data: erros } = await db
        .from("aip_executions")
        .select("id, erro, created_at, origem")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("status", "erro")
        .order("created_at", { ascending: false })
        .limit(5);

      setM({
        agentes,
        execucoesHoje,
        tokens: (uso ?? []).reduce((s: number, r: any) => s + (r.tokens_input ?? 0) + (r.tokens_output ?? 0), 0),
        custo: (uso ?? []).reduce((s: number, r: any) => s + Number(r.custo ?? 0), 0),
        recursos: recursos ?? 0,
        workflows,
        emAndamento,
        aprovacoesPendentes,
        errosRecentes: erros ?? [],
      });
    })();
  }, [estabelecimentoId]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {CARDS.map((c) => (
          <Link key={c.key} to={c.to}>
            <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <c.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground">{c.label}</p>
                  {m ? (
                    <p className="text-xl font-semibold">
                      {"moeda" in c && c.moeda
                        ? (m[c.key as keyof Metricas] as number).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })
                        : (m[c.key as keyof Metricas] as number).toLocaleString("pt-BR")}
                    </p>
                  ) : (
                    <Skeleton className="h-6 w-16" />
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Erros recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!m ? (
            <Skeleton className="h-16 w-full" />
          ) : m.errosRecentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum erro registrado.</p>
          ) : (
            <ul className="space-y-2">
              {m.errosRecentes.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{e.erro ?? "Erro desconhecido"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <Badge variant="destructive">{e.origem}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
