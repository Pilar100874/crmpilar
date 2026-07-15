import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PosicaoPayload {
  veiculoId: string;
  lat: number;
  lng: number;
  velocidade?: number;
  direcao?: number;
  dataHora?: string;
  token?: string;
}

// Traccar Client App format (background geolocation plugin)
interface TraccarClientPayload {
  location?: {
    timestamp?: string;
    coords?: {
      latitude?: number;
      longitude?: number;
      speed?: number;
      heading?: number;
      accuracy?: number;
    };
    is_moving?: boolean;
  };
  device_id?: string;
}

interface CondicaoTempo {
  tempo_minutos: number;
  label?: string;
}

interface AutomacaoFlowNode {
  id: string;
  type: string;
  data: {
    type: string;
    label: string;
    config: {
      condicoes_tempo?: CondicaoTempo[];
      tempo_minutos?: number; // Retrocompatibilidade
      icone_parada?: string;
      cor_icone_parada?: string;
      legenda_parada?: string;
      velocidade_km?: number;
      operador_velocidade?: 'maior' | 'menor';
      telefone?: string;
      mensagem?: string;
      titulo?: string;
      [key: string]: unknown;
    };
  };
}

interface AutomacaoFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

// Parse OsmAnd/Traccar format from query string
function parseOsmAndFormat(url: URL): PosicaoPayload | null {
  const id = url.searchParams.get('id');
  const lat = url.searchParams.get('lat');
  const lon = url.searchParams.get('lon') || url.searchParams.get('lng');
  const speed = url.searchParams.get('speed');
  const bearing = url.searchParams.get('bearing') || url.searchParams.get('hdop');
  const timestamp = url.searchParams.get('timestamp');
  const token = url.searchParams.get('token');
  
  if (!id || !lat || !lon) {
    return null;
  }
  
  return {
    veiculoId: id,
    lat: parseFloat(lat),
    lng: parseFloat(lon),
    velocidade: speed ? parseFloat(speed) * 3.6 : 0, // Convert m/s to km/h
    direcao: bearing ? parseFloat(bearing) : undefined,
    dataHora: timestamp ? new Date(parseInt(timestamp) * 1000).toISOString() : new Date().toISOString(),
    token: token || undefined
  };
}

async function validateToken(supabase: any, token: string): Promise<{ valid: boolean; estabelecimentoId?: string }> {
  // Token validation is now optional - if no token provided, still allow tracking
  // The vehicle's estabelecimento_id will be used from the vehicle record
  if (!token) {
    return { valid: true }; // Allow without token
  }

  const { data, error } = await supabase
    .from('logistica_config')
    .select('estabelecimento_id')
    .eq('token_rastreamento', token)
    .single();

  if (error || !data) {
    console.log('Token validation skipped - will use vehicle estabelecimento_id');
    return { valid: true }; // Still allow - will use vehicle's estabelecimento_id
  }

  return { valid: true, estabelecimentoId: data.estabelecimento_id };
}

interface VeiculoInfo {
  id: string;
  estabelecimento_id: string;
}

async function findVeiculoInfo(supabase: any, deviceId: string, estabelecimentoId?: string): Promise<VeiculoInfo | null> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  // Base query builder - now returns both id and estabelecimento_id
  const buildQuery = (table: string, field: string, value: string) => {
    let query = supabase.from(table).select('id, estabelecimento_id').eq(field, value).eq('ativo', true);
    if (estabelecimentoId) {
      query = query.eq('estabelecimento_id', estabelecimentoId);
    }
    return query.single();
  };
  
  // If it's a UUID, try direct lookup
  if (uuidRegex.test(deviceId)) {
    const { data: veiculo } = await buildQuery('veiculos', 'id', deviceId);
    if (veiculo) return { id: veiculo.id, estabelecimento_id: veiculo.estabelecimento_id };
  }
  
  // Try by traccar_device_id
  const { data: veiculoByDevice } = await buildQuery('veiculos', 'traccar_device_id', deviceId);
  if (veiculoByDevice) return { id: veiculoByDevice.id, estabelecimento_id: veiculoByDevice.estabelecimento_id };
  
  // Try by placa (uppercase)
  const { data: veiculoByPlaca } = await buildQuery('veiculos', 'placa', deviceId.toUpperCase());
  if (veiculoByPlaca) return { id: veiculoByPlaca.id, estabelecimento_id: veiculoByPlaca.estabelecimento_id };
  
  return null;
}

