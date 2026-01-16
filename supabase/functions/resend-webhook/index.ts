import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
};

interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Resend webhook received - method:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: ResendWebhookPayload = await req.json();
    
    console.log('Webhook payload:', JSON.stringify(payload, null, 2));
    console.log('Event type:', payload.type);

    // Only process email.opened events
    if (payload.type !== 'email.opened') {
      console.log('Ignoring event type:', payload.type);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find email by to_email and subject (since we don't have direct tracking_id from Resend)
    const toEmail = payload.data.to[0];
    const subject = payload.data.subject;
    
    console.log('Looking for email to:', toEmail, 'subject:', subject);

    // Find the most recent matching email that hasn't been opened yet
    const { data: emails, error: fetchError } = await supabase
      .from('emails')
      .select('id, opened_at, opened_count, tracking_id')
      .eq('to_email', toEmail)
      .eq('subject', subject)
      .eq('folder', 'sent')
      .order('created_at', { ascending: false })
      .limit(5);

    if (fetchError) {
      console.error('Error fetching emails:', fetchError);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!emails || emails.length === 0) {
      console.log('No matching email found');
      return new Response(JSON.stringify({ received: true, matched: false }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update the first unopened email, or the most recent one
    const emailToUpdate = emails.find(e => !e.opened_at) || emails[0];
    
    console.log('Updating email:', emailToUpdate.id);

    const updateData: Record<string, unknown> = {
      opened_count: (emailToUpdate.opened_count || 0) + 1,
    };

    if (!emailToUpdate.opened_at) {
      updateData.opened_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('emails')
      .update(updateData)
      .eq('id', emailToUpdate.id);

    if (updateError) {
      console.error('Error updating email:', updateError);
      return new Response(JSON.stringify({ error: 'Update failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Email tracking updated successfully for:', emailToUpdate.id);

    return new Response(JSON.stringify({ received: true, updated: true, emailId: emailToUpdate.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);
