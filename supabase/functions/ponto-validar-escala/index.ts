// Validador de escala vs. CCT: detecta jornada >10h, intervalo <60min em jornadas >6h,
// HE projetada acima do limite mensal. Pode ser usado antes de salvar uma nova escala.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function toMin(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { jornada, intervalo_minutos = 60, he_mensal_estimada_min = 0, limite_he_mensal_min = 7200 } = await req.json();
    if (!jornada) {
      return new Response(JSON.stringify({ error: "jornada (obj) obrigatório" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const erros: any[] = [];
    for (const [dia, j] of Object.entries(jornada as Record<string, any>)) {
      if (!j?.entrada || !j?.saida) continue;
      let total = toMin(j.saida) - toMin(j.entrada);
      if (total < 0) total += 24 * 60;
      const efetiva = total - (j.intervalo_minutos ?? intervalo_minutos);
      if (efetiva > 600) erros.push({ dia, regra: "jornada_maior_que_10h", valor: efetiva });
      if (efetiva > 360 && (j.intervalo_minutos ?? intervalo_minutos) < 60)
        erros.push({ dia, regra: "intervalo_insuficiente", valor: j.intervalo_minutos ?? intervalo_minutos });
      if (efetiva > 480) {
        const heDia = efetiva - 480;
        if (heDia > 120) erros.push({ dia, regra: "he_diaria_acima_2h", valor: heDia });
      }
    }
    if (he_mensal_estimada_min > limite_he_mensal_min)
      erros.push({ regra: "he_mensal_acima_limite", valor: he_mensal_estimada_min, limite: limite_he_mensal_min });

    return new Response(JSON.stringify({ ok: erros.length === 0, erros }),
      { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
