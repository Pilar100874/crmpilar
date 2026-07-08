import { Outlet, useSearchParams } from "react-router-dom";
import { FileText } from "lucide-react";
import { useEffect } from "react";
import { toast } from "@/lib/toast-config";

export default function EditoresLayout() {
  const [params, setParams] = useSearchParams();

  // Permite mudar a variante do editor via ?v=v1 | v2 (usado nos itens do menu lateral).
  useEffect(() => {
    const v = params.get("v");
    if (v === "v1" || v === "v2") {
      localStorage.setItem("editor_variant", v);
      toast.success(v === "v2" ? "Editor Moderno ativado" : "Editor Clássico A4 ativado");
      params.delete("v");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      <div className="border-b bg-card px-4 py-3">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Editores
        </h1>
        <p className="text-xs text-muted-foreground">
          Documentos e modelos — editor Word-like, campos dinâmicos, PDF
        </p>
      </div>
      <main className="flex-1 min-w-0 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
