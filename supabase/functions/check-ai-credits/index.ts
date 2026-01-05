import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreditInfo {
  provider: string;
  displayName: string;
  credits?: number;
  creditsUsed?: number;
  creditsRemaining?: number;
  balance?: number;
  quota?: {
    used: number;
    total: number;
    remaining: number;
  };
  usage?: {
    tokens?: number;
    requests?: number;
    cost?: number;
  };
  plan?: string;
  error?: string;
  supported: boolean;
}

async function checkOpenAICredits(apiKey: string, orgId?: string): Promise<CreditInfo> {
  try {
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    if (orgId) headers["OpenAI-Organization"] = orgId;

    // Check usage for current billing period
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];

    const usageResponse = await fetch(
      `https://api.openai.com/v1/dashboard/billing/usage?start_date=${startDate}&end_date=${endDate}`,
      { headers }
    );

    if (usageResponse.ok) {
      const usageData = await usageResponse.json();
      
      // Get subscription info
      const subResponse = await fetch(
        "https://api.openai.com/v1/dashboard/billing/subscription",
        { headers }
      );
      
      let balance = 0;
      let plan = "free";
      
      if (subResponse.ok) {
        const subData = await subResponse.json();
        balance = (subData.hard_limit_usd || 0) - (usageData.total_usage / 100);
        plan = subData.plan?.title || "free";
      }

      return {
        provider: "openai",
        displayName: "OpenAI",
        usage: {
          cost: usageData.total_usage / 100,
        },
        balance,
        plan,
        supported: true,
      };
    }

    return {
      provider: "openai",
      displayName: "OpenAI",
      error: "Não foi possível obter informações de uso",
      supported: true,
    };
  } catch (error) {
    return {
      provider: "openai",
      displayName: "OpenAI",
      error: error instanceof Error ? error.message : "Erro desconhecido",
      supported: true,
    };
  }
}

async function checkAnthropicCredits(apiKey: string): Promise<CreditInfo> {
  try {
    // Anthropic doesn't have a public billing API, but we can validate the key
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });

    if (response.ok || response.status === 200) {
      return {
        provider: "anthropic",
        displayName: "Anthropic (Claude)",
        plan: "API Access",
        supported: false,
        error: "Anthropic não fornece API de billing pública. Verifique em console.anthropic.com",
      };
    }

    const errorData = await response.json();
    if (errorData.error?.type === "insufficient_quota") {
      return {
        provider: "anthropic",
        displayName: "Anthropic (Claude)",
        creditsRemaining: 0,
        error: "Créditos esgotados",
        supported: false,
      };
    }

    return {
      provider: "anthropic",
      displayName: "Anthropic (Claude)",
      supported: false,
      error: "Verifique créditos em console.anthropic.com",
    };
  } catch (error) {
    return {
      provider: "anthropic",
      displayName: "Anthropic (Claude)",
      error: error instanceof Error ? error.message : "Erro desconhecido",
      supported: false,
    };
  }
}

async function checkGroqCredits(apiKey: string): Promise<CreditInfo> {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return {
        provider: "groq",
        displayName: "Groq",
        plan: "API Access",
        supported: false,
        error: "Groq oferece plano gratuito generoso. Verifique em console.groq.com",
      };
    }

    return {
      provider: "groq",
      displayName: "Groq",
      error: "Chave inválida ou expirada",
      supported: false,
    };
  } catch (error) {
    return {
      provider: "groq",
      displayName: "Groq",
      error: error instanceof Error ? error.message : "Erro desconhecido",
      supported: false,
    };
  }
}

async function checkElevenLabsCredits(apiKey: string): Promise<CreditInfo> {
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
      headers: {
        "xi-api-key": apiKey,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        provider: "elevenlabs",
        displayName: "ElevenLabs",
        quota: {
          used: data.character_count || 0,
          total: data.character_limit || 0,
          remaining: (data.character_limit || 0) - (data.character_count || 0),
        },
        plan: data.tier || "free",
        supported: true,
      };
    }

    return {
      provider: "elevenlabs",
      displayName: "ElevenLabs",
      error: "Não foi possível obter informações",
      supported: true,
    };
  } catch (error) {
    return {
      provider: "elevenlabs",
      displayName: "ElevenLabs",
      error: error instanceof Error ? error.message : "Erro desconhecido",
      supported: true,
    };
  }
}

async function checkReplicateCredits(apiKey: string): Promise<CreditInfo> {
  try {
    const response = await fetch("https://api.replicate.com/v1/account", {
      headers: {
        "Authorization": `Token ${apiKey}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        provider: "replicate",
        displayName: "Replicate",
        plan: data.type || "user",
        supported: false,
        error: "Verifique créditos em replicate.com/account",
      };
    }

    return {
      provider: "replicate",
      displayName: "Replicate",
      error: "Chave inválida",
      supported: false,
    };
  } catch (error) {
    return {
      provider: "replicate",
      displayName: "Replicate",
      error: error instanceof Error ? error.message : "Erro desconhecido",
      supported: false,
    };
  }
}

async function checkStabilityCredits(apiKey: string): Promise<CreditInfo> {
  try {
    const response = await fetch("https://api.stability.ai/v1/user/balance", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        provider: "stability",
        displayName: "Stability AI",
        credits: data.credits || 0,
        creditsRemaining: data.credits || 0,
        supported: true,
      };
    }

    return {
      provider: "stability",
      displayName: "Stability AI",
      error: "Não foi possível obter saldo",
      supported: true,
    };
  } catch (error) {
    return {
      provider: "stability",
      displayName: "Stability AI",
      error: error instanceof Error ? error.message : "Erro desconhecido",
      supported: true,
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, apiKey, organizationId, estabelecimentoId } = await req.json();

    if (!provider || !apiKey) {
      return new Response(
        JSON.stringify({ error: "Provider and API key are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let creditInfo: CreditInfo;

    switch (provider) {
      case "openai":
        creditInfo = await checkOpenAICredits(apiKey, organizationId);
        break;
      case "anthropic":
        creditInfo = await checkAnthropicCredits(apiKey);
        break;
      case "groq":
        creditInfo = await checkGroqCredits(apiKey);
        break;
      case "elevenlabs":
        creditInfo = await checkElevenLabsCredits(apiKey);
        break;
      case "replicate":
        creditInfo = await checkReplicateCredits(apiKey);
        break;
      case "stability":
        creditInfo = await checkStabilityCredits(apiKey);
        break;
      default:
        creditInfo = {
          provider,
          displayName: provider,
          supported: false,
          error: "Este provedor não suporta verificação de créditos via API. Verifique diretamente no painel do provedor.",
        };
    }

    return new Response(
      JSON.stringify(creditInfo),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking credits:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
