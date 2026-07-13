import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Botão flutuante "Voltar" exibido em qualquer atalho aberto a partir
 * de uma Tela Customizada. Reconhecido pelo parâmetro `?fromtela=<id>`
 * e sempre retorna para `/tela-customizada/<id>`, restaurando os botões
 * anteriores independentemente do layout da rota atual.
 *
 * Também marca `document.body[data-fromtela="1"]` e injeta um CSS global
 * que oculta botões locais de "voltar" (icon-only com lucide-arrow-left)
 * em qualquer atalho aberto via Tela Customizada, padronizando o botão
 * de voltar globalmente no canto superior direito.
 */
export default function GlobalBackToTelaButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const fromTela = params.get("fromtela");

  useEffect(() => {
    const body = document.body;
    if (fromTela) body.setAttribute("data-fromtela", "1");
    else body.removeAttribute("data-fromtela");
    return () => body.removeAttribute("data-fromtela");
  }, [fromTela]);

  if (!fromTela) return null;
  if (location.pathname.startsWith("/tela-customizada/")) return null;

  const handleBack = () => {
    const solo = params.get("solo") === "1" ? "?solo=1" : "";
    navigate(`/tela-customizada/${fromTela}${solo}`);
  };

  return (
    <>
      {/* CSS global: oculta botões locais de "voltar" comuns nos atalhos.
          Cobre: botões marcados com [data-app-back], e botões icon-only cujo
          único filho é um svg.lucide-arrow-left (padrão usado em várias telas). */}
      <style>{`
        body[data-fromtela="1"] [data-app-back],
        body[data-fromtela="1"] button:has(> svg.lucide-arrow-left:only-child) {
          display: none !important;
        }
      `}</style>
      <Button
        type="button"
        size="sm"
        variant="default"
        onClick={handleBack}
        className="fixed top-4 right-4 z-[1000] rounded-full shadow-lg h-10 px-4"
        aria-label="Voltar para a tela customizada"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>
    </>
  );
}
