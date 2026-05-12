import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TZ_OFFSET_MIN = -180; // America/Sao_Paulo (UTC-3)

function nowInTZ(): Date {
  const now = new Date();
  return new Date(now.getTime() + TZ_OFFSET_MIN * 60 * 1000);
}

function shouldRun(config: any, lastRunISO: string | null): boolean {
  const periodicidade = config.periodicidade;
  const horario: string = config.horario || ""; // HH:MM
  if (!horario) return false;

  const now = nowInTZ();
  const [hh, mm] = horario.split(":").map(Number);
  if (now.getUTCHours() !== hh || now.getUTCMinutes() !== mm) return false;

  // Avoid double-run within the same minute
  if (lastRunISO) {
    const last = new Date(lastRunISO);
    if (Math.abs(now.getTime() - last.getTime()) < 90 * 1000) return false;
  }

  switch (periodicidade) {
    case "data_especifica": {
      const target = config.data_especifica;
      if (!target) return false;
      const todayISO = now.toISOString().slice(0, 10);
      return target === todayISO;
    }
    case "diario":
      return true;
    case "semanal": {
      const dia = parseInt(config.dia_semana || "-1", 10);
      return now.getUTCDay() === dia;
    }
    case "quinzenal": {
      const diaMes = parseInt(config.dia_mes || "0", 10);
      const day = now.getUTCDate();
      return day === diaMes || day === ((diaMes + 14) % 31 || 15);
    }
    case "mensal": {
      const diaMes = parseInt(config.dia_mes || "0", 10);
      return now.getUTCDate() === diaMes;
    }
    case "anual": {
      const diaMes = parseInt(config.dia_mes || "0", 10);
      return now.getUTCDate() === diaMes && now.getUTCMonth() === 0;
    }
    default:
      return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: autos, error } = await supabase
      .from("marketing_automations")
      .select("*")
      .eq("active", true);

    if (error) throw error;

    const eligible = (autos || []).filter((a: any) => {
      const cfg = a.config || {};
      return cfg.tipo_disparo === "data" && shouldRun(cfg, cfg.last_executed_at);
    });

    console.log(`📅 Scheduler: ${eligible.length}/${autos?.length || 0} automações elegíveis`);

    const results = [];
    for (const a of eligible) {
      try {
        const r = await supabase.functions.invoke("marketing-automation-execute", {
          body: { automationId: a.id },
        });
        results.push({ id: a.id, name: a.name, ok: !r.error });
      } catch (e) {
        results.push({ id: a.id, name: a.name, ok: false, error: String(e) });
      }
    }

    return new Response(
      JSON.stringify({ success: true, executed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("❌ Scheduler erro:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
