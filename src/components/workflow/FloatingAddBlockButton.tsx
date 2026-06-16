import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingAddBlockButtonProps {
  onClick: () => void;
  className?: string;
}

export const FloatingAddBlockButton = ({ onClick, className = "" }: FloatingAddBlockButtonProps) => (
  <Button
    size="icon"
    onClick={onClick}
    title="Adicionar bloco"
    className={`absolute left-4 top-4 z-10 h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 border-0 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 ${className}`}
  >
    <Plus className="h-5 w-5" />
  </Button>
);
