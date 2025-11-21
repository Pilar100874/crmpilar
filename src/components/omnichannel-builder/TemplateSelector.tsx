import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Award, Star, Zap, Globe, TrendingUp, Users, ShieldCheck, MessageSquare, PhoneCall } from "lucide-react";
import type { OmnichannelNode, OmnichannelEdge } from "@/types/omnichannelFlow";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  nodes: OmnichannelNode[];
  edges: OmnichannelEdge[];
}

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (nodes: OmnichannelNode[], edges: OmnichannelEdge[]) => void;
}

const templates: Template[] = [
  {
    id: "support-hours",
    name: "Suporte por Horário",
    description: "Roteamento com verificação de horário comercial e mensagem automática fora do expediente",
    icon: <Clock className="h-8 w-8" />,
    nodes: [
      {
        id: "start",
        type: "custom",
        position: { x: 250, y: 50 },
        data: { type: "inicio", label: "Início", config: {} }
      },
      {
        id: "horario",
        type: "custom",
        position: { x: 250, y: 150 },
        data: {
          type: "horario",
          label: "Horário Comercial",
          config: {
            diasSemana: [1, 2, 3, 4, 5],
            horarioInicio: "09:00",
            horarioFim: "18:00",
            acaoForaHorario: "mensagem",
            mensagemForaHorario: "Estamos fora do horário de atendimento. Retornaremos em breve!"
          }
        }
      },
      {
        id: "fila",
        type: "custom",
        position: { x: 250, y: 300 },
        data: {
          type: "fila",
          label: "Fila Geral",
          config: { tipoRoteamento: "round_robin", maxChats: 5, prioridade: 5, ativa: true }
        }
      }
    ],
    edges: [
      { id: "e1", source: "start", target: "horario", type: "smoothstep" },
      { id: "e2", source: "horario", target: "fila", type: "smoothstep" }
    ]
  },
  {
    id: "skill-routing",
    name: "Roteamento por Skill",
    description: "Distribui atendimentos baseado nas habilidades específicas dos atendentes",
    icon: <Award className="h-8 w-8" />,
    nodes: [
      {
        id: "start",
        type: "custom",
        position: { x: 250, y: 50 },
        data: { type: "inicio", label: "Início", config: {} }
      },
      {
        id: "skill",
        type: "custom",
        position: { x: 250, y: 150 },
        data: {
          type: "skill",
          label: "Skill Técnica",
          config: { skillNome: "Técnico", nivelMinimo: 3, obrigatorio: true }
        }
      },
      {
        id: "fila",
        type: "custom",
        position: { x: 250, y: 300 },
        data: {
          type: "fila",
          label: "Fila Técnica",
          config: { tipoRoteamento: "por_skill", maxChats: 3, prioridade: 7, ativa: true }
        }
      }
    ],
    edges: [
      { id: "e1", source: "start", target: "skill", type: "smoothstep" },
      { id: "e2", source: "skill", target: "fila", type: "smoothstep" }
    ]
  },
  {
    id: "vip-priority",
    name: "Priorização VIP",
    description: "Atendimento prioritário para clientes VIP com fila exclusiva e tempo de resposta reduzido",
    icon: <Star className="h-8 w-8" />,
    nodes: [
      {
        id: "start",
        type: "custom",
        position: { x: 250, y: 50 },
        data: { type: "inicio", label: "Início", config: {} }
      },
      {
        id: "regra",
        type: "custom",
        position: { x: 250, y: 150 },
        data: {
          type: "regra_roteamento",
          label: "Verificar VIP",
          config: {
            tipoRegra: "condicional",
            condicoes: [{ campo: "prioridade_cliente", operador: "igual", valor: "VIP" }]
          }
        }
      },
      {
        id: "fila_vip",
        type: "custom",
        position: { x: 100, y: 300 },
        data: {
          type: "fila",
          label: "Fila VIP",
          config: { tipoRoteamento: "por_prioridade", maxChats: 2, prioridade: 10, ativa: true }
        }
      },
      {
        id: "fila_normal",
        type: "custom",
        position: { x: 400, y: 300 },
        data: {
          type: "fila",
          label: "Fila Normal",
          config: { tipoRoteamento: "round_robin", maxChats: 5, prioridade: 5, ativa: true }
        }
      }
    ],
    edges: [
      { id: "e1", source: "start", target: "regra", type: "smoothstep" },
      { id: "e2", source: "regra", target: "fila_vip", type: "smoothstep", label: "VIP" },
      { id: "e3", source: "regra", target: "fila_normal", type: "smoothstep", label: "Normal" }
    ]
  },
  {
    id: "webhook-integration",
    name: "Integração com Webhook",
    description: "Consulta sistema externo (CRM, ERP) antes de rotear para enriquecer dados do cliente",
    icon: <Zap className="h-8 w-8" />,
    nodes: [
      {
        id: "start",
        type: "custom",
        position: { x: 250, y: 50 },
        data: { type: "inicio", label: "Início", config: {} }
      },
      {
        id: "webhook",
        type: "custom",
        position: { x: 250, y: 150 },
        data: {
          type: "webhook",
          label: "Consultar CRM",
          config: {
            webhookUrl: "https://api.example.com/customer",
            metodo: "POST",
            aguardarResposta: true,
            timeout: 10
          }
        }
      },
      {
        id: "fila",
        type: "custom",
        position: { x: 250, y: 300 },
        data: {
          type: "fila",
          label: "Fila Atendimento",
          config: { tipoRoteamento: "por_disponibilidade", maxChats: 5, prioridade: 5, ativa: true }
        }
      }
    ],
    edges: [
      { id: "e1", source: "start", target: "webhook", type: "smoothstep" },
      { id: "e2", source: "webhook", target: "fila", type: "smoothstep" }
    ]
  },
  {
    id: "multilanguage",
    name: "Atendimento Multilíngue",
    description: "Detecta idioma do cliente e roteia para atendente com skill no idioma correspondente",
    icon: <Globe className="h-8 w-8" />,
    nodes: [
      {
        id: "start",
        type: "custom",
        position: { x: 300, y: 50 },
        data: { type: "inicio", label: "Início", config: {} }
      },
      {
        id: "regra_idioma",
        type: "custom",
        position: { x: 300, y: 150 },
        data: {
          type: "regra_roteamento",
          label: "Detectar Idioma",
          config: {
            tipoRegra: "condicional",
            condicoes: [{ campo: "idioma", operador: "igual", valor: "pt-BR" }]
          }
        }
      },
      {
        id: "skill_pt",
        type: "custom",
        position: { x: 100, y: 280 },
        data: {
          type: "skill",
          label: "Skill Português",
          config: { skillNome: "Português", nivelMinimo: 4, obrigatorio: true }
        }
      },
      {
        id: "skill_en",
        type: "custom",
        position: { x: 300, y: 280 },
        data: {
          type: "skill",
          label: "Skill Inglês",
          config: { skillNome: "Inglês", nivelMinimo: 4, obrigatorio: true }
        }
      },
      {
        id: "skill_es",
        type: "custom",
        position: { x: 500, y: 280 },
        data: {
          type: "skill",
          label: "Skill Espanhol",
          config: { skillNome: "Espanhol", nivelMinimo: 4, obrigatorio: true }
        }
      },
      {
        id: "fila_pt",
        type: "custom",
        position: { x: 100, y: 410 },
        data: {
          type: "fila",
          label: "Fila PT",
          config: { tipoRoteamento: "por_skill", maxChats: 5, prioridade: 5, ativa: true }
        }
      },
      {
        id: "fila_en",
        type: "custom",
        position: { x: 300, y: 410 },
        data: {
          type: "fila",
          label: "Fila EN",
          config: { tipoRoteamento: "por_skill", maxChats: 5, prioridade: 5, ativa: true }
        }
      },
      {
        id: "fila_es",
        type: "custom",
        position: { x: 500, y: 410 },
        data: {
          type: "fila",
          label: "Fila ES",
          config: { tipoRoteamento: "por_skill", maxChats: 5, prioridade: 5, ativa: true }
        }
      }
    ],
    edges: [
      { id: "e1", source: "start", target: "regra_idioma", type: "smoothstep" },
      { id: "e2", source: "regra_idioma", target: "skill_pt", type: "smoothstep", label: "PT" },
      { id: "e3", source: "regra_idioma", target: "skill_en", type: "smoothstep", label: "EN" },
      { id: "e4", source: "regra_idioma", target: "skill_es", type: "smoothstep", label: "ES" },
      { id: "e5", source: "skill_pt", target: "fila_pt", type: "smoothstep" },
      { id: "e6", source: "skill_en", target: "fila_en", type: "smoothstep" },
      { id: "e7", source: "skill_es", target: "fila_es", type: "smoothstep" }
    ]
  },
  {
    id: "overflow-routing",
    name: "Overflow entre Filas",
    description: "Redireciona para fila alternativa quando a principal está saturada",
    icon: <TrendingUp className="h-8 w-8" />,
    nodes: [
      {
        id: "start",
        type: "custom",
        position: { x: 250, y: 50 },
        data: { type: "inicio", label: "Início", config: {} }
      },
      {
        id: "regra_capacidade",
        type: "custom",
        position: { x: 250, y: 150 },
        data: {
          type: "regra_roteamento",
          label: "Verificar Capacidade",
          config: {
            tipoRegra: "condicional",
            condicoes: [{ campo: "fila_principal_cheia", operador: "igual", valor: "false" }]
          }
        }
      },
      {
        id: "fila_principal",
        type: "custom",
        position: { x: 100, y: 300 },
        data: {
          type: "fila",
          label: "Fila Principal",
          config: { tipoRoteamento: "round_robin", maxChats: 3, prioridade: 8, ativa: true }
        }
      },
      {
        id: "fila_overflow",
        type: "custom",
        position: { x: 400, y: 300 },
        data: {
          type: "fila",
          label: "Fila Overflow",
          config: { tipoRoteamento: "por_disponibilidade", maxChats: 7, prioridade: 6, ativa: true }
        }
      }
    ],
    edges: [
      { id: "e1", source: "start", target: "regra_capacidade", type: "smoothstep" },
      { id: "e2", source: "regra_capacidade", target: "fila_principal", type: "smoothstep", label: "Disponível" },
      { id: "e3", source: "regra_capacidade", target: "fila_overflow", type: "smoothstep", label: "Cheia" }
    ]
  },
  {
    id: "department-triage",
    name: "Triagem por Departamento",
    description: "Classifica e roteia para departamentos específicos (vendas, suporte, financeiro)",
    icon: <Users className="h-8 w-8" />,
    nodes: [
      {
        id: "start",
        type: "custom",
        position: { x: 300, y: 50 },
        data: { type: "inicio", label: "Início", config: {} }
      },
      {
        id: "regra_dept",
        type: "custom",
        position: { x: 300, y: 150 },
        data: {
          type: "regra_roteamento",
          label: "Classificar Assunto",
          config: {
            tipoRegra: "condicional",
            condicoes: [{ campo: "departamento", operador: "igual", valor: "vendas" }]
          }
        }
      },
      {
        id: "skill_vendas",
        type: "custom",
        position: { x: 100, y: 280 },
        data: {
          type: "skill",
          label: "Skill Vendas",
          config: { skillNome: "Vendas", nivelMinimo: 3, obrigatorio: true }
        }
      },
      {
        id: "skill_suporte",
        type: "custom",
        position: { x: 300, y: 280 },
        data: {
          type: "skill",
          label: "Skill Suporte",
          config: { skillNome: "Suporte Técnico", nivelMinimo: 4, obrigatorio: true }
        }
      },
      {
        id: "skill_financeiro",
        type: "custom",
        position: { x: 500, y: 280 },
        data: {
          type: "skill",
          label: "Skill Financeiro",
          config: { skillNome: "Financeiro", nivelMinimo: 3, obrigatorio: true }
        }
      },
      {
        id: "fila_vendas",
        type: "custom",
        position: { x: 100, y: 410 },
        data: {
          type: "fila",
          label: "Fila Vendas",
          config: { tipoRoteamento: "por_prioridade", maxChats: 8, prioridade: 7, ativa: true }
        }
      },
      {
        id: "fila_suporte",
        type: "custom",
        position: { x: 300, y: 410 },
        data: {
          type: "fila",
          label: "Fila Suporte",
          config: { tipoRoteamento: "por_skill", maxChats: 5, prioridade: 8, ativa: true }
        }
      },
      {
        id: "fila_financeiro",
        type: "custom",
        position: { x: 500, y: 410 },
        data: {
          type: "fila",
          label: "Fila Financeiro",
          config: { tipoRoteamento: "round_robin", maxChats: 4, prioridade: 9, ativa: true }
        }
      }
    ],
    edges: [
      { id: "e1", source: "start", target: "regra_dept", type: "smoothstep" },
      { id: "e2", source: "regra_dept", target: "skill_vendas", type: "smoothstep", label: "Vendas" },
      { id: "e3", source: "regra_dept", target: "skill_suporte", type: "smoothstep", label: "Suporte" },
      { id: "e4", source: "regra_dept", target: "skill_financeiro", type: "smoothstep", label: "Financeiro" },
      { id: "e5", source: "skill_vendas", target: "fila_vendas", type: "smoothstep" },
      { id: "e6", source: "skill_suporte", target: "fila_suporte", type: "smoothstep" },
      { id: "e7", source: "skill_financeiro", target: "fila_financeiro", type: "smoothstep" }
    ]
  },
  {
    id: "sla-based",
    name: "Roteamento por SLA",
    description: "Atendimento baseado em SLA com tempos de resposta diferenciados por tipo de cliente",
    icon: <ShieldCheck className="h-8 w-8" />,
    nodes: [
      {
        id: "start",
        type: "custom",
        position: { x: 250, y: 50 },
        data: { type: "inicio", label: "Início", config: {} }
      },
      {
        id: "regra_sla",
        type: "custom",
        position: { x: 250, y: 150 },
        data: {
          type: "regra_roteamento",
          label: "Verificar SLA",
          config: {
            tipoRegra: "condicional",
            condicoes: [{ campo: "tipo_sla", operador: "igual", valor: "premium" }]
          }
        }
      },
      {
        id: "fila_premium",
        type: "custom",
        position: { x: 80, y: 300 },
        data: {
          type: "fila",
          label: "Fila Premium (5min)",
          config: { tipoRoteamento: "por_prioridade", maxChats: 2, prioridade: 10, ativa: true }
        }
      },
      {
        id: "fila_standard",
        type: "custom",
        position: { x: 250, y: 300 },
        data: {
          type: "fila",
          label: "Fila Standard (15min)",
          config: { tipoRoteamento: "round_robin", maxChats: 5, prioridade: 6, ativa: true }
        }
      },
      {
        id: "fila_basic",
        type: "custom",
        position: { x: 420, y: 300 },
        data: {
          type: "fila",
          label: "Fila Basic (30min)",
          config: { tipoRoteamento: "por_disponibilidade", maxChats: 8, prioridade: 3, ativa: true }
        }
      }
    ],
    edges: [
      { id: "e1", source: "start", target: "regra_sla", type: "smoothstep" },
      { id: "e2", source: "regra_sla", target: "fila_premium", type: "smoothstep", label: "Premium" },
      { id: "e3", source: "regra_sla", target: "fila_standard", type: "smoothstep", label: "Standard" },
      { id: "e4", source: "regra_sla", target: "fila_basic", type: "smoothstep", label: "Basic" }
    ]
  },
  {
    id: "first-contact-resolution",
    name: "First Contact Resolution",
    description: "Prioriza atendentes com histórico positivo de resolução na primeira interação",
    icon: <MessageSquare className="h-8 w-8" />,
    nodes: [
      {
        id: "start",
        type: "custom",
        position: { x: 250, y: 50 },
        data: { type: "inicio", label: "Início", config: {} }
      },
      {
        id: "webhook_historico",
        type: "custom",
        position: { x: 250, y: 150 },
        data: {
          type: "webhook",
          label: "Buscar Histórico Cliente",
          config: {
            webhookUrl: "https://api.example.com/customer-history",
            metodo: "GET",
            aguardarResposta: true,
            timeout: 5
          }
        }
      },
      {
        id: "skill_senior",
        type: "custom",
        position: { x: 250, y: 280 },
        data: {
          type: "skill",
          label: "Atendente Senior",
          config: { skillNome: "Senior", nivelMinimo: 4, obrigatorio: true }
        }
      },
      {
        id: "fila_fcr",
        type: "custom",
        position: { x: 250, y: 410 },
        data: {
          type: "fila",
          label: "Fila FCR",
          config: { tipoRoteamento: "por_skill", maxChats: 3, prioridade: 9, ativa: true }
        }
      }
    ],
    edges: [
      { id: "e1", source: "start", target: "webhook_historico", type: "smoothstep" },
      { id: "e2", source: "webhook_historico", target: "skill_senior", type: "smoothstep" },
      { id: "e3", source: "skill_senior", target: "fila_fcr", type: "smoothstep" }
    ]
  },
  {
    id: "24-7-escalation",
    name: "Atendimento 24/7 com Escalação",
    description: "Roteamento contínuo com escalação automática para supervisor após timeout",
    icon: <PhoneCall className="h-8 w-8" />,
    nodes: [
      {
        id: "start",
        type: "custom",
        position: { x: 250, y: 50 },
        data: { type: "inicio", label: "Início", config: {} }
      },
      {
        id: "fila_nivel1",
        type: "custom",
        position: { x: 250, y: 150 },
        data: {
          type: "fila",
          label: "Fila Nível 1",
          config: { tipoRoteamento: "round_robin", maxChats: 6, prioridade: 5, ativa: true }
        }
      },
      {
        id: "aguardar",
        type: "custom",
        position: { x: 250, y: 280 },
        data: {
          type: "aguardar",
          label: "Aguardar 10min",
          config: { tempo: 600, unidade: "segundos" }
        }
      },
      {
        id: "skill_supervisor",
        type: "custom",
        position: { x: 250, y: 410 },
        data: {
          type: "skill",
          label: "Skill Supervisor",
          config: { skillNome: "Supervisor", nivelMinimo: 5, obrigatorio: true }
        }
      },
      {
        id: "fila_escalacao",
        type: "custom",
        position: { x: 250, y: 540 },
        data: {
          type: "fila",
          label: "Fila Escalação",
          config: { tipoRoteamento: "por_prioridade", maxChats: 3, prioridade: 10, ativa: true }
        }
      }
    ],
    edges: [
      { id: "e1", source: "start", target: "fila_nivel1", type: "smoothstep" },
      { id: "e2", source: "fila_nivel1", target: "aguardar", type: "smoothstep", label: "Sem resposta" },
      { id: "e3", source: "aguardar", target: "skill_supervisor", type: "smoothstep" },
      { id: "e4", source: "skill_supervisor", target: "fila_escalacao", type: "smoothstep" }
    ]
  }
];

export const TemplateSelector = ({ open, onOpenChange, onSelectTemplate }: TemplateSelectorProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Escolher Template de Fluxo</DialogTitle>
          <DialogDescription>
            Selecione um template pré-configurado para começar rapidamente seu fluxo omnichannel
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="p-4 cursor-pointer hover:border-primary hover:shadow-md transition-all group"
                onClick={() => {
                  onSelectTemplate(template.nodes, template.edges);
                  onOpenChange(false);
                }}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      {template.icon}
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {template.nodes.length} blocos
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {template.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
