import { useEffect, useState } from "react";

interface Props {
  /** Tempo total do pulso em milissegundos. */
  duracaoMs: number;
  /** Chamado quando a barra chega em 100%. */
  onFim?: () => void;
  /** Texto exibido antes da porcentagem (ex.: "Desliga em…"). */
  rotulo?: string;
}

/**
 * Barra de porcentagem que acompanha um pulso: vai de 0% a 100%
 * no tempo configurado no dispositivo e some ao terminar.
 */
export default function BarraPulso({ duracaoMs, onFim, rotulo }: Props) {
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

  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-2 z-[5]">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-75 ease-linear"
          style={{ width: `${porcentagem}%` }}
        />
      </div>
      <p className="mt-0.5 text-center text-[10px] font-semibold text-muted-foreground">
        {rotulo ? `${rotulo} ${porcentagem}%` : `${porcentagem}%`}
      </p>
    </div>
  );
}
