import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Autenticação necessária');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    const { to, subject, body } = await req.json();

    if (!to || !subject || !body) {
      throw new Error('Destinatário, assunto e corpo do email são obrigatórios');
    }

    // Buscar estabelecimento do usuário usando auth_user_id
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('estabelecimento_id, email')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (usuarioError || !usuario?.estabelecimento_id) {
      throw new Error('Usuário não vinculado a um estabelecimento');
    }

    // Buscar configuração Resend do estabelecimento
    const { data: resendConfig, error: configError } = await supabase
      .from('resend_config')
      .select('*')
      .eq('estabelecimento_id', usuario.estabelecimento_id)
      .maybeSingle();

    if (configError || !resendConfig) {
      throw new Error('Configuração Resend não encontrada. Configure o Resend nas configurações do estabelecimento.');
    }

    console.log('Enviando email via Resend...');
    console.log('De:', resendConfig.from_email);
    console.log('Para:', to);
    console.log('Assunto:', subject);

    // Inicializar Resend com a API Key do estabelecimento
    const resend = new Resend(resendConfig.api_key);

    // Converter quebras de linha para HTML
    const htmlBody = body.replace(/\n/g, '<br>');

    // Enviar email via Resend (tracking via webhook, sem pixel)
    const { data: emailData, error: resendError } = await resend.emails.send({
      from: `${resendConfig.from_name} <${resendConfig.from_email}>`,
      to: [to],
      subject: subject,
      html: htmlBody,
    });

    if (resendError) {
      console.error('Erro ao enviar via Resend:', resendError);
      throw new Error(`Erro ao enviar email: ${resendError.message}`);
    }

    console.log('Email enviado com sucesso via Resend:', emailData);
    console.log('Resend Email ID:', emailData?.id);

    // Salvar na pasta enviados (tracking via webhook do Resend)
    const { error: saveError } = await supabase
      .from('emails')
      .insert({
        user_id: user.id,
        from_email: resendConfig.from_email,
        to_email: to,
        subject: subject,
        body: body,
        folder: 'sent',
        read: true,
        starred: false,
      });

    if (saveError) {
      console.error('Erro ao salvar email no banco:', saveError);
      // Não lança erro aqui pois o email já foi enviado
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email enviado com sucesso!',
        emailId: emailData?.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
