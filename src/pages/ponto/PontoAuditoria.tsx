import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { auditoria } from "./mock";

export default function PontoAuditoria() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">Auditoria</h2>
        <p className="text-sm text-muted-foreground">Histórico completo de alterações · imutável</p>
      </div>
      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por usuário, ação ou entidade..." className="pl-9" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Eventos</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b">
              <tr><th className="text-left p-2">Quando</th><th className="text-left p-2">Usuário</th><th className="text-left p-2">Ação</th><th className="text-left p-2">Entidade</th><th className="text-left p-2">Antes</th><th className="text-left p-2">Depois</th></tr>
            </thead>
            <tbody>
              {auditoria.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="p-2 font-mono text-xs">{a.quando}</td>
                  <td className="p-2">{a.usuario}</td>
                  <td className="p-2 font-medium">{a.acao}</td>
                  <td className="p-2">{a.entidade}</td>
                  <td className="p-2 text-muted-foreground">{a.antes}</td>
                  <td className="p-2 text-emerald-600">{a.depois}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
