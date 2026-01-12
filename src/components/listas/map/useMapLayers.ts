import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MapLayer, DEFAULT_LAYERS, VendasRegiao, DADOS_DEMOGRAFICOS_UF, Unidade } from './MapLayerTypes';

interface Empresa {
  id: string;
  nome_fantasia: string;
  nome: string;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface Usuario {
  id: string;
  nome: string;
}

interface EmpresaVinculo {
  empresa_id: string;
  usuario_id: string | null;
}

export const useMapLayers = () => {
  const [layers, setLayers] = useState<MapLayer[]>(DEFAULT_LAYERS);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [vinculos, setVinculos] = useState<EmpresaVinculo[]>([]);
  const [vendasData, setVendasData] = useState<VendasRegiao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsuarioId, setSelectedUsuarioId] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empresasRes, usuariosRes, empresaVinculosRes, unidadesRes] = await Promise.all([
        supabase.from('empresas').select('id, nome_fantasia, nome, endereco, cidade, estado, latitude, longitude'),
        supabase.from('usuarios').select('id, nome'),
        supabase.from('empresa_vinculos').select('empresa_id, usuario_id'),
        supabase.from('unidades').select('id, nome, cep, logradouro, numero, complemento, bairro, cidade, uf, latitude, longitude')
      ]);

      if (empresasRes.data) setEmpresas(empresasRes.data);
      if (usuariosRes.data) setUsuarios(usuariosRes.data);
      
      // Processa unidades e geocodifica as que não têm coordenadas
      if (unidadesRes.data) {
        const unidadesComCoordenadas = unidadesRes.data.filter(u => u.latitude && u.longitude);
        const unidadesSemCoordenadas = unidadesRes.data.filter(u => !u.latitude && !u.longitude);
        
        // Geocodificar unidades sem coordenadas (até 5 por vez para não sobrecarregar)
        for (const unidade of unidadesSemCoordenadas.slice(0, 5)) {
          try {
            const addressParts = [
              unidade.logradouro,
              unidade.numero,
              unidade.bairro,
              unidade.cidade,
              unidade.uf,
              'Brasil'
            ].filter(Boolean).join(', ');
            
            if (addressParts.length > 10) {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressParts)}&limit=1`
              );
              const data = await response.json();
              
              if (data?.[0]) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                
                // Salvar no banco
                await supabase
                  .from('unidades')
                  .update({ latitude: lat, longitude: lon })
                  .eq('id', unidade.id);
                
                // Adicionar à lista com coordenadas
                unidadesComCoordenadas.push({ ...unidade, latitude: lat, longitude: lon });
              }
              
              // Delay para respeitar rate limit do Nominatim
              await new Promise(resolve => setTimeout(resolve, 1100));
            }
          } catch (error) {
            console.error('Erro geocodificando unidade:', error);
          }
        }
        
        setUnidades([...unidadesComCoordenadas, ...unidadesSemCoordenadas.slice(5)]);
      }
      
      if (empresaVinculosRes.data) {
        setVinculos(empresaVinculosRes.data.map(v => ({
          empresa_id: v.empresa_id,
          usuario_id: v.usuario_id
        })));
      }

      // Buscar dados de vendas/orçamentos agrupados por região
      const orcamentosRes = await supabase
        .from('orcamentos')
        .select(`
          id,
          valor_total,
          status,
          empresa_id,
          empresas!inner(id, nome, cidade, estado, latitude, longitude)
        `);

      if (orcamentosRes.data) {
        const vendasPorRegiao: Record<string, VendasRegiao> = {};
        
        orcamentosRes.data.forEach((orc: any) => {
          const empresa = orc.empresas;
          if (!empresa) return;
          
          const key = `${empresa.estado || 'N/A'}-${empresa.cidade || 'N/A'}`;
          
          if (!vendasPorRegiao[key]) {
            vendasPorRegiao[key] = {
              uf: empresa.estado || 'N/A',
              cidade: empresa.cidade || 'Não informada',
              total_orcamentos: 0,
              total_vendas: 0,
              valor_total: 0,
              ticket_medio: 0,
              latitude: empresa.latitude,
              longitude: empresa.longitude
            };
          }
          
          vendasPorRegiao[key].total_orcamentos++;
          if (orc.status === 'venda' || orc.status === 'aprovado') {
            vendasPorRegiao[key].total_vendas++;
            vendasPorRegiao[key].valor_total += Number(orc.valor_total) || 0;
          }
        });

        // Calcular ticket médio
        Object.values(vendasPorRegiao).forEach(v => {
          if (v.total_vendas > 0) {
            v.ticket_medio = v.valor_total / v.total_vendas;
          }
        });

        setVendasData(Object.values(vendasPorRegiao));
      }
    } catch (error) {
      console.error('Error fetching map data:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleLayer = useCallback((layerId: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
    ));
  }, []);

  const filteredEmpresas = (() => {
    let filtered = empresas.filter(e => e.latitude && e.longitude);
    
    if (selectedUsuarioId === 'none') {
      const empresasComVinculo = new Set(vinculos.map(v => v.empresa_id));
      filtered = filtered.filter(e => !empresasComVinculo.has(e.id));
    } else if (selectedUsuarioId !== 'all') {
      const empresasDoUsuario = vinculos
        .filter(v => v.usuario_id === selectedUsuarioId)
        .map(v => v.empresa_id);
      filtered = filtered.filter(e => empresasDoUsuario.includes(e.id));
    }
    
    return filtered;
  })();

  const getDemographicsData = useCallback(() => {
    return Object.entries(DADOS_DEMOGRAFICOS_UF).map(([uf, data]) => ({
      uf,
      ...data
    }));
  }, []);

  return {
    layers,
    toggleLayer,
    empresas: filteredEmpresas,
    allEmpresas: empresas,
    unidades,
    usuarios,
    vinculos,
    vendasData,
    loading,
    fetchData,
    selectedUsuarioId,
    setSelectedUsuarioId,
    getDemographicsData
  };
};
