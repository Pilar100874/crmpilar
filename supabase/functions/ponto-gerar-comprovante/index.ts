// Gera comprovante de marcação de ponto em PDF com NSR + hash + QR Code
// Conforme Portaria 671/2021 art. 81 (comprovante entregue ao trabalhador no momento da marcação)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import QRCode from "https://esm.sh/qrcode@1.5.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { registro_id } = await req.json();
    if (!registro_id) return json({ error: "registro_id obrigatório" }, 400);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: reg, error } = await sb
      .from("ponto_registros")
      .select("*, ponto_funcionarios(nome, cpf, matricula, empresa_id)")
      .eq("id", registro_id).maybeSingle();
    if (error || !reg) return json({ error: "registro não encontrado" }, 404);

    const { data: emp } = await sb.from("empresas")
      .select("razao_social, cnpj, endereco").eq("id", reg.ponto_funcionarios.empresa_id).maybeSingle();

    const nsr = reg.nsr || reg.id.slice(0, 8);
    const dt = new Date(reg.timestamp_registro);
    const ts = dt.toLocaleString("pt-BR");
    // Hash de integridade (SHA-256 dos campos críticos)
    const enc = new TextEncoder();
    const dataHash = `${nsr}|${reg.funcionario_id}|${reg.timestamp_registro}|${reg.tipo}`;
    const buf = await crypto.subtle.digest("SHA-256", enc.encode(dataHash));
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);

    const qrPayload = JSON.stringify({ nsr, ts: reg.timestamp_registro, cpf: reg.ponto_funcionarios.cpf, hash });
    const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 180, margin: 1 });

    const pdf = new jsPDF({ unit: "mm", format: [80, 120] });
    pdf.setFontSize(9); pdf.setFont("helvetica", "bold");
    pdf.text("COMPROVANTE DE MARCAÇÃO", 40, 8, { align: "center" });
    pdf.text("Portaria MTP 671/2021", 40, 12, { align: "center" });
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(7);
    let y = 18;
    const line = (l: string, v: string) => { pdf.text(`${l}: ${v}`, 4, y); y += 4; };
    line("Empresa", (emp?.razao_social || "").slice(0, 40));
    line("CNPJ", emp?.cnpj || "");
    line("Funcionário", reg.ponto_funcionarios.nome);
    line("CPF", reg.ponto_funcionarios.cpf || "");
    line("Matrícula", reg.ponto_funcionarios.matricula || "");
    line("Data/Hora", ts);
    line("Tipo", reg.tipo);
    line("NSR", String(nsr));
    line("Hash", hash);
    pdf.addImage(qrDataUrl, "PNG", 25, y + 2, 30, 30);
    pdf.setFontSize(6);
    pdf.text("Guarde este comprovante.", 40, y + 36, { align: "center" });
    pdf.text("Validade verificável pelo QR Code.", 40, y + 39, { align: "center" });

    const pdfBase64 = pdf.output("datauristring");

    // Registra entrega do comprovante
    await sb.from("ponto_registros").update({
      comprovante_gerado_em: new Date().toISOString(),
      comprovante_hash: hash,
    }).eq("id", registro_id);

    return json({ ok: true, pdf: pdfBase64, hash, nsr, qr: qrPayload });
  } catch (e: any) {
    console.error(e);
    return json({ error: e.message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
