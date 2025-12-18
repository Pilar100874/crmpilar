import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageSquare, Phone, Mail, Receipt, Calendar, 
  Clock, User, ChevronDown, ChevronUp, Loader2,
  Users, CheckCircle2, XCircle, ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TimelineEvent {
  id: string;
  type: 'chat' | 'atendimento' | 'orcamento' | 'email' | 'tarefa';
  title: string;
  description?: string;
  date: Date;
  status?: string;
  metadata?: Record<string, any>;
}

interface CustomerHistoryTimelineProps {
  contactId?: string;
  contactName?: string;
  estabelecimentoId: string;
}

const TYPE_CONFIG = {
  chat: {
    icon: MessageSquare,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    label: 'Chat'
  },
  atendimento: {
    icon: Phone,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    label: 'Atendimento'
  },
  orcamento: {
    icon: Receipt,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    label: 'Orçamento'
  },
  email: {
    icon: Mail,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    label: 'Email'
  },
  tarefa: {
    icon: Calendar,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    label: 'Tarefa'
  }
};

export function CustomerHistoryTimeline({
  contactId,
  contactName,
  estabelecimentoId
}: CustomerHistoryTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    if (contactId || contactName) {
      loadHistory();
    }
  }, [contactId, contactName, estabelecimentoId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const allEvents: TimelineEvent[] = [];
      let customerId = contactId;

      // Se não temos contactId, tentar buscar pelo nome
      if (!customerId && contactName) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id, email, telefone')
          .eq('estabelecimento_id', estabelecimentoId)
          .eq('nome', contactName)
          .maybeSingle();
        
        if (customer) {
          customerId = customer.id;
        }
      }

      // Buscar conversas/chats
      if (customerId) {
        const { data: conversations } = await supabase
          .from('conversations')
          .select('id, canal, chat_status, created_at, updated_at, motivo_encerramento')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (conversations) {
          conversations.forEach(conv => {
            allEvents.push({
              id: `conv-${conv.id}`,
              type: 'chat',
              title: `Chat via ${conv.canal}`,
              description: conv.motivo_encerramento || undefined,
              date: new Date(conv.created_at || ''),
              status: conv.chat_status || 'aberto',
              metadata: { canal: conv.canal }
            });
          });
        }
      }

      // Buscar tarefas e registros de atendimento
      if (contactName) {
        const { data: tarefas } = await supabase
          .from('calendario_tarefas')
          .select('id, contact_name, title, date, status, origem, description')
          .eq('estabelecimento_id', estabelecimentoId)
          .eq('contact_name', contactName)
          .order('date', { ascending: false })
          .limit(30);

        if (tarefas && tarefas.length > 0) {
          const tarefaIds = tarefas.map(t => t.id);
          
          // Buscar registros de atendimento associados
          const { data: registros } = await supabase
            .from('atendimento_registros')
            .select(`
              id, 
              tarefa_id,
              tipo_contato, 
              observacao, 
              created_at,
              data_proximo_contato,
              atendimento_flags (nome, cor)
            `)
            .in('tarefa_id', tarefaIds)
            .order('created_at', { ascending: false });

          if (registros) {
            registros.forEach((reg: any) => {
              const flagInfo = reg.atendimento_flags;
              allEvents.push({
                id: `atend-${reg.id}`,
                type: 'atendimento',
                title: `Contato via ${reg.tipo_contato}`,
                description: reg.observacao || (flagInfo?.nome ? `Resultado: ${flagInfo.nome}` : undefined),
                date: new Date(reg.created_at || ''),
                status: flagInfo?.nome,
                metadata: { 
                  tipo_contato: reg.tipo_contato,
                  flag_cor: flagInfo?.cor,
                  proximo_contato: reg.data_proximo_contato
                }
              });
            });
          }

          // Adicionar todas as tarefas ao histórico
          tarefas.forEach(tarefa => {
            allEvents.push({
              id: `tarefa-${tarefa.id}`,
              type: 'tarefa',
              title: tarefa.title,
              description: tarefa.description || `Origem: ${tarefa.origem}`,
              date: new Date(tarefa.date),
              status: tarefa.status
            });
          });
        }
      }

      // Buscar orçamentos
      if (customerId) {
        const { data: orcamentos } = await supabase
          .from('orcamentos')
          .select('id, status, etapa, valor_total, created_at')
          .eq('cliente_id', customerId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (orcamentos) {
          orcamentos.forEach(orc => {
            allEvents.push({
              id: `orc-${orc.id}`,
              type: 'orcamento',
              title: `Orçamento - ${orc.etapa || orc.status}`,
              description: orc.valor_total ? `R$ ${orc.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : undefined,
              date: new Date(orc.created_at || ''),
              status: orc.status
            });
          });
        }
      }

      // Buscar emails (se houver customer com email)
      if (customerId) {
        const { data: customer } = await supabase
          .from('customers')
          .select('email')
          .eq('id', customerId)
          .maybeSingle();

        if (customer?.email) {
          const { data: emails } = await supabase
            .from('emails')
            .select('id, subject, from_email, to_email, date, read, folder')
            .or(`from_email.eq.${customer.email},to_email.eq.${customer.email}`)
            .order('date', { ascending: false })
            .limit(10);

          if (emails) {
            emails.forEach(email => {
              allEvents.push({
                id: `email-${email.id}`,
                type: 'email',
                title: email.subject || 'Sem assunto',
                description: email.from_email === customer.email ? 'Recebido' : 'Enviado',
                date: new Date(email.date),
                status: email.read ? 'lido' : 'não lido',
                metadata: { folder: email.folder }
              });
            });
          }
        }
      }

      // Ordenar por data decrescente
      allEvents.sort((a, b) => b.date.getTime() - a.date.getTime());
      setEvents(allEvents);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = filter 
    ? events.filter(e => e.type === filter)
    : events;

  const getStatusBadge = (event: TimelineEvent) => {
    if (!event.status) return null;
    
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      'em_atendimento': { variant: 'default', label: 'Em atendimento' },
      'aberto': { variant: 'outline', label: 'Aberto' },
      'fechado': { variant: 'secondary', label: 'Fechado' },
      'pendente': { variant: 'outline', label: 'Pendente' },
      'concluido': { variant: 'secondary', label: 'Concluído' },
      'aprovado': { variant: 'default', label: 'Aprovado' },
      'rejeitado': { variant: 'destructive', label: 'Rejeitado' },
    };

    const config = statusMap[event.status.toLowerCase()] || { variant: 'outline' as const, label: event.status };
    
    return (
      <Badge 
        variant={config.variant} 
        className="text-[10px] ml-auto"
        style={event.metadata?.flag_cor ? { 
          backgroundColor: event.metadata.flag_cor,
          color: 'white',
          borderColor: event.metadata.flag_cor
        } : undefined}
      >
        {config.label}
      </Badge>
    );
  };

  if (!contactId && !contactName) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-0 h-auto hover:bg-transparent"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Histórico do Cliente</span>
            <Badge variant="secondary" className="text-[10px]">
              {events.length}
            </Badge>
          </div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-3">
        {/* Filtros */}
        <div className="flex gap-1 mb-3 flex-wrap">
          <Button
            variant={filter === null ? "default" : "outline"}
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={() => setFilter(null)}
          >
            Todos
          </Button>
          {Object.entries(TYPE_CONFIG).map(([type, config]) => (
            <Button
              key={type}
              variant={filter === type ? "default" : "outline"}
              size="sm"
              className="h-6 text-[10px] px-2 gap-1"
              onClick={() => setFilter(type)}
            >
              <config.icon className="w-3 h-3" />
              {config.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">Nenhum histórico encontrado</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-2">
            <div className="relative">
              {/* Linha vertical da timeline */}
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
              
              <div className="space-y-3">
                {filteredEvents.map((event, index) => {
                  const config = TYPE_CONFIG[event.type];
                  const Icon = config.icon;
                  
                  return (
                    <div 
                      key={event.id}
                      className="relative pl-8"
                    >
                      {/* Ícone na timeline */}
                      <div className={cn(
                        "absolute left-0 w-6 h-6 rounded-full flex items-center justify-center",
                        config.bgColor,
                        "border-2 border-background"
                      )}>
                        <Icon className={cn("w-3 h-3", config.color)} />
                      </div>
                      
                      {/* Card do evento */}
                      <div className={cn(
                        "rounded-lg border p-2.5 text-xs",
                        config.borderColor,
                        "hover:bg-muted/50 transition-colors"
                      )}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{event.title}</p>
                            {event.description && (
                              <p className="text-muted-foreground mt-0.5 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                          </div>
                          {getStatusBadge(event)}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {format(event.date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                          {event.metadata?.proximo_contato && (
                            <>
                              <ArrowRight className="w-3 h-3" />
                              <span>
                                Próximo: {format(new Date(event.metadata.proximo_contato), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}