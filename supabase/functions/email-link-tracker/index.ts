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
    const redirectUrl = url.searchParams.get('url') || 'https://www.pilar.com.br';

    console.log('Link tracker called - Email ID:', emailId, 'Redirect:', redirectUrl);

    if (emailId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Find email by ID and update opened_at
        const { data: email, error: fetchError } = await supabase
          .from('emails')
          .select('id, opened_at, opened_count')
          .eq('id', emailId)
          .single();

        if (!fetchError && email) {
          const updateData: Record<string, unknown> = {
            opened_count: (email.opened_count || 0) + 1,
            link_clicked_at: new Date().toISOString(),
          };

          // Only set opened_at if not already set
          if (!email.opened_at) {
            updateData.opened_at = new Date().toISOString();
          }

          const { error: updateError } = await supabase
            .from('emails')
            .update(updateData)
            .eq('id', emailId);

          if (updateError) {
            console.error('Error updating email:', updateError);
          } else {
            console.log('Email click tracked successfully:', emailId);
          }
        } else {
          console.log('Email not found:', emailId, fetchError);
        }
      }
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
    console.error('Link tracker error:', error);
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
