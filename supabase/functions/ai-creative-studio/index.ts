import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, params } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    switch (action) {
      case "enhance_prompt": {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: params.model || "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: params.systemPrompt || "You are a creative prompt enhancement assistant. Take the user's simple prompt and expand it with vivid, descriptive details for AI generation. Keep the enhanced prompt concise but rich in visual detail." },
              { role: "user", content: params.prompt },
            ],
          }),
        });

        if (!response.ok) {
          const status = response.status;
          if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          throw new Error(`AI gateway error: ${status}`);
        }

        const data = await response.json();
        return new Response(JSON.stringify({ result: data.choices?.[0]?.message?.content }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "generate_image": {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: params.model || "google/gemini-2.5-flash-image",
            messages: [
              { role: "user", content: params.prompt },
            ],
            modalities: ["image", "text"],
          }),
        });

        if (!response.ok) {
          const status = response.status;
          if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          throw new Error(`AI gateway error: ${status}`);
        }

        const data = await response.json();
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        const text = data.choices?.[0]?.message?.content;

        return new Response(JSON.stringify({ result: { imageUrl, text } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "edit_image": {
        const content: any[] = [
          { type: "text", text: params.prompt },
        ];
        if (params.imageUrl) {
          content.push({ type: "image_url", image_url: { url: params.imageUrl } });
        }

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: params.model || "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content }],
            modalities: ["image", "text"],
          }),
        });

        if (!response.ok) {
          const status = response.status;
          if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          throw new Error(`AI gateway error: ${status}`);
        }

        const data = await response.json();
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        return new Response(JSON.stringify({ result: { imageUrl } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "generate_text": {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: params.model || "google/gemini-2.5-flash",
            messages: [
              ...(params.systemPrompt ? [{ role: "system", content: params.systemPrompt }] : []),
              { role: "user", content: params.prompt },
            ],
          }),
        });

        if (!response.ok) {
          const status = response.status;
          if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          throw new Error(`AI gateway error: ${status}`);
        }

        const data = await response.json();
        return new Response(JSON.stringify({ result: data.choices?.[0]?.message?.content }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "analyze_image": {
        const content: any[] = [
          { type: "text", text: params.prompt || "Describe this image in detail." },
        ];
        if (params.imageUrl) {
          content.push({ type: "image_url", image_url: { url: params.imageUrl } });
        }

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: params.model || "google/gemini-2.5-flash",
            messages: [{ role: "user", content }],
          }),
        });

        if (!response.ok) {
          const status = response.status;
          if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          throw new Error(`AI gateway error: ${status}`);
        }

        const data = await response.json();
        return new Response(JSON.stringify({ result: data.choices?.[0]?.message?.content }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (e) {
    console.error("ai-creative-studio error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
