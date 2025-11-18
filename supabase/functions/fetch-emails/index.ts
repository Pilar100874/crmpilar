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

    // Buscar configurações POP/IMAP do usuário autenticado
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('pop, porta_pop, email, senha_email, smtp, porta_smtp')
      .eq('id', user.id)
      .single();

    if (usuarioError || !usuario) {
      throw new Error('Configurações de email não encontradas. Configure seu email nas configurações do usuário.');
    }

    if (!usuario.pop || !usuario.porta_pop || !usuario.senha_email) {
      throw new Error('Configure completamente o servidor POP/IMAP e senha do email nas configurações do usuário');
    }

    console.log('Configurações do usuário:', {
      email: usuario.email,
      pop: usuario.pop,
      porta_pop: usuario.porta_pop
    });

    // NOTA: Implementação simplificada para teste
    // Em produção, seria necessário usar uma biblioteca IMAP para Deno
    const mockEmails = [
      {
        from_email: 'exemplo@teste.com',
        to_email: usuario.email,
        subject: 'Bem-vindo ao sistema de email',
        body: 'Configure suas credenciais IMAP corretamente para receber emails reais. Suas configurações foram detectadas com sucesso.',
        date: new Date().toISOString(),
        read: false,
        starred: false,
      }
    ];

    // Salvar emails no banco vinculados ao usuário
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

    console.log(`${savedCount} emails salvos com sucesso para o usuário ${user.email}`);

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
        status: 400,
      }
    );
  }
});
