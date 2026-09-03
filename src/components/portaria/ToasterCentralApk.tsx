import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * Mensagens do app Pilar Fone: aparecem no centro da tela e somem sozinhas em 2 segundos.
 */
export default function ToasterCentralApk() {
  const { toasts, dismiss } = useToast();
  const visiveis = toasts.filter((t) => t.open !== false);

  useEffect(() => {
    if (visiveis.length === 0) return;
    const timers = visiveis.map((t) => setTimeout(() => dismiss(t.id), 2000));
    return () => timers.forEach(clearTimeout);
  }, [visiveis.map((t) => t.id).join(","), dismiss]);

  if (visiveis.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center p-6">
      <div className="flex w-full max-w-xs flex-col gap-2">
        {visiveis.map((t) => (
          <div
            key={t.id}
            className={cn(
              "animate-in fade-in zoom-in-95 rounded-2xl border px-5 py-4 text-center shadow-2xl backdrop-blur-xl",
              t.variant === "destructive"
                ? "border-red-500/40 bg-[#3A1220]/95 text-red-100"
                : "border-white/10 bg-[#152443]/95 text-white",
            )}
          >
            {t.title && <p className="text-sm font-semibold leading-snug">{t.title}</p>}
            {t.description && (
              <p className="mt-1 text-xs leading-snug text-slate-300">{t.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
