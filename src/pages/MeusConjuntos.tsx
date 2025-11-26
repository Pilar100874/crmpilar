import { ConjuntosItensManager } from "@/components/orcamento/ConjuntosItensManager";
import { Card } from "@/components/ui/card";

export default function MeusConjuntos() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Meus Conjuntos de Itens</h1>
        <p className="text-muted-foreground mt-2">
          Crie conjuntos de produtos que você utiliza frequentemente para agilizar a criação de orçamentos.
        </p>
      </div>
      
      <Card className="p-6">
        <ConjuntosItensManager />
      </Card>
    </div>
  );
}
