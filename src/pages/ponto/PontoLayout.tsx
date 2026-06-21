import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Clock, LayoutDashboard, Building2, Users, Smartphone, Wrench, FileEdit, FileSignature, Cpu, FileDown, ShieldAlert, ShieldCheck, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/ponto", label: "Dashboard RH", short: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/ponto/empresas", label: "Empresas", short: "Empresas", icon: Building2 },
  { to: "/ponto/funcionarios", label: "Funcionários", short: "Func.", icon: Users },
  { to: "/ponto/registro", label: "Registro (App)", short: "Registro", icon: Smartphone },
  { to: "/ponto/tratamento", label: "Tratamento", short: "Tratar", icon: Wrench },
  { to: "/ponto/ajustes", label: "Ajustes", short: "Ajustes", icon: FileEdit },
  { to: "/ponto/espelho", label: "Espelho de Ponto", short: "Espelho", icon: FileSignature },
  { to: "/ponto/equipamentos", label: "Equipamentos Control iD", short: "Equip.", icon: Cpu },
  { to: "/ponto/exportacao", label: "Exportação Domínio", short: "Export", icon: FileDown },
  { to: "/ponto/alertas", label: "Antifraude", short: "Alertas", icon: ShieldAlert },
  { to: "/ponto/auditoria", label: "Auditoria", short: "Auditoria", icon: ShieldCheck },
];

export default function PontoLayout() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const current = nav.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to))) ?? nav[0];

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      <header className="border-b bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <div className="px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-semibold leading-none truncate">Controle de Ponto</h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 truncate">RH · Gestor · Funcionário</p>
          </div>

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline" className="lg:hidden gap-2">
                <Menu className="h-4 w-4" />
                <span className="text-xs">{current.short}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">Controle de Ponto</span>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
              </div>
              <ul className="p-2 space-y-1">
                {nav.map((n) => {
                  const active = n.end ? pathname === n.to : pathname.startsWith(n.to);
                  const Icon = n.icon;
                  return (
                    <li key={n.to}>
                      <NavLink
                        to={n.to}
                        end={n.end}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                          active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{n.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop / tablet horizontal nav */}
        <nav className="hidden lg:block px-2 sm:px-4 overflow-x-auto">
          <ul className="flex gap-1 pb-2 min-w-max">
            {nav.map((n) => {
              const active = n.end ? pathname === n.to : pathname.startsWith(n.to);
              const Icon = n.icon;
              return (
                <li key={n.to}>
                  <NavLink
                    to={n.to}
                    end={n.end}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors",
                      active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {n.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Tablet / mobile scroll chips */}
        <nav className="lg:hidden px-2 overflow-x-auto">
          <ul className="flex gap-1.5 pb-3 min-w-max">
            {nav.map((n) => {
              const active = n.end ? pathname === n.to : pathname.startsWith(n.to);
              const Icon = n.icon;
              return (
                <li key={n.to}>
                  <NavLink
                    to={n.to}
                    end={n.end}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-colors",
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card text-muted-foreground border-border hover:bg-muted"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {n.short}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
      <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
