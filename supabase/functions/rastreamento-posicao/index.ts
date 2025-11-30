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

interface AutomacaoFlowNode {
  id: string;
  type: string;
  data: {
    type: string;
    label: string;
    config: {
      tempo_minutos?: number;
      marcar_no_mapa?: boolean;
      icone_parada?: string;
      cor_icone_parada?: string;
      legenda_parada?: string;
      velocidade_maxima?: number;
      telefone?: string;
      mensagem?: string;
      titulo?: string;
      [key: string]: unknown;
    };
  };
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
  if (!token) {
    return { valid: false };
  }

  const { data, error } = await supabase
    .from('logistica_config')
    .select('estabelecimento_id')
    .eq('token_rastreamento', token)
    .single();

  if (error || !data) {
    console.log('Token validation failed:', error?.message || 'Not found');
    return { valid: false };
  }

  return { valid: true, estabelecimentoId: data.estabelecimento_id };
}

async function findVeiculoId(supabase: any, deviceId: string, estabelecimentoId?: string): Promise<string | null> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  // Base query builder
  const buildQuery = (table: string, field: string, value: string) => {
    let query = supabase.from(table).select('id').eq(field, value).eq('ativo', true);
    if (estabelecimentoId) {
      query = query.eq('estabelecimento_id', estabelecimentoId);
    }
    return query.single();
  };
  
  // If it's a UUID, try direct lookup
  if (uuidRegex.test(deviceId)) {
    const { data: veiculo } = await buildQuery('veiculos', 'id', deviceId);
    if (veiculo) return veiculo.id;
  }
  
  // Try by traccar_device_id
  const { data: veiculoByDevice } = await buildQuery('veiculos', 'traccar_device_id', deviceId);
  if (veiculoByDevice) return veiculoByDevice.id;
  
  // Try by placa (uppercase)
  const { data: veiculoByPlaca } = await buildQuery('veiculos', 'placa', deviceId.toUpperCase());
  if (veiculoByPlaca) return veiculoByPlaca.id;
  
  return null;
}

