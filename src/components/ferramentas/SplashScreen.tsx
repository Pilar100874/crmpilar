import { useState, useEffect } from "react";
import { Wrench } from "lucide-react";
import logo from "@/assets/logo.png";

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 1800);
    const endTimer = setTimeout(() => onFinish(), 2400);
    return () => {
      clearTimeout(timer);
      clearTimeout(endTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-primary transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-700">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary-foreground/20 blur-2xl scale-150" />
          <img
            src={logo}
            alt="Pilar Ferramentas"
            className="relative h-24 w-24 rounded-2xl shadow-2xl"
          />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary-foreground tracking-tight">
            Pilar Ferramentas
          </h1>
          <p className="text-primary-foreground/70 text-sm">
            Gestão inteligente de ferramentas
          </p>
        </div>
        <div className="mt-8">
          <div className="h-1 w-32 rounded-full bg-primary-foreground/20 overflow-hidden">
            <div className="h-full bg-primary-foreground/80 rounded-full animate-[loading_1.5s_ease-in-out_forwards]" />
          </div>
        </div>
      </div>
    </div>
  );
}
