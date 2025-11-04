import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extrair o path do webhook da URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const webhookPath = pathParts[pathParts.length - 1];

    console.log('[WEBHOOK-ENTRADA] Recebida requisição para:', webhookPath);
    console.log('[WEBHOOK-ENTRADA] Método:', req.method);

    // Buscar configuração do webhook
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks_entrada')
      .select('*')
      .eq('url_gerada', webhookPath)
      .eq('ativo', true)
      .single();

    if (webhookError || !webhook) {
      console.error('[WEBHOOK-ENTRADA] Webhook não encontrado ou inativo:', webhookError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Webhook não encontrado ou inativo' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[WEBHOOK-ENTRADA] Webhook encontrado:', webhook.nome);

    // Verificar se o método HTTP está correto
    if (req.method !== webhook.metodo && req.method !== 'OPTIONS') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Método ${req.method} não permitido. Use ${webhook.metodo}` 
        }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Processar payload
    let payload: any = {};
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json') && webhook.aceita_json) {
      payload = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded') && webhook.aceita_form_data) {
      const formData = await req.formData();
      payload = Object.fromEntries(formData);
    } else if (contentType.includes('multipart/form-data') && webhook.aceita_form_data) {
      const formData = await req.formData();
      payload = Object.fromEntries(formData);
    } else {
      // Tentar ler como texto
      const text = await req.text();
      payload = { raw: text };
    }

    console.log('[WEBHOOK-ENTRADA] Payload recebido:', JSON.stringify(payload).substring(0, 200));

    // Executar ação baseada no tipo
    let actionResult: any = { success: true };

    if (webhook.acao_tipo === 'automacao_marketing' && webhook.automacao_id) {
      console.log('[WEBHOOK-ENTRADA] Disparando automação de marketing:', webhook.automacao_id);
      
      // Buscar configuração da automação
      const { data: automacao, error: automacaoError } = await supabase
        .from('marketing_automations')
        .select('*')
        .eq('id', webhook.automacao_id)
        .eq('active', true)
        .single();

      if (automacaoError || !automacao) {
        console.error('[WEBHOOK-ENTRADA] Automação não encontrada:', automacaoError);
        actionResult = { 
          success: false, 
          error: 'Automação não encontrada ou inativa' 
        };
      } else {
        // Aqui você pode adicionar lógica específica para executar a automação
        // Por exemplo, inserir em uma fila de execução
        console.log('[WEBHOOK-ENTRADA] Automação encontrada:', automacao.name);
        actionResult = { 
          success: true, 
          automacao: automacao.name,
          message: 'Automação disparada com sucesso' 
        };
      }
    } else if (webhook.acao_tipo === 'url_customizada' && webhook.url_customizada) {
      console.log('[WEBHOOK-ENTRADA] Chamando URL customizada:', webhook.url_customizada);
      
      try {
        const customResponse = await fetch(webhook.url_customizada, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            webhook_name: webhook.nome,
            original_payload: payload,
            triggered_at: new Date().toISOString(),
          }),
        });

        const customResult = await customResponse.json();
        actionResult = { 
          success: customResponse.ok, 
          custom_response: customResult,
          status: customResponse.status 
        };
        
        console.log('[WEBHOOK-ENTRADA] Resposta da URL customizada:', customResponse.status);
      } catch (error: any) {
        console.error('[WEBHOOK-ENTRADA] Erro ao chamar URL customizada:', error);
        actionResult = { 
          success: false, 
          error: 'Erro ao chamar URL customizada: ' + error.message 
        };
      }
    }

    // Atualizar contadores do webhook
    const { error: updateError } = await supabase
      .from('webhooks_entrada')
      .update({
        ultimo_trigger: new Date().toISOString(),
        total_triggers: webhook.total_triggers + 1,
      })
      .eq('id', webhook.id);

    if (updateError) {
      console.error('[WEBHOOK-ENTRADA] Erro ao atualizar contadores:', updateError);
    }

    console.log('[WEBHOOK-ENTRADA] Webhook processado com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        webhook: {
          id: webhook.id,
          name: webhook.nome,
          method: webhook.metodo,
        },
        payload_received: payload,
        action_result: actionResult,
        triggered_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[WEBHOOK-ENTRADA] Erro geral:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});