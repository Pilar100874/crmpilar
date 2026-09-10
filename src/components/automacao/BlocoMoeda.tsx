// Bloco de cotação de moedas em tempo real (ex.: Dólar em Real).
// Fonte principal: AwesomeAPI (pública, sem chave). Reserva: Frankfurter.
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Bloco } from "@/lib/automacao/api";
import { fonteCss } from "./BlocoTexto";

export const MOEDAS = [
  { valor: "USD", rotulo: "Dólar americano (US$)", simbolo: "US$" },
  { valor: "BRL", rotulo: "Real (R$)", simbolo: "R$" },
  { valor: "EUR", rotulo: "Euro (€)", simbolo: "€" },
  { valor: "GBP", rotulo: "Libra (£)", simbolo: "£" },
  { valor: "ARS", rotulo: "Peso argentino", simbolo: "$" },
  { valor: "CLP", rotulo: "Peso chileno", simbolo: "$" },
  { valor: "PYG", rotulo: "Guarani", simbolo: "₲" },
  { valor: "UYU", rotulo: "Peso uruguaio", simbolo: "$" },
  { valor: "JPY", rotulo: "Iene (¥)", simbolo: "¥" },
  { valor: "CNY", rotulo: "Yuan (¥)", simbolo: "¥" },
  { valor: "CHF", rotulo: "Franco suíço", simbolo: "CHF" },
  { valor: "CAD", rotulo: "Dólar canadense", simbolo: "C$" },
  { valor: "AUD", rotulo: "Dólar australiano", simbolo: "A$" },
  { valor: "BTC", rotulo: "Bitcoin", simbolo: "₿" },
];

export function simboloMoeda(codigo?: string) {
  return MOEDAS.find((m) => m.valor === codigo)?.simbolo ?? codigo ?? "";
}

interface ConfigMoeda {
  de?: string;
  para?: string;
  quantidade?: number;
  casas?: number;
  intervalo?: number;
  mostrar_variacao?: boolean;
  mostrar_maxmin?: boolean;
  mostrar_atualizacao?: boolean;
  titulo?: string;
  layout?: "vertical" | "horizontal";
  fonte?: string;
  cor?: string;
  cor_secundaria?: string;
  fundo?: string;
  transparente?: boolean;
  tamanho_valor?: number;
}

interface Cotacao {
  valor: number;
  variacao: number | null;
  max: number | null;
  min: number | null;
  quando: Date | null;
}

async function buscarCotacao(de: string, para: string): Promise<Cotacao> {
  if (de === para) return { valor: 1, variacao: 0, max: 1, min: 1, quando: new Date() };
  try {
    const r = await fetch(`https://economia.awesomeapi.com.br/json/last/${de}-${para}`);
    if (r.ok) {
      const j = await r.json();
      const item = j?.[`${de}${para}`];
      if (item?.bid) {
        return {
          valor: Number(item.bid),
          variacao: item.pctChange != null ? Number(item.pctChange) : null,
          max: item.high != null ? Number(item.high) : null,
          min: item.low != null ? Number(item.low) : null,
          quando: item.create_date ? new Date(item.create_date.replace(" ", "T")) : new Date(),
        };
      }
    }
  } catch {
    /* tenta a fonte reserva */
  }
  const r2 = await fetch(`https://api.frankfurter.app/latest?from=${de}&to=${para}`);
  if (!r2.ok) throw new Error("falha");
  const j2 = await r2.json();
  const v = Number(j2?.rates?.[para]);
  if (!Number.isFinite(v)) throw new Error("falha");
  return { valor: v, variacao: null, max: null, min: null, quando: new Date() };
}

