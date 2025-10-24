import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

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

    // Buscar configurações SMTP do usuário autenticado
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('smtp, porta_smtp, email, senha_email, usar_autenticacao')
      .eq('id', user.id)
      .single();

    if (usuarioError || !usuario) {
      throw new Error('Configurações de email não encontradas. Configure seu email nas configurações do usuário.');
    }

    if (!usuario.smtp || !usuario.porta_smtp || !usuario.email || !usuario.senha_email) {
      throw new Error('Configure completamente o servidor SMTP e senha do email nas configurações do usuário');
    }

    console.log('Usuário autenticado:', usuario.email);
    console.log('Enviando email para:', to);
    console.log('Assunto:', subject);

    // Salvar na pasta enviados vinculado ao usuário
    const { error: saveError } = await supabase
      .from('emails')
      .insert({
        user_id: user.id,
        from_email: usuario.email,
        to_email: to,
        subject: subject,
        body: body,
        folder: 'sent',
        read: true,
        starred: false,
      });

    if (saveError) {
      console.error('Erro ao salvar email:', saveError);
      throw new Error('Erro ao salvar email: ' + saveError.message);
    }

    console.log('Email salvo com sucesso para o usuário:', user.email);

    // NOTA: Implementação simplificada
    // Para envio real de email via SMTP, seria necessário:
    // 1. Usar um serviço de terceiros como SendGrid, Resend, etc.
    // 2. Ou implementar um proxy SMTP dedicado
    // O nodemailer não é compatível com Deno Edge Functions

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email salvo com sucesso. NOTA: Para envio real, configure um serviço de email como Resend ou SendGrid.'
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
