import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { usuario_id, action, frame_data } = await req.json()

    if (!usuario_id) {
      return new Response(
        JSON.stringify({ error: 'usuario_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[extension-status] Action: ${action}, Usuario: ${usuario_id}`)

    if (action === 'start') {
      // Iniciar compartilhamento
      const { error } = await supabase
        .from('screen_monitor_consent')
        .update({
          is_sharing: true,
          sharing_started_at: new Date().toISOString(),
          last_frame_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('usuario_id', usuario_id)

      if (error) {
        console.error('[extension-status] Erro ao iniciar:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('[extension-status] Compartilhamento iniciado')
      return new Response(
        JSON.stringify({ success: true, message: 'Compartilhamento iniciado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else if (action === 'stop') {
      // Parar compartilhamento
      const { error } = await supabase
        .from('screen_monitor_consent')
        .update({
          is_sharing: false,
          sharing_started_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('usuario_id', usuario_id)

      if (error) {
        console.error('[extension-status] Erro ao parar:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('[extension-status] Compartilhamento parado')
      return new Response(
        JSON.stringify({ success: true, message: 'Compartilhamento parado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else if (action === 'frame') {
      // Atualizar timestamp do último frame
      const { error } = await supabase
        .from('screen_monitor_consent')
        .update({
          is_sharing: true,
          last_frame_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('usuario_id', usuario_id)

      if (error) {
        console.error('[extension-status] Erro ao atualizar frame:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else {
      return new Response(
        JSON.stringify({ error: 'Action inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[extension-status] Erro:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
