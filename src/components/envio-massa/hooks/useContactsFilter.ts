import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ContactForBulkSend, EnvioMassaFilters, CanalEnvio } from '../types';

export function useContactsFilter(estabelecimentoId: string, canal: CanalEnvio | null = null) {
  const [contacts, setContacts] = useState<ContactForBulkSend[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<ContactForBulkSend[]>([]);
  const [segmentos, setSegmentos] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<EnvioMassaFilters>({});

  // Filter contacts by channel
  const contactsByChannel = useMemo(() => {
    if (!canal) return contacts;
    
    return contacts.filter(c => {
      if (canal === 'whatsapp') return !!c.telefone;
      if (canal === 'email') return !!c.email;
      return true;
    });
  }, [contacts, canal]);

  const fetchContacts = async () => {
    if (!estabelecimentoId) return;
    
    try {
      // Fetch contacts with empresa info
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
        .order('nome');

      if (error) throw error;

      const formattedContacts: ContactForBulkSend[] = (data || []).map((c: any) => ({
        id: c.id,
        nome: c.nome || 'Sem nome',
        telefone: c.telefone,
        email: c.email,
        empresa: c.customer_empresas?.[0]?.empresas?.nome_fantasia || 
                 c.customer_empresas?.[0]?.empresas?.nome || null,
        tags: c.tags || [],
        segmentos: c.customer_segmentos?.map((s: any) => s.segmento_id) || [],
        dataCadastro: c.created_at
      }));

      setContacts(formattedContacts);
      setFilteredContacts(formattedContacts);
    } catch (error: any) {
      console.error('Error fetching contacts:', error);
      toast.error('Erro ao carregar contatos');
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
    segmentos,
    loading,
    filters,
    applyFilters,
    clearFilters,
    refetch: fetchContacts
  };
}
