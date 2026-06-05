import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";

export interface CaptureResult {
  image_url: string;
  vw: number;
  vh: number;
}

const BUCKET = "heatmap-screenshots";
const SIGNED_TTL = 60 * 60 * 24 * 7; // 7 dias
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

async function signedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  if (error) return "";
  const raw = (data as any)?.signedUrl || (data as any)?.signedURL || "";
  if (!raw) return "";
  return raw.startsWith("http") ? raw : `${SUPABASE_URL}/storage/v1${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function frameSrcFor(route: string) {
  const url = new URL(route, window.location.origin);
  const currentParams = new URLSearchParams(window.location.search);
  currentParams.forEach((value, key) => {
    if (key.startsWith("__lovable") && !url.searchParams.has(key)) {
      url.searchParams.set(key, value);
    }
  });
  return `${url.pathname}${url.search}${url.hash}`;
}

function canvasLooksBlank(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  const stepX = Math.max(1, Math.floor(canvas.width / 24));
  const stepY = Math.max(1, Math.floor(canvas.height / 16));
  let sampled = 0;
  let changed = 0;
  for (let y = 0; y < canvas.height; y += stepY) {
    for (let x = 0; x < canvas.width; x += stepX) {
      const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
      sampled += 1;
      if (a > 0 && (Math.abs(r - 255) > 8 || Math.abs(g - 255) > 8 || Math.abs(b - 255) > 8)) changed += 1;
    }
  }
  return sampled > 0 && changed / sampled < 0.01;
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

  const { error: dbErr } = await supabase.from("heatmap_screenshots" as any).upsert(
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
  if (dbErr) console.warn("[heatmap] falha ao salvar metadados do fundo:", dbErr.message);

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
  if (!data) {
    const fallbackUrl = await signedUrl(pathFor(scope, estabelecimentoId, route));
    return fallbackUrl ? { image_url: fallbackUrl, vw: 1440, vh: 900 } : null;
  }
  const rec: any = data;
  const url = String(rec.image_url || "");
  const image_url = url.includes("://") ? url : await signedUrl(url || pathFor(scope, estabelecimentoId, route));
  if (!image_url) return null;
  return { image_url, vw: rec.vw || 1440, vh: rec.vh || 900 };
}

/**
 * Captura uma rota arbitrária do mesmo app via iframe oculto (same-origin)
 * e faz upload. Usada para auto-capturar a tela ao selecioná-la no heatmap.
 */
export async function captureRouteViaIframe(
  scope: "sistema" | "ecommerce",
  estabelecimentoId: string | null,
  route: string,
  opts: { width?: number; height?: number; waitMs?: number } = {},
): Promise<CaptureResult> {
  const width = opts.width ?? 1440;
  const height = opts.height ?? 900;
  const waitMs = opts.waitMs ?? 6000; // tempo para a SPA carregar dados/render
  const maxTotalMs = 60000;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "0";
  iframe.style.top = "0";
  iframe.style.width = `${width}px`;
  iframe.style.height = `${height}px`;
  iframe.style.border = "0";
  iframe.style.opacity = "0.01";
  iframe.style.pointerEvents = "none";
  iframe.style.zIndex = "-2147483647";
  iframe.name = "heatmap-capture-frame";
  iframe.setAttribute("aria-hidden", "true");
  // não adicionamos query string para evitar quebrar rotas que não suportam
  iframe.src = route;
  document.body.appendChild(iframe);

  try {
    // Estratégia: aguardamos o evento load se ele vier rápido; caso contrário
    // seguimos mesmo assim após waitMs (apps pesados podem nunca disparar load).
    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      const hardTimer = setTimeout(finish, maxTotalMs);
      iframe.addEventListener(
        "load",
        () => {
          setTimeout(() => { clearTimeout(hardTimer); finish(); }, waitMs);
        },
        { once: true },
      );
      // Fallback: se em waitMs+4s o load não veio, tentamos capturar mesmo assim
      setTimeout(finish, waitMs + 4000);
    });
    const doc = iframe.contentDocument;
    if (!doc?.body) throw new Error("Iframe sem documento acessível");
    const target = doc.body;

    const canvas = await html2canvas(target, {
      backgroundColor: "#ffffff",
      scale: 1,
      useCORS: true,
      logging: false,
      windowWidth: width,
      windowHeight: height,
      width,
      height: Math.min(target.scrollHeight || height, height * 3),
      imageTimeout: 8000,
      ignoreElements: (el) => ["IFRAME", "VIDEO"].includes(el.tagName),
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

    const { error: dbErr } = await supabase.from("heatmap_screenshots" as any).upsert(
      {
        scope,
        route,
        estabelecimento_id: estabelecimentoId,
        image_url: path,
        vw: width,
        vh: height,
      },
      { onConflict: "scope,route,estabelecimento_id" },
    );
    if (dbErr) console.warn("[heatmap] falha ao salvar metadados do fundo:", dbErr.message);

    return { image_url, vw: width, vh: height };
  } finally {
    iframe.remove();
  }
}
