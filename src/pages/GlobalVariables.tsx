import { SubMenuHeader } from "@/components/SubMenuHeader";
import { useLayout } from "@/contexts/LayoutContext";

export default function GlobalVariables() {
  const { openSubmenu } = useLayout();
  
  return (
    <div className="p-8 bg-white min-h-full">
      <div className="flex items-center gap-4 mb-8">
        <SubMenuHeader 
          title="Configurações"
          onOpenSubmenu={() => openSubmenu("Configurações")}
        />
        <h1 className="text-lg font-bold text-foreground">Variáveis Globais</h1>
      </div>
      
      <p className="text-muted-foreground mb-8">
        Gerencie variáveis globais do sistema
      </p>
      
      {/* Conteúdo da página de variáveis globais virá aqui */}
    </div>
  );
}
