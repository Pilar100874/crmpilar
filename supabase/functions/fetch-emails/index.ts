import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import Imap from "npm:imap@0.8.19";
import { simpleParser } from "npm:mailparser@3.6.5";

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
      .select('pop, porta_pop, email, senha_email, usar_autenticacao')
      .eq('id', user.id)
      .single();

    if (usuarioError || !usuario) {
      throw new Error('Configurações de email não encontradas');
    }

    if (!usuario.pop || !usuario.porta_pop) {
      throw new Error('Configure o servidor POP/IMAP nas configurações do usuário');
    }

    console.log('Conectando ao servidor IMAP:', {
      host: usuario.pop,
      port: usuario.porta_pop,
      user: usuario.email
    });

    const emails = await new Promise((resolve, reject) => {
      const imap = new Imap({
        user: usuario.email,
        password: usuario.senha_email,
        host: usuario.pop,
        port: usuario.porta_pop,
        tls: usuario.porta_pop === 993,
        tlsOptions: { rejectUnauthorized: false }
      });

      const emailList: any[] = [];

      imap.once('ready', () => {
        console.log('IMAP conectado');
        imap.openBox('INBOX', true, (err: any, box: any) => {
          if (err) {
            console.error('Erro ao abrir INBOX:', err);
            reject(err);
            return;
          }

          const fetch = imap.seq.fetch('1:*', {
            bodies: '',
            struct: true
          });

          fetch.on('message', (msg: any, seqno: number) => {
            let buffer = '';
            
            msg.on('body', (stream: any) => {
              stream.on('data', (chunk: any) => {
                buffer += chunk.toString('utf8');
              });
            });

            msg.once('end', async () => {
              try {
                const parsed = await simpleParser(buffer);
                emailList.push({
                  from: parsed.from?.text || '',
                  to: parsed.to?.text || '',
                  subject: parsed.subject || 'Sem assunto',
                  body: parsed.text || parsed.html || '',
                  date: parsed.date || new Date(),
                  read: false,
                  starred: false,
                });
              } catch (parseError) {
                console.error('Erro ao parsear email:', parseError);
              }
            });
          });

          fetch.once('error', (err: any) => {
            console.error('Erro no fetch:', err);
            reject(err);
          });

          fetch.once('end', () => {
            console.log('Fetch completo, emails encontrados:', emailList.length);
            imap.end();
          });
        });
      });

      imap.once('error', (err: any) => {
        console.error('Erro IMAP:', err);
        reject(err);
      });

      imap.once('end', () => {
        console.log('Conexão IMAP encerrada');
        resolve(emailList);
      });

      imap.connect();
    });

    // Salvar emails no banco
    for (const email of emails as any[]) {
      const { error: saveError } = await supabase
        .from('emails')
        .upsert({
          user_id: user.id,
          from: email.from,
          to: email.to,
          subject: email.subject,
          body: email.body,
          date: email.date,
          folder: 'inbox',
          read: email.read,
          starred: email.starred,
        }, {
          onConflict: 'user_id,from,subject,date'
        });

      if (saveError) {
        console.error('Erro ao salvar email:', saveError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, count: (emails as any[]).length }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erro ao buscar emails:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
