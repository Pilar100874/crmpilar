import { lazy, Suspense } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const Empresas = lazy(() => import("@/pages/Empresas"));

interface EmpresaExtrasOverlayProps {
  tipo: "localizacao" | "qualificacao";
  empresaId: string;
  empresaNome?: string;
  onClose: () => void;
}

/** Abre o cadastro da empresa (aba Localização ou Qualificação) na tela central. */
export function EmpresaExtrasOverlay({ tipo, empresaId, empresaNome, onClose }: EmpresaExtrasOverlayProps) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-background">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{tipo === "localizacao" ? "Localização da empresa" : "Qualificação da empresa"}</p>
          {empresaNome && <p className="truncate text-xs text-muted-foreground">{empresaNome}</p>}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} title="Fechar">
          <X className="h-4 w-4 mr-1" />
          Fechar
        </Button>
      </div>
      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden flex flex-col">
        <Suspense fallback={<div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span className="text-sm">Carregando...</span></div>}>
          <Empresas key={`${empresaId}-${tipo}`} empresaIdInicial={empresaId} abaInicial={tipo} onFecharEmbutido={onClose} />
        </Suspense>
      </div>
    </div>
  );
}