async function savePosition(supabase: any, payload: PosicaoPayload, estabelecimentoId?: string) {
  // Validate coordinates range
  if (payload.lat < -90 || payload.lat > 90 || payload.lng < -180 || payload.lng > 180) {
    return { error: 'Invalid coordinates', status: 400 };
  }

  // Find vehicle by device ID, placa, or UUID - now returns both id and estabelecimento_id
  const veiculoInfo = await findVeiculoInfo(supabase, payload.veiculoId, estabelecimentoId);
  
  if (!veiculoInfo) {
    console.error('Vehicle not found for identifier:', payload.veiculoId);
    return { error: 'Vehicle not found', status: 404 };
  }

  // Insert position
  const { data: posicao, error: posicaoError } = await supabase
    .from('veiculo_posicoes')
    .insert({
      veiculo_id: veiculoInfo.id,
      lat: payload.lat,
      lng: payload.lng,
      velocidade: payload.velocidade || 0,
      direcao: payload.direcao,
      data_hora: payload.dataHora || new Date().toISOString()
    })
    .select()
    .single();

  if (posicaoError) {
    console.error('Error inserting position:', posicaoError);
    return { error: 'Failed to save position', status: 500 };
  }

  console.log('Position saved successfully:', posicao.id, 'for vehicle:', veiculoInfo.id);
  return { 
    data: posicao, 
    status: 200,
    veiculoId: veiculoInfo.id,
    estabelecimentoId: veiculoInfo.estabelecimento_id, // Return estabelecimento_id from vehicle
    velocidade: payload.velocidade || 0
  };
}

// Find connected action nodes from a condition node
function findConnectedActions(
  conditionNodeId: string, 
  edges: AutomacaoFlowEdge[], 
  nodes: AutomacaoFlowNode[],
  outputHandle: string = 'sim'
): AutomacaoFlowNode[] {
  const connectedActions: AutomacaoFlowNode[] = [];
  
  console.log(`🔍 Finding actions from node ${conditionNodeId} with handle "${outputHandle}"`);
  console.log(`📊 Total edges: ${edges.length}`);
  
  for (const edge of edges) {
    if (edge.source === conditionNodeId) {
      console.log(`  Edge found: source=${edge.source}, target=${edge.target}, sourceHandle=${edge.sourceHandle}`);
      
      // Check if edge is from correct output handle
      const handleMatch = edge.sourceHandle === outputHandle || 
                         edge.sourceHandle === `${outputHandle}-0` ||
                         (!edge.sourceHandle && outputHandle === 'sim');
      
      if (handleMatch) {
        const targetNode = nodes.find(n => n.id === edge.target);
        console.log(`  ✅ Handle matched! Target node: ${targetNode?.data?.type}`);
        if (targetNode && targetNode.data?.type?.startsWith('acao_')) {
          connectedActions.push(targetNode);
        }
      } else {
        console.log(`  ❌ Handle "${edge.sourceHandle}" doesn't match "${outputHandle}"`);
      }
    }
  }
  
  console.log(`🎯 Found ${connectedActions.length} connected actions`);
  return connectedActions;
}

// Find the best matching time condition for stopped time
function findMatchingTimeCondition(
  condicoesTempo: CondicaoTempo[],
  minutosParado: number
): CondicaoTempo | null {
  // Sort by time descending to find the highest threshold that is met
  const sortedCondicoes = [...condicoesTempo].sort((a, b) => b.tempo_minutos - a.tempo_minutos);
  
  for (const condicao of sortedCondicoes) {
    if (minutosParado >= condicao.tempo_minutos) {
      return condicao;
    }
  }
  
  return null;
}

