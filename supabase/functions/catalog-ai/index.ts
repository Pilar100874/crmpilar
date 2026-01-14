import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, prompt, catalogName, businessType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (action === "generate-image") {
      const realisticPrompt = `
Ultra-realistic photography quality.
Natural, believable lighting with correct light falloff and shadow behavior.
Accurate skin tones and textures — visible pores, micro-details, natural imperfections.
No plastic skin, no AI smoothing, no artificial sharpening.
Correct anatomy, realistic proportions, physically plausible posture and perspective.
High dynamic range without overprocessing — highlights preserved, shadows detailed.
True-to-life materials and surfaces (fabric, skin, metal, glass, concrete).
Depth and separation between subject and background feel natural, not cut-out.
Lens behavior feels real: subtle depth of field where appropriate, natural motion blur if movement exists, realistic noise or grain when low light is present.
Color grading is restrained and photographic — no oversaturation, no fake cinematic LUTs.
Overall image should feel indistinguishable from a real photograph taken in the real world.
No stylization. No illustration look. No CGI feel. No fantasy lighting.
`;

      const fullPrompt = `Generate a FULLSCREEN, high-resolution, edge-to-edge background image for a catalog cover. The image must completely fill a vertical A4 page (portrait orientation, 210x297mm aspect ratio). 

USER REQUEST: ${prompt || 'Professional, elegant and modern catalog cover background with sophisticated colors.'}

PHOTOGRAPHY STYLE REQUIREMENTS:
${realisticPrompt}

IMPORTANT: The image must work as a full-bleed backdrop for white text overlay. No text, no borders, no margins - just pure visual content that fills the entire frame. Ultra high resolution.`;

      // Generate image using Lovable AI
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: fullPrompt
            }
          ],
          modalities: ["image", "text"]
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error("Failed to generate image");
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      if (!imageUrl) {
        throw new Error("No image generated");
      }

      return new Response(JSON.stringify({ imageUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "suggest-layout") {
      // Generate text layout suggestions
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: "You are a professional catalog designer. Generate creative titles and subtitles for product catalogs. Be concise and elegant."
            },
            {
              role: "user",
              content: `Generate 3 creative title and subtitle combinations for a product catalog named "${catalogName}" for a ${businessType || 'general'} business. Return as JSON array with objects containing 'title' and 'subtitle' fields.`
            }
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_layouts",
                description: "Return creative title and subtitle suggestions for catalog cover",
                parameters: {
                  type: "object",
                  properties: {
                    suggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string", description: "Main title for the catalog cover" },
                          subtitle: { type: "string", description: "Subtitle or tagline" }
                        },
                        required: ["title", "subtitle"]
                      }
                    }
                  },
                  required: ["suggestions"]
                }
              }
            }
          ],
          tool_choice: { type: "function", function: { name: "suggest_layouts" } }
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("Failed to generate suggestions");
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      
      if (toolCall?.function?.arguments) {
        const parsed = JSON.parse(toolCall.function.arguments);
        return new Response(JSON.stringify({ suggestions: parsed.suggestions }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("catalog-ai error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