export default function BlocoMoeda({ bloco }: { bloco: Bloco }) {
  const cfg = (bloco.config ?? {}) as ConfigMoeda;
  const de = (cfg.de || "USD").toUpperCase();
  const para = (cfg.para || "BRL").toUpperCase();
  const quantidade = Number(cfg.quantidade ?? 1) || 1;
  const casas = Math.min(8, Math.max(0, Number(cfg.casas ?? 2)));
  const intervaloSeg = Math.max(10, Number(cfg.intervalo ?? 60));

  const [cotacao, setCotacao] = useState<Cotacao | null>(null);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    const rodar = async () => {
      try {
        const c = await buscarCotacao(de, para);
        if (!vivo) return;
        setCotacao(c);
        setErro(false);
      } catch {
        if (vivo) setErro(true);
      } finally {
        if (vivo) setCarregando(false);
      }
    };
    rodar();
    const t = setInterval(rodar, intervaloSeg * 1000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [de, para, intervaloSeg]);

  const fmt = useMemo(
    () => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }),
    [casas],
  );

  const cor = cfg.cor || "hsl(var(--foreground))";
  const cor2 = cfg.cor_secundaria || "hsl(var(--muted-foreground))";
  const horizontal = cfg.layout === "horizontal";
  const variacao = cotacao?.variacao ?? null;
  const Tendencia = variacao == null || variacao === 0 ? Minus : variacao > 0 ? TrendingUp : TrendingDown;
  const corVariacao =
    variacao == null || variacao === 0 ? cor2 : variacao > 0 ? "hsl(var(--success, 142 71% 45%))" : "hsl(var(--destructive))";

  return (
    <div
      className="flex h-full w-full overflow-hidden rounded-[inherit] p-4"
      style={{
        background: cfg.transparente ? "transparent" : cfg.fundo || "hsl(var(--card))",
        color: cor,
        fontFamily: fonteCss(cfg.fonte),
      }}
    >
      <div
        className={
          horizontal
            ? "flex h-full w-full items-center justify-between gap-4"
            : "flex h-full w-full flex-col justify-center gap-1"
        }
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1 truncate" style={{ fontSize: 12, color: cor2 }}>
            <span className="truncate">{cfg.titulo || `${de}`}</span>
            <ArrowRight className="h-3 w-3 shrink-0" />
            <span className="truncate">{para}</span>
          </div>
          <div className="truncate" style={{ fontSize: 11, color: cor2 }}>
            {fmt.format(quantidade)} {simboloMoeda(de)}
          </div>
        </div>

        <div className={horizontal ? "min-w-0 text-right" : "min-w-0"}>
          {carregando && !cotacao ? (
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: cor2 }} />
          ) : erro && !cotacao ? (
            <span style={{ fontSize: 12, color: cor2 }}>Não foi possível buscar a cotação.</span>
          ) : cotacao ? (
            <>
              <div
                className="font-semibold leading-none tabular-nums"
                style={{ fontSize: Math.max(12, Number(cfg.tamanho_valor ?? 34)) }}
              >
                {simboloMoeda(para)} {fmt.format(cotacao.valor * quantidade)}
              </div>
              {cfg.mostrar_variacao !== false && (
                <div
                  className="mt-1 flex items-center gap-1 tabular-nums"
                  style={{ fontSize: 12, color: corVariacao, justifyContent: horizontal ? "flex-end" : undefined }}
                >
                  <Tendencia className="h-3.5 w-3.5" />
                  {variacao == null ? "sem variação hoje" : `${variacao > 0 ? "+" : ""}${variacao.toFixed(2)}% hoje`}
                </div>
              )}
              {cfg.mostrar_maxmin && (cotacao.max != null || cotacao.min != null) && (
                <div className="mt-1 truncate tabular-nums" style={{ fontSize: 11, color: cor2 }}>
                  máx {fmt.format((cotacao.max ?? 0) * quantidade)} · mín {fmt.format((cotacao.min ?? 0) * quantidade)}
                </div>
              )}
              {cfg.mostrar_atualizacao !== false && cotacao.quando && (
                <div className="mt-1 truncate" style={{ fontSize: 10, color: cor2 }}>
                  atualizado {cotacao.quando.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
