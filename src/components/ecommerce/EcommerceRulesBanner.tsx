import { useEcommerceRulesEngine, RuleAction } from "@/hooks/useEcommerceRulesEngine";
import { X } from "lucide-react";
import { useState } from "react";

/**
 * Renderiza banners promocionais gerados pelo motor de regras do e-commerce.
 * Suporta posições: topo, meio, rodape.
 */
export default function EcommerceRulesBanner({ posicao }: { posicao?: "topo" | "meio" | "rodape" }) {
  const { bannerActions, loading } = useEcommerceRulesEngine();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (loading) return null;

  const filtered = bannerActions.filter((b) => {
    if (dismissed.has(b.ruleId)) return false;
    const bannerPos = b.config?.posicao || "topo";
    return !posicao || bannerPos === posicao;
  });

  if (filtered.length === 0) return null;

  return (
    <>
      {filtered.map((banner) => {
        const { titulo, imagem, link } = banner.config || {};
        const content = (
          <div className="relative w-full group">
            {imagem ? (
              <img
                src={imagem}
                alt={titulo || "Banner promocional"}
                className="w-full h-auto max-h-[300px] object-cover"
              />
            ) : (
              <div className="w-full py-4 px-6 bg-primary text-primary-foreground text-center font-semibold text-lg">
                {titulo || "Promoção"}
              </div>
            )}
            {titulo && imagem && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white px-4 py-2 text-sm font-medium">
                {titulo}
              </div>
            )}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDismissed((prev) => new Set(prev).add(banner.ruleId));
              }}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );

        if (link) {
          return (
            <a key={banner.ruleId} href={link} className="block">
              {content}
            </a>
          );
        }

        return <div key={banner.ruleId}>{content}</div>;
      })}
    </>
  );
}
