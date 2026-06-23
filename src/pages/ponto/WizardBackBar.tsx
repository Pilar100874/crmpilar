import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WizardBackBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  if (params.get("from") !== "wizard") return null;

  // Don't show on the wizard page itself
  if (location.pathname.endsWith("/config/wizard")) return null;

  return (
    <div className="mb-3 flex flex-col gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm">
        <Wand2 className="h-4 w-4 text-primary shrink-0" />
        <span>
          Você está configurando esta etapa pelo{" "}
          <strong>Assistente de Configuração</strong>.
        </span>
      </div>
      <Button
        size="sm"
        onClick={() => navigate("/ponto/config/wizard")}
        className="w-full sm:w-auto"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao Assistente
      </Button>
    </div>
  );
}
