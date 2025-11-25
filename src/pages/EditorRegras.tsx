/**
 * Página Editor de Regras com Scratch Blocks
 */

import Layout from "@/components/Layout";
import { ScratchEditor } from "@/components/scratch/ScratchEditor";

export default function EditorRegras() {
  return (
    <Layout>
      <div className="h-[calc(100vh-4rem)] flex flex-col p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Editor de Regras de Automação</h1>
          <p className="text-muted-foreground">
            Crie regras visuais para automação de orçamentos usando blocos Scratch
          </p>
        </div>

        <div className="flex-1">
          <ScratchEditor />
        </div>
      </div>
    </Layout>
  );
}
