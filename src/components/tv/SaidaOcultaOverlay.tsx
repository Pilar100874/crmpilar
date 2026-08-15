/** Indicador discreto que só aparece enquanto o usuário mantém pressionado. */
export function SaidaOcultaOverlay({ progresso }: { progresso: number }) {
  if (progresso <= 0.2) return null;
  const pct = Math.round(progresso * 100);
  return (
    <div
      className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      style={{ zIndex: 9999999 }}
    >
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-foreground/20">
        <div className="h-full bg-foreground/70 transition-[width] duration-75" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-foreground/70">Segure para sair…</span>
    </div>
  );
}
