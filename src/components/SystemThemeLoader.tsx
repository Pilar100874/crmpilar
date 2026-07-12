import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

/** Converte hex (#rrggbb) para string HSL no formato Tailwind: "H S% L%" */
export function hexToHslString(hex: string): string | null {
  const m = hex.replace("#", "").match(/^([a-f\d]{6})$/i);
  if (!m) return null;
  const num = parseInt(m[1], 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function hslStringToHex(hsl: string): string {
  const m = hsl.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  if (!m) return "#000000";
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function applyPrimaryColor(hsl: string) {
  if (!hsl) return;
  const m = hsl.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  if (!m) return;
  const h = m[1], s = m[2], l = m[3];
  const glowL = Math.min(parseFloat(l) + 10, 95);
  const root = document.documentElement;
  const isDark = root.classList.contains("dark");
  // Accent: light tint in light mode, dark tint in dark mode — used by hover states (ghost/outline/dropdown)
  const accentL = isDark ? 20 : 95;
  const accentS = isDark ? 30 : parseFloat(s);
  root.style.setProperty("--primary", `${h} ${s}% ${l}%`);
  root.style.setProperty("--primary-glow", `${h} ${s}% ${glowL}%`);
  root.style.setProperty("--ring", `${h} ${s}% ${l}%`);
  root.style.setProperty("--sidebar-primary", `${h} ${s}% ${l}%`);
  root.style.setProperty("--accent", `${h} ${accentS}% ${accentL}%`);
  root.style.setProperty("--accent-foreground", `${h} ${s}% ${l}%`);
  root.style.setProperty("--sidebar-accent", `${h} ${accentS}% ${accentL}%`);
  root.style.setProperty("--sidebar-accent-foreground", `${h} ${s}% ${l}%`);
  root.style.setProperty(
    "--gradient-primary",
    `linear-gradient(135deg, hsl(${h} ${s}% ${l}%) 0%, hsl(${h} ${s}% ${glowL}%) 100%)`
  );
}

/* ====================== VISUAL PRESET (menu/minimal/classic) ====================== */
export type VisualPreset = "menu" | "minimal" | "classic";
export const VISUAL_PRESETS: VisualPreset[] = ["menu", "minimal", "classic"];
export const DEFAULT_VISUAL_PRESET: VisualPreset = "menu";

export function applyVisualPreset(preset: VisualPreset) {
  if (!VISUAL_PRESETS.includes(preset)) preset = DEFAULT_VISUAL_PRESET;
  document.documentElement.setAttribute("data-visual-preset", preset);
}

export function getCurrentVisualPreset(): VisualPreset {
  const v = (localStorage.getItem("system_visual_preset") as VisualPreset) || DEFAULT_VISUAL_PRESET;
  return VISUAL_PRESETS.includes(v) ? v : DEFAULT_VISUAL_PRESET;
}

/* ====================== MAIN MENU STYLE (dark/light/brand/glass) ====================== */
export type MainMenuStyle = "dark" | "buttons";
export const MAIN_MENU_STYLES: MainMenuStyle[] = ["dark", "buttons"];
export const DEFAULT_MAIN_MENU_STYLE: MainMenuStyle = "dark";

export function applyMainMenuStyle(style: MainMenuStyle) {
  if (!MAIN_MENU_STYLES.includes(style)) style = DEFAULT_MAIN_MENU_STYLE;
  document.documentElement.setAttribute("data-main-menu-style", style);
}

export function getCurrentMainMenuStyle(): MainMenuStyle {
  const v = (localStorage.getItem("system_main_menu_style") as MainMenuStyle) || DEFAULT_MAIN_MENU_STYLE;
  return MAIN_MENU_STYLES.includes(v) ? v : DEFAULT_MAIN_MENU_STYLE;
}

/* ====================== MAIN MENU LAYOUT (MenuHub cards) ====================== */
export type MainMenuLayout = "icons" | "images" | "list" | "cinema";
export const MAIN_MENU_LAYOUTS: MainMenuLayout[] = ["icons", "images", "list", "cinema"];
export const DEFAULT_MAIN_MENU_LAYOUT: MainMenuLayout = "icons";

export function applyMainMenuLayout(layout: MainMenuLayout) {
  if (!MAIN_MENU_LAYOUTS.includes(layout)) layout = DEFAULT_MAIN_MENU_LAYOUT;
  document.documentElement.setAttribute("data-main-menu-layout", layout);
}

export function getCurrentMainMenuLayout(): MainMenuLayout {
  const v = (localStorage.getItem("system_main_menu_layout") as MainMenuLayout) || DEFAULT_MAIN_MENU_LAYOUT;
  return MAIN_MENU_LAYOUTS.includes(v) ? v : DEFAULT_MAIN_MENU_LAYOUT;
}







export default function SystemThemeLoader() {
  useEffect(() => {
    // Aplica imediatamente cor salva em localStorage (evita flash)
    const cached = localStorage.getItem("system_primary_hsl");
    if (cached) applyPrimaryColor(cached);

    // Aplica preset visual salvo
    applyVisualPreset(getCurrentVisualPreset());

    // Aplica estilo do menu principal salvo
    applyMainMenuStyle(getCurrentMainMenuStyle());



    // Reaplica quando o tema (dark/light) mudar para recalcular --accent
    const observer = new MutationObserver(() => {
      const hsl = localStorage.getItem("system_primary_hsl");
      if (hsl) applyPrimaryColor(hsl);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    (async () => {
      try {
        const estId = await getEstabelecimentoId();
        if (!estId) return;
        const { data } = await supabase
          .from("system_visual_config")
          .select("primary_color_hsl")
          .eq("estabelecimento_id", estId)
          .maybeSingle();
        const hsl = (data as any)?.primary_color_hsl;
        if (hsl) {
          localStorage.setItem("system_primary_hsl", hsl);
          applyPrimaryColor(hsl);
        }
      } catch (err) {
        console.error("SystemThemeLoader error:", err);
      }
    })();

    return () => observer.disconnect();
  }, []);
  return null;
}

