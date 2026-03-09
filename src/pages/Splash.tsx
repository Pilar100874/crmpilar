import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import logo3 from "@/assets/logo-3.png";
import logoFallback from "@/assets/logo_preto.png";

export default function Splash() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    const holdTimer = setTimeout(() => setPhase("hold"), 100);
    const exitTimer = setTimeout(() => setPhase("exit"), 2400);
    const navTimer = setTimeout(() => navigate("/login", { replace: true }), 3200);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(navTimer);
    };
  }, [navigate]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center overflow-hidden">
      {/* Subtle animated background circles */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full opacity-10"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)",
        }}
        animate={{
          scale: [1, 1.3, 1],
        }}
        transition={{ duration: 3, ease: "easeInOut" }}
      />

      <AnimatePresence>
        {phase !== "exit" ? (
          <motion.div
            className="flex flex-col items-center gap-8 z-10"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, y: -30 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Logo with glow */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            >
              <div className="absolute inset-0 blur-3xl opacity-30 bg-primary rounded-full scale-150" />
              <img
                src={logo3}
                alt="Logo Pilar"
                className="h-40 w-auto relative z-10"
                style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5)) drop-shadow(0 0 4px rgba(0,0,0,0.3))" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = logoFallback;
                }}
              />
            </motion.div>

            {/* Title */}
            <motion.h1
              className="text-3xl md:text-4xl font-light tracking-widest text-white/90 text-center"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              Sistema de Gestão
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-sm md:text-base text-white/40 tracking-wider font-light"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              Plataforma Omnicanal
            </motion.p>

            {/* Loading indicator */}
            <motion.div
              className="flex gap-1.5 mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary/60"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.4, 1, 0.4],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
