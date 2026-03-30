import { SubMenuHeader } from "@/components/SubMenuHeader";
import { useLayout } from "@/contexts/LayoutContext";

export default function Campanhas() {
  const { openSubmenu } = useLayout();
  
  return (
    <div className="p-8 bg-background min-h-full">
      <div className="flex items-center gap-4 mb-8">
        <SubMenuHeader 
          title="Configurações"
          onOpenSubmenu={() => openSubmenu("Configurações")}
        />
        <h1 className="text-lg font-bold text-foreground">Teste Campanhas</h1>
      </div>
      
      <p className="text-muted-foreground mb-8">
        Teste suas campanhas de mensagens
      </p>
      
      {/* Conteúdo da página de teste de campanhas virá aqui */}
    </div>
  );
}
