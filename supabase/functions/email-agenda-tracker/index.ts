import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const emailId = url.searchParams.get('eid');
    const estabelecimentoId = url.searchParams.get('estab');
    const userId = url.searchParams.get('uid');
    const recipientEmail = url.searchParams.get('email');
    const recipientName = url.searchParams.get('name');
    const tituloTarefa = url.searchParams.get('titulo') || 'Retorno Email';
    const descricaoTarefa = url.searchParams.get('desc') || 'Cliente clicou no link do email';
    const redirectUrl = url.searchParams.get('url') || 'https://www.pilar.com.br';

    console.log('Agenda tracker called:', {
      emailId,
      estabelecimentoId,
      userId,
      recipientEmail,
      recipientName,
      tituloTarefa,
      redirectUrl
    });

    if (estabelecimentoId && userId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get today's date in YYYY-MM-DD format
        const hoje = new Date().toISOString().split('T')[0];

        // Try to find customer by email
        let customerId: string | null = null;
        let customerName = recipientName || 'Cliente Email';

        if (recipientEmail) {
          const { data: customer } = await supabase
            .from('customers')
            .select('id, nome')
            .eq('estabelecimento_id', estabelecimentoId)
            .ilike('email', recipientEmail)
            .limit(1)
            .maybeSingle();

          if (customer) {
            customerId = customer.id;
            customerName = customer.nome || customerName;
            console.log('Customer found:', customer.nome);
          }
        }

        // If customer not found, create a basic lead
        if (!customerId && recipientEmail) {
          console.log('Creating basic customer for email:', recipientEmail);
          const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .insert({
              estabelecimento_id: estabelecimentoId,
              nome: recipientName || `Lead Email - ${recipientEmail}`,
              email: recipientEmail,
              telefone: '',
            })
            .select('id, nome')
            .maybeSingle();

          if (!createError && newCustomer) {
            customerId = newCustomer.id;
            customerName = newCustomer.nome;
            console.log('Customer created:', newCustomer.id);
          } else {
            console.error('Error creating customer:', createError);
          }
        }

        // Create task in calendario_tarefas
        const { data: tarefa, error: tarefaError } = await supabase
          .from('calendario_tarefas')
          .insert({
            estabelecimento_id: estabelecimentoId,
            user_id: userId,
            contact_id: customerId,
            contact_name: customerName,
            title: tituloTarefa,
            description: descricaoTarefa,
            date: hoje,
            status: 'pendente',
            origem: 'email',
            origem_sub_item: 'link_agenda',
          })
          .select('id')
          .maybeSingle();

        if (tarefaError) {
          console.error('Error creating task:', tarefaError);
        } else {
          console.log('Task created successfully:', tarefa?.id);
        }

        // Also update email tracking if emailId provided
        if (emailId) {
          const { data: email } = await supabase
            .from('emails')
            .select('id, opened_at, opened_count')
            .eq('id', emailId)
            .single();

          if (email) {
            const updateData: Record<string, unknown> = {
              opened_count: (email.opened_count || 0) + 1,
              link_clicked_at: new Date().toISOString(),
            };

            if (!email.opened_at) {
              updateData.opened_at = new Date().toISOString();
            }

            await supabase
              .from('emails')
              .update(updateData)
              .eq('id', emailId);

            console.log('Email tracking updated:', emailId);
          }
        }
      }
    } else {
      console.log('Missing required parameters: estabelecimentoId or userId');
    }

    // Redirect to the target URL
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('Agenda tracker error:', error);
    // Even on error, redirect to the main site
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': 'https://www.pilar.com.br',
      },
    });
  }
});
