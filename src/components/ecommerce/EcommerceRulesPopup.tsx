import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEcommerceRulesEngine, RuleAction } from "@/hooks/useEcommerceRulesEngine";

/**
 * Componente que renderiza popups disparados pelo motor de regras do e-commerce.
 * Diferente do EcommerceAdBanner (que usa ecommerce_anuncios),
 * este usa ecommerce_rules com o fluxo visual.
 */
export default function EcommerceRulesPopup() {
  const { popupActions, loading } = useEcommerceRulesEngine();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [delayReady, setDelayReady] = useState<Set<string>>(new Set());

  // Handle delays for each popup
  useEffect(() => {
    if (popupActions.length === 0) return;

    const timers: NodeJS.Timeout[] = [];
    popupActions.forEach((action) => {
      const delay = (action.config.delay || 0) * 1000;
      const timer = setTimeout(() => {
        setDelayReady((prev) => new Set(prev).add(action.ruleId));
      }, delay);
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, [popupActions]);

  if (loading) return null;

  const visiblePopups = popupActions.filter(
    (a) => !dismissed.has(a.ruleId) && delayReady.has(a.ruleId)
  );

  if (visiblePopups.length === 0) return null;

  // Show only the first popup at a time
  const popup = visiblePopups[0];
  const config = popup.config;

  const handleDismiss = () => {
    setDismissed((prev) => new Set(prev).add(popup.ruleId));
  };

  return (
    <AnimatePresence>
      <motion.div
        key={popup.ruleId}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
        onClick={handleDismiss}
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
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>

          {config.imagem && (
            <img
              src={config.imagem}
              alt={config.titulo || popup.ruleName}
              className="w-full aspect-video object-cover"
            />
          )}

          <div className="p-6 text-center">
            <h3 className="text-xl font-bold mb-2">
              {config.titulo || popup.ruleName}
            </h3>
            {config.mensagem && (
              <p className="text-sm text-muted-foreground mb-4">{config.mensagem}</p>
            )}
            {config.link ? (
              <Link to={config.link} onClick={handleDismiss}>
                <Button className="rounded-full">
                  {config.botaoTexto || "Aproveitar!"}
                </Button>
              </Link>
            ) : (
              <Button className="rounded-full" onClick={handleDismiss}>
                {config.botaoTexto || "Aproveitar!"}
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
