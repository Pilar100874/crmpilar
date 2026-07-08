import { Outlet, NavLink, useLocation } from "react-router-dom";
import { FileText, FileStack, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/editores/modelos", label: "Modelos de Documento", icon: FileText },
  { to: "/editores/gerar", label: "Gerar Documento", icon: Send },
  { to: "/editores/documentos", label: "Documentos Gerados", icon: FileStack },
];

export default function EditoresLayout() {
  const { pathname } = useLocation();
  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      <div className="border-b bg-card px-4 py-3">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Editores
        </h1>
        <p className="text-xs text-muted-foreground">Modelos de documento, campos dinâmicos e geração de PDF</p>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-56 border-r bg-card p-2 space-y-1 hidden md:block">
          {nav.map(n => {
            const Icon = n.icon;
            const active = pathname === n.to || pathname.startsWith(n.to + "/");
            return (
              <NavLink
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted/50",
                  active && "bg-primary/10 text-foreground font-medium"
                )}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </NavLink>
            );
          })}
        </aside>
        <main className="flex-1 min-w-0 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
