import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// 1x1 transparent GIF pixel
const TRANSPARENT_PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
  0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21,
  0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
  0x01, 0x00, 0x3b
]);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const trackingId = url.searchParams.get('id');

    console.log('Tracking pixel accessed for id:', trackingId);

    if (!trackingId) {
      console.log('No tracking ID provided, returning pixel anyway');
      return new Response(TRANSPARENT_PIXEL, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/gif',
          'Content-Length': TRANSPARENT_PIXEL.length.toString(),
        },
      });
    }

    // Use service role to update without authentication
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update email tracking info
    const { data: email, error: fetchError } = await supabase
      .from('emails')
      .select('id, opened_at, opened_count')
      .eq('tracking_id', trackingId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching email:', fetchError);
    } else if (email) {
      const updateData: any = {
        opened_count: (email.opened_count || 0) + 1,
      };

      // Only set opened_at on first open
      if (!email.opened_at) {
        updateData.opened_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('emails')
        .update(updateData)
        .eq('tracking_id', trackingId);

      if (updateError) {
        console.error('Error updating email tracking:', updateError);
      } else {
        console.log('Email tracking updated successfully for:', trackingId);
      }
    } else {
      console.log('No email found with tracking_id:', trackingId);
    }

    // Always return the pixel
    return new Response(TRANSPARENT_PIXEL, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/gif',
        'Content-Length': TRANSPARENT_PIXEL.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error in email tracking:', error);
    // Return pixel even on error to not break email display
    return new Response(TRANSPARENT_PIXEL, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/gif',
        'Content-Length': TRANSPARENT_PIXEL.length.toString(),
      },
    });
  }
});
