/**
 * Página Editor de Regras com Blockly
 */

import { useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { ScratchEditor } from "@/components/scratch/ScratchEditor";

export default function EditorRegras() {
  const { id } = useParams();

  return (
    <Layout>
      <div className="h-[calc(100vh-4rem)] flex flex-col p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Editor de Regras de Automação</h1>
          <p className="text-muted-foreground">
            Crie regras visuais com blocos para aplicar automaticamente aos orçamentos
          </p>
        </div>

        <div className="flex-1">
          <ScratchEditor ruleId={id} />
        </div>
      </div>
    </Layout>
  );
}