// Execute logistics automations for a vehicle
async function executarAutomacoesLogistica(
  supabase: any,
  veiculoId: string,
  lat: number,
  lng: number,
  velocidade: number,
  estabelecimentoId: string
): Promise<void> {
  try {
    console.log('🔄 Executing automations for vehicle:', veiculoId);

    // Fetch active automations for this establishment
    const { data: automacoes, error: autoError } = await supabase
      .from('logistica_automacoes')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('ativo', true);

    if (autoError || !automacoes || automacoes.length === 0) {
      console.log('No active automations found');
      return;
    }

    // Get vehicle's last positions to calculate stopped time
    const { data: posicoes } = await supabase
      .from('veiculo_posicoes')
      .select('*')
      .eq('veiculo_id', veiculoId)
      .order('data_hora', { ascending: false })
      .limit(20);

    // Calculate time stopped (if speed is 0)
    let minutosParado = 0;
    if (velocidade <= 5 && posicoes && posicoes.length > 1) {
      // Find when vehicle started being stopped
      for (const pos of posicoes) {
        if (pos.velocidade <= 5) {
          const diffMs = new Date().getTime() - new Date(pos.data_hora).getTime();
          minutosParado = Math.floor(diffMs / 60000);
        } else {
          break;
        }
      }
    }

    console.log(`Vehicle ${veiculoId}: speed=${velocidade}, stoppedMinutes=${minutosParado}`);

    // Track if we should create a marker (only one per vehicle)
    let markerToCreate: {
      icone: string;
      cor: string;
      legenda: string;
      automacaoId: string;
      automacaoNome: string;
    } | null = null;

    // Process each automation
    for (const automacao of automacoes) {
      const flowData = automacao.flow_data as { nodes?: AutomacaoFlowNode[]; edges?: AutomacaoFlowEdge[] };
      if (!flowData?.nodes) continue;
      
      const nodes = flowData.nodes;
      const edges = flowData.edges || [];

      for (const node of nodes) {
        const nodeType = node.data?.type;
        const config = node.data?.config || {};

        // Handle "condicao_parado" - Vehicle stopped condition
        if (nodeType === 'condicao_parado') {
          // Support both new format (condicoes_tempo) and old format (tempo_minutos)
          const condicoesTempo: CondicaoTempo[] = config.condicoes_tempo || 
            (config.tempo_minutos ? [{ tempo_minutos: config.tempo_minutos }] : [{ tempo_minutos: 30 }]);
          
          console.log(`📋 Configured time conditions: ${JSON.stringify(condicoesTempo)}`);
          
          // Only process if vehicle is stopped
          if (velocidade <= 5) {
            // Find the best matching time condition (highest threshold that is met)
            const condicaoAtendida = findMatchingTimeCondition(condicoesTempo, minutosParado);
            
            if (condicaoAtendida) {
              console.log(`✅ Automation triggered: Vehicle stopped for ${minutosParado} min (threshold: ${condicaoAtendida.tempo_minutos})`);
              
              // The output handle is based on the time condition
              const outputHandle = `tempo_${condicaoAtendida.tempo_minutos}`;
              
              // Find connected action nodes from the matched time output
              let connectedActions = findConnectedActions(node.id, edges, nodes, outputHandle);
              
              // If no actions found for specific time handle, try all time conditions from highest to lowest
              if (connectedActions.length === 0) {
                console.log(`⚠️ No actions for handle "${outputHandle}", trying other time handles...`);
                const sortedCondicoes = [...condicoesTempo].sort((a, b) => b.tempo_minutos - a.tempo_minutos);
                for (const cond of sortedCondicoes) {
                  if (minutosParado >= cond.tempo_minutos) {
                    const altHandle = `tempo_${cond.tempo_minutos}`;
                    connectedActions = findConnectedActions(node.id, edges, nodes, altHandle);
                    if (connectedActions.length > 0) {
                      console.log(`✅ Found actions using handle "${altHandle}"`);
                      break;
                    }
                  }
                }
              }
              
              // Also try legacy 'sim' and 'yes' handles for backwards compatibility
              if (connectedActions.length === 0) {
                console.log(`⚠️ Trying legacy handles 'sim' and 'yes'...`);
                connectedActions.push(...findConnectedActions(node.id, edges, nodes, 'sim'));
                connectedActions.push(...findConnectedActions(node.id, edges, nodes, 'yes'));
              }
              
              console.log(`🎯 Total actions to execute: ${connectedActions.length}`);
              
              for (const actionNode of connectedActions) {
                const actionType = actionNode.data?.type;
                const actionConfig = actionNode.data?.config || {};
                
                console.log(`🔧 Executing action: ${actionType}, config: ${JSON.stringify(actionConfig)}`);
                
                // Handle "acao_marcar_mapa" action
                if (actionType === 'acao_marcar_mapa') {
                  // Only keep the last marker config (overwrites previous)
                  markerToCreate = {
                    icone: actionConfig.icone_parada || 'MapPin',
                    cor: actionConfig.cor_icone_parada || '#EAB308',
                    legenda: actionConfig.legenda_parada || `Parado há ${minutosParado} min`,
                    automacaoId: automacao.id,
                    automacaoNome: automacao.nome
                  };
                  console.log(`📍 Marker config: icon=${markerToCreate.icone}, color=${markerToCreate.cor}, legend=${markerToCreate.legenda}`);
                }
                
                // TODO: Handle other actions (WhatsApp, notification, email)
              }
            }
          }
        }

        // Handle "condicao_velocidade" - Speed exceeded condition
        if (nodeType === 'condicao_velocidade') {
          const velocidadeMaxima = config.velocidade_km || 80;
          const operador = config.operador_velocidade || 'maior';
          
          const velocidadeExcedida = operador === 'maior' 
            ? velocidade > velocidadeMaxima 
            : velocidade < velocidadeMaxima;
          
          if (velocidadeExcedida) {
            console.log(`✅ Automation triggered: Speed ${velocidade} km/h ${operador} ${velocidadeMaxima} km/h`);
            
            // Find connected action nodes
            const connectedActions = findConnectedActions(node.id, edges, nodes, 'sim');
            
            for (const actionNode of connectedActions) {
              const actionType = actionNode.data?.type;
              const actionConfig = actionNode.data?.config || {};
              
              if (actionType === 'acao_marcar_mapa') {
                markerToCreate = {
                  icone: actionConfig.icone_parada || 'Gauge',
                  cor: actionConfig.cor_icone_parada || '#DC2626',
                  legenda: actionConfig.legenda_parada || `Velocidade: ${Math.round(velocidade)} km/h`,
                  automacaoId: automacao.id,
                  automacaoNome: automacao.nome
                };
              }
            }
          }
        }
      }
    }

    // Create or update marker (only ONE per vehicle - the last one)
    if (markerToCreate) {
      // First, delete any existing markers for this vehicle
      await supabase
        .from('logistica_paradas_marcadas')
        .delete()
        .eq('veiculo_id', veiculoId)
        .eq('estabelecimento_id', estabelecimentoId);
      
      // Then create the new marker
      const markerData = {
        veiculo_id: veiculoId,
        estabelecimento_id: estabelecimentoId,
        lat,
        lng,
        tempo_parado_minutos: minutosParado,
        categoria_tempo: minutosParado >= 30 ? 'mais_30' : minutosParado >= 15 ? '15_30' : '5_15',
        icone_parada: markerToCreate.icone,
        cor_icone_parada: markerToCreate.cor,
        legenda_parada: `${markerToCreate.legenda} (${markerToCreate.automacaoNome})`,
        data_inicio: new Date().toISOString(),
        automacao_id: markerToCreate.automacaoId
      };
      
      await supabase
        .from('logistica_paradas_marcadas')
        .insert(markerData);
      
      console.log('📍 Created single marker for vehicle:', veiculoId);
    }

    // Clean up markers for vehicles that are moving
    if (velocidade > 5) {
      const { error: deleteError } = await supabase
        .from('logistica_paradas_marcadas')
        .delete()
        .eq('veiculo_id', veiculoId)
        .eq('estabelecimento_id', estabelecimentoId);
      
      if (!deleteError) {
        console.log('🧹 Cleaned up markers for moving vehicle:', veiculoId);
      }
    }

  } catch (error) {
    console.error('Error executing automations:', error);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const url = new URL(req.url);
    let estabelecimentoId: string | undefined;

    // Handle GET request (OsmAnd/Traccar format)
    if (req.method === 'GET') {
      const payload = parseOsmAndFormat(url);
      
      if (!payload) {
        console.log('Invalid OsmAnd format, params:', Object.fromEntries(url.searchParams));
        return new Response(
          JSON.stringify({ 
            status: 'error', 
            message: 'Missing required params: id, lat, lon' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Token validation is optional - if provided, use it to get estabelecimentoId
      if (payload.token) {
        const tokenResult = await validateToken(supabase, payload.token);
        estabelecimentoId = tokenResult.estabelecimentoId;
      }
      // If no token, the vehicle's estabelecimento_id will be used from findVeiculoInfo
      
      console.log('Received OsmAnd/Traccar position:', payload);
      
      const result = await savePosition(supabase, payload, estabelecimentoId);
      
      if (result.error) {
        return new Response(
          JSON.stringify({ status: 'error', message: result.error }),
          { status: result.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Execute automations in background (fire and forget)
      // Use estabelecimentoId from token OR from vehicle record
      const effectiveEstabelecimentoId = estabelecimentoId || result.estabelecimentoId;
      if (effectiveEstabelecimentoId && result.veiculoId) {
        console.log('🚀 Triggering automations for estabelecimento:', effectiveEstabelecimentoId);
        executarAutomacoesLogistica(
          supabase,
          result.veiculoId,
          payload.lat,
          payload.lng,
          payload.velocidade || 0,
          effectiveEstabelecimentoId
        ).catch(err => console.error('Automation error:', err));
      } else {
        console.log('⚠️ Skipping automations - no estabelecimentoId available');
      }
      
      return new Response(
        JSON.stringify({ 
          status: 'ok',
          posicaoId: result.data.id,
          timestamp: result.data.data_hora
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST request (JSON format)
    if (req.method === 'POST') {
      const rawPayload = await req.json();
      
      console.log('Received JSON position data:', rawPayload);

      let payload: PosicaoPayload;

      // Check if it's Traccar Client App format (background geolocation plugin)
      if (rawPayload.location && rawPayload.device_id) {
        const traccarPayload = rawPayload as TraccarClientPayload;
        const coords = traccarPayload.location?.coords;
        
        if (!coords?.latitude || !coords?.longitude) {
          return new Response(
            JSON.stringify({ 
              status: 'error', 
              message: 'Invalid Traccar Client format: missing coordinates' 
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        // Convert Traccar Client format to standard format
        // Speed from Traccar is in m/s, convert to km/h (if positive)
        const speedMs = coords.speed && coords.speed > 0 ? coords.speed : 0;
        const speedKmh = speedMs * 3.6;
        
        payload = {
          veiculoId: traccarPayload.device_id!,
          lat: coords.latitude,
          lng: coords.longitude,
          velocidade: speedKmh,
          direcao: coords.heading && coords.heading > 0 ? coords.heading : undefined,
          dataHora: traccarPayload.location?.timestamp || new Date().toISOString(),
          token: rawPayload.token // Token can be passed at root level
        };
        
        console.log('Converted Traccar Client payload:', payload);
      } else if (rawPayload.source === 'gt06-bridge' && rawPayload.imei) {
        // GT06 Bridge format (J6/JM01/JM-VL03/GT06N via TCP bridge no Railway)
        if (typeof rawPayload.latitude !== 'number' || typeof rawPayload.longitude !== 'number') {
          return new Response(
            JSON.stringify({ status: 'error', message: 'Invalid GT06 bridge format: missing latitude/longitude' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        payload = {
          veiculoId: String(rawPayload.imei),
          lat: rawPayload.latitude,
          lng: rawPayload.longitude,
          velocidade: typeof rawPayload.speed_kmh === 'number' ? rawPayload.speed_kmh : 0,
          direcao: typeof rawPayload.heading === 'number' ? rawPayload.heading : undefined,
          dataHora: rawPayload.timestamp || new Date().toISOString(),
          token: rawPayload.token,
        };
        console.log('Converted GT06 bridge payload:', payload);
      } else {
        // Standard format
        payload = rawPayload as PosicaoPayload;
      }

      // Token validation is optional - if provided, use it to get estabelecimentoId
      if (payload.token) {
        const tokenResult = await validateToken(supabase, payload.token);
        estabelecimentoId = tokenResult.estabelecimentoId;
      }
      // If no token, the vehicle's estabelecimento_id will be used from findVeiculoInfo

      // Validate required fields
      if (!payload.veiculoId || typeof payload.lat !== 'number' || typeof payload.lng !== 'number') {
        return new Response(
          JSON.stringify({ 
            status: 'error', 
            message: 'Missing required fields: veiculoId, lat, lng' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const result = await savePosition(supabase, payload, estabelecimentoId);
      
      if (result.error) {
        return new Response(
          JSON.stringify({ status: 'error', message: result.error }),
          { status: result.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Execute automations in background
      // Use estabelecimentoId from token OR from vehicle record
      const effectiveEstabelecimentoId = estabelecimentoId || result.estabelecimentoId;
      if (effectiveEstabelecimentoId && result.veiculoId) {
        console.log('🚀 Triggering automations for estabelecimento:', effectiveEstabelecimentoId);
        executarAutomacoesLogistica(
          supabase,
          result.veiculoId,
          payload.lat,
          payload.lng,
          payload.velocidade || 0,
          effectiveEstabelecimentoId
        ).catch(err => console.error('Automation error:', err));
      } else {
        console.log('⚠️ Skipping automations - no estabelecimentoId available');
      }
      
      return new Response(
        JSON.stringify({ 
          status: 'ok',
          posicaoId: result.data.id,
          timestamp: result.data.data_hora
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ status: 'error', message: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ status: 'error', message: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
