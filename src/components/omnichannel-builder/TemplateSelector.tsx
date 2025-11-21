import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, Award, Star, Zap } from "lucide-react";
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
    description: "Roteamento básico com verificação de horário comercial",
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
            mensagemForaHorario: "Estamos fora do horário de atendimento"
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
    description: "Distribui por habilidades dos atendentes",
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
    description: "Atendimento prioritário para clientes VIP",
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
      { id: "e2", source: "regra", target: "fila_vip", type: "smoothstep" },
      { id: "e3", source: "regra", target: "fila_normal", type: "smoothstep" }
    ]
  },
  {
    id: "webhook-integration",
    name: "Integração com Webhook",
    description: "Consulta sistema externo antes de rotear",
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
  }
];

export const TemplateSelector = ({ open, onOpenChange, onSelectTemplate }: TemplateSelectorProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Escolher Template</DialogTitle>
          <DialogDescription>
            Selecione um template pré-configurado para começar rapidamente
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="p-4 cursor-pointer hover:border-primary transition-colors"
              onClick={() => {
                onSelectTemplate(template.nodes, template.edges);
                onOpenChange(false);
              }}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {template.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{template.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                  <div className="mt-3 text-xs text-muted-foreground">
                    {template.nodes.length} blocos • {template.edges.length} conexões
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
