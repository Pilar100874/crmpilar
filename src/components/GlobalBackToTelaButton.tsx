import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Barra superior fixa com botão "Voltar" para qualquer atalho aberto a
 * partir de uma Tela Customizada (`?fromtela=<id>`). Sempre retorna para
 * `/tela-customizada/<id>`, independente do layout da rota atual.
 *
 * Também marca `document.body[data-fromtela="1"]` e injeta CSS global que
 * oculta botões locais de "voltar" (icon-only com lucide-arrow-left) e
 * adiciona padding-top no body para não sobrepor o conteúdo.
 */
const BAR_HEIGHT = 48;

export default function GlobalBackToTelaButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const fromTela = params.get("fromtela");
  const onTelaRoot = location.pathname.startsWith("/tela-customizada/");
  const active = !!fromTela && !onTelaRoot;

  useEffect(() => {
    const body = document.body;
    if (active) {
      body.setAttribute("data-fromtela", "1");
      body.style.paddingTop = `${BAR_HEIGHT}px`;
    } else {
      body.removeAttribute("data-fromtela");
      body.style.paddingTop = "";
    }
    return () => {
      body.removeAttribute("data-fromtela");
      body.style.paddingTop = "";
    };
  }, [active]);

  if (!active) return null;

  const handleBack = () => {
    const solo = params.get("solo") === "1" ? "?solo=1" : "";
    navigate(`/tela-customizada/${fromTela}${solo}`);
  };

  return (
    <>
      <style>{`
        body[data-fromtela="1"] [data-app-back],
        body[data-fromtela="1"] button:has(> svg.lucide-arrow-left:only-child) {
          display: none !important;
        }
      `}</style>
      <div
        className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-start gap-2 border-b bg-background shadow-sm px-3"
        style={{ height: BAR_HEIGHT }}
      >
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={handleBack}
          className="h-9 px-4"
          aria-label="Voltar para a tela customizada"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>
    </>
  );
}