async function savePosition(supabase: any, payload: PosicaoPayload, estabelecimentoId?: string) {
  // Validate coordinates range
  if (payload.lat < -90 || payload.lat > 90 || payload.lng < -180 || payload.lng > 180) {
    return { error: 'Invalid coordinates', status: 400 };
  }

  // Find vehicle by device ID, placa, or UUID
  const veiculoId = await findVeiculoId(supabase, payload.veiculoId, estabelecimentoId);
  
  if (!veiculoId) {
    console.error('Vehicle not found for identifier:', payload.veiculoId);
    return { error: 'Vehicle not found', status: 404 };
  }

  // Insert position
  const { data: posicao, error: posicaoError } = await supabase
    .from('veiculo_posicoes')
    .insert({
      veiculo_id: veiculoId,
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

  console.log('Position saved successfully:', posicao.id, 'for vehicle:', veiculoId);
  return { 
    data: posicao, 
    status: 200,
    veiculoId: veiculoId,
    velocidade: payload.velocidade || 0
  };
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

    // Get vehicle's last position to calculate stopped time
    const { data: posicoes } = await supabase
      .from('veiculo_posicoes')
      .select('*')
      .eq('veiculo_id', veiculoId)
      .order('data_hora', { ascending: false })
      .limit(10);

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

    // Process each automation
    for (const automacao of automacoes) {
      const flowData = automacao.flow_data as { nodes?: AutomacaoFlowNode[] };
      if (!flowData?.nodes) continue;

      for (const node of flowData.nodes) {
        const nodeType = node.data?.type;
        const config = node.data?.config || {};

        // Handle "condicao_parado" - Vehicle stopped condition
        if (nodeType === 'condicao_parado') {
          const tempoMinutos = config.tempo_minutos || 30;
          
          if (velocidade <= 5 && minutosParado >= tempoMinutos) {
            console.log(`✅ Automation triggered: Vehicle stopped for ${minutosParado} min (threshold: ${tempoMinutos})`);
            
            // Create map marker if configured
            if (config.marcar_no_mapa) {
              let categoriaTempo = 'menos_5';
              if (minutosParado >= 30) categoriaTempo = 'mais_30';
              else if (minutosParado >= 15) categoriaTempo = '15_30';
              else if (minutosParado >= 5) categoriaTempo = '5_15';

              // Check if marker already exists
              const { data: existing } = await supabase
                .from('logistica_paradas_marcadas')
                .select('id')
                .eq('veiculo_id', veiculoId)
                .eq('estabelecimento_id', estabelecimentoId)
                .single();

              const markerData = {
                lat,
                lng,
                tempo_parado_minutos: minutosParado,
                categoria_tempo: categoriaTempo,
                icone_parada: config.icone_parada || 'MapPin',
                cor_icone_parada: config.cor_icone_parada || '#EAB308',
                legenda_parada: `${config.legenda_parada || `Parado há ${minutosParado} min`} (${automacao.nome})`
              };

              if (existing) {
                await supabase
                  .from('logistica_paradas_marcadas')
                  .update(markerData)
                  .eq('id', existing.id);
                console.log('📍 Updated marker for vehicle:', veiculoId);
              } else {
                await supabase
                  .from('logistica_paradas_marcadas')
                  .insert({
                    veiculo_id: veiculoId,
                    estabelecimento_id: estabelecimentoId,
                    data_inicio: new Date().toISOString(),
                    automacao_id: automacao.id,
                    ...markerData
                  });
                console.log('📍 Created marker for vehicle:', veiculoId);
              }
            }

            // TODO: Execute other actions (WhatsApp, notification, email)
            // These would connect to respective edge functions or services
          }
        }

        // Handle "condicao_velocidade" - Speed exceeded condition
        if (nodeType === 'condicao_velocidade') {
          const velocidadeMaxima = config.velocidade_maxima || 80;
          
          if (velocidade > velocidadeMaxima) {
            console.log(`✅ Automation triggered: Speed ${velocidade} km/h exceeded ${velocidadeMaxima} km/h`);
            
            if (config.marcar_no_mapa) {
              const { data: existing } = await supabase
                .from('logistica_paradas_marcadas')
                .select('id')
                .eq('veiculo_id', veiculoId)
                .eq('estabelecimento_id', estabelecimentoId)
                .eq('categoria_tempo', 'velocidade')
                .single();

              const markerData = {
                lat,
                lng,
                tempo_parado_minutos: 0,
                categoria_tempo: 'velocidade',
                icone_parada: config.icone_parada || 'Gauge',
                cor_icone_parada: config.cor_icone_parada || '#DC2626',
                legenda_parada: `${config.legenda_parada || `Velocidade: ${Math.round(velocidade)} km/h`} (${automacao.nome})`
              };

              if (!existing) {
                await supabase
                  .from('logistica_paradas_marcadas')
                  .insert({
                    veiculo_id: veiculoId,
                    estabelecimento_id: estabelecimentoId,
                    data_inicio: new Date().toISOString(),
                    automacao_id: automacao.id,
                    ...markerData
                  });
                console.log('🚨 Created speed alert marker for vehicle:', veiculoId);
              }
            }
          }
        }
      }
    }

    // Clean up markers for vehicles that no longer meet conditions
    if (velocidade > 5) {
      // Vehicle is moving, remove any "parado" markers
      const { error: deleteError } = await supabase
        .from('logistica_paradas_marcadas')
        .delete()
        .eq('veiculo_id', veiculoId)
        .eq('estabelecimento_id', estabelecimentoId)
        .neq('categoria_tempo', 'velocidade');
      
      if (!deleteError) {
        console.log('🧹 Cleaned up stopped markers for moving vehicle:', veiculoId);
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
    let token: string | undefined;
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

      // Validate token if provided
      if (payload.token) {
        const tokenResult = await validateToken(supabase, payload.token);
        if (!tokenResult.valid) {
          return new Response(
            JSON.stringify({ status: 'error', message: 'Invalid token' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        estabelecimentoId = tokenResult.estabelecimentoId;
      }
      
      console.log('Received OsmAnd/Traccar position:', payload);
      
      const result = await savePosition(supabase, payload, estabelecimentoId);
      
      if (result.error) {
        return new Response(
          JSON.stringify({ status: 'error', message: result.error }),
          { status: result.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Execute automations in background (fire and forget)
      if (estabelecimentoId && result.veiculoId) {
        executarAutomacoesLogistica(
          supabase,
          result.veiculoId,
          payload.lat,
          payload.lng,
          payload.velocidade || 0,
          estabelecimentoId
        ).catch(err => console.error('Automation error:', err));
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
      } else {
        // Standard format
        payload = rawPayload as PosicaoPayload;
      }

      // Validate token if provided
      if (payload.token) {
        const tokenResult = await validateToken(supabase, payload.token);
        if (!tokenResult.valid) {
          return new Response(
            JSON.stringify({ status: 'error', message: 'Invalid token' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        estabelecimentoId = tokenResult.estabelecimentoId;
      }

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

      // Execute automations in background (fire and forget)
      if (estabelecimentoId && result.veiculoId) {
        executarAutomacoesLogistica(
          supabase,
          result.veiculoId,
          payload.lat,
          payload.lng,
          payload.velocidade || 0,
          estabelecimentoId
        ).catch(err => console.error('Automation error:', err));
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

  } catch (error: unknown) {
    console.error('Error processing request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ status: 'error', message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
