import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Building2,
  Cpu,
  ShieldCheck,
  Users,
  Download,
  FileDown,
  Bell,
  Upload,
  PartyPopper,
  ExternalLink,
  Briefcase,
  Network,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { setWizardActive } from "./WizardBackBar";

type Step = {
  id: string;
  title: string;
  description: string;
  icon: any;
  url?: string;
  ctaLabel: string;
  whyItMatters: string;
  checklist: string[];
  check?: (ctx: CheckCtx) => Promise<boolean>;
  optional?: boolean;
};

type CheckCtx = {
  empresaId: string | null;
};

const STEPS: Step[] = [
  {
    id: "empresas",
    title: "Empresa (Matriz)",
    description: "Cadastre o CNPJ, razão social e endereço da empresa principal.",
    icon: Building2,
    url: "/ponto/empresas",
    ctaLabel: "Abrir cadastro de empresas",
    whyItMatters:
      "Toda jornada de ponto começa pela empresa. Os funcionários, equipamentos e exportações são vinculados a ela.",
    checklist: [
      "Cadastrar CNPJ, razão social e endereço",
      "Informar Inscrição Estadual (se aplicável)",
      "Definir código Domínio para exportação de folha",
    ],
    check: async ({ empresaId }) => {
      if (!empresaId) return false;
      const { count } = await supabase
        .from("ponto_empresas")
        .select("id", { count: "exact", head: true });
      return (count ?? 0) > 0;
    },
  },
  {
    id: "filiais",
    title: "Filiais da Empresa",
    description: "Cadastre as filiais (unidades) vinculadas à empresa. Pule este passo se a empresa não possui filiais.",
    icon: Building2,
    url: "/ponto/filiais",
    ctaLabel: "Abrir cadastro de filiais",
    whyItMatters:
      "Se a empresa tem mais de uma unidade, cadastre cada uma como filial. Empresas com apenas um endereço podem pular este passo — os funcionários e equipamentos ficam vinculados diretamente à empresa.",
    checklist: [
      "Selecionar a empresa no topo da tela",
      "Criar filiais adicionais (se houver)",
      "Informar endereço, GPS e raio para geofence",
    ],
    optional: true,
    check: async ({ empresaId }) => {
      if (!empresaId) return false;
      const { count } = await supabase
        .from("ponto_filiais")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", empresaId);
      return (count ?? 0) > 0;
    },
  },
  {
    id: "departamentos",
    title: "Departamentos",
    description: "Cadastre setores e centros de custo. Compartilhados entre matriz e filiais.",
    icon: Network,
    url: "/ponto/departamentos",
    ctaLabel: "Abrir departamentos",
    whyItMatters:
      "Departamentos são compartilhados entre a empresa e todas as filiais. Organize por setor (RH, Financeiro, Operacional) e use para relatórios por centro de custo.",
    checklist: [
      "Criar departamentos (RH, Financeiro, Operacional, etc.)",
      "Informar centro de custo (opcional)",
      "Vincular a uma filial apenas se for específico dela",
    ],
    optional: true,
    check: async ({ empresaId }) => {
      const filtro = empresaId
        ? `empresa_id.eq.${empresaId},global.eq.true`
        : "global.eq.true";
      const { count } = await supabase
        .from("ponto_departamentos")
        .select("id", { count: "exact", head: true })
        .or(filtro);
      return (count ?? 0) > 0;
    },

  },

  {
    id: "cargos",
    title: "Cargos",
    description: "Cadastre as posições funcionais. Compartilhados entre matriz e filiais.",
    icon: Briefcase,
    url: "/ponto/cargos",
    ctaLabel: "Abrir cargos",
    whyItMatters:
      "Cargos são compartilhados entre a empresa e todas as filiais. Padronizam vínculos dos funcionários e alimentam eSocial e folha.",
    checklist: [
      "Criar cargos com nome e CBO",
      "Informar salário base (opcional)",
      "Manter inativos os que não estão em uso",
    ],

    optional: true,
    check: async ({ empresaId }) => {
      const filtro = empresaId
        ? `empresa_id.eq.${empresaId},global.eq.true`
        : "global.eq.true";
      const { count } = await supabase
        .from("ponto_cargos")
        .select("id", { count: "exact", head: true })
        .or(filtro);
      return (count ?? 0) > 0;
    },

  },
  {
    id: "equipes",
    title: "Equipes",
    description: "Agrupe funcionários em equipes. Podem misturar pessoas da matriz e filiais.",
    icon: Users,
    url: "/ponto/equipes",
    ctaLabel: "Abrir equipes",
    whyItMatters:
      "Equipes são compartilhadas entre a empresa e todas as filiais — uma equipe pode ter membros de unidades diferentes. Facilitam escalas, mapa de equipes e visões por líder.",
    checklist: [
      "Criar equipes (com cor para identificação)",
      "Definir líder responsável",
      "Adicionar membros à equipe (de qualquer filial)",
    ],

    optional: true,
    check: async ({ empresaId }) => {
      const filtro = empresaId
        ? `empresa_id.eq.${empresaId},global.eq.true`
        : "global.eq.true";
      const { count } = await supabase
        .from("ponto_equipes")
        .select("id", { count: "exact", head: true })
        .or(filtro);
      return (count ?? 0) > 0;
    },

  },
  {
    id: "equipamentos",
    title: "Equipamentos e Relógios",
    description: "Cadastre os relógios Control iD ou marque como ponto via app.",
    icon: Cpu,
    url: "/ponto/equipamentos",
    ctaLabel: "Configurar equipamentos",
    whyItMatters:
      "Os equipamentos são a fonte dos registros. Sem eles, o sistema só aceita registros via app.",
    checklist: [
      "Cadastrar relógios físicos (IP e modelo)",
      "Ou habilitar apenas ponto via app",
      "Vincular cada equipamento à filial correta",
    ],
    optional: true,
  },
  {
    id: "antifraude",
    title: "Antifraude (Geofence e Rede)",
    description: "Defina raio de localização e redes WiFi autorizadas.",
    icon: ShieldCheck,
    url: "/ponto/antifraude",
    ctaLabel: "Configurar antifraude",
    whyItMatters:
      "Bloqueia batidas fora do local de trabalho. Essencial para registro via app.",
    checklist: [
      "Definir coordenada e raio de cada filial",
      "Listar redes WiFi confiáveis (opcional)",
      "Ativar validação por foto/biometria",
    ],
    optional: true,
  },
  {
    id: "escalas",
    title: "Escalas / Jornadas",
    description: "Defina as jornadas de trabalho (5x2, 6x1, 12x36) antes de cadastrar funcionários.",
    icon: CalendarClock,
    url: "/ponto/escalas",
    ctaLabel: "Abrir escalas",
    whyItMatters:
      "Toda funcionário precisa estar vinculado a uma escala. Sem ela não é possível calcular horas trabalhadas, banco de horas ou extras.",
    checklist: [
      "Cadastrar a(s) escala(s) padrão da empresa",
      "Configurar horários por dia da semana",
      "Definir intervalo e carga semanal",
    ],
    check: async ({ empresaId }) => {
      if (!empresaId) return false;
      const { count } = await supabase
        .from("ponto_escalas")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", empresaId);
      return (count ?? 0) > 0;
    },
  },
  {
    id: "funcionarios",
    title: "Funcionários e Jornadas",
    description: "Cadastre funcionários, escalas e PIN/biometria.",
    icon: Users,
    url: "/ponto/funcionarios",
    ctaLabel: "Cadastrar funcionários",
    whyItMatters:
      "Sem funcionários, não há ponto. Cada um precisa de jornada, vínculo CLT/PJ e identificador único.",
    checklist: [
      "Importar ou cadastrar funcionários",
      "Definir jornada de cada um",
      "Atribuir PIN, cartão ou biometria",
    ],
  },
  {
    id: "importacao",
    title: "Importação em Lote",
    description: "Se já tem funcionários em planilha, importe de uma vez.",
    icon: Upload,
    url: "/ponto/importacao",
    ctaLabel: "Abrir importador",
    whyItMatters: "Acelera o setup quando você tem muitos funcionários.",
    checklist: [
      "Baixar planilha modelo",
      "Preencher com dados dos funcionários",
      "Subir a planilha e validar",
    ],
    optional: true,
  },
  {
    id: "coletor",
    title: "Coletor Desktop",
    description: "Instale o agente que captura registros dos relógios físicos.",
    icon: Download,
    url: "/ponto/coletor",
    ctaLabel: "Baixar coletor",
    whyItMatters:
      "Sem o coletor, registros dos relógios físicos não chegam ao sistema.",
    checklist: [
      "Baixar instalador",
      "Configurar com a chave da empresa",
      "Deixar rodando em uma máquina sempre ligada",
    ],
    optional: true,
  },
  {
    id: "layouts-exportacao",
    title: "Layouts de Exportação",
    description: "Crie os layouts e rubricas usados pela folha (Domínio, Sage, Senior, etc.).",
    icon: FileDown,
    url: "/ponto/layouts-exportacao",
    ctaLabel: "Abrir layouts de exportação",
    whyItMatters:
      "Os layouts definem como cada evento (HE 50%, HE 100%, DSR, faltas) é entregue ao sistema de folha. Use o botão 'Criar 2 layouts padrão' para começar com modelos prontos (50/100% e 60/100%).",
    checklist: [
      "Criar o(s) layout(s) usados pela empresa",
      "Mapear rubricas (150, 200, 8069, 8794, etc.)",
      "Definir tamanho da matrícula e formato de horas",
    ],
    optional: true,
    check: async ({ empresaId }) => {
      if (!empresaId) return false;
      const { count } = await supabase
        .from("ponto_export_layouts")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", empresaId);
      return (count ?? 0) > 0;
    },
  },
  {
    id: "exportacao",
    title: "Exportação para Folha",
    description: "Gere o arquivo final para envio à folha de pagamento.",
    icon: FileDown,
    url: "/ponto/exportacao",
    ctaLabel: "Configurar exportação",
    whyItMatters:
      "Conecta o ponto ao sistema de folha. Sem isso, o RH refaz tudo manualmente.",
    checklist: [
      "Escolher o layout cadastrado",
      "Selecionar o período de competência",
      "Fazer uma exportação teste",
    ],
    optional: true,
  },
  {
    id: "notificacoes",
    title: "Notificações Automáticas",
    description: "Defina alertas de atraso, banco de horas e fechamento.",
    icon: Bell,
    url: "/ponto/notificacoes",
    ctaLabel: "Configurar notificações",
    whyItMatters: "Mantém RH e gestores informados sem precisar olhar o sistema.",
    checklist: [
      "Ativar alerta de atraso e falta",
      "Notificar saldo de banco de horas",
      "Lembrar fechamento mensal",
    ],
    optional: true,
  },
];

