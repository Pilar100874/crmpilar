import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Ad {
  id: string;
  titulo: string;
  descricao: string | null;
  imagem_url: string | null;
  link_url: string | null;
  posicao: string;
  tipo: string;
  html_conteudo: string | null;
}

interface EcommerceAdBannerProps {
  posicao: string;
  className?: string;
  carousel?: boolean;
  autoPlay?: boolean;
  interval?: number;
}

export default function EcommerceAdBanner({ posicao, className = "", carousel = false, autoPlay = true, interval = 5000 }: EcommerceAdBannerProps) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAds();
  }, [posicao]);

  useEffect(() => {
    if (!carousel || !autoPlay || ads.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % ads.length);
    }, interval);
    return () => clearInterval(timer);
  }, [carousel, autoPlay, ads.length, interval]);

  const loadAds = async () => {
    const estabId = localStorage.getItem("estabelecimentoId");
    const now = new Date().toISOString();
    
    let query = supabase
      .from("ecommerce_anuncios")
      .select("id, titulo, descricao, imagem_url, link_url, posicao, tipo, html_conteudo")
      .eq("posicao", posicao)
      .eq("ativo", true)
      .order("ordem");

    if (estabId) {
      query = query.eq("estabelecimento_id", estabId);
    }

    const { data } = await query;
    
    // Filter by date range client-side
    const filtered = (data || []).filter((ad: any) => {
      if (ad.data_inicio && new Date(ad.data_inicio) > new Date()) return false;
      if (ad.data_fim && new Date(ad.data_fim) < new Date()) return false;
      return true;
    });
    
    setAds(filtered as Ad[]);
  };

  const visibleAds = ads.filter((ad) => !dismissed.has(ad.id));
  if (visibleAds.length === 0) return null;

  // Popup style
  if (posicao === "popup") {
    const ad = visibleAds[0];
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setDismissed((s) => new Set(s).add(ad.id))}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative max-w-lg w-full bg-card rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-background/80 rounded-full h-8 w-8"
              onClick={() => setDismissed((s) => new Set(s).add(ad.id))}
            >
              <X className="h-4 w-4" />
            </Button>
            {ad.imagem_url && (
              <ConditionalLink url={ad.link_url}>
                <img src={ad.imagem_url} alt={ad.titulo} className="w-full aspect-video object-cover" />
              </ConditionalLink>
            )}
            {(ad.titulo || ad.descricao) && (
              <div className="p-6 text-center">
                <h3 className="text-xl font-bold mb-2">{ad.titulo}</h3>
                {ad.descricao && <p className="text-sm text-muted-foreground">{ad.descricao}</p>}
                {ad.link_url && (
                  <Link to={ad.link_url}>
                    <Button className="mt-4 rounded-full">Ver Oferta</Button>
                  </Link>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Carousel banner
  if (carousel && visibleAds.length > 1) {
    const ad = visibleAds[currentIndex % visibleAds.length];
    return (
      <div className={`relative overflow-hidden rounded-xl group ${className}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={ad.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4 }}
          >
            <ConditionalLink url={ad.link_url}>
              {ad.imagem_url ? (
                <img src={ad.imagem_url} alt={ad.titulo} className="w-full aspect-[3/1] object-cover rounded-xl" />
              ) : (
                <div className="w-full aspect-[3/1] bg-gradient-to-r from-primary/20 to-primary/5 rounded-xl flex items-center justify-center">
                  <div className="text-center p-8">
                    <h3 className="text-2xl font-bold mb-2">{ad.titulo}</h3>
                    {ad.descricao && <p className="text-muted-foreground">{ad.descricao}</p>}
                  </div>
                </div>
              )}
            </ConditionalLink>
          </motion.div>
        </AnimatePresence>
        {/* Navigation */}
        <button
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setCurrentIndex((i) => (i - 1 + visibleAds.length) % visibleAds.length)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setCurrentIndex((i) => (i + 1) % visibleAds.length)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {/* Dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {visibleAds.map((_, i) => (
            <button
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${i === currentIndex % visibleAds.length ? "bg-primary w-6" : "bg-background/60"}`}
              onClick={() => setCurrentIndex(i)}
            />
          ))}
        </div>
      </div>
    );
  }

  // Single or stacked banners
  return (
    <div className={`space-y-3 ${className}`}>
      {visibleAds.map((ad) => (
        <ConditionalLink key={ad.id} url={ad.link_url}>
          {ad.tipo === "html" && ad.html_conteudo ? (
            <div dangerouslySetInnerHTML={{ __html: ad.html_conteudo }} className="rounded-xl overflow-hidden" />
          ) : ad.imagem_url ? (
            <motion.div whileHover={{ scale: 1.01 }} className="rounded-xl overflow-hidden cursor-pointer">
              <img src={ad.imagem_url} alt={ad.titulo} className="w-full object-cover rounded-xl" />
            </motion.div>
          ) : (
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6 text-center cursor-pointer hover:from-primary/15 hover:to-primary/10 transition-colors">
              <h3 className="font-bold text-lg">{ad.titulo}</h3>
              {ad.descricao && <p className="text-sm text-muted-foreground mt-1">{ad.descricao}</p>}
            </div>
          )}
        </ConditionalLink>
      ))}
    </div>
  );
}

function ConditionalLink({ url, children }: { url: string | null; children: React.ReactNode }) {
  if (!url) return <>{children}</>;
  if (url.startsWith("http")) return <a href={url} target="_blank" rel="noopener noreferrer">{children}</a>;
  return <Link to={url}>{children}</Link>;
}
