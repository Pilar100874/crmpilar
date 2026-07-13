import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function SoloBackButton() {
  const navigate = useNavigate();
  return (
    <div className="sticky top-0 z-40 flex items-center gap-2 border-b bg-background/95 backdrop-blur px-3 py-2">
      <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
      </Button>
    </div>
  );
}
