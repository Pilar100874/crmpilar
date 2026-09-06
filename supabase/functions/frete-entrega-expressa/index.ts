import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Ponto {
  endereco: string;
  lat?: number;
  lng?: number;
  nome?: string;
  telefone?: string;
}

interface Body {
  estabelecimento_id: string;
  coleta: Ponto;
  entrega: Ponto;
  provider?: "uber_direct" | "lalamove";
}

interface Cotacao {
  provider: string;
  nome: string;
  valor: number | null;
  moeda: string;
  prazo_minutos: number | null;
  cotacao_id: string | null;
  erro?: string;
  bruto?: unknown;
}

async function geocode(p: Ponto): Promise<Ponto> {
  if (p.lat != null && p.lng != null) return p;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(p.endereco)}`;
    const r = await fetch(url, { headers: { "User-Agent": "crm-pilar/1.0" } });
    const j = await r.json();
    if (Array.isArray(j) && j[0]) return { ...p, lat: Number(j[0].lat), lng: Number(j[0].lon) };
  } catch (e) {
    console.error("geocode falhou", e);
  }
  return p;
}

/* ---------------- Uber Direct ---------------- */
async function cotarUber(cfg: any, coleta: Ponto, entrega: Ponto): Promise<Cotacao> {
  const extra = (cfg.configuracao_extra || {}) as Record<string, string>;
  const clientId = extra.client_id;
  const clientSecret = cfg.api_key;
  const customerId = extra.customer_id;
  const base = (cfg.api_url || "https://api.uber.com").replace(/\/+$/, "");
  const out: Cotacao = {
    provider: "uber_direct",
    nome: cfg.nome_display || "Uber Direct",
    valor: null,
    moeda: "BRL",
    prazo_minutos: null,
    cotacao_id: null,
  };
  if (!clientId || !clientSecret || !customerId) {
    return { ...out, erro: "Informe Client ID, Client Secret (API Key) e Customer ID do Uber Direct." };
  }

  let token = cfg.token as string | null;
  if (!token) {
    const tokenRes = await fetch("https://auth.uber.com/oauth/v2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
        scope: "eats.deliveries",
      }),
    });
    const tokenBody = await tokenRes.text();
    if (!tokenRes.ok) {
      console.error(`Uber token [${tokenRes.status}]: ${tokenBody}`);
      return { ...out, erro: `Falha na autenticação Uber (${tokenRes.status}): ${tokenBody}` };
    }
    token = JSON.parse(tokenBody).access_token;
  }

  const payload: Record<string, unknown> = {
    pickup_address: coleta.endereco,
    dropoff_address: entrega.endereco,
  };
  if (coleta.lat != null) { payload.pickup_latitude = coleta.lat; payload.pickup_longitude = coleta.lng; }
  if (entrega.lat != null) { payload.dropoff_latitude = entrega.lat; payload.dropoff_longitude = entrega.lng; }
  if (coleta.telefone) payload.pickup_phone_number = coleta.telefone;
  if (entrega.telefone) payload.dropoff_phone_number = entrega.telefone;

  const res = await fetch(`${base}/v1/customers/${customerId}/delivery_quotes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const raw = await res.text();
  if (!res.ok) {
    console.error(`Uber quote [${res.status}]: ${raw}`);
    return { ...out, erro: `Uber Direct (${res.status}): ${raw}` };
  }
  const j = JSON.parse(raw);
  const dropoffEta = j.dropoff_eta ?? j.duration ?? null;
  return {
    ...out,
    valor: typeof j.fee === "number" ? j.fee / 100 : null,
    moeda: j.currency || j.currency_code || "BRL",
    prazo_minutos: typeof dropoffEta === "number" ? dropoffEta : null,
    cotacao_id: j.id || null,
    bruto: j,
  };
}

