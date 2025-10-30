import { SubMenuHeader } from "@/components/SubMenuHeader";
import { useLayout } from "@/contexts/LayoutContext";

export default function MarketingAutomacoes() {
  const { openSubmenu } = useLayout();
  
  return (
    <div className="p-8 bg-white min-h-full">
      <div className="flex items-center gap-4 mb-8">
        <SubMenuHeader 
          title="Marketing"
          onOpenSubmenu={() => openSubmenu("Desenho")}
        />
        <h1 className="text-lg font-bold text-foreground">Automações de Marketing</h1>
      </div>
      
      <p className="text-muted-foreground mb-8">
        Configure automações de marketing
      </p>
      
      {/* Conteúdo de automações virá aqui */}
    </div>
  );
}
