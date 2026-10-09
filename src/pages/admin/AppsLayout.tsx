import { Outlet } from "react-router-dom";
import { Smartphone } from "lucide-react";

export default function AppsLayout() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-muted/20 text-foreground">
      <header className="shrink-0 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary sm:h-10 sm:w-10">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold sm:text-2xl">Apps</h1>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">Downloads, versões, chaves e equipamentos instalados</p>
          </div>
        </div>
      </header>

      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
