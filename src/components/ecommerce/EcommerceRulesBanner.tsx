import { useEcommerceRulesEngine, RuleAction } from "@/hooks/useEcommerceRulesEngine";
import { X, ChevronLeft, ChevronRight, Layers, LayoutList } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";

/**
 * Renderiza banners promocionais gerados pelo motor de regras do e-commerce.
 * Suporta posições: topo, meio, rodape.
 * Quando há 2+ banners na mesma posição, exibe toggle carrossel/empilhado.
 */
export default function EcommerceRulesBanner({ posicao }: { posicao?: "topo" | "meio" | "rodape" }) {
  const { bannerActions, loading } = useEcommerceRulesEngine();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [modo, setModo] = useState<"empilhado" | "carrossel">("carrossel");

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Auto-play carousel
  useEffect(() => {
    if (!emblaApi || modo !== "carrossel") return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [emblaApi, modo]);

  if (loading) return null;

  const filtered = bannerActions.filter((b) => {
    if (dismissed.has(b.ruleId)) return false;
    const bannerPos = b.config?.posicao || "topo";
    return !posicao || bannerPos === posicao;
  });

  if (filtered.length === 0) return null;

  const renderBannerContent = (banner: RuleAction & { ruleId: string; ruleName: string }) => {
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
          className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
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
  };

  const showModeToggle = filtered.length >= 2;

  // Empilhado mode
  if (!showModeToggle || modo === "empilhado") {
    return (
      <div className="relative">
        {showModeToggle && (
          <div className="absolute top-2 left-2 z-20 flex gap-1">
            <button
              onClick={() => setModo("carrossel")}
              className="bg-black/60 hover:bg-black/80 text-white rounded p-1.5 transition-colors"
              title="Carrossel"
            >
              <Layers className="h-3.5 w-3.5" />
            </button>
            <button
              disabled
              className="bg-white/90 text-black rounded p-1.5 cursor-default"
              title="Empilhado"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {filtered.map((banner) => renderBannerContent(banner))}
      </div>
    );
  }

  // Carrossel mode
  return (
    <div className="relative">
      <div className="absolute top-2 left-2 z-20 flex gap-1">
        <button
          disabled
          className="bg-white/90 text-black rounded p-1.5 cursor-default"
          title="Carrossel"
        >
          <Layers className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setModo("empilhado")}
          className="bg-black/60 hover:bg-black/80 text-white rounded p-1.5 transition-colors"
          title="Empilhado"
        >
          <LayoutList className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {filtered.map((banner) => (
            <div key={banner.ruleId} className="flex-[0_0_100%] min-w-0">
              {renderBannerContent(banner)}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={() => emblaApi?.scrollPrev()}
        disabled={!canScrollPrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors disabled:opacity-30"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => emblaApi?.scrollNext()}
        disabled={!canScrollNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors disabled:opacity-30"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dots */}
      {filtered.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {filtered.map((_, idx) => (
            <button
              key={idx}
              onClick={() => emblaApi?.scrollTo(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                idx === selectedIndex ? "bg-white" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
