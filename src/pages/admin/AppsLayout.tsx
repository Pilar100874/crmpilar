import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Download, KeyRound, RefreshCw, PanelLeft, PanelLeftClose, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const itens = [
  { to: "/admin/apps", label: "Aplicativos e downloads", icon: Download, end: true },
  { to: "/admin/apps/atualizacoes", label: "Atualizações", icon: RefreshCw, end: false },
  { to: "/admin/apps/chaves", label: "Chaves do Aplicativo", icon: KeyRound, end: false },
];

export default function AppsLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [recolhido, setRecolhido] = useState(false);
  const ativo = itens.find((item) => item.end ? pathname === item.to : pathname.startsWith(item.to)) || itens[0];
  const IconeAtivo = ativo.icon;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-muted/20 text-foreground">
      <header className="shrink-0 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary sm:h-10 sm:w-10">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold sm:text-2xl">Apps</h1>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">Downloads, versões e equipamentos instalados</p>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="shrink-0 border-b bg-card/60 p-3 backdrop-blur md:hidden">
          <Select value={ativo.to} onValueChange={navigate}>
            <SelectTrigger className="h-11 w-full bg-background">
              <SelectValue>
                <div className="flex min-w-0 items-center gap-2">
                  <IconeAtivo className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{ativo.label}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {itens.map((item) => {
                const Icone = item.icon;
                return (
                  <SelectItem key={item.to} value={item.to}>
                    <div className="flex items-center gap-2">
                      <Icone className="h-4 w-4 text-muted-foreground" />
                      <span>{item.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <aside className={cn(
          "hub-menu hidden w-14 shrink-0 flex-col overflow-y-auto border-r bg-card transition-all duration-300 md:flex lg:w-64",
          recolhido && "lg:w-14",
        )}>
          <div className="hidden justify-end border-b p-2 lg:flex">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRecolhido((valor) => !valor)}>
              {recolhido ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              <span className="sr-only">{recolhido ? "Expandir menu" : "Recolher menu"}</span>
            </Button>
          </div>
          <TooltipProvider delayDuration={0}>
            <nav className="space-y-1 p-2">
              {itens.map((item) => {
                const Icone = item.icon;
                const selecionado = item.to === ativo.to;
                const botao = (
                  <Button
                    key={item.to}
                    variant="ghost"
                    onClick={() => navigate(item.to)}
                    className={cn(
                      "relative h-10 w-full justify-start gap-3 px-2.5 text-muted-foreground",
                      selecionado && "bg-primary/10 font-medium text-primary hover:bg-primary/10 hover:text-primary",
                      "justify-center px-0 lg:justify-start lg:px-2.5",
                      recolhido && "lg:justify-center lg:px-0",
                    )}
                  >
                    {selecionado && !recolhido && <span className="absolute inset-y-1.5 left-0 hidden w-0.5 rounded-full bg-primary lg:block" />}
                    <Icone className="h-4 w-4 shrink-0" />
                    {!recolhido && <span className="hidden truncate lg:inline">{item.label}</span>}
                  </Button>
                );
                return recolhido ? (
                  <Tooltip key={item.to}>
                    <TooltipTrigger asChild>{botao}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip key={item.to}>
                    <TooltipTrigger asChild>{botao}</TooltipTrigger>
                    <TooltipContent side="right" className="lg:hidden">{item.label}</TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>
          </TooltipProvider>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}