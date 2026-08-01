import Layout from "@/components/Layout";
import { NotebookPen } from "lucide-react";
import { NotasWorkspace } from "@/components/notas/NotasWorkspace";

export default function Notas() {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 p-5">
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <NotebookPen className="h-7 w-7 text-primary" /> Notas
          </h1>
          <p className="text-muted-foreground">
            Notas em Markdown interligadas. Use <code>[[título da nota]]</code> para criar links entre notas e{" "}
            <code>#tag</code> para etiquetar.
          </p>
        </div>
        <NotasWorkspace />
      </div>
    </Layout>
  );
}
