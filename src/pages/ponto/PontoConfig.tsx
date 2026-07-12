import { Link } from "react-router-dom";
import {
  Building2,
  Cpu,
  Download,
  FileDown,
  ShieldCheck,
  Users,
  Upload,
  Bell,
  Wand2,
  Briefcase,
  Network,
  Clock,
  Scale,
  User,
  MapPin,
  QrCode,
  ClipboardCheck,
  Lock,
  Plane,
  Vote,
  FileCheck,
  ShieldAlert,
  FileText,
  FileCode,
  Sparkles,
  TrendingUp,
  Calculator,
  BookOpen,
  Smartphone,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";


const wizard = {
  title: "Assistente de Configuração",
  description: "Configure todo o sistema de ponto passo a passo, do início ao fim",
  url: "/ponto/config/wizard",
  icon: Wand2,
  highlight: true,
};

const items = [
  {
    title: "Empresas",
    description: "Cadastro das empresas (matrizes) do controle de ponto",
    url: "/ponto/empresas",
    icon: Building2,
  },
  {
    title: "Filiais",
    description: "Unidades vinculadas à empresa selecionada (endereço, GPS, raio)",
    url: "/ponto/filiais",
    icon: Building2,
  },
  {
    title: "Escalas e Jornadas",
    description: "Horários de entrada/saída, intervalo de almoço e carga diária por dia da semana",
    url: "/ponto/escalas",
    icon: Clock,
  },
  {
    title: "Regras CLT / Tolerâncias",
    description: "Tolerância de atraso, hora extra, adicional noturno e limites legais",
    url: "/ponto/clt-config",
    icon: Scale,
  },
  {
    title: "Funcionários",
    description: "Cadastro de funcionários, jornadas e vínculos",
    url: "/ponto/funcionarios",
    icon: Users,
  },
  {
    title: "Departamentos",
    description: "Setores e centros de custo por empresa ou filial",
    url: "/ponto/departamentos",
    icon: Network,
  },
  {
    title: "Cargos",
    description: "Posições funcionais com CBO e salário base",
    url: "/ponto/cargos",
    icon: Briefcase,
  },
  {
    title: "Equipes",
    description: "Agrupe funcionários em equipes com líder e membros",
    url: "/ponto/equipes",
    icon: Users,
  },
  {
    title: "Equipamentos Control iD",
    description: "Relógios de ponto e dispositivos conectados",
    url: "/ponto/equipamentos",
    icon: Cpu,
  },
  {
    title: "Antifraude",
    description: "Geofences e redes autorizadas para validação multi-fator",
    url: "/ponto/antifraude",
    icon: ShieldCheck,
  },
  {
    title: "Coletor Desktop",
    description: "Baixar agente que captura registros dos relógios",
    url: "/ponto/coletor",
    icon: Download,
  },
  {
    title: "Layouts de Exportação",
    description: "Mapeamento de rubricas por software de folha (Domínio, Sage, Senior...)",
    url: "/ponto/layouts-exportacao",
    icon: FileDown,
  },
  {
    title: "Exportação Domínio",
    description: "Configuração de rubricas e exportação para folha",
    url: "/ponto/exportacao",
    icon: FileDown,
  },
  {
    title: "Notificações",
    description: "Regras de avisos automáticos para RH e funcionários",
    url: "/ponto/notificacoes",
    icon: Bell,
  },
  {
    title: "Importação em Lote",
    description: "Importar funcionários, jornadas e históricos via planilha",
    url: "/ponto/importacao",
    icon: Upload,
  },
];

export default function PontoConfig() {
  const WizardIcon = wizard.icon;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Ajustes e cadastros do módulo de Controle de Ponto
        </p>
      </div>

      <Link to={wizard.url} className="group block">
        <Card className="border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent transition-all hover:border-primary hover:shadow-lg">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="rounded-xl bg-primary p-3 text-primary-foreground shadow-md">
              <WizardIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base sm:text-lg">{wizard.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{wizard.description}</p>
              <span className="mt-2 inline-block text-xs font-medium text-primary">
                Iniciar configuração →
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Link key={it.url} to={it.url} className="group">
              <Card className="h-full transition-all hover:border-primary hover:shadow-md">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="rounded-lg bg-primary/10 p-2.5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm sm:text-base">{it.title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                      {it.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
