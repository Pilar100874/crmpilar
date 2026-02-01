import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })

    const { usuario_id, frame } = await req.json()

    if (!usuario_id || !frame) {
      console.log('[broadcast-frame] Erro: campos obrigatórios faltando')
      return new Response(
        JSON.stringify({ error: 'usuario_id e frame são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[broadcast-frame] Recebido frame para usuario: ${usuario_id.substring(0, 8)}...`)

    // Criar canal e conectar
    const channelName = `screen-share-${usuario_id}`
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false, ack: false }
      }
    })

    // Subscrever primeiro e esperar conexão
    const subscribePromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout ao conectar canal')), 5000)
      
      channel.subscribe((status) => {
        console.log(`[broadcast-frame] Status canal: ${status}`)
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout)
          resolve()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeout)
          reject(new Error(`Erro ao conectar: ${status}`))
        }
      })
    })

    await subscribePromise
    console.log(`[broadcast-frame] Canal ${channelName} conectado, enviando frame...`)

    // Enviar broadcast
    const result = await channel.send({
      type: 'broadcast',
      event: 'frame',
      payload: { 
        frame, 
        timestamp: Date.now(),
        userId: usuario_id
      }
    })

    console.log(`[broadcast-frame] Resultado envio: ${result}`)

    // Limpar canal após envio
    await supabase.removeChannel(channel)

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[broadcast-frame] Erro:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
