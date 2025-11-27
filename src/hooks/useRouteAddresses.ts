import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RouteAddresses {
  origemCep: string | null;
  destinoCep: string | null;
  origemEndereco: string | null;
  destinoEndereco: string | null;
  loading: boolean;
  error: string | null;
}

export function useRouteAddresses(empresaId: string | null) {
  const [addresses, setAddresses] = useState<RouteAddresses>({
    origemCep: null,
    destinoCep: null,
    origemEndereco: null,
    destinoEndereco: null,
    loading: false,
    error: null
  });

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!empresaId) {
        setAddresses({
          origemCep: null,
          destinoCep: null,
          origemEndereco: null,
          destinoEndereco: null,
          loading: false,
          error: null
        });
        return;
      }

      setAddresses(prev => ({ ...prev, loading: true, error: null }));

      try {
        // 1. Get current authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setAddresses(prev => ({ ...prev, loading: false, error: 'Usuário não autenticado' }));
          return;
        }

        // 2. Get user's unit (unidade) from usuarios table
        const { data: usuario, error: usuarioError } = await supabase
          .from('usuarios')
          .select('unidade_id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (usuarioError || !usuario?.unidade_id) {
          setAddresses(prev => ({ ...prev, loading: false, error: 'Usuário sem unidade cadastrada' }));
          return;
        }

        // 3. Get unit's full address (origin)
        const { data: unidade, error: unidadeError } = await supabase
          .from('unidades')
          .select('cep, logradouro, numero, bairro, cidade, uf')
          .eq('id', usuario.unidade_id)
          .maybeSingle();

        if (unidadeError || !unidade?.cep) {
          setAddresses(prev => ({ ...prev, loading: false, error: 'Unidade sem CEP cadastrado' }));
          return;
        }

        const origemCep = unidade.cep.replace(/\D/g, '');
        const origemEndereco = [
          unidade.logradouro,
          unidade.numero,
          unidade.bairro,
          unidade.cidade,
          unidade.uf
        ].filter(Boolean).join(', ');

        // 4. Get empresa's full address (destination)
        const { data: empresa, error: empresaError } = await supabase
          .from('empresas')
          .select('cep, endereco, bairro, cidade, estado')
          .eq('id', empresaId)
          .maybeSingle();

        if (empresaError || !empresa?.cep) {
          setAddresses({
            origemCep,
            origemEndereco,
            destinoCep: null,
            destinoEndereco: null,
            loading: false,
            error: 'Cliente sem CEP cadastrado'
          });
          return;
        }

        const destinoCep = empresa.cep.replace(/\D/g, '');
        const destinoEndereco = [
          empresa.endereco,
          empresa.bairro,
          empresa.cidade,
          empresa.estado
        ].filter(Boolean).join(', ');

        setAddresses({
          origemCep,
          origemEndereco,
          destinoCep,
          destinoEndereco,
          loading: false,
          error: null
        });
      } catch (error) {
        console.error('Error fetching route addresses:', error);
        setAddresses(prev => ({ ...prev, loading: false, error: 'Erro ao buscar endereços' }));
      }
    };

    fetchAddresses();
  }, [empresaId]);

  return addresses;
}
