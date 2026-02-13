import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

async function uploadBase64ToStorage(base64DataUrl: string): Promise<string | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      console.warn("[upload] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return null;
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const [header, base64] = base64DataUrl.split(",");
    const mime = header.match(/data:(.*?);/)?.[1] || "image/png";
    const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
    const fileName = `studio/${crypto.randomUUID()}.${ext}`;
    
    const bytes = base64Decode(base64);
    
    const { error } = await supabase.storage
      .from("marketing-images")
      .upload(fileName, bytes, { contentType: mime, upsert: true });

    if (error) {
      console.error("[upload] Storage upload error:", error.message);
      return null;
    }

    const { data: publicData } = supabase.storage
      .from("marketing-images")
      .getPublicUrl(fileName);

    console.log("[upload] Uploaded to storage:", publicData.publicUrl?.substring(0, 100));
    return publicData.publicUrl;
  } catch (err) {
    console.error("[upload] Failed to upload:", err);
    return null;
  }
}

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

// Max ~500KB base64 per image to support product composite reference images
const MAX_IMAGE_BASE64_LENGTH = 500_000;

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
        const refImages = (params.imageUrls || []) as string[];
        const imageRoles = (params.imageRoles || []) as string[];

        // Identify if there's a strict reference (product/logo/influencer/clothing) — use EDIT mode
        const strictRoles = ['PRODUCT - DO NOT MODIFY', 'LOGO - DO NOT MODIFY', 'PERSON/INFLUENCER - DO NOT MODIFY', 'CLOTHING - DO NOT MODIFY'];
        const hasStrictRef = imageRoles.some(r => strictRoles.includes(r));

        // Find the primary strict image (product takes priority) to use as the BASE image for editing
        let primaryImageUrl: string | null = null;
        const otherImages: { url: string; role: string }[] = [];
        
        if (hasStrictRef) {
          // Priority order for primary: product > logo > influencer > clothing
          const priorityOrder = ['PRODUCT - DO NOT MODIFY', 'LOGO - DO NOT MODIFY', 'PERSON/INFLUENCER - DO NOT MODIFY', 'CLOTHING - DO NOT MODIFY'];
          for (const targetRole of priorityOrder) {
            const idx = imageRoles.indexOf(targetRole);
            if (idx !== -1 && refImages[idx]) {
              const safe = truncateImageUrl(refImages[idx]);
              if (safe) {
                primaryImageUrl = safe;
                // Collect remaining images as context
                for (let i = 0; i < refImages.length; i++) {
                  if (i !== idx) {
                    const s = truncateImageUrl(refImages[i]);
                    if (s) otherImages.push({ url: s, role: imageRoles[i] || 'REFERENCE' });
                  }
                }
                break;
              }
            }
          }
        }

        let data: any;

        if (primaryImageUrl) {
          // === EDIT MODE: Use the product/main image as base, edit around it ===
          console.log(`[generate_image] EDIT MODE — preserving primary image, ${otherImages.length} other refs`);
          
          const editContent: any[] = [];
          // Instruction: edit AROUND the product, not the product itself
          let editPrompt = `EDIT THIS IMAGE: Keep the main subject (product/logo/person) EXACTLY as it is — same shape, colors, label, packaging, proportions. Do NOT change, redraw, or reinterpret the subject. Only modify the BACKGROUND and SURROUNDINGS based on the following instructions:\n\n${params.prompt}`;
          
          // Add other reference images as style/environment context
          for (const other of otherImages) {
            editContent.push({ type: "text", text: `[STYLE/ENVIRONMENT REFERENCE: ${other.role}]` });
            editContent.push({ type: "image_url", image_url: { url: other.url } });
          }
          
          // Add the primary image LAST so it's the "subject" being edited
          editContent.push({ type: "text", text: editPrompt });
          editContent.push({ type: "image_url", image_url: { url: primaryImageUrl } });

          data = await callGateway(LOVABLE_API_KEY, {
            model,
            messages: [
              { role: "system", content: "You are an image editor. You receive a product/subject image. Your job is to ONLY change the background/environment/scenery. The main subject (product, packaging, logo, person) must remain PIXEL-PERFECT — identical shape, colors, text, labels, proportions. Never redraw, reimagine, or alter the subject in any way." },
              { role: "user", content: editContent },
            ],
            modalities: ["image", "text"],
          });
        } else {
          // === GENERATION MODE: No strict references, generate freely ===
          const content: any[] = [];
          for (let idx = 0; idx < refImages.length; idx++) {
            const safe = truncateImageUrl(refImages[idx]);
            if (safe) {
              const roleLabel = imageRoles[idx] || `Reference image ${idx + 1}`;
              content.push({ type: "text", text: `[IMAGE ${idx + 1}: ${roleLabel}]` });
              content.push({ type: "image_url", image_url: { url: safe } });
            }
          }
          content.push({ type: "text", text: params.prompt });

          console.log(`[generate_image] GENERATION MODE — ${refImages.length} refs`);

          const systemMessage = refImages.length > 0
            ? "You are an image generator. Use reference images for style and environment inspiration. Create a high-quality image based on the prompt."
            : "You are an image generator. Create high-quality images based on the prompt.";

          data = await callGateway(LOVABLE_API_KEY, {
            model,
            messages: [
              { role: "system", content: systemMessage },
              { role: "user", content },
            ],
            modalities: ["image", "text"],
          });
        }

        const msg = data.choices?.[0]?.message;
        console.log(`[generate_image] Full message keys:`, JSON.stringify(Object.keys(msg || {})));
        console.log(`[generate_image] Has images array:`, !!(msg?.images?.length));
        console.log(`[generate_image] Content type:`, typeof msg?.content);
        if (Array.isArray(msg?.content)) {
          console.log(`[generate_image] Content parts:`, msg.content.map((p: any) => p.type || typeof p));
        }
        
        // Try multiple extraction paths for the image
        let imageUrl = msg?.images?.[0]?.image_url?.url;
        let text = typeof msg?.content === 'string' ? msg.content : '';
        
        // If content is an array of parts (multimodal), extract image from there
        if (!imageUrl && Array.isArray(msg?.content)) {
          for (const part of msg.content) {
            if (part.type === 'image_url' && part.image_url?.url) {
              imageUrl = part.image_url.url;
            } else if (part.type === 'text' && part.text) {
              text = part.text;
            }
          }
        }

        // Also check inline_data format
        if (!imageUrl && Array.isArray(msg?.content)) {
          for (const part of msg.content) {
            if (part.inline_data?.mime_type?.startsWith('image/')) {
              imageUrl = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
            }
          }
        }

        if (!imageUrl) {
          console.warn(`[generate_image] No image in response. Text: "${(text || '').substring(0, 200)}"`);
          console.warn(`[generate_image] Full response structure:`, JSON.stringify(data).substring(0, 500));
        } else {
          console.log(`[generate_image] Image extracted, length: ${imageUrl.length}`);
          // Upload to storage for reliable delivery
          if (imageUrl.startsWith('data:')) {
            const publicUrl = await uploadBase64ToStorage(imageUrl);
            if (publicUrl) imageUrl = publicUrl;
          }
        }

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

        const msg = data.choices?.[0]?.message;
        let imageUrl = msg?.images?.[0]?.image_url?.url;
        
        if (!imageUrl && Array.isArray(msg?.content)) {
          for (const part of msg.content) {
            if (part.type === 'image_url' && part.image_url?.url) {
              imageUrl = part.image_url.url;
            } else if (part.inline_data?.mime_type?.startsWith('image/')) {
              imageUrl = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
            }
          }
        }

        // Upload to storage for reliable delivery
        if (imageUrl && imageUrl.startsWith('data:')) {
          const publicUrl = await uploadBase64ToStorage(imageUrl);
          if (publicUrl) imageUrl = publicUrl;
        }

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
