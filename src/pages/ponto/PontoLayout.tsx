import { Outlet } from "react-router-dom";
import { Menu, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePontoEmpresa } from "./usePontoEmpresa";
import WizardBackBar from "./WizardBackBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PontoLayout() {
  const { empresas, empresaId, setEmpresaId } = usePontoEmpresa();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0"
              onClick={() => window.dispatchEvent(new CustomEvent("toggle-sidebar"))}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Clock className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base font-semibold truncate sm:text-lg">
                Controle de Ponto
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                RH · Gestor · Funcionário
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={empresaId ?? undefined}
              onValueChange={(v) => setEmpresaId(v)}
            >
              <SelectTrigger className="h-9 w-full sm:w-[260px]">
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.length === 0 && (
                  <div className="px-2 py-3 text-xs text-muted-foreground">
                    Nenhuma empresa cadastrada
                  </div>
                )}
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.razao_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>
      <main className="overflow-x-hidden p-3 sm:p-5">
        <WizardBackBar />
        <Outlet />
      </main>
    </div>
  );
}
