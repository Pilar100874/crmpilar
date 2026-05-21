import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PublishRequest {
  estabelecimento_id?: string;
  platforms: string[];
  postType?: "image" | "video" | "carousel" | "story" | "text";
  mediaUrl?: string;
  caption?: string;
  hashtags?: string;
  scheduledAt?: string;
}

interface PublishResult {
  platform: string;
  success: boolean;
  post_id?: string;
  permalink?: string;
  error?: string;
}

function buildCaption(caption?: string, hashtags?: string) {
  const parts = [caption?.trim(), hashtags?.trim()].filter(Boolean);
  return parts.join("\n\n");
}

async function publishInstagram(creds: any, body: PublishRequest): Promise<PublishResult> {
  const platform = "instagram";
  try {
    const accessToken = creds.access_token;
    const igUserId = creds.page_id;
    if (!accessToken || !igUserId) throw new Error("Credenciais incompletas (access_token, page_id)");

    const mediaUrls = (body.mediaUrl || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (mediaUrls.length === 0) throw new Error("URL da mídia é obrigatória");

    const isVideo = body.postType === "video" || body.postType === "story";
    const fullCaption = buildCaption(body.caption, body.hashtags);

    let creationId: string;

    if (body.postType === "carousel" && mediaUrls.length > 1) {
      // Cria itens filhos
      const childIds: string[] = [];
      for (const url of mediaUrls) {
        const r = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: url, is_carousel_item: true, access_token: accessToken }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(`Carousel item falhou: ${JSON.stringify(j)}`);
        childIds.push(j.id);
      }
      const r = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "CAROUSEL",
          children: childIds.join(","),
          caption: fullCaption,
          access_token: accessToken,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(`Carousel container falhou: ${JSON.stringify(j)}`);
      creationId = j.id;
    } else {
      const params: any = { caption: fullCaption, access_token: accessToken };
      if (isVideo) {
        params.media_type = body.postType === "story" ? "STORIES" : "REELS";
        params.video_url = mediaUrls[0];
      } else {
        params.image_url = mediaUrls[0];
      }
      const r = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(`Criação de mídia falhou: ${JSON.stringify(j)}`);
      creationId = j.id;
    }

    // Para vídeo, esperar processar
    if (isVideo || body.postType === "carousel") {
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const s = await fetch(
          `https://graph.facebook.com/v21.0/${creationId}?fields=status_code&access_token=${accessToken}`,
        );
        const sj = await s.json();
        if (sj.status_code === "FINISHED") break;
        if (sj.status_code === "ERROR") throw new Error(`Processamento falhou: ${JSON.stringify(sj)}`);
      }
    }

    const pub = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: creationId, access_token: accessToken }),
    });
    const pubJson = await pub.json();
    if (!pub.ok) throw new Error(`Publicação falhou: ${JSON.stringify(pubJson)}`);

    // Buscar permalink
    const perma = await fetch(
      `https://graph.facebook.com/v21.0/${pubJson.id}?fields=permalink&access_token=${accessToken}`,
    );
    const permaJson = await perma.json();

    return { platform, success: true, post_id: pubJson.id, permalink: permaJson.permalink };
  } catch (e: any) {
    return { platform, success: false, error: e.message };
  }
}

async function publishFacebook(creds: any, body: PublishRequest): Promise<PublishResult> {
  const platform = "facebook";
  try {
    const accessToken = creds.access_token;
    const pageId = creds.page_id;
    if (!accessToken || !pageId) throw new Error("Credenciais incompletas (access_token, page_id)");

    const fullCaption = buildCaption(body.caption, body.hashtags);
    const mediaUrls = (body.mediaUrl || "").split(",").map((s) => s.trim()).filter(Boolean);

    let endpoint = `https://graph.facebook.com/v21.0/${pageId}/feed`;
    let params: any = { message: fullCaption, access_token: accessToken };

    if (body.postType === "video" && mediaUrls[0]) {
      endpoint = `https://graph.facebook.com/v21.0/${pageId}/videos`;
      params = { description: fullCaption, file_url: mediaUrls[0], access_token: accessToken };
    } else if (mediaUrls[0] && body.postType !== "text") {
      endpoint = `https://graph.facebook.com/v21.0/${pageId}/photos`;
      params = { caption: fullCaption, url: mediaUrls[0], access_token: accessToken };
    }

    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(j));

    const postId = j.post_id || j.id;
    const permalink = `https://www.facebook.com/${postId}`;

    return { platform, success: true, post_id: postId, permalink };
  } catch (e: any) {
    return { platform, success: false, error: e.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = (await req.json()) as PublishRequest;
    if (!body.platforms || body.platforms.length === 0) {
      return new Response(JSON.stringify({ error: "platforms é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolver estabelecimento
    let estabelecimentoId = body.estabelecimento_id;
    if (!estabelecimentoId) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        if (user) {
          const { data: u } = await admin
            .from("usuarios")
            .select("estabelecimento_id")
            .eq("auth_user_id", user.id)
            .single();
          estabelecimentoId = u?.estabelecimento_id;
        }
      }
    }
    if (!estabelecimentoId) {
      return new Response(JSON.stringify({ error: "estabelecimento_id não identificado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: credRows, error: credErr } = await admin
      .from("social_media_credentials")
      .select("platform, credentials, ativo")
      .eq("estabelecimento_id", estabelecimentoId)
      .in("platform", body.platforms);
    if (credErr) throw credErr;

    const credsByPlatform: Record<string, any> = {};
    (credRows || []).forEach((r: any) => {
      if (r.ativo !== false) credsByPlatform[r.platform] = r.credentials || {};
    });

    const results: PublishResult[] = [];
    for (const plat of body.platforms) {
      const creds = credsByPlatform[plat];
      if (!creds) {
        results.push({ platform: plat, success: false, error: "Plataforma não configurada" });
        continue;
      }
      if (plat === "instagram") results.push(await publishInstagram(creds, body));
      else if (plat === "facebook") results.push(await publishFacebook(creds, body));
      else results.push({ platform: plat, success: false, error: `Plataforma '${plat}' ainda não suportada na publicação automática` });
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
