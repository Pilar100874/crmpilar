import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PedagioResult {
  ida: number;
  volta: number;
  total: number;
  distanciaIdaKm: number;
  distanciaVoltaKm: number;
  distanciaTotalKm: number;
  tempoIdaMin: number;
  tempoVoltaMin: number;
  tempoTotalMin: number;
  loading: boolean;
  error: string | null;
  origemCep: string | null;
  destinoCep: string | null;
  origemEndereco: string | null;
  destinoEndereco: string | null;
  origemCoords: { lat: number; lng: number } | null;
  destinoCoords: { lat: number; lng: number } | null;
  rawResponse: any | null;
}

export const usePedagioCalculation = (
  estabelecimentoId: string,
  empresaId: string | null
) => {
  const [result, setResult] = useState<PedagioResult>({
    ida: 0,
    volta: 0,
    total: 0,
    distanciaIdaKm: 0,
    distanciaVoltaKm: 0,
    distanciaTotalKm: 0,
    tempoIdaMin: 0,
    tempoVoltaMin: 0,
    tempoTotalMin: 0,
    loading: false,
    error: null,
    origemCep: null,
    destinoCep: null,
    origemEndereco: null,
    destinoEndereco: null,
    origemCoords: null,
    destinoCoords: null,
    rawResponse: null
  });

  useEffect(() => {
    const calculatePedagio = async () => {
      if (!empresaId || !estabelecimentoId) {
        setResult(prev => ({ 
          ...prev, 
          ida: 0, volta: 0, total: 0, 
          distanciaIdaKm: 0, distanciaVoltaKm: 0, distanciaTotalKm: 0,
          tempoIdaMin: 0, tempoVoltaMin: 0, tempoTotalMin: 0,
          origemCep: null, destinoCep: null,
          origemEndereco: null, destinoEndereco: null,
          origemCoords: null, destinoCoords: null,
          rawResponse: null
        }));
        return;
      }

      setResult(prev => ({ ...prev, loading: true, error: null }));

      try {
        // 1. Get current authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setResult(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'Usuário não autenticado' 
          }));
          return;
        }

        // 2. Get user's unit (unidade) from usuarios table
        const { data: usuario, error: usuarioError } = await supabase
          .from('usuarios')
          .select('unidade_id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (usuarioError || !usuario?.unidade_id) {
          setResult(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'Usuário sem unidade cadastrada' 
          }));
          return;
        }

        // 3. Get unit's full address (origin)
        const { data: unidade, error: unidadeError } = await supabase
          .from('unidades')
          .select('cep, logradouro, numero, bairro, cidade, uf')
          .eq('id', usuario.unidade_id)
          .maybeSingle();

        if (unidadeError || !unidade?.cep) {
          setResult(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'Unidade sem CEP cadastrado' 
          }));
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
          setResult(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'Cliente sem CEP cadastrado',
            origemCep,
            origemEndereco
          }));
          return;
        }

        const destinoCep = empresa.cep.replace(/\D/g, '');
        const destinoEndereco = [
          empresa.endereco,
          empresa.bairro,
          empresa.cidade,
          empresa.estado
        ].filter(Boolean).join(', ');

        // 5. Get toll API configuration
        const { data: pedagioConfig, error: configError } = await supabase
          .from('pedagio_api_config')
          .select('*')
          .eq('estabelecimento_id', estabelecimentoId)
          .eq('ativo', true)
          .maybeSingle();

        if (configError || !pedagioConfig) {
          setResult(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'API de pedágio não configurada',
            origemCep,
            destinoCep,
            origemEndereco,
            destinoEndereco
          }));
          return;
        }

        // 6. Call Edge Function to calculate toll with full addresses
        const { data: tollData, error: tollError } = await supabase.functions.invoke('calcular-pedagio', {
          body: {
            provider: pedagioConfig.provider,
            api_key: pedagioConfig.api_key,
            configuracoes: pedagioConfig.configuracoes,
            origem_cep: origemCep,
            destino_cep: destinoCep,
            origem_endereco: origemEndereco,
            destino_endereco: destinoEndereco
          }
        });

        if (tollError) {
          console.error('Erro na Edge Function:', tollError);
          setResult(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'Erro ao calcular pedágio',
            origemCep,
            destinoCep,
            origemEndereco,
            destinoEndereco
          }));
          return;
        }

        if (tollData?.error) {
          setResult({
            ida: 0,
            volta: 0,
            total: 0,
            distanciaIdaKm: 0,
            distanciaVoltaKm: 0,
            distanciaTotalKm: 0,
            tempoIdaMin: 0,
            tempoVoltaMin: 0,
            tempoTotalMin: 0,
            loading: false,
            error: tollData.error,
            origemCep,
            destinoCep,
            origemEndereco,
            destinoEndereco,
            origemCoords: null,
            destinoCoords: null,
            rawResponse: null
          });
          return;
        }

        setResult({
          ida: tollData?.ida || 0,
          volta: tollData?.volta || 0,
          total: tollData?.total || 0,
          distanciaIdaKm: tollData?.distanciaIdaKm || 0,
          distanciaVoltaKm: tollData?.distanciaVoltaKm || 0,
          distanciaTotalKm: tollData?.distanciaTotalKm || 0,
          tempoIdaMin: tollData?.tempoIdaMin || 0,
          tempoVoltaMin: tollData?.tempoVoltaMin || 0,
          tempoTotalMin: tollData?.tempoTotalMin || 0,
          loading: false,
          error: null,
          origemCep,
          destinoCep,
          origemEndereco,
          destinoEndereco,
          origemCoords: tollData?.origem_coords || null,
          destinoCoords: tollData?.destino_coords || null,
          rawResponse: tollData
        });

      } catch (error: any) {
        console.error('Erro ao calcular pedágio:', error);
        setResult(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Erro ao calcular pedágio' 
        }));
      }
    };

    calculatePedagio();
  }, [estabelecimentoId, empresaId]);

  return result;
};
