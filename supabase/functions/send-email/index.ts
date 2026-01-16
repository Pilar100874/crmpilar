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

    // Primeiro, salvar o email no banco para obter o ID
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: savedEmail, error: saveError } = await supabaseAdmin
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
      })
      .select('id')
      .single();

    if (saveError) {
      console.error('Erro ao salvar email no banco:', saveError);
    }

    // Criar link de tracking com o ID do email
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const emailId = savedEmail?.id || '';
    const trackingLink = `${supabaseUrl}/functions/v1/email-link-tracker?eid=${emailId}&url=https://www.pilar.com.br`;
    
    // Logo da empresa hospedado publicamente
    const logoUrl = 'https://crmpilar.lovable.app/images/pilar-logo.jpg';

    // HTML do email com logo clicável (tracking por clique)
    const emailHtml = `
      <div style="font-family: Arial, sans-serif;">
        ${htmlBody}
        <br><br>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          <a href="${trackingLink}" target="_blank" style="text-decoration: none;">
            <img src="${logoUrl}" alt="Pilar" style="max-width: 120px; height: auto;" />
          </a>
          <p style="color: #666; font-size: 12px; margin-top: 10px;">
            <a href="${trackingLink}" style="color: #666; text-decoration: none;">www.pilar.com.br</a>
          </p>
        </div>
      </div>
    `;

    // Enviar email via Resend SEM tracking pixel interno
    const { data: emailData, error: resendError } = await resend.emails.send({
      from: `${resendConfig.from_name} <${resendConfig.from_email}>`,
      to: [to],
      subject: subject,
      html: emailHtml,
      headers: {
        'X-Entity-Ref-ID': crypto.randomUUID(),
      },
    });

    if (resendError) {
      console.error('Erro ao enviar via Resend:', resendError);
      throw new Error(`Erro ao enviar email: ${resendError.message}`);
    }

    console.log('Email enviado com sucesso via Resend:', emailData);
    console.log('Email ID no banco:', emailId);

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
