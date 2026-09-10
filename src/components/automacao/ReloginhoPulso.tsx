import { useEffect, useState } from "react";

interface Props {
  /** Tempo total do pulso em milissegundos. */
  duracaoMs: number;
  /** Chamado quando o relóginho chega em 100%. */
  onFim?: () => void;
}

/**
 * Indicador circular pequeno, como um relógio, que acompanha o tempo restante
 * de um pulso ou auto-desligar. Fica centralizado no elemento.
 */
export default function ReloginhoPulso({ duracaoMs, onFim }: Props) {
  const [porcentagem, setPorcentagem] = useState(0);

  useEffect(() => {
    const inicio = Date.now();
    const passo = 50; // atualização a cada 50 ms, leve e suave
    const timer = window.setInterval(() => {
      const decorrido = Date.now() - inicio;
      const pct = Math.min(100, Math.round((decorrido / duracaoMs) * 100));
      setPorcentagem(pct);
      if (pct >= 100) {
        window.clearInterval(timer);
        onFim?.();
      }
    }, passo);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duracaoMs]);

  const raio = 13;
  const circunferencia = 2 * Math.PI * raio;
  const offset = circunferencia - (porcentagem / 100) * circunferencia;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-background/85 backdrop-blur-sm shadow-lg ring-1 ring-border/60">
        <svg className="h-7 w-7 -rotate-90" viewBox="0 0 30 30">
          <circle
            cx="15"
            cy="15"
            r={raio}
            fill="none"
            strokeWidth="3"
            className="stroke-muted-foreground/25"
          />
          <circle
            cx="15"
            cy="15"
            r={raio}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circunferencia}
            strokeDashoffset={offset}
            className="stroke-primary transition-[stroke-dashoffset] duration-75 ease-linear"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-primary">
          {porcentagem}%
        </span>
      </div>
    </div>
  );
}
