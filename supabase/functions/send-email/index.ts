import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import nodemailer from "npm:nodemailer@6.9.7";

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
      throw new Error('No authorization header');
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
      throw new Error('Unauthorized');
    }

    const { to, subject, body, attachments } = await req.json();

    // Buscar configurações SMTP do usuário
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('smtp, porta_smtp, email, senha_email, usar_autenticacao')
      .eq('id', user.id)
      .single();

    if (usuarioError || !usuario) {
      throw new Error('Configurações de email não encontradas');
    }

    if (!usuario.smtp || !usuario.porta_smtp) {
      throw new Error('Configure o servidor SMTP nas configurações do usuário');
    }

    console.log('Configurando transporter SMTP:', {
      host: usuario.smtp,
      port: usuario.porta_smtp,
      secure: usuario.porta_smtp === 465,
      auth: usuario.usar_autenticacao
    });

    // Configurar transporter do nodemailer
    const transporter = nodemailer.createTransport({
      host: usuario.smtp,
      port: usuario.porta_smtp,
      secure: usuario.porta_smtp === 465,
      auth: usuario.usar_autenticacao ? {
        user: usuario.email,
        pass: usuario.senha_email,
      } : undefined,
    });

    // Enviar email
    const info = await transporter.sendMail({
      from: usuario.email,
      to: to,
      subject: subject,
      text: body,
      html: body.replace(/\n/g, '<br>'),
      attachments: attachments || [],
    });

    console.log('Email enviado:', info.messageId);

    // Salvar na pasta enviados
    const { error: saveError } = await supabase
      .from('emails')
      .insert({
        user_id: user.id,
        from: usuario.email,
        to: to,
        subject: subject,
        body: body,
        folder: 'sent',
        read: true,
        starred: false,
      });

    if (saveError) {
      console.error('Erro ao salvar email:', saveError);
    }

    return new Response(
      JSON.stringify({ success: true, messageId: info.messageId }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
