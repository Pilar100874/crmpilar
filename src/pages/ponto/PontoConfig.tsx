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

type Item = { title: string; description: string; url: string; icon: any; category: string };

const items: Item[] = [
  // Operacional
  { category: "Operacional", title: "Portal do Funcionário", description: "Acesso do colaborador: espelho, solicitações e comprovantes", url: "/ponto/portal", icon: User },
  { category: "Operacional", title: "Registro via App", description: "Bater ponto pelo aplicativo com GPS e biometria", url: "/ponto/registro", icon: Smartphone },
  { category: "Operacional", title: "Mapa de Equipes", description: "Localização em tempo real dos funcionários em campo", url: "/ponto/mapa", icon: MapPin },
  { category: "Operacional", title: "QR Code Totem", description: "Modo totem para bater ponto por QR Code", url: "/ponto/qrcode", icon: QrCode },

  // Fechamento & Banco
  { category: "Fechamento & Banco", title: "Pré-Fechamento (Checklist)", description: "Checklist antes do fechamento da folha", url: "/ponto/pre-fechamento", icon: ClipboardCheck },
  { category: "Fechamento & Banco", title: "Fechamento de Folha", description: "Bloqueio de competência e envio para folha", url: "/ponto/fechamento", icon: Lock },
  { category: "Fechamento & Banco", title: "Banco de Horas", description: "Saldo, compensações e vencimento do banco de horas", url: "/ponto/banco-horas", icon: Clock },
  { category: "Fechamento & Banco", title: "Férias e Afastamentos", description: "Programação de férias, licenças e afastamentos", url: "/ponto/ferias", icon: Plane },
  { category: "Fechamento & Banco", title: "Compensação (Emenda Feriado)", description: "Regras de compensação de feriados e pontes", url: "/ponto/compensacao", icon: Scale },
  { category: "Fechamento & Banco", title: "Votação de Compensação", description: "Votação dos funcionários para acordos de compensação", url: "/ponto/compensacao-votacao", icon: Vote },
  { category: "Fechamento & Banco", title: "Atestados (RH)", description: "Aprovação e gestão de atestados médicos", url: "/ponto/atestados-admin", icon: FileCheck },

  // Compliance & Auditoria
  { category: "Compliance & Auditoria", title: "Antifraude (Alertas)", description: "Alertas de fraude, geofence e comportamentos suspeitos", url: "/ponto/alertas", icon: ShieldAlert },
  { category: "Compliance & Auditoria", title: "Auditoria", description: "Trilhas de auditoria e log de alterações", url: "/ponto/auditoria", icon: ShieldCheck },
  { category: "Compliance & Auditoria", title: "Arquivos Legais (AFD/AEJ)", description: "Geração dos arquivos exigidos pela Portaria 671", url: "/ponto/afd", icon: FileText },
  { category: "Compliance & Auditoria", title: "eSocial", description: "Envio de eventos S-2200, S-2299 e demais", url: "/ponto/esocial", icon: FileCode },

  // Inteligência IA
  { category: "Inteligência IA", title: "Assistente RH (IA)", description: "Assistente inteligente para dúvidas e análises rápidas", url: "/ponto/assistente", icon: Sparkles },
  { category: "Inteligência IA", title: "Inteligência Preditiva", description: "Previsão de faltas, atrasos e turnover", url: "/ponto/predicoes", icon: TrendingUp },
  { category: "Inteligência IA", title: "Simulador de Cenários", description: "Simule custos e impactos de mudanças na jornada", url: "/ponto/simulador", icon: Calculator },

  // Cadastros
  { category: "Cadastros", title: "Empresas", description: "Cadastro das empresas (matrizes) do controle de ponto", url: "/ponto/empresas", icon: Building2 },
  { category: "Cadastros", title: "Filiais", description: "Unidades vinculadas à empresa (endereço, GPS, raio)", url: "/ponto/filiais", icon: Building2 },
  { category: "Cadastros", title: "Funcionários", description: "Cadastro de funcionários, jornadas e vínculos", url: "/ponto/funcionarios", icon: Users },
  { category: "Cadastros", title: "Departamentos", description: "Setores e centros de custo por empresa ou filial", url: "/ponto/departamentos", icon: Network },
  { category: "Cadastros", title: "Cargos", description: "Posições funcionais com CBO e salário base", url: "/ponto/cargos", icon: Briefcase },
  { category: "Cadastros", title: "Equipes", description: "Agrupe funcionários em equipes com líder e membros", url: "/ponto/equipes", icon: Users },
  { category: "Cadastros", title: "Escalas e Jornadas", description: "Horários, intervalo de almoço e carga diária", url: "/ponto/escalas", icon: Clock },
  { category: "Cadastros", title: "Regras CLT / Tolerâncias", description: "Tolerância de atraso, hora extra, adicional noturno", url: "/ponto/clt-config", icon: Scale },

  // Sistema
  { category: "Sistema", title: "Equipamentos Control iD", description: "Relógios de ponto e dispositivos conectados", url: "/ponto/equipamentos", icon: Cpu },
  { category: "Sistema", title: "Antifraude", description: "Geofences e redes autorizadas para validação multi-fator", url: "/ponto/antifraude", icon: ShieldCheck },
  { category: "Sistema", title: "Coletor Desktop", description: "Baixar agente que captura registros dos relógios", url: "/ponto/coletor", icon: Download },
  { category: "Sistema", title: "Layouts de Exportação", description: "Mapeamento de rubricas por software de folha", url: "/ponto/layouts-exportacao", icon: FileDown },
  { category: "Sistema", title: "Exportação Domínio", description: "Configuração de rubricas e exportação para folha", url: "/ponto/exportacao", icon: FileDown },
  { category: "Sistema", title: "Notificações", description: "Regras de avisos automáticos para RH e funcionários", url: "/ponto/notificacoes", icon: Bell },
  { category: "Sistema", title: "Importação em Lote", description: "Importar funcionários, jornadas e históricos via planilha", url: "/ponto/importacao", icon: Upload },
  { category: "Sistema", title: "Manual de Uso", description: "Documentação e guia do módulo", url: "/ponto/manual", icon: BookOpen },
];

const CATEGORY_ORDER = [
  "Operacional",
  "Fechamento & Banco",
  "Compliance & Auditoria",
  "Inteligência IA",
  "Cadastros",
  "Sistema",
];

export default function PontoConfig() {
  const WizardIcon = wizard.icon;
  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: items.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Ajustes, cadastros e ferramentas do módulo de Controle de Ponto
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

      {grouped.map((group) => (
        <section key={group.cat} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.cat}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((it) => {
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
        </section>
      ))}
    </div>
  );
}

