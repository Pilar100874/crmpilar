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

  // Registrar log de API com custo específico
  const logApiCall = async (buscaId: string | null, tipoRequisicao: string, sucesso: boolean, custoCustom?: number) => {
    if (!estabelecimentoId || !config) return;
    const cfg = config as any;

    await supabase.from('prospects_b2b_api_log').insert({
      estabelecimento_id: estabelecimentoId,
      busca_id: buscaId,
      tipo_chamada: tipoRequisicao,
      custo_chamada: custoCustom ?? cfg.custo_por_chamada ?? 0.032,
      resposta_status: sucesso ? 200 : 500
    });
  };

  // Buscar Place Details para obter telefone, website, etc.
  const fetchPlaceDetails = async (
    placeId: string, 
    apiKey: string, 
    campos: { contact: boolean; atmosphere: boolean }
  ): Promise<{ telefone?: string; website?: string; horario_funcionamento?: any; google_maps_url?: string } | null> => {
    // Construir lista de campos a buscar
    const fieldsList: string[] = [];
    if (campos.contact) {
      fieldsList.push('formatted_phone_number', 'international_phone_number', 'website', 'opening_hours');
    }
    if (campos.atmosphere) {
      fieldsList.push('url', 'reviews', 'photos');
    }
    
    if (fieldsList.length === 0) return null;

    try {
      const proxyUrl = 'https://corsproxy.io/?';
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fieldsList.join(',')}&key=${apiKey}`;
      
      const response = await fetch(proxyUrl + encodeURIComponent(detailsUrl));
      const data = await response.json();
      
      if (data.status === 'OK' && data.result) {
        return {
          telefone: data.result.formatted_phone_number || data.result.international_phone_number,
          website: data.result.website,
          horario_funcionamento: data.result.opening_hours,
          google_maps_url: data.result.url
        };
      }
    } catch (error) {
      console.error('Erro ao buscar Place Details:', error);
    }
    return null;
  };

  // Verificar se o limite de gastos foi atingido
  const checkGastoLimite = useCallback(async (): Promise<{ permitido: boolean; gastoAtual: number; limite: number | null }> => {
    const cfg = config as any;
    const limite = cfg?.limite_custo_mensal;
    
    if (!limite || !estabelecimentoId) {
      return { permitido: true, gastoAtual: 0, limite: null };
    }

    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
    
    const { data: logsDoMes } = await supabase
      .from('prospects_b2b_api_log')
      .select('custo_chamada')
      .eq('estabelecimento_id', estabelecimentoId)
      .gte('created_at', inicioMes);

    const gastoAtual = (logsDoMes || []).reduce((sum, log) => sum + (log.custo_chamada || 0), 0);
    
    return {
      permitido: gastoAtual < limite,
      gastoAtual,
      limite
    };
  }, [config, estabelecimentoId]);

  // Verificar se place_id já existe na base (ANTES de gastar dinheiro)
  const checkDuplicados = async (placeIds: string[]): Promise<Set<string>> => {
    if (!estabelecimentoId || placeIds.length === 0) return new Set();

    const { data: existentes } = await supabase
      .from('prospects_b2b')
      .select('place_id')
      .eq('estabelecimento_id', estabelecimentoId)
      .in('place_id', placeIds);

    return new Set((existentes || []).map(e => e.place_id).filter(Boolean));
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

    // VERIFICAR LIMITE DE GASTOS ANTES DE COMEÇAR
    const gastoCheck = await checkGastoLimite();
    if (!gastoCheck.permitido) {
      toast({ 
        title: 'Limite de gastos atingido', 
        description: `Você já gastou $${gastoCheck.gastoAtual.toFixed(2)} de $${gastoCheck.limite?.toFixed(2)} neste mês. Aumente o limite nos parâmetros.`, 
        variant: 'destructive' 
      });
      return;
    }

    setSearching(true);
    setSearchProgress(0);

    let custoAcumulado = gastoCheck.gastoAtual;
    const limiteGasto = gastoCheck.limite;
    const custoPorChamada = cfg.custo_por_chamada || 0.017;

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

      // Verificar se ainda há orçamento para a chamada de busca
      if (limiteGasto && custoAcumulado + custoPorChamada > limiteGasto) {
        await supabase
          .from('prospects_b2b_buscas')
          .update({ status: 'cancelada_limite_gasto' })
          .eq('id', buscaId);
        
        toast({ 
          title: 'Busca cancelada', 
          description: 'Limite de gastos seria excedido', 
          variant: 'destructive' 
        });
        return;
      }

      // Usar CORS proxy para chamar a API do Google Places
      const proxyUrl = 'https://corsproxy.io/?';
      const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${centerLat},${centerLng}&radius=${radius}&keyword=${encodeURIComponent(keyword)}&key=${cfg.google_places_api_key}`;
      
      const response = await fetch(proxyUrl + encodeURIComponent(placesUrl));
      const data = await response.json();

      // Registrar custo da chamada de busca
      await logApiCall(buscaId, 'nearbysearch', data.status === 'OK');
      custoAcumulado += custoPorChamada;

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(data.error_message || `API Error: ${data.status}`);
      }

      setSearchProgress(30);

      const results = data.results || [];
      const limitedResults = results.slice(0, cfg.limite_resultados_por_busca || 50);
      
      // VERIFICAR DUPLICADOS ANTES DE PROCESSAR (economia de dinheiro!)
      const todosPlaceIds = limitedResults.map((p: any) => p.place_id);
      const duplicados = await checkDuplicados(todosPlaceIds);
      
      // Filtrar apenas os que não existem
      const novosResults = limitedResults.filter((p: any) => !duplicados.has(p.place_id));
      
      const duplicadosCount = limitedResults.length - novosResults.length;
      if (duplicadosCount > 0) {
        console.log(`💰 Economia: ${duplicadosCount} empresas já existentes ignoradas (evitou gastar $${(duplicadosCount * custoPorChamada).toFixed(3)})`);
      }

      setSearchProgress(40);

      const newProspects: ProspectB2BInsert[] = [];
      let parouPorLimite = false;
      const camposDetails = cfg.campos_place_details || { contact: false, atmosphere: false };
      const buscarDetalhes = camposDetails.contact || camposDetails.atmosphere;
      
      // Calcular custo por empresa para detalhes
      let custoPorDetalhe = 0;
      if (camposDetails.contact) custoPorDetalhe += 0.003;
      if (camposDetails.atmosphere) custoPorDetalhe += 0.005;

      for (let i = 0; i < novosResults.length; i++) {
        const place = novosResults[i];
        setSearchProgress(40 + ((i / novosResults.length) * 50));

        // VERIFICAR LIMITE A CADA ITERAÇÃO
        const custoProximaOperacao = buscarDetalhes ? custoPorDetalhe : 0;
        if (limiteGasto && custoAcumulado + custoProximaOperacao > limiteGasto) {
          parouPorLimite = true;
          toast({ 
            title: 'Limite de gastos atingido', 
            description: `Busca interrompida ao atingir $${limiteGasto.toFixed(2)}. ${newProspects.length} empresas processadas.`, 
            variant: 'default' 
          });
          break;
        }

        // Buscar detalhes adicionais se configurado
        let detalhes: { telefone?: string; website?: string; horario_funcionamento?: any; google_maps_url?: string } | null = null;
        if (buscarDetalhes) {
          detalhes = await fetchPlaceDetails(place.place_id, cfg.google_places_api_key, camposDetails);
          
          // Registrar custo da chamada de detalhes
          if (detalhes) {
            await logApiCall(buscaId, 'place_details', true, custoPorDetalhe);
            custoAcumulado += custoPorDetalhe;
          }
        }

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
          palavra_chave_busca: keyword,
          // Dados do Place Details
          telefone: detalhes?.telefone,
          website: detalhes?.website,
          google_maps_link: detalhes?.google_maps_url
        });
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
          status: parouPorLimite ? 'parada_limite_gasto' : 'concluida',
          custo_estimado: custoAcumulado - gastoCheck.gastoAtual
        })
        .eq('id', buscaId);

      setSearchProgress(100);
      
      const mensagem = duplicadosCount > 0 
        ? `${newProspects.length} novas empresas encontradas (${duplicadosCount} duplicadas ignoradas)` 
        : `${newProspects.length} novas empresas encontradas`;
      
      toast({ 
        title: parouPorLimite ? 'Busca interrompida' : 'Busca concluída', 
        description: mensagem 
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

  // Importar prospect(s) B2B para o cadastro de Empresas como "prospect"
  const importarParaEmpresas = async (prospectIds: string[]): Promise<{ ok: number; fail: number; jaImportados: number }> => {
    if (!estabelecimentoId) return { ok: 0, fail: 0, jaImportados: 0 };
    let ok = 0, fail = 0, jaImportados = 0;

    for (const pid of prospectIds) {
      const p = prospects.find(x => x.id === pid) as any;
      if (!p) { fail++; continue; }
      if (p.empresa_id) { jaImportados++; continue; }

      const { data: emp, error } = await supabase
        .from('empresas')
        .insert({
          estabelecimento_id: estabelecimentoId,
          nome: p.nome,
          nome_fantasia: p.nome,
          telefone: p.telefone,
          endereco: p.endereco_completo,
          cidade: p.cidade,
          estado: p.estado,
          cep: p.cep,
          latitude: p.latitude,
          longitude: p.longitude,
          site: p.website,
          status_comercial: 'prospect',
          origem_prospeccao: p.fonte_dados || 'google_places',
          tipo_cliente: 'B2B',
          custom_fields: {
            categoria: p.categoria,
            rating: p.rating,
            total_avaliacoes: p.total_avaliacoes,
            google_maps_link: p.google_maps_link,
            place_id: p.place_id,
          },
        } as any)
        .select('id')
        .single();

      if (error || !emp) { fail++; continue; }

      await supabase
        .from('prospects_b2b')
        .update({ empresa_id: emp.id, status_lead: 'cliente' } as any)
        .eq('id', pid);

      setProspects(prev => prev.map(x => x.id === pid ? { ...x, empresa_id: emp.id, status_lead: 'cliente' } as any : x));
      ok++;
    }

    if (ok) toast({ title: 'Importado', description: `${ok} empresa(s) criadas como prospect no CRM` });
    if (fail) toast({ title: 'Atenção', description: `${fail} falharam`, variant: 'destructive' });
    if (jaImportados) toast({ title: 'Já importados', description: `${jaImportados} já estavam no CRM` });

    return { ok, fail, jaImportados };

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
    const limite = cfg?.limite_custo_mensal;
    const limiteAtingido = limite ? custoTotal >= limite : false;
    const percentualUsado = limite ? (custoTotal / limite) * 100 : 0;

    return {
      custoMensal: custoTotal,
      requisicoesDoMes: requisicoes,
      limiteAtingido,
      limiteMensal: limite || null,
      percentualUsado: Math.min(percentualUsado, 100),
      saldoRestante: limite ? Math.max(limite - custoTotal, 0) : null
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
