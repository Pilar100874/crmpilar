import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { ContactForBulkSend, EnvioMassaFilters, CanalEnvio } from '../types';

interface CampaignPermissions {
  id: string;
  last_contact_days: number;
  only_replied: boolean;
  optin_required: boolean;
  min_score: number;
  allowed_tags: string[] | null;
  blocked_tags: string[] | null;
  is_active: boolean;
}

/**
 * Hook for Atendimento bulk send - filters contacts by TODAY's calendar tasks only
 * Now includes anti-block permission validation
 */
export function useContactsFilter(estabelecimentoId: string, canal: CanalEnvio | null = null) {
  const [contacts, setContacts] = useState<ContactForBulkSend[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<ContactForBulkSend[]>([]);
  const [segmentos, setSegmentos] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<EnvioMassaFilters>({});
  const [permissions, setPermissions] = useState<CampaignPermissions | null>(null);

  // Filter contacts by channel
  const contactsByChannel = useMemo(() => {
    if (!canal) return contacts;
    
    return contacts.filter(c => {
      if (canal === 'whatsapp') return !!c.telefone;
      if (canal === 'email') return !!c.email;
      return true;
    });
  }, [contacts, canal]);

  // Contacts that can be sent (not blocked)
  const eligibleContacts = useMemo(() => {
    return contactsByChannel.filter(c => !c.isBlocked);
  }, [contactsByChannel]);

  // Blocked contacts
  const blockedContacts = useMemo(() => {
    return contactsByChannel.filter(c => c.isBlocked);
  }, [contactsByChannel]);

  const fetchPermissions = async () => {
    if (!estabelecimentoId) return null;
    
    try {
      const { data, error } = await supabase
        .from('campaign_permissions')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      setPermissions(data);
      return data as CampaignPermissions | null;
    } catch (error: any) {
      console.error('Error fetching campaign permissions:', error);
      return null;
    }
  };

  const checkContactPermission = (
    contact: any,
    perms: CampaignPermissions | null,
    lastConversationDate: Date | null
  ): { isBlocked: boolean; blockReason: string } => {
    if (!perms) {
      return { isBlocked: false, blockReason: '' };
    }

    // Check last contact days
    if (lastConversationDate) {
      const daysSinceContact = differenceInDays(new Date(), lastConversationDate);
      if (daysSinceContact > perms.last_contact_days) {
        return {
          isBlocked: true,
          blockReason: `Último contato há ${daysSinceContact} dias (máx: ${perms.last_contact_days})`
        };
      }
    } else {
      // No previous conversation - blocked if last_contact_days rule exists
      if (perms.last_contact_days > 0) {
        return {
          isBlocked: true,
          blockReason: 'Sem histórico de conversas'
        };
      }
    }

    // Check opt-in requirement (skip this check if optin_whatsapp column doesn't exist)
    // This check is disabled until the column is added to customers table
    // if (perms.optin_required && !contact.optin_whatsapp) {
    //   return {
    //     isBlocked: true,
    //     blockReason: 'Opt-in WhatsApp não concedido'
    //   };
    // }

    // Check blocked tags
    if (perms.blocked_tags && perms.blocked_tags.length > 0 && contact.tags) {
      const hasBlockedTag = perms.blocked_tags.some(bt => 
        contact.tags.includes(bt)
      );
      if (hasBlockedTag) {
        return {
          isBlocked: true,
          blockReason: 'Contato possui tag bloqueada'
        };
      }
    }

    // Check allowed tags (if configured, contact must have at least one)
    if (perms.allowed_tags && perms.allowed_tags.length > 0) {
      const hasAllowedTag = perms.allowed_tags.some(at => 
        contact.tags?.includes(at)
      );
      if (!hasAllowedTag) {
        return {
          isBlocked: true,
          blockReason: 'Contato não possui tags permitidas'
        };
      }
    }

    // Check minimum engagement score
    if (perms.min_score > 0) {
      const score = contact.engagement_score || 0;
      if (score < perms.min_score) {
        return {
          isBlocked: true,
          blockReason: `Score de engajamento baixo (${score}/${perms.min_score})`
        };
      }
    }

    return { isBlocked: false, blockReason: '' };
  };

  const fetchContacts = async () => {
    if (!estabelecimentoId) return;
    
    try {
      setLoading(true);
      
      // First fetch permissions
      const perms = await fetchPermissions();
      
      // Get today's date
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // First, get contact IDs from today's calendar tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('calendario_tarefas')
        .select('contact_id')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('date', today)
        .not('contact_id', 'is', null);

      if (tasksError) throw tasksError;

      // Extract unique contact IDs from today's tasks
      const contactIds = [...new Set((tasksData || []).map(t => t.contact_id).filter(Boolean))];

      if (contactIds.length === 0) {
        setContacts([]);
        setFilteredContacts([]);
        setLoading(false);
        return;
      }

      // Fetch only contacts that are in today's agenda
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id,
          nome,
          telefone,
          email,
          tags,
          created_at,
          customer_empresas (
            empresa_id,
            empresas (
              nome_fantasia,
              nome
            )
          ),
          customer_segmentos (
            segmento_id
          )
        `)
        .eq('estabelecimento_id', estabelecimentoId)
        .in('id', contactIds)
        .order('nome');

      if (error) throw error;

      // Fetch last conversation date for each contact (if permissions require)
      let conversationDates: Record<string, Date | null> = {};
      
      if (perms && perms.last_contact_days > 0) {
        const { data: convData } = await supabase
          .from('conversations')
          .select('customer_id, updated_at')
          .eq('estabelecimento_id', estabelecimentoId)
          .in('customer_id', contactIds)
          .order('updated_at', { ascending: false });

        if (convData) {
          // Get the most recent conversation per customer
          convData.forEach(conv => {
            if (!conversationDates[conv.customer_id]) {
              conversationDates[conv.customer_id] = new Date(conv.updated_at);
            }
          });
        }
      }

      // Check only_replied if needed
      let repliedContacts: Set<string> = new Set();
      if (perms?.only_replied) {
        const { data: repliedData } = await supabase
          .from('messages')
          .select('conversation_id, conversations!inner(customer_id)')
          .eq('sender', 'customer')
          .in('conversations.customer_id', contactIds);

        if (repliedData) {
          repliedData.forEach((msg: any) => {
            if (msg.conversations?.customer_id) {
              repliedContacts.add(msg.conversations.customer_id);
            }
          });
        }
      }

      const formattedContacts: ContactForBulkSend[] = (data || []).map((c: any) => {
        const lastConversation = conversationDates[c.id] || null;
        const hasReplied = repliedContacts.has(c.id);
        
        // Check only_replied rule
        let blockInfo = { isBlocked: false, blockReason: '' };
        
        if (perms?.only_replied && !hasReplied) {
          blockInfo = {
            isBlocked: true,
            blockReason: 'Contato nunca respondeu'
          };
        } else {
          blockInfo = checkContactPermission(c, perms, lastConversation);
        }

        const daysSinceContact = lastConversation 
          ? differenceInDays(new Date(), lastConversation)
          : null;

        return {
          id: c.id,
          nome: c.nome || 'Sem nome',
          telefone: c.telefone,
          email: c.email,
          empresa: c.customer_empresas?.[0]?.empresas?.nome_fantasia || 
                   c.customer_empresas?.[0]?.empresas?.nome || null,
          tags: c.tags || [],
          segmentos: c.customer_segmentos?.map((s: any) => s.segmento_id) || [],
          dataCadastro: c.created_at,
          isBlocked: blockInfo.isBlocked,
          blockReason: blockInfo.blockReason,
          lastContactDays: daysSinceContact,
          hasReplied,
          hasOptin: false // Column doesn't exist yet
        };
      });

      setContacts(formattedContacts);
      setFilteredContacts(formattedContacts);
    } catch (error: any) {
      console.error('Error fetching contacts:', error);
      toast.error('Erro ao carregar contatos da agenda');
    } finally {
      setLoading(false);
    }
  };

  const fetchSegmentos = async () => {
    if (!estabelecimentoId) return;
    
    try {
      const { data, error } = await supabase
        .from('segmentos')
        .select('id, nome')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (error) throw error;
      setSegmentos(data || []);
    } catch (error: any) {
      console.error('Error fetching segmentos:', error);
    }
  };

  useEffect(() => {
    fetchContacts();
    fetchSegmentos();
  }, [estabelecimentoId]);

  const applyFilters = (newFilters: EnvioMassaFilters) => {
    setFilters(newFilters);

    // Start with contacts filtered by channel
    let result = [...contactsByChannel];

    // Filter by name
    if (newFilters.nome) {
      const searchTerm = newFilters.nome.toLowerCase();
      result = result.filter(c => 
        c.nome.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by phone
    if (newFilters.telefone) {
      const searchTerm = newFilters.telefone.replace(/\D/g, '');
      result = result.filter(c => 
        c.telefone?.replace(/\D/g, '').includes(searchTerm)
      );
    }

    // Filter by empresa
    if (newFilters.empresa) {
      const searchTerm = newFilters.empresa.toLowerCase();
      result = result.filter(c => 
        c.empresa?.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by tags
    if (newFilters.tags && newFilters.tags.length > 0) {
      result = result.filter(c => 
        newFilters.tags!.some(tag => c.tags?.includes(tag))
      );
    }

    // Filter by segmentos
    if (newFilters.segmentos && newFilters.segmentos.length > 0) {
      result = result.filter(c => 
        newFilters.segmentos!.some(seg => (c as any).segmentos?.includes(seg))
      );
    }

    // Filter by date range
    if (newFilters.dataCadastroInicio) {
      const startDate = new Date(newFilters.dataCadastroInicio);
      result = result.filter(c => 
        new Date((c as any).dataCadastro) >= startDate
      );
    }

    if (newFilters.dataCadastroFim) {
      const endDate = new Date(newFilters.dataCadastroFim);
      endDate.setHours(23, 59, 59, 999);
      result = result.filter(c => 
        new Date((c as any).dataCadastro) <= endDate
      );
    }

    setFilteredContacts(result);
    return result;
  };

  const clearFilters = () => {
    setFilters({});
    setFilteredContacts(contactsByChannel);
  };

  // Re-apply filters when canal changes
  useEffect(() => {
    if (canal) {
      applyFilters(filters);
    }
  }, [canal, contactsByChannel]);

  return {
    contacts: filteredContacts,
    allContacts: contacts,
    contactsByChannel,
    eligibleContacts,
    blockedContacts,
    segmentos,
    loading,
    filters,
    permissions,
    applyFilters,
    clearFilters,
    refetch: fetchContacts
  };
}
