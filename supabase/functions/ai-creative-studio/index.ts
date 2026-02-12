import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callGateway(apiKey: string, body: Record<string, any>) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const status = response.status;
    const errorText = await response.text().catch(() => "");
    console.error(`AI gateway ${status}:`, errorText);
    if (status === 429) throw Object.assign(new Error("Rate limit exceeded"), { status: 429 });
    if (status === 402) throw Object.assign(new Error("Credits exhausted"), { status: 402 });
    throw Object.assign(new Error(`AI gateway error: ${status} - ${errorText}`), { status: 500 });
  }

  return response.json();
}

// Only these models are supported by Lovable AI gateway
const SUPPORTED_LLM_MODELS = [
  "google/gemini-2.5-flash", "google/gemini-2.5-flash-lite", "google/gemini-2.5-pro",
  "google/gemini-3-flash-preview", "google/gemini-3-pro-preview",
  "openai/gpt-5", "openai/gpt-5-mini", "openai/gpt-5-nano", "openai/gpt-5.2",
];

const SUPPORTED_IMAGE_MODELS = [
  "google/gemini-2.5-flash-image", "google/gemini-3-pro-image-preview",
];

function validateModel(model: string, type: "llm" | "image"): string {
  const supported = type === "image" ? SUPPORTED_IMAGE_MODELS : SUPPORTED_LLM_MODELS;
  if (supported.includes(model)) return model;
  // Fallback to default
  console.warn(`Unsupported model "${model}" for ${type}, using default`);
  return type === "image" ? "google/gemini-2.5-flash-image" : "google/gemini-3-flash-preview";
}

// Truncate base64 images that are too large (max ~500KB base64 per image)
const MAX_IMAGE_BASE64_LENGTH = 700_000; // ~500KB

function truncateImageUrl(url: string): string | null {
  if (!url) return null;
  // If it's a regular URL (not base64), keep it
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  // If base64 is too large, skip it
  if (url.length > MAX_IMAGE_BASE64_LENGTH) {
    console.warn(`Skipping image: base64 too large (${(url.length / 1024).toFixed(0)}KB)`);
    return null;
  }
  return url;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, params } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    console.log(`[ai-creative-studio] action=${action}, model=${params?.model || 'default'}`);

    switch (action) {
      case "enhance_prompt": {
        const model = validateModel(params.model || "google/gemini-3-flash-preview", "llm");
        const data = await callGateway(LOVABLE_API_KEY, {
          model,
          messages: [
            { role: "system", content: params.systemPrompt || "You are a creative prompt enhancement assistant. Take the user's simple prompt and expand it with vivid, descriptive details for AI generation. Keep the enhanced prompt concise but rich in visual detail." },
            { role: "user", content: params.prompt },
          ],
        });

        return new Response(JSON.stringify({ result: data.choices?.[0]?.message?.content }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "generate_image": {
        const model = validateModel(params.model || "google/gemini-2.5-flash-image", "image");
        const content: any[] = [
          { type: "text", text: params.prompt },
        ];
        // Attach reference images if provided (filter out oversized ones)
        const refImages = (params.imageUrls || []) as string[];
        for (const url of refImages) {
          const safe = truncateImageUrl(url);
          if (safe) {
            content.push({ type: "image_url", image_url: { url: safe } });
          }
        }

        const data = await callGateway(LOVABLE_API_KEY, {
          model,
          messages: [{ role: "user", content }],
          modalities: ["image", "text"],
        });

        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        const text = data.choices?.[0]?.message?.content;

        return new Response(JSON.stringify({ result: { imageUrl, text } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "edit_image": {
        const model = validateModel(params.model || "google/gemini-2.5-flash-image", "image");
        const content: any[] = [
          { type: "text", text: params.prompt },
        ];
        // Support single imageUrl or multiple imageUrls (filter oversized)
        const imageUrls = params.imageUrls || (params.imageUrl ? [params.imageUrl] : []);
        for (const url of imageUrls) {
          const safe = truncateImageUrl(url);
          if (safe) {
            content.push({ type: "image_url", image_url: { url: safe } });
          }
        }

        const data = await callGateway(LOVABLE_API_KEY, {
          model,
          messages: [{ role: "user", content }],
          modalities: ["image", "text"],
        });

        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        return new Response(JSON.stringify({ result: { imageUrl } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "generate_text": {
        const model = validateModel(params.model || "google/gemini-3-flash-preview", "llm");
        const data = await callGateway(LOVABLE_API_KEY, {
          model,
          messages: [
            ...(params.systemPrompt ? [{ role: "system", content: params.systemPrompt }] : []),
            { role: "user", content: params.prompt },
          ],
        });

        return new Response(JSON.stringify({ result: data.choices?.[0]?.message?.content }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "analyze_image": {
        const model = validateModel(params.model || "google/gemini-3-flash-preview", "llm");
        const content: any[] = [
          { type: "text", text: params.prompt || "Describe this image in detail." },
        ];
        if (params.imageUrl) {
          content.push({ type: "image_url", image_url: { url: params.imageUrl } });
        }

        const data = await callGateway(LOVABLE_API_KEY, {
          model,
          messages: [{ role: "user", content }],
        });

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
  } catch (e: any) {
    console.error("ai-creative-studio error:", e);
    const status = e?.status || 500;
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
