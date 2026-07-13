import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Botão flutuante "Voltar" exibido em qualquer atalho aberto a partir
 * de uma Tela Customizada. Reconhecido pelo parâmetro `?fromtela=<id>`
 * e sempre retorna para `/tela-customizada/<id>`, restaurando os botões
 * anteriores independentemente do layout da rota atual.
 */
export default function GlobalBackToTelaButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const fromTela = params.get("fromtela");
  if (!fromTela) return null;
  if (location.pathname.startsWith("/tela-customizada/")) return null;

  const handleBack = () => {
    const solo = params.get("solo") === "1" ? "?solo=1" : "";
    navigate(`/tela-customizada/${fromTela}${solo}`);
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="default"
      onClick={handleBack}
      className="fixed bottom-4 left-4 z-[1000] rounded-full shadow-lg h-10 px-4"
      aria-label="Voltar para a tela customizada"
    >
      <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
    </Button>
  );
}
