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
  if (isNaN(hh) || isNaN(mm)) return false;

  // "Já passou do horário-alvo hoje?" (em horário local)
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const targetMinutes = hh * 60 + mm;
  if (nowMinutes < targetMinutes) return false;

  // Idempotência por período: se já rodou dentro da janela do período, não repete.
  // (evita duplo disparo mesmo com scheduler rodando a cada minuto)
  const last = lastRunISO ? new Date(lastRunISO) : null;
  const lastLocal = last ? new Date(last.getTime() + TZ_OFFSET_MIN * 60 * 1000) : null;

  const sameDay = (a: Date, b: Date) =>
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate();

  switch (periodicidade) {
    case "data_especifica": {
      const target = config.data_especifica;
      if (!target) return false;
      const todayISO = now.toISOString().slice(0, 10);
      if (target !== todayISO) return false;
      if (lastLocal && sameDay(lastLocal, now)) return false;
      return true;
    }
    case "diario": {
      if (lastLocal && sameDay(lastLocal, now)) return false;
      return true;
    }
    case "dia_util": {
      const dow = now.getUTCDay(); // 0=Dom, 6=Sab
      if (dow === 0 || dow === 6) return false;
      if (lastLocal && sameDay(lastLocal, now)) return false;
      return true;
    }
    case "semanal": {
      const dia = parseInt(config.dia_semana ?? "-1", 10);
      if (now.getUTCDay() !== dia) return false;
      if (lastLocal && (now.getTime() - lastLocal.getTime()) < 6 * 24 * 60 * 60 * 1000) return false;
      return true;
    }
    case "quinzenal": {
      const diaMes = parseInt(config.dia_mes || "0", 10);
      const day = now.getUTCDate();
      const alt = ((diaMes + 14) % 31) || 15;
      if (day !== diaMes && day !== alt) return false;
      if (lastLocal && sameDay(lastLocal, now)) return false;
      return true;
    }
    case "mensal": {
      const diaMes = parseInt(config.dia_mes || "0", 10);
      if (now.getUTCDate() !== diaMes) return false;
      if (lastLocal && sameDay(lastLocal, now)) return false;
      return true;
    }
    case "anual": {
      const diaMes = parseInt(config.dia_mes || "0", 10);
      if (now.getUTCDate() !== diaMes || now.getUTCMonth() !== 0) return false;
      if (lastLocal && sameDay(lastLocal, now)) return false;
      return true;
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
        // Reivindica o slot ANTES de invocar para evitar duplo disparo
        // (o execute atualiza last_executed_at só após terminar; enquanto isso,
        // o scheduler do minuto seguinte pode re-executar a mesma automação).
        const claimISO = new Date().toISOString();
        const newCfg = { ...(a.config || {}), last_executed_at: claimISO };
        const prevLast = a.config?.last_executed_at ?? null;
        let claimQuery = supabase
          .from("marketing_automations")
          .update({ config: newCfg })
          .eq("id", a.id);
        claimQuery = prevLast === null
          ? claimQuery.is("config->>last_executed_at", null)
          : claimQuery.eq("config->>last_executed_at", prevLast);
        const { data: claimed, error: claimErr } = await claimQuery.select("id");
        if (claimErr || !claimed || claimed.length === 0) {
          console.warn(`⚠️ Slot já reivindicado para ${a.id}, pulando (evita duplo disparo)`);
          continue;
        }
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
