// Bloco de data, hora e clima (estilo Home Assistant).
// O clima vem da API pública Open-Meteo (sem chave e sem custo).
import { useEffect, useMemo, useState } from "react";
import {
  Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun,
  Droplets, Loader2, MapPin, Moon, Sun, Wind,
} from "lucide-react";
import { Bloco } from "@/lib/automacao/api";
import { fonteCss } from "./BlocoTexto";

interface ConfigClima {
  cidade?: string;
  latitude?: number;
  longitude?: number;
  mostrar_data?: boolean;
  mostrar_hora?: boolean;
  mostrar_clima?: boolean;
  mostrar_detalhes?: boolean;
  segundos?: boolean;
  layout?: "vertical" | "horizontal";
  fonte?: string;
  cor?: string;
  cor_secundaria?: string;
  fundo?: string;
  tamanho_hora?: number;
  tamanho_data?: number;
  tamanho_temp?: number;
}

interface Tempo {
  temp: number;
  aparente: number;
  codigo: number;
  dia: boolean;
  vento: number;
  umidade: number;
  max: number;
  min: number;
}

/** Códigos WMO -> ícone e descrição em português. */
function tempoInfo(codigo: number, dia: boolean) {
  const c = codigo;
  if (c === 0) return { Icone: dia ? Sun : Moon, texto: dia ? "Céu limpo" : "Noite limpa" };
  if (c <= 2) return { Icone: CloudSun, texto: "Parcialmente nublado" };
  if (c === 3) return { Icone: Cloud, texto: "Nublado" };
  if (c === 45 || c === 48) return { Icone: CloudFog, texto: "Neblina" };
  if (c >= 51 && c <= 57) return { Icone: CloudDrizzle, texto: "Garoa" };
  if (c >= 61 && c <= 67) return { Icone: CloudRain, texto: "Chuva" };
  if (c >= 71 && c <= 77) return { Icone: CloudSnow, texto: "Neve" };
  if (c >= 80 && c <= 82) return { Icone: CloudRain, texto: "Pancadas de chuva" };
  if (c >= 85 && c <= 86) return { Icone: CloudSnow, texto: "Nevascas" };
  if (c >= 95) return { Icone: CloudLightning, texto: "Tempestade" };
  return { Icone: Cloud, texto: "Tempo instável" };
}

export default function BlocoClima({ bloco }: { bloco: Bloco }) {
  const cfg = (bloco.config ?? {}) as ConfigClima;
  const [agora, setAgora] = useState(() => new Date());
  const [tempo, setTempo] = useState<Tempo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const lat = typeof cfg.latitude === "number" ? cfg.latitude : -23.5505;
  const lon = typeof cfg.longitude === "number" ? cfg.longitude : -46.6333;
  const mostrarClima = cfg.mostrar_clima !== false;

  // Relógio
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Clima (atualiza a cada 15 minutos)
  useEffect(() => {
    if (!mostrarClima) return;
    let vivo = true;
    const buscar = async () => {
      setCarregando(true);
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,wind_speed_10m` +
          `&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;
        const r = await fetch(url);
        if (!r.ok) throw new Error("falha");
        const j = await r.json();
        if (!vivo) return;
        setTempo({
          temp: Math.round(j.current.temperature_2m),
          aparente: Math.round(j.current.apparent_temperature),
          codigo: Number(j.current.weather_code),
          dia: j.current.is_day === 1,
          vento: Math.round(j.current.wind_speed_10m),
          umidade: Math.round(j.current.relative_humidity_2m),
          max: Math.round(j.daily.temperature_2m_max?.[0]),
          min: Math.round(j.daily.temperature_2m_min?.[0]),
        });
        setErro(null);
      } catch {
        if (vivo) setErro("Não foi possível buscar o clima agora.");
      } finally {
        if (vivo) setCarregando(false);
      }
    };
    buscar();
    const t = setInterval(buscar, 15 * 60 * 1000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [lat, lon, mostrarClima]);

  const hora = useMemo(
    () =>
      agora.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        ...(cfg.segundos ? { second: "2-digit" as const } : {}),
      }),
    [agora, cfg.segundos],
  );
  const data = useMemo(
    () => agora.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }),
    [agora],
  );

  const cor = cfg.cor || "hsl(var(--foreground))";
  const cor2 = cfg.cor_secundaria || "hsl(var(--muted-foreground))";
  const info = tempo ? tempoInfo(tempo.codigo, tempo.dia) : null;
  const Icone = info?.Icone ?? Cloud;
  const horizontal = cfg.layout === "horizontal";

  return (
    <div
      className="flex h-full w-full overflow-hidden rounded-[inherit] p-4"
      style={{
        background: cfg.fundo || "hsl(var(--card))",
        color: cor,
        fontFamily: fonteCss(cfg.fonte),
      }}
    >
      <div
        className={
          horizontal
            ? "flex h-full w-full items-center justify-between gap-4"
            : "flex h-full w-full flex-col items-start justify-center gap-1"
        }
      >
        <div className="min-w-0">
          {cfg.mostrar_hora !== false && (
            <div
              className="font-semibold leading-none tabular-nums"
              style={{ fontSize: Math.max(12, Number(cfg.tamanho_hora ?? 44)) }}
            >
              {hora}
            </div>
          )}
          {cfg.mostrar_data !== false && (
            <div
              className="mt-1 truncate capitalize"
              style={{ fontSize: Math.max(8, Number(cfg.tamanho_data ?? 14)), color: cor2 }}
            >
              {data}
            </div>
          )}
          {cfg.cidade && (
            <div className="mt-1 flex items-center gap-1 truncate" style={{ fontSize: 12, color: cor2 }}>
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{cfg.cidade}</span>
            </div>
          )}
        </div>

        {mostrarClima && (
          <div className={horizontal ? "flex shrink-0 items-center gap-3" : "mt-2 flex items-center gap-3"}>
            {carregando && !tempo ? (
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: cor2 }} />
            ) : erro && !tempo ? (
              <span style={{ fontSize: 12, color: cor2 }}>{erro}</span>
            ) : tempo ? (
              <>
                <Icone className="h-10 w-10 shrink-0" style={{ color: cor }} />
                <div className="min-w-0">
                  <div
                    className="font-semibold leading-none tabular-nums"
                    style={{ fontSize: Math.max(12, Number(cfg.tamanho_temp ?? 28)) }}
                  >
                    {tempo.temp}°
                  </div>
                  <div className="truncate" style={{ fontSize: 12, color: cor2 }}>
                    {info?.texto} · {tempo.min}° / {tempo.max}°
                  </div>
                  {cfg.mostrar_detalhes !== false && (
                    <div className="mt-1 flex items-center gap-3" style={{ fontSize: 11, color: cor2 }}>
                      <span className="flex items-center gap-1">
                        <Droplets className="h-3 w-3" /> {tempo.umidade}%
                      </span>
                      <span className="flex items-center gap-1">
                        <Wind className="h-3 w-3" /> {tempo.vento} km/h
                      </span>
                      <span>Sensação {tempo.aparente}°</span>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
