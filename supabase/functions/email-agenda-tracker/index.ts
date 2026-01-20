import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
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
    const recipientPhone = url.searchParams.get('phone');
    const recipientName = url.searchParams.get('name');
    const tituloTarefa = url.searchParams.get('titulo') || 'Retorno Cliente';
    const descricaoTarefa = url.searchParams.get('desc') || 'Cliente clicou no link';
    const redirectUrl = url.searchParams.get('url') || 'https://www.pilar.com.br';
    const source = url.searchParams.get('source') || 'email';

    console.log('Agenda tracker called:', {
      emailId,
      estabelecimentoId,
      userId,
      recipientEmail,
      recipientPhone,
      recipientName,
      tituloTarefa,
      redirectUrl,
      source
    });

    if (estabelecimentoId && userId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get today's date in YYYY-MM-DD format
        const hoje = new Date().toISOString().split('T')[0];

        // Try to find customer by email or phone
        let customerId: string | null = null;
        let customerName = recipientName || 'Cliente';
        let displayName = customerName; // This will be company name if linked, otherwise contact name

        // First try by phone (for chat source)
        if (recipientPhone) {
          // Clean phone number for search
          const cleanPhone = recipientPhone.replace(/\D/g, '');
          console.log('Searching customer by phone:', cleanPhone);
          
          const { data: customer } = await supabase
            .from('customers')
            .select('id, nome')
            .eq('estabelecimento_id', estabelecimentoId)
            .ilike('telefone', `%${cleanPhone}%`)
            .limit(1)
            .maybeSingle();

          if (customer) {
            customerId = customer.id;
            customerName = customer.nome || customerName;
            console.log('Customer found by phone:', customer.nome);
          }
        }

        // If not found by phone, try by email
        if (!customerId && recipientEmail) {
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
            console.log('Customer found by email:', customer.nome);
          }
        }

        // If customer not found, create a basic lead
        if (!customerId && (recipientEmail || recipientPhone)) {
          const identifier = recipientEmail || recipientPhone;
          console.log('Creating basic customer for:', identifier);
          
          const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .insert({
              estabelecimento_id: estabelecimentoId,
              nome: recipientName || `Lead - ${identifier}`,
              email: recipientEmail || '',
              telefone: recipientPhone || '',
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

        // If we have a customer, check for linked company
        displayName = customerName;
        if (customerId) {
          // Check if customer has a linked company (prefer primary company)
          const { data: customerEmpresa } = await supabase
            .from('customer_empresas')
            .select(`
              empresa_id,
              is_primary,
              empresas:empresa_id (
                id,
                nome,
                razao_social
              )
            `)
            .eq('customer_id', customerId)
            .order('is_primary', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (customerEmpresa?.empresas) {
            const empresa = customerEmpresa.empresas as unknown as { id: string; nome: string; razao_social: string };
            displayName = empresa.nome || empresa.razao_social || customerName;
            console.log('Customer has linked company:', displayName);
          } else {
            console.log('No linked company, using contact name:', customerName);
          }
        }

        // Determine origem based on source - use valid values from check constraint
        // Valid values based on existing data: 'bot', 'email_enviado'
        const origem = source === 'chat' ? 'bot' : 'email_enviado';

        // Create task in calendario_tarefas
        const { data: tarefa, error: tarefaError } = await supabase
          .from('calendario_tarefas')
          .insert({
            estabelecimento_id: estabelecimentoId,
            user_id: userId,
            contact_id: customerId,
            contact_name: displayName, // Use company name if linked, otherwise contact name
            title: tituloTarefa,
            description: descricaoTarefa,
            date: hoje,
            status: 'pending',
            origem: origem,
            origem_sub_item: 'link_rastreio',
          })
          .select('id')
          .maybeSingle();

        if (tarefaError) {
          console.error('Error creating task:', tarefaError);
        } else {
          console.log('Task created successfully:', tarefa?.id, 'for:', displayName);
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

    // Ensure redirect URL has protocol
    let finalRedirectUrl = redirectUrl;
    if (!finalRedirectUrl.startsWith('http://') && !finalRedirectUrl.startsWith('https://')) {
      finalRedirectUrl = 'https://' + finalRedirectUrl;
    }

    // Redirect to the target URL
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': finalRedirectUrl,
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