/* ---------------- Lalamove ---------------- */
async function hmacSha256(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function cotarLalamove(cfg: any, coleta: Ponto, entrega: Ponto): Promise<Cotacao> {
  const extra = (cfg.configuracao_extra || {}) as Record<string, string>;
  const apiKey = cfg.api_key;
  const apiSecret = cfg.token;
  const market = extra.market || "BR";
  const servico = extra.service_type || "MOTORCYCLE";
  const base = (cfg.api_url || "https://rest.lalamove.com").replace(/\/+$/, "");
  const out: Cotacao = {
    provider: "lalamove",
    nome: cfg.nome_display || "Lalamove",
    valor: null,
    moeda: "BRL",
    prazo_minutos: null,
    cotacao_id: null,
  };
  if (!apiKey || !apiSecret) {
    return { ...out, erro: "Informe a API Key e o API Secret (Token) da Lalamove." };
  }
  if (coleta.lat == null || entrega.lat == null) {
    return { ...out, erro: "Não foi possível localizar as coordenadas dos endereços." };
  }

  const path = "/v3/quotations";
  const bodyObj = {
    data: {
      serviceType: servico,
      language: "pt_BR",
      stops: [
        {
          coordinates: { lat: String(coleta.lat), lng: String(coleta.lng) },
          address: coleta.endereco,
        },
        {
          coordinates: { lat: String(entrega.lat), lng: String(entrega.lng) },
          address: entrega.endereco,
        },
      ],
    },
  };
  const body = JSON.stringify(bodyObj);
  const timestamp = Date.now().toString();
  const signature = await hmacSha256(apiSecret, `${timestamp}\r\nPOST\r\n${path}\r\n\r\n${body}`);

  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      Authorization: `hmac ${apiKey}:${timestamp}:${signature}`,
      "Content-Type": "application/json",
      Market: market,
    },
    body,
  });
  const raw = await res.text();
  if (!res.ok) {
    console.error(`Lalamove quote [${res.status}]: ${raw}`);
    return { ...out, erro: `Lalamove (${res.status}): ${raw}` };
  }
  const j = JSON.parse(raw);
  const d = j.data || {};
  return {
    ...out,
    valor: d.priceBreakdown?.total ? Number(d.priceBreakdown.total) : null,
    moeda: d.priceBreakdown?.currency || "BRL",
    prazo_minutos: null,
    cotacao_id: d.quotationId || null,
    bruto: j,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body?.estabelecimento_id || !body?.coleta?.endereco || !body?.entrega?.endereco) {
      return new Response(
        JSON.stringify({ error: "Informe estabelecimento_id, coleta.endereco e entrega.endereco" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let query = supabase
      .from("frete_terceiros_config")
      .select("*")
      .eq("estabelecimento_id", body.estabelecimento_id)
      .eq("ativo", true)
      .in("provider", ["uber_direct", "lalamove"]);
    if (body.provider) query = query.eq("provider", body.provider);

    const { data: configs, error } = await query;
    if (error) throw error;
    if (!configs?.length) {
      return new Response(
        JSON.stringify({ cotacoes: [], aviso: "Nenhuma integração de entrega expressa ativa." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const [coleta, entrega] = await Promise.all([geocode(body.coleta), geocode(body.entrega)]);

    const cotacoes = await Promise.all(
      configs.map(async (cfg: any) => {
        try {
          return cfg.provider === "uber_direct"
            ? await cotarUber(cfg, coleta, entrega)
            : await cotarLalamove(cfg, coleta, entrega);
        } catch (e) {
          console.error("Erro na cotação", cfg.provider, e);
          return {
            provider: cfg.provider,
            nome: cfg.nome_display,
            valor: null,
            moeda: "BRL",
            prazo_minutos: null,
            cotacao_id: null,
            erro: e instanceof Error ? e.message : String(e),
          } as Cotacao;
        }
      }),
    );

    cotacoes.sort((a, b) => (a.valor ?? Infinity) - (b.valor ?? Infinity));

    return new Response(JSON.stringify({ cotacoes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("frete-entrega-expressa erro:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
