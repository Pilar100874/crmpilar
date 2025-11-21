import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      usuario_id,
      estabelecimento_id,
      tipo,
      titulo,
      mensagem,
      chat_id,
    } = await req.json();

    console.log('Enviando notificação:', { usuario_id, tipo, titulo });

    if (!usuario_id || !estabelecimento_id || !tipo || !titulo || !mensagem) {
      throw new Error('Campos obrigatórios faltando');
    }

    // Criar notificação
    const { data, error } = await supabase
      .from('notificacoes_log')
      .insert({
        usuario_id,
        estabelecimento_id,
        tipo,
        titulo,
        mensagem,
        chat_id: chat_id || null,
        lida: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar notificação:', error);
      throw error;
    }

    console.log('Notificação criada com sucesso:', data.id);

    return new Response(
      JSON.stringify({ success: true, notification: data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Erro em enviar-notificacao:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
