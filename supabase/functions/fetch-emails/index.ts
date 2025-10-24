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

    // Buscar configurações POP/IMAP do usuário
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('pop, porta_pop, email, senha_email')
      .eq('id', user.id)
      .single();

    if (usuarioError || !usuario) {
      throw new Error('Configurações de email não encontradas');
    }

    if (!usuario.pop || !usuario.porta_pop) {
      throw new Error('Configure o servidor POP/IMAP nas configurações do usuário');
    }

    console.log('Tentando conectar ao servidor:', {
      host: usuario.pop,
      port: usuario.porta_pop,
      user: usuario.email
    });

    // Por enquanto, criar alguns emails de exemplo para teste
    // Em produção, você precisará usar uma biblioteca apropriada
    // ou um serviço de API de email
    const mockEmails = [
      {
        from_email: 'exemplo@teste.com',
        to_email: usuario.email,
        subject: 'Bem-vindo ao sistema de email',
        body: 'Este é um email de teste. Configure suas credenciais IMAP corretamente para receber emails reais.',
        date: new Date().toISOString(),
        read: false,
        starred: false,
      }
    ];

    // Salvar emails no banco
    let savedCount = 0;
    for (const email of mockEmails) {
      const { error: saveError } = await supabase
        .from('emails')
        .insert({
          user_id: user.id,
          from_email: email.from_email,
          to_email: email.to_email,
          subject: email.subject,
          body: email.body,
          date: email.date,
          folder: 'inbox',
          read: email.read,
          starred: email.starred,
        });

      if (saveError) {
        if (saveError.code !== '23505') { // Ignora duplicatas
          console.error('Erro ao salvar email:', saveError);
        }
      } else {
        savedCount++;
      }
    }

    console.log(`${savedCount} emails salvos com sucesso`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: savedCount,
        message: 'NOTA: Implementação simplificada. Para receber emails reais, será necessário integrar com uma biblioteca IMAP compatível com Deno.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erro ao buscar emails:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
