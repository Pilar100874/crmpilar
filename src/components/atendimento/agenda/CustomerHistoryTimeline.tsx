import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageSquare, Phone, Mail, Receipt, Calendar, 
  Clock, ChevronDown, ChevronUp, Loader2,
  ArrowRight, Send, Eye, CheckCircle, XCircle,
  FileText, AlertCircle
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
  icon?: any;
  color?: string;
}

interface CustomerHistoryTimelineProps {
  contactId?: string;
  contactName?: string;
  estabelecimentoId: string;
}

const TYPE_CONFIG = {
  chat: {
    icon: MessageSquare,
    color: '#3b82f6',
    label: 'Chat'
  },
  atendimento: {
    icon: Phone,
    color: '#22c55e',
    label: 'Atendimento'
  },
  orcamento: {
    icon: Receipt,
    color: '#a855f7',
    label: 'Orçamento'
  },
  email: {
    icon: Mail,
    color: '#f97316',
    label: 'Email'
  },
  tarefa: {
    icon: Calendar,
    color: '#eab308',
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
                color: flagInfo?.cor,
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

      // Buscar orçamentos com todos os eventos do ciclo de vida
      // Orçamentos podem estar vinculados ao cliente OU à empresa do cliente
      let empresaIds: string[] = [];
      
      if (customerId) {
        // Buscar empresas vinculadas ao cliente
        const { data: customerEmpresas } = await supabase
          .from('customer_empresas')
          .select('empresa_id')
          .eq('customer_id', customerId);
        
        if (customerEmpresas) {
          empresaIds = customerEmpresas.map(ce => ce.empresa_id);
        }

        // Também verificar empresa diretamente no customer
        const { data: customerDirect } = await supabase
          .from('customers')
          .select('empresa_id')
          .eq('id', customerId)
          .maybeSingle();
        
        if (customerDirect?.empresa_id && !empresaIds.includes(customerDirect.empresa_id)) {
          empresaIds.push(customerDirect.empresa_id);
        }
      }

      // Buscar orçamentos por cliente_id OU empresa_id
      if (customerId || empresaIds.length > 0) {
        let query = supabase
          .from('orcamentos')
          .select('id, status, etapa, valor_total, created_at, data_envio, data_visualizacao, updated_at')
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (customerId && empresaIds.length > 0) {
          query = query.or(`cliente_id.eq.${customerId},empresa_id.in.(${empresaIds.join(',')})`);
        } else if (customerId) {
          query = query.eq('cliente_id', customerId);
        } else if (empresaIds.length > 0) {
          query = query.in('empresa_id', empresaIds);
        }
        
        const { data: orcamentos } = await query;

        if (orcamentos) {
          orcamentos.forEach(orc => {
            const valorStr = orc.valor_total ? `R$ ${orc.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
            
            // Evento de criação
            allEvents.push({
              id: `orc-create-${orc.id}`,
              type: 'orcamento',
              title: 'Orçamento Criado',
              description: valorStr,
              date: new Date(orc.created_at || ''),
              status: 'criado',
              icon: FileText,
              color: '#a855f7'
            });

            // Evento de envio
            if (orc.data_envio) {
              allEvents.push({
                id: `orc-send-${orc.id}`,
                type: 'orcamento',
                title: 'Orçamento Enviado',
                description: valorStr,
                date: new Date(orc.data_envio),
                status: 'enviado',
                icon: Send,
                color: '#3b82f6'
              });
            }

            // Evento de visualização
            if (orc.data_visualizacao) {
              allEvents.push({
                id: `orc-view-${orc.id}`,
                type: 'orcamento',
                title: 'Orçamento Visualizado',
                description: valorStr,
                date: new Date(orc.data_visualizacao),
                status: 'visualizado',
                icon: Eye,
                color: '#06b6d4'
              });
            }

            // Evento de status final (aprovado/rejeitado/negociando)
            if (orc.status && orc.status !== 'rascunho' && orc.updated_at && orc.updated_at !== orc.created_at) {
              const statusConfig: Record<string, { title: string; icon: any; color: string }> = {
                'aprovado': { title: 'Orçamento Aprovado', icon: CheckCircle, color: '#22c55e' },
                'rejeitado': { title: 'Orçamento Rejeitado', icon: XCircle, color: '#ef4444' },
                'negociando': { title: 'Em Negociação', icon: MessageSquare, color: '#f97316' },
                'pendente': { title: 'Aguardando Resposta', icon: AlertCircle, color: '#eab308' },
              };
              
              const config = statusConfig[orc.status.toLowerCase()] || { 
                title: `Orçamento ${orc.etapa || orc.status}`, 
                icon: Receipt, 
                color: '#a855f7' 
              };

              allEvents.push({
                id: `orc-status-${orc.id}`,
                type: 'orcamento',
                title: config.title,
                description: valorStr,
                date: new Date(orc.updated_at),
                status: orc.status,
                icon: config.icon,
                color: config.color
              });
            }
          });
        }
      }

      // Buscar emails
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
        <div className="flex gap-1 mb-4 flex-wrap">
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
          <ScrollArea className="h-[350px] pr-2">
            <div className="relative pl-6">
              {/* Linha vertical central da timeline */}
              <div className="absolute left-[9px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-border to-border" />
              
              <div className="space-y-0">
                {filteredEvents.map((event, index) => {
                  const config = TYPE_CONFIG[event.type];
                  const Icon = event.icon || config.icon;
                  const eventColor = event.color || config.color;
                  const isLeft = index % 2 === 0;
                  
                  return (
                    <div 
                      key={event.id}
                      className="relative pb-4"
                    >
                      {/* Círculo do ícone na linha */}
                      <div 
                        className="absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center border-2 border-background shadow-sm z-10"
                        style={{ backgroundColor: eventColor }}
                      >
                        <Icon className="w-2.5 h-2.5 text-white" />
                      </div>
                      
                      {/* Linha horizontal conectora */}
                      <div 
                        className="absolute -left-1 top-2 w-3 h-0.5"
                        style={{ backgroundColor: eventColor }}
                      />
                      
                      {/* Card do evento */}
                      <div 
                        className={cn(
                          "ml-4 rounded-lg border p-3 text-xs transition-all hover:shadow-md",
                          "bg-card hover:bg-muted/30"
                        )}
                        style={{ borderLeftColor: eventColor, borderLeftWidth: '3px' }}
                      >
                        {/* Data no topo */}
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1.5">
                          <Calendar className="w-3 h-3" />
                          <span className="font-medium">
                            {format(event.date, "dd MMM yyyy", { locale: ptBR })}
                          </span>
                          <span>•</span>
                          <span>{format(event.date, "HH:mm", { locale: ptBR })}</span>
                        </div>
                        
                        {/* Título e Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground">{event.title}</p>
                            {event.description && (
                              <p className="text-muted-foreground mt-0.5 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                          </div>
                          {event.status && (
                            <Badge 
                              variant="outline" 
                              className="text-[9px] shrink-0 capitalize"
                              style={{ 
                                borderColor: eventColor,
                                color: eventColor
                              }}
                            >
                              {event.status}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Próximo contato se houver */}
                        {event.metadata?.proximo_contato && (
                          <div className="flex items-center gap-1 mt-2 text-[10px] text-primary">
                            <ArrowRight className="w-3 h-3" />
                            <span>
                              Próximo: {format(new Date(event.metadata.proximo_contato), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {/* Marcador de fim */}
                <div className="relative">
                  <div className="absolute -left-6 w-5 h-5 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                  </div>
                  <p className="ml-4 text-[10px] text-muted-foreground py-1">Início do histórico</p>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}