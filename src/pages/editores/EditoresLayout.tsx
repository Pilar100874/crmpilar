import { Outlet } from "react-router-dom";
import { FileText } from "lucide-react";

export default function EditoresLayout() {
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
