import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useAtalhos } from "@/hooks/useAtalhos";
import { useLocation } from "react-router-dom";

interface AtalhoButtonProps {
  titulo: string;
  icone: string;
  className?: string;
}

export const AtalhoButton = ({ titulo, icone, className }: AtalhoButtonProps) => {
  const location = useLocation();
  const { isAtalho, adicionarAtalho, removerAtalho } = useAtalhos();
  const currentPath = location.pathname;
  const isCurrentAtalho = isAtalho(currentPath);

  const handleClick = () => {
    if (isCurrentAtalho) {
      removerAtalho(currentPath);
    } else {
      adicionarAtalho(titulo, icone, currentPath);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className={className}
    >
      <Star
        className={`h-4 w-4 mr-2 ${
          isCurrentAtalho ? "fill-yellow-400 text-yellow-400" : ""
        }`}
      />
      {isCurrentAtalho ? "Remover dos Atalhos" : "Adicionar aos Atalhos"}
    </Button>
  );
};
