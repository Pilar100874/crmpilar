import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, CheckCircle2, Circle, RefreshCw, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Passo {
  id: string;
  titulo: string;
  descricao: string;
  rota: string;
  acao: string;
  concluido: boolean;
  detalhe: string;
}

/** Conta linhas de uma tabela sem trazer dados. */
async function contar(tabela: string): Promise<number> {
  const { count } = await supabase
    .from(tabela as never)
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}

export default function WizardInicialPage() {
  const [passos, setPassos] = useState<Passo[] | null>(null);

  const carregar = async () => {
    setPassos(null);
    const [config, credenciais, agentes, skills, tools, mcps, workflows, rotinas, execucoes] =
      await Promise.all([
        contar("aip_server_config"),
        contar("aip_credenciais"),
        contar("aip_agents"),
        contar("aip_skills"),
        contar("aip_tools"),
        contar("aip_mcps"),
        contar("aip_workflows"),
        contar("aip_rotinas"),
        contar("aip_executions"),
      ]);

    setPassos([
      {
        id: "motor",
        titulo: "1. Conectar o motor de execução",
        descricao:
          "Confirme a conexão com o servidor Claude Agent SDK, que executa as tarefas (inclusive longas: vídeo, navegação).",
        rota: "/ia-platform/motor",
        acao: "Abrir motor",
        concluido: true,
        detalhe: "Configurável a qualquer momento",
      },
      {
        id: "config",
        titulo: "2. Enviar as chaves para o servidor",
        descricao:
          "Cadastre pelo CRM a chave da Anthropic e demais integrações e envie ao servidor de execução.",
        rota: "/ia-platform/config-servidor",
        acao: "Configurar servidor",
        concluido: config > 0,
        detalhe: `${config} chave(s) salva(s)`,
      },
      {
        id: "credenciais",
        titulo: "3. Cadastrar credenciais da organização",
        descricao:
          "Segredos por organização (Playwright, Remotion, Higgsfield, Claude Code) com rotação e permissões.",
        rota: "/ia-platform/credenciais",
        acao: "Abrir credenciais",
        concluido: credenciais > 0,
        detalhe: `${credenciais} credencial(is)`,
      },
      {
        id: "capacidades",
        titulo: "4. Habilitar capacidades (Skills, Tools e MCPs)",
        descricao: "O que o agente sabe fazer, quais APIs ele acessa e a quais servidores MCP conecta.",
        rota: "/ia-platform/skills",
        acao: "Abrir skills",
        concluido: skills + tools + mcps > 0,
        detalhe: `${skills} skills · ${tools} tools · ${mcps} MCPs`,
      },
      {
        id: "agentes",
        titulo: "5. Criar o primeiro agente",
        descricao: "Defina papel, instruções, modelo e as capacidades que ele pode usar.",
        rota: "/ia-platform/agentes",
        acao: "Criar agente",
        concluido: agentes > 0,
        detalhe: `${agentes} agente(s)`,
      },
      {
        id: "workflows",
        titulo: "6. Montar um workflow",
        descricao: "Encadeie agentes e etapas no builder visual, com aprovação humana onde precisar.",
        rota: "/ia-platform/workflows",
        acao: "Abrir workflows",
        concluido: workflows > 0,
        detalhe: `${workflows} workflow(s)`,
      },
      {
        id: "rotinas",
        titulo: "7. Agendar uma rotina",
        descricao: "Programe execuções por horário, com dry-run, limites de concorrência e retries.",
        rota: "/ia-platform/rotinas",
        acao: "Abrir rotinas",
        concluido: rotinas > 0,
        detalhe: `${rotinas} rotina(s)`,
      },
      {
        id: "execucoes",
        titulo: "8. Executar e acompanhar",
        descricao: "Rode no Playground, acompanhe as execuções passo a passo e veja os assets gerados.",
        rota: "/ia-platform/playground",
        acao: "Abrir playground",
        concluido: execucoes > 0,
        detalhe: `${execucoes} execução(ões)`,
      },
    ]);
  };

  useEffect(() => {
    void carregar();
  }, []);

  const concluidos = passos?.filter((p) => p.concluido).length ?? 0;
  const total = passos?.length ?? 8;
  const progresso = Math.round((concluidos / total) * 100);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/20">
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Rocket className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Wizard inicial</h2>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Siga os passos abaixo para deixar a plataforma de agentes pronta para rodar. O
                  status de cada etapa é verificado automaticamente.
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={carregar}>
              <RefreshCw className="mr-2 h-4 w-4" /> Reverificar
            </Button>
          </div>
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso da configuração</span>
              <span className="font-medium">
                {concluidos} de {total} etapas
              </span>
            </div>
            <Progress value={progresso} />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {!passos
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)
          : passos.map((passo) => (
              <Card
                key={passo.id}
                className="transition-shadow hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-2">
                    {passo.concluido ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">{passo.titulo}</CardTitle>
                      <CardDescription>{passo.descricao}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant={passo.concluido ? "secondary" : "outline"}>{passo.detalhe}</Badge>
                  <Button asChild size="sm" variant={passo.concluido ? "ghost" : "default"}>
                    <Link to={passo.rota}>
                      {passo.acao} <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Precisa de exemplos?</CardTitle>
          <CardDescription>
            O manual traz rotinas agendadas, geração de imagens e vídeos e outros casos prontos para
            copiar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/ia-platform/manual">
              Abrir manual de uso <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
