import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";

export interface CaptureResult {
  image_url: string;
  vw: number;
  vh: number;
}

const BUCKET = "heatmap-screenshots";
const SIGNED_TTL = 60 * 60 * 24 * 7; // 7 dias

async function signedUrl(path: string): Promise<string> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  return data?.signedUrl || "";
}

function pathFor(scope: "sistema" | "ecommerce", estab: string | null, route: string) {
  const safeRoute = route.replace(/[^a-zA-Z0-9-_]/g, "_") || "_root";
  return `${scope}/${estab || "global"}/${safeRoute}.jpg`;
}

export async function captureAndUploadScreenshot(
  scope: "sistema" | "ecommerce",
  estabelecimentoId: string | null,
  routeOverride?: string,
): Promise<CaptureResult> {
  const route = routeOverride ?? window.location.pathname;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const canvas = await html2canvas(document.body, {
    backgroundColor: "#ffffff",
    scale: 1,
    useCORS: true,
    logging: false,
    windowWidth: vw,
    windowHeight: vh,
    height: Math.min(document.body.scrollHeight, vh * 3),
    width: vw,
  });

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob falhou"))), "image/jpeg", 0.78),
  );

  const path = pathFor(scope, estabelecimentoId, route);
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "60" });
  if (upErr) throw upErr;

  const image_url = await signedUrl(path);

  await supabase.from("heatmap_screenshots" as any).upsert(
    {
      scope,
      route,
      estabelecimento_id: estabelecimentoId,
      image_url: path, // armazena o caminho; geramos URL assinada na leitura
      vw,
      vh,
    },
    { onConflict: "scope,route,estabelecimento_id" },
  );

  return { image_url, vw, vh };
}

export async function fetchScreenshot(
  scope: "sistema" | "ecommerce",
  route: string,
  estabelecimentoId: string | null,
): Promise<CaptureResult | null> {
  let q = supabase
    .from("heatmap_screenshots" as any)
    .select("image_url,vw,vh")
    .eq("scope", scope)
    .eq("route", route);
  q = estabelecimentoId ? q.eq("estabelecimento_id", estabelecimentoId) : q.is("estabelecimento_id", null);
  const { data } = await q.maybeSingle();
  if (!data) return null;
  const rec: any = data;
  // image_url pode ser um path (novo) ou URL antiga; se contém "://", usa direto
  const url = String(rec.image_url || "");
  const image_url = url.includes("://") ? url : await signedUrl(url || pathFor(scope, estabelecimentoId, route));
  return { image_url, vw: rec.vw, vh: rec.vh };
}
