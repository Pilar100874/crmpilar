import { useState, useEffect } from "react";
import { format, subDays, subMonths, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageSquare, Phone, Mail, Receipt, Calendar, 
  Clock, Loader2, ChevronUp, ChevronDown,
  ArrowRight, Send, Eye, CheckCircle, XCircle,
  FileText, AlertCircle, Filter
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  isFullView?: boolean;
}

const TYPE_CONFIG = {
  chat: { icon: MessageSquare, color: '#3b82f6', label: 'Chat' },
  atendimento: { icon: Phone, color: '#22c55e', label: 'Atendimento' },
  orcamento: { icon: Receipt, color: '#a855f7', label: 'Orçamento' },
  email: { icon: Mail, color: '#f97316', label: 'Email' },
  tarefa: { icon: Calendar, color: '#eab308', label: 'Tarefa' }
};

const PERIOD_OPTIONS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 3 meses' },
  { value: '180', label: 'Últimos 6 meses' },
  { value: '365', label: 'Último ano' },
  { value: 'all', label: 'Todo histórico' },
];

const LIMIT_OPTIONS = [
  { value: '10', label: '10 itens' },
  { value: '25', label: '25 itens' },
  { value: '50', label: '50 itens' },
  { value: '100', label: '100 itens' },
  { value: 'all', label: 'Todos' },
];