const STORAGE_KEY = "ponto.config.wizard.progress";

export default function PontoConfigWizard() {
  const navigate = useNavigate();
  const { empresaId } = usePontoEmpresa();
  const [current, setCurrent] = useState(0);
  const [completed, setCompleted] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
  }, [completed]);

  const step = STEPS[current];
  const Icon = step.icon;
  const completedCount = STEPS.filter((s) => completed[s.id]).length;
  const progress = Math.round((completedCount / STEPS.length) * 100);
  const isLast = current === STEPS.length - 1;
  const allDone = completedCount === STEPS.length;

  const toggleDone = () => {
    setCompleted((c) => ({ ...c, [step.id]: !c[step.id] }));
  };

  const goNext = () => {
    if (!isLast) setCurrent((i) => i + 1);
  };

  const verifyStep = async () => {
    if (!step.check) return;
    const ok = await step.check({ empresaId });
    if (ok) {
      setCompleted((c) => ({ ...c, [step.id]: true }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/ponto/config")}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      </div>

      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Assistente de Configuração</h1>
        <p className="text-sm text-muted-foreground">
          Siga os passos abaixo para configurar o Controle de Ponto do início ao fim.
        </p>
      </div>

      {/* Progresso */}
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {completedCount} de {STEPS.length} passos concluídos
            </span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} />
        </CardContent>
      </Card>

      {allDone && (
        <Card className="border-success/40 bg-success/5">
          <CardContent className="flex items-center gap-3 p-4">
            <PartyPopper className="h-6 w-6 text-success" />
            <div>
              <p className="font-semibold">Configuração concluída!</p>
              <p className="text-sm text-muted-foreground">
                Seu Controle de Ponto está pronto para uso.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Lista de passos */}
        <Card className="h-fit">
          <CardContent className="p-2">
            <ol className="space-y-1">
              {STEPS.map((s, idx) => {
                const isDone = !!completed[s.id];
                const isCurrent = idx === current;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => setCurrent(idx)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                        isCurrent ? "bg-primary/10 text-foreground" : "hover:bg-muted",
                      )}
                    >
                      {isDone ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      ) : (
                        <Circle
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0",
                            isCurrent ? "text-primary" : "text-muted-foreground",
                          )}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span
                            className={cn(
                              "truncate font-medium",
                              isCurrent && "text-primary",
                            )}
                          >
                            {idx + 1}. {s.title}
                          </span>
                          {s.optional && (
                            <Badge variant="outline" className="h-4 px-1 text-[10px]">
                              opcional
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        {/* Detalhe do passo */}
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold sm:text-xl">
                    Passo {current + 1}: {step.title}
                  </h2>
                  {step.optional && <Badge variant="outline">Opcional</Badge>}
                  {completed[step.id] && (
                    <Badge className="bg-success text-success-foreground">
                      <Check className="mr-1 h-3 w-3" /> Concluído
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Por que importa
              </p>
              <p className="mt-1 text-sm">{step.whyItMatters}</p>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">O que fazer:</p>
              <ul className="space-y-1.5">
                {step.checklist.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Circle className="mt-1 h-2 w-2 shrink-0 fill-primary text-primary" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {step.url && (
                <Button asChild onClick={() => setWizardActive()}>
                  <Link to={`${step.url}?from=wizard`}>
                    <ExternalLink className="h-4 w-4" /> {step.ctaLabel}
                  </Link>
                </Button>
              )}
              <Button variant="outline" onClick={verifyStep}>
                {completed[step.id] ? "Desmarcar" : "Marcar como concluído"}
              </Button>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <Button
                variant="ghost"
                onClick={() => setCurrent((i) => Math.max(0, i - 1))}
                disabled={current === 0}
              >
                <ArrowLeft className="h-4 w-4" /> Anterior
              </Button>
              <span className="text-xs text-muted-foreground">
                {current + 1} / {STEPS.length}
              </span>
              <Button onClick={goNext} disabled={isLast}>
                Próximo <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
