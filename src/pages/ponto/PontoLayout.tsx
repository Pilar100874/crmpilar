import { Outlet } from "react-router-dom";
import { Clock, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

export default function PontoLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setMenuOpen((prev) => !prev);
    window.addEventListener("toggle-sidebar", handleToggle);
    return () => window.removeEventListener("toggle-sidebar", handleToggle);
  }, []);

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      <header className="border-b bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <div className="px-4 sm:px-6 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("toggle-sidebar"))}
            className="lg:hidden h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 hover:bg-primary/25 transition-colors"
            aria-label="Abrir menu"
          >
            {menuOpen ? (
              <X className="h-5 w-5 text-primary" />
            ) : (
              <Menu className="h-5 w-5 text-primary" />
            )}
          </button>
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-semibold leading-none truncate">Controle de Ponto</h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 truncate">RH · Gestor · Funcionário</p>
          </div>
        </div>
      </header>
      <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
