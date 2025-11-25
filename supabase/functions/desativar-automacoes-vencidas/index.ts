import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Chama a função do banco para desativar automações vencidas
    const { error: functionError } = await supabaseClient.rpc('desativar_automacoes_vencidas')
    
    if (functionError) {
      console.error('Erro ao desativar automações vencidas:', functionError)
      throw functionError
    }

    console.log('Automações vencidas desativadas com sucesso')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Automações vencidas desativadas com sucesso' 
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Erro na edge function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
