import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";

export interface CaptureResult {
  image_url: string;
  vw: number;
  vh: number;
}

/**
 * Captura a tela atual (document.body), envia ao storage e atualiza a tabela
 * heatmap_screenshots para a rota corrente. Idempotente por (scope, route, estab).
 */
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

  const safeRoute = route.replace(/[^a-zA-Z0-9-_]/g, "_") || "_root";
  const path = `${scope}/${estabelecimentoId || "global"}/${safeRoute}.jpg`;

  const { error: upErr } = await supabase.storage
    .from("heatmap-screenshots")
    .upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "60" });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from("heatmap-screenshots").getPublicUrl(path);
  const image_url = `${pub.publicUrl}?t=${Date.now()}`;

  await supabase.from("heatmap_screenshots" as any).upsert(
    {
      scope,
      route,
      estabelecimento_id: estabelecimentoId,
      image_url: pub.publicUrl,
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
  return data as any;
}
