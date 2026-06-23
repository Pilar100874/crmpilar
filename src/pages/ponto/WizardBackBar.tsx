import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const FLAG_KEY = "ponto.wizard.active";

export function setWizardActive() {
  sessionStorage.setItem(FLAG_KEY, "1");
}
export function clearWizardActive() {
  sessionStorage.removeItem(FLAG_KEY);
}

export default function WizardBackBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Backwards compat: ?from=wizard also activates the flag
    const params = new URLSearchParams(location.search);
    if (params.get("from") === "wizard") {
      setWizardActive();
    }
    setActive(sessionStorage.getItem(FLAG_KEY) === "1");
  }, [location.pathname, location.search]);

  if (!active) return null;
  // Hide on the wizard/config pages themselves
  if (
    location.pathname.endsWith("/config/wizard") ||
    location.pathname.endsWith("/ponto/config")
  ) {
    return null;
  }

  return (
    <div className="mb-3 flex flex-col gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm">
        <Wand2 className="h-4 w-4 text-primary shrink-0" />
        <span>
          Você está configurando esta etapa pelo{" "}
          <strong>Assistente de Configuração</strong>.
        </span>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => navigate("/ponto/config/wizard")}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao Assistente
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            clearWizardActive();
            setActive(false);
          }}
          title="Sair do modo assistente"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