export function CustomerHistoryTimeline({
  contactId,
  contactName,
  estabelecimentoId,
  isFullView = false
}: CustomerHistoryTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [limitFilter, setLimitFilter] = useState<string>('50');

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

      if (!customerId && contactName) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id, email, telefone')
          .eq('estabelecimento_id', estabelecimentoId)
          .eq('nome', contactName)
          .maybeSingle();
        
        if (customer) customerId = customer.id;
      }

      // Buscar conversas/chats
      if (customerId) {
        const { data: conversations } = await supabase
          .from('conversations')
          .select('id, canal, chat_status, created_at, updated_at, motivo_encerramento')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .limit(50);

        conversations?.forEach(conv => {
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

      // Buscar tarefas e registros
      if (contactName) {
        const { data: tarefas } = await supabase
          .from('calendario_tarefas')
          .select('id, contact_name, title, date, status, origem, description')
          .eq('estabelecimento_id', estabelecimentoId)
          .eq('contact_name', contactName)
          .order('date', { ascending: false })
          .limit(50);

        if (tarefas && tarefas.length > 0) {
          const tarefaIds = tarefas.map(t => t.id);
          
          const { data: registros } = await supabase
            .from('atendimento_registros')
            .select(`id, tarefa_id, tipo_contato, observacao, created_at, data_proximo_contato, atendimento_flags (nome, cor)`)
            .in('tarefa_id', tarefaIds)
            .order('created_at', { ascending: false });

          registros?.forEach((reg: any) => {
            const flagInfo = reg.atendimento_flags;
            allEvents.push({
              id: `atend-${reg.id}`,
              type: 'atendimento',
              title: `Contato via ${reg.tipo_contato}`,
              description: reg.observacao || (flagInfo?.nome ? `Resultado: ${flagInfo.nome}` : undefined),
              date: new Date(reg.created_at || ''),
              status: flagInfo?.nome,
              color: flagInfo?.cor,
              metadata: { tipo_contato: reg.tipo_contato, flag_cor: flagInfo?.cor, proximo_contato: reg.data_proximo_contato }
            });
          });

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
      let empresaIds: string[] = [];
      if (customerId) {
        const { data: customerEmpresas } = await supabase
          .from('customer_empresas')
          .select('empresa_id')
          .eq('customer_id', customerId);
        
        if (customerEmpresas) empresaIds = customerEmpresas.map(ce => ce.empresa_id);

        const { data: customerDirect } = await supabase
          .from('customers')
          .select('empresa_id')
          .eq('id', customerId)
          .maybeSingle();
        
        if (customerDirect?.empresa_id && !empresaIds.includes(customerDirect.empresa_id)) {
          empresaIds.push(customerDirect.empresa_id);
        }
      }

      if (customerId || empresaIds.length > 0) {
        let query = supabase
          .from('orcamentos')
          .select('id, status, etapa, valor_total, created_at, data_envio, data_visualizacao, updated_at')
          .order('created_at', { ascending: false })
          .limit(30);
        
        if (customerId && empresaIds.length > 0) {
          query = query.or(`cliente_id.eq.${customerId},empresa_id.in.(${empresaIds.join(',')})`);
        } else if (customerId) {
          query = query.eq('cliente_id', customerId);
        } else if (empresaIds.length > 0) {
          query = query.in('empresa_id', empresaIds);
        }
        
        const { data: orcamentos } = await query;

        orcamentos?.forEach(orc => {
          const valorStr = orc.valor_total ? `R$ ${orc.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
          
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

          if (orc.status && orc.status !== 'rascunho' && orc.updated_at && orc.updated_at !== orc.created_at) {
            const statusConfig: Record<string, { title: string; icon: any; color: string }> = {
              'aprovado': { title: 'Orçamento Aprovado', icon: CheckCircle, color: '#22c55e' },
              'rejeitado': { title: 'Orçamento Rejeitado', icon: XCircle, color: '#ef4444' },
              'negociando': { title: 'Em Negociação', icon: MessageSquare, color: '#f97316' },
              'pendente': { title: 'Aguardando Resposta', icon: AlertCircle, color: '#eab308' },
              'em_aberto': { title: 'Orçamento em Aberto', icon: FileText, color: '#64748b' },
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
            .limit(20);

          emails?.forEach(email => {
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

      allEvents.sort((a, b) => b.date.getTime() - a.date.getTime());
      setEvents(allEvents);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros
  const getFilteredEvents = () => {
    let filtered = events;

    // Filtro por tipo
    if (typeFilter) {
      filtered = filtered.filter(e => e.type === typeFilter);
    }

    // Filtro por período
    if (periodFilter !== 'all') {
      const days = parseInt(periodFilter);
      const minDate = subDays(new Date(), days);
      filtered = filtered.filter(e => isAfter(e.date, minDate));
    }

    // Filtro por limite
    if (limitFilter !== 'all') {
      const limit = parseInt(limitFilter);
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  };

  const filteredEvents = getFilteredEvents();

  if (!contactId && !contactName) return null;

  // Agrupar eventos por mês/ano
  const groupEventsByMonth = (events: TimelineEvent[]) => {
    const groups: { [key: string]: TimelineEvent[] } = {};
    events.forEach(event => {
      const key = format(event.date, "MMMM yyyy", { locale: ptBR });
      if (!groups[key]) groups[key] = [];
      groups[key].push(event);
    });
    return groups;
  };

  const renderTimeline = () => (
    <>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum histórico encontrado</p>
        </div>
      ) : (
        <ScrollArea className={isFullView ? "flex-1" : "h-[400px]"}>
          <div className="relative py-6">
            {/* Linha central vertical */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-border -translate-x-1/2" />
            
            {/* Marcador START */}
            <div className="relative flex justify-center mb-8">
              <div className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg z-10">
                Início
              </div>
            </div>
            
            {Object.entries(groupEventsByMonth(filteredEvents)).map(([monthYear, monthEvents], groupIndex) => (
              <div key={monthYear} className="mb-8">
                {/* Cabeçalho do mês - alternando lado */}
                <div className={cn(
                  "relative flex items-center mb-4",
                  groupIndex % 2 === 0 ? "justify-start pl-[52%]" : "justify-end pr-[52%]"
                )}>
                  <div className="text-lg font-bold text-primary capitalize">
                    {monthYear}
                  </div>
                </div>
                
                {monthEvents.map((event, eventIndex) => {
                  const config = TYPE_CONFIG[event.type];
                  const Icon = event.icon || config.icon;
                  const eventColor = event.color || config.color;
                  const isLeft = (groupIndex + eventIndex) % 2 === 0;
                  
                  return (
                    <div key={event.id} className="relative flex items-start mb-6">
                      {/* Conteúdo lado esquerdo */}
                      <div className={cn(
                        "w-[calc(50%-24px)] pr-6",
                        !isLeft && "invisible"
                      )}>
                        {isLeft && (
                          <div 
                            className="bg-card rounded-xl border p-4 shadow-sm hover:shadow-md transition-all text-right"
                            style={{ borderColor: `${eventColor}30` }}
                          >
                            <div className="flex items-center justify-end gap-2 mb-2">
                              <span className="text-xs font-semibold text-foreground">{event.title}</span>
                              <Badge 
                                variant="outline" 
                                className="text-[10px] capitalize"
                                style={{ borderColor: eventColor, color: eventColor }}
                              >
                                {config.label}
                              </Badge>
                            </div>
                            {event.description && (
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{event.description}</p>
                            )}
                            <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                              <span>{format(event.date, "dd MMM", { locale: ptBR })}</span>
                              <span>•</span>
                              <span>{format(event.date, "HH:mm", { locale: ptBR })}</span>
                            </div>
                            {event.metadata?.proximo_contato && (
                              <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-primary">
                                <span>Próximo: {format(new Date(event.metadata.proximo_contato), "dd/MM/yyyy", { locale: ptBR })}</span>
                                <ArrowRight className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Linha horizontal + Círculo central */}
                      <div className="relative flex items-center justify-center w-12 shrink-0">
                        {/* Linha horizontal conectora */}
                        <div 
                          className={cn(
                            "absolute top-4 h-0.5 w-6",
                            isLeft ? "right-6" : "left-6"
                          )}
                          style={{ backgroundColor: eventColor }}
                        />
                        
                        {/* Círculo com ícone */}
                        <div 
                          className="relative w-10 h-10 rounded-full flex items-center justify-center border-4 border-background shadow-lg z-10"
                          style={{ backgroundColor: eventColor }}
                        >
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      
                      {/* Conteúdo lado direito */}
                      <div className={cn(
                        "w-[calc(50%-24px)] pl-6",
                        isLeft && "invisible"
                      )}>
                        {!isLeft && (
                          <div 
                            className="bg-card rounded-xl border p-4 shadow-sm hover:shadow-md transition-all"
                            style={{ borderColor: `${eventColor}30` }}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Badge 
                                variant="outline" 
                                className="text-[10px] capitalize"
                                style={{ borderColor: eventColor, color: eventColor }}
                              >
                                {config.label}
                              </Badge>
                              <span className="text-xs font-semibold text-foreground">{event.title}</span>
                            </div>
                            {event.description && (
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{event.description}</p>
                            )}
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <span>{format(event.date, "dd MMM", { locale: ptBR })}</span>
                              <span>•</span>
                              <span>{format(event.date, "HH:mm", { locale: ptBR })}</span>
                            </div>
                            {event.metadata?.proximo_contato && (
                              <div className="flex items-center gap-1 mt-2 text-[10px] text-primary">
                                <ArrowRight className="w-3 h-3" />
                                <span>Próximo: {format(new Date(event.metadata.proximo_contato), "dd/MM/yyyy", { locale: ptBR })}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            
            {/* Marcador FIM */}
            <div className="relative flex justify-center mt-4">
              <div className="relative flex items-center justify-center w-12">
                <div className="w-8 h-8 rounded-full bg-muted border-4 border-background flex items-center justify-center shadow-md">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                </div>
              </div>
            </div>
            <div className="relative flex justify-center mt-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Fim do histórico</span>
            </div>
          </div>
        </ScrollArea>
      )}
    </>
  );

  const renderFilters = () => (
    <div className={cn("flex flex-wrap gap-2 mb-3", isFullView && "mb-4")}>
      {/* Filtro por tipo */}
      <div className="flex gap-1 flex-wrap">
        <Button
          variant={typeFilter === null ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs px-2"
          onClick={() => setTypeFilter(null)}
        >
          Todos
        </Button>
        {Object.entries(TYPE_CONFIG).map(([type, config]) => (
          <Button
            key={type}
            variant={typeFilter === type ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs px-2 gap-1"
            onClick={() => setTypeFilter(type)}
          >
            <config.icon className="w-3 h-3" />
            {config.label}
          </Button>
        ))}
      </div>
      
      {/* Filtros avançados (apenas em fullView) */}
      {isFullView && (
        <div className="flex gap-2 ml-auto">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="h-7 w-[140px] text-xs">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={limitFilter} onValueChange={setLimitFilter}>
            <SelectTrigger className="h-7 w-[100px] text-xs">
              <SelectValue placeholder="Limite" />
            </SelectTrigger>
            <SelectContent>
              {LIMIT_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  // Modo tela cheia (para aba)
  if (isFullView) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Histórico do Cliente</span>
          <Badge variant="secondary" className="text-[10px]">{filteredEvents.length} eventos</Badge>
        </div>
        {renderFilters()}
        {renderTimeline()}
      </div>
    );
  }

  // Modo colapsável (inline)
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Histórico do Cliente</span>
            <Badge variant="secondary" className="text-[10px]">{events.length}</Badge>
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-3">
        {renderFilters()}
        {renderTimeline()}
      </CollapsibleContent>
    </Collapsible>
  );
}