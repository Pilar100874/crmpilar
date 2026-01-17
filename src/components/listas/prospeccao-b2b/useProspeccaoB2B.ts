import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';
import { ProspectB2B, ProspectB2BInsert, BuscaB2B, ConfigB2B, ApiLogB2B, PolygonPoint } from './types';
import { useToast } from '@/hooks/use-toast';

export function useProspeccaoB2B() {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [prospects, setProspects] = useState<ProspectB2B[]>([]);
  const [buscas, setBuscas] = useState<BuscaB2B[]>([]);
  const [config, setConfig] = useState<ConfigB2B | null>(null);
  const [apiLogs, setApiLogs] = useState<ApiLogB2B[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const { toast } = useToast();

  // Carregar estabelecimento
  useEffect(() => {
    const loadEstabelecimento = async () => {
      const id = await getEstabelecimentoId();
      setEstabelecimentoId(id);
    };
    loadEstabelecimento();
  }, []);

  // Carregar configuração
  const loadConfig = useCallback(async () => {
    if (!estabelecimentoId) return;
    
    const { data, error } = await supabase
      .from('prospects_b2b_config')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .maybeSingle();

    if (data) {
      setConfig(data);
    } else if (!error) {
      // Criar config padrão
      const { data: newConfig } = await supabase
        .from('prospects_b2b_config')
        .insert({
          estabelecimento_id: estabelecimentoId,
          limite_resultados_por_busca: 50,
          custo_por_chamada: 0.017
        })
        .select()
        .single();
      
      if (newConfig) {
        setConfig(newConfig);
      }
    }
  }, [estabelecimentoId]);

  // Carregar prospects
  const loadProspects = useCallback(async () => {
    if (!estabelecimentoId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('prospects_b2b')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Erro', description: 'Falha ao carregar prospects', variant: 'destructive' });
    } else {
      setProspects(data || []);
    }
    setLoading(false);
  }, [estabelecimentoId, toast]);

  // Carregar buscas
  const loadBuscas = useCallback(async () => {
    if (!estabelecimentoId) return;

    const { data } = await supabase
      .from('prospects_b2b_buscas')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setBuscas(data);
    }
  }, [estabelecimentoId]);

  // Carregar logs de API (para monitoramento de gastos)
  const loadApiLogs = useCallback(async () => {
    if (!estabelecimentoId) return;

    const { data } = await supabase
      .from('prospects_b2b_api_log')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) {
      setApiLogs(data);
    }
  }, [estabelecimentoId]);

  // Salvar configuração
  const saveConfig = async (newConfig: Partial<ConfigB2B>) => {
    if (!estabelecimentoId || !config) return;

    const { error } = await supabase
      .from('prospects_b2b_config')
      .update(newConfig as any)
      .eq('id', config.id);

    if (error) {
      toast({ title: 'Erro', description: 'Falha ao salvar configuração', variant: 'destructive' });
    } else {
      setConfig({ ...config, ...newConfig } as ConfigB2B);
      toast({ title: 'Sucesso', description: 'Configuração salva' });
    }
  };

  // Registrar log de API
  const logApiCall = async (buscaId: string | null, tipoRequisicao: string, sucesso: boolean) => {
    if (!estabelecimentoId || !config) return;
    const cfg = config as any;

    await supabase.from('prospects_b2b_api_log').insert({
      estabelecimento_id: estabelecimentoId,
      busca_id: buscaId,
      tipo_chamada: tipoRequisicao,
      custo_chamada: cfg.custo_por_chamada || 0.017,
      resposta_status: sucesso ? 200 : 500
    });
  };

  // Buscar empresas usando Google Places API
  const searchPlaces = async (keyword: string, polygon: PolygonPoint[]) => {
    const cfg = config as any;
    if (!estabelecimentoId || !cfg?.google_places_api_key) {
      toast({ 
        title: 'Configuração necessária', 
        description: 'Configure sua API Key do Google Places nos parâmetros', 
        variant: 'destructive' 
      });
      return;
    }

    if (!keyword || polygon.length < 3) {
      toast({ 
        title: 'Dados inválidos', 
        description: 'Informe uma palavra-chave e desenhe uma área no mapa', 
        variant: 'destructive' 
      });
      return;
    }

    setSearching(true);
    setSearchProgress(0);

    try {
      // Calcular bounding box do polígono
      const lats = polygon.map(p => p.lat);
      const lngs = polygon.map(p => p.lng);
      const boundingBox = {
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lngs),
        west: Math.min(...lngs)
      };

      // Centro do polígono
      const centerLat = (boundingBox.north + boundingBox.south) / 2;
      const centerLng = (boundingBox.east + boundingBox.west) / 2;

      // Calcular raio aproximado (em metros)
      const latDiff = boundingBox.north - boundingBox.south;
      const lngDiff = boundingBox.east - boundingBox.west;
      const radiusKm = Math.max(latDiff, lngDiff) * 111 / 2; // Aproximação
      const radius = Math.min(radiusKm * 1000, 50000); // Max 50km

      // Criar registro de busca
      const { data: buscaData, error: buscaError } = await supabase
        .from('prospects_b2b_buscas')
        .insert({
          estabelecimento_id: estabelecimentoId,
          palavra_chave: keyword,
          area_poligono: polygon as any,
          bounding_box: boundingBox as any,
          total_resultados: 0,
          status: 'em_andamento'
        })
        .select()
        .single();

      if (buscaError) throw buscaError;
      const buscaId = buscaData.id;

      setSearchProgress(10);

      // Usar CORS proxy para chamar a API do Google Places
      const proxyUrl = 'https://corsproxy.io/?';
      const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${centerLat},${centerLng}&radius=${radius}&keyword=${encodeURIComponent(keyword)}&key=${cfg.google_places_api_key}`;
      
      const response = await fetch(proxyUrl + encodeURIComponent(placesUrl));
      const data = await response.json();

      await logApiCall(buscaId, 'nearbysearch', data.status === 'OK');

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(data.error_message || `API Error: ${data.status}`);
      }

      setSearchProgress(40);

      const results = data.results || [];
      const limitedResults = results.slice(0, cfg.limite_resultados_por_busca || 50);
      const newProspects: ProspectB2BInsert[] = [];

      for (let i = 0; i < limitedResults.length; i++) {
        const place = limitedResults[i];
        setSearchProgress(40 + ((i / limitedResults.length) * 50));

        // Verificar se já existe
        const { data: existing } = await supabase
          .from('prospects_b2b')
          .select('id')
          .eq('estabelecimento_id', estabelecimentoId)
          .eq('place_id', place.place_id)
          .maybeSingle();

        if (!existing) {
          // Extrair cidade/estado do endereço
          const addressParts = (place.vicinity || '').split(',').map((s: string) => s.trim());
          
          newProspects.push({
            estabelecimento_id: estabelecimentoId,
            place_id: place.place_id,
            nome: place.name,
            categoria: place.types?.join(', '),
            endereco_completo: place.vicinity,
            cidade: addressParts[addressParts.length - 1] || '',
            latitude: place.geometry?.location?.lat,
            longitude: place.geometry?.location?.lng,
            rating: place.rating,
            total_avaliacoes: place.user_ratings_total,
            fonte_dados: 'google_places',
            status_lead: 'novo',
            busca_id: buscaId,
            palavra_chave_busca: keyword
          });
        }
      }

      if (newProspects.length > 0) {
        const { error: insertError } = await supabase
          .from('prospects_b2b')
          .insert(newProspects);

        if (insertError) throw insertError;
      }

      // Atualizar busca
      await supabase
        .from('prospects_b2b_buscas')
        .update({ 
          total_resultados: newProspects.length,
          status: 'concluida',
          custo_estimado: (limitedResults.length + 1) * (cfg.custo_por_chamada || 0.017)
        })
        .eq('id', buscaId);

      setSearchProgress(100);
      
      toast({ 
        title: 'Busca concluída', 
        description: `${newProspects.length} novas empresas encontradas` 
      });

      await loadProspects();
      await loadBuscas();
      await loadApiLogs();

    } catch (error: any) {
      console.error('Search error:', error);
      toast({ 
        title: 'Erro na busca', 
        description: error.message || 'Falha ao buscar empresas', 
        variant: 'destructive' 
      });
    } finally {
      setSearching(false);
      setSearchProgress(0);
    }
  };

  // Atualizar status do prospect
  const updateProspectStatus = async (prospectId: string, status: string) => {
    const { error } = await supabase
      .from('prospects_b2b')
      .update({ status_lead: status })
      .eq('id', prospectId);

    if (error) {
      toast({ title: 'Erro', description: 'Falha ao atualizar status', variant: 'destructive' });
    } else {
      setProspects(prev => 
        prev.map(p => p.id === prospectId ? { ...p, status_lead: status } : p)
      );
    }
  };

  // Excluir prospect
  const deleteProspect = async (prospectId: string) => {
    const { error } = await supabase
      .from('prospects_b2b')
      .delete()
      .eq('id', prospectId);

    if (error) {
      toast({ title: 'Erro', description: 'Falha ao excluir', variant: 'destructive' });
    } else {
      setProspects(prev => prev.filter(p => p.id !== prospectId));
      toast({ title: 'Sucesso', description: 'Prospect excluído' });
    }
  };

  // Calcular gastos
  const getGastosInfo = useCallback(() => {
    const cfg = config as any;
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    const logsDoMes = apiLogs.filter(log => 
      new Date(log.created_at || '') >= inicioMes
    );

    const custoTotal = logsDoMes.reduce((sum, log) => sum + (log.custo_chamada || 0), 0);
    const requisicoes = logsDoMes.length;
    const limiteAtingido = cfg?.limite_custo_mensal 
      ? custoTotal >= cfg.limite_custo_mensal 
      : false;

    return {
      custoMensal: custoTotal,
      requisicoesDoMes: requisicoes,
      limiteAtingido,
      limiteMensal: cfg?.limite_custo_mensal || null
    };
  }, [apiLogs, config]);

  useEffect(() => {
    if (estabelecimentoId) {
      loadConfig();
      loadProspects();
      loadBuscas();
      loadApiLogs();
    }
  }, [estabelecimentoId, loadConfig, loadProspects, loadBuscas, loadApiLogs]);

  return {
    estabelecimentoId,
    prospects,
    buscas,
    config,
    apiLogs,
    loading,
    searching,
    searchProgress,
    loadProspects,
    loadConfig,
    saveConfig,
    searchPlaces,
    updateProspectStatus,
    deleteProspect,
    getGastosInfo
  };
}
