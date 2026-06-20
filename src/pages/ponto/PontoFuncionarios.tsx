import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { funcionarios } from "./mock";

export default function PontoFuncionarios() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Funcionários</h2>
          <p className="text-sm text-muted-foreground">Cadastro vinculado às empresas e escalas do ponto</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Funcionário</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nome, CPF ou matrícula..." className="pl-9" />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left p-2 px-3">Matrícula</th>
              <th className="text-left p-2 px-3">Nome</th>
              <th className="text-left p-2 px-3">CPF</th>
              <th className="text-left p-2 px-3">Cargo</th>
              <th className="text-left p-2 px-3">Escala</th>
              <th className="text-left p-2 px-3">Filial</th>
              <th className="text-left p-2 px-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {funcionarios.map((f) => (
              <tr key={f.id} className="border-t">
                <td className="p-2 px-3 font-mono">{f.matricula}</td>
                <td className="p-2 px-3 font-medium">{f.nome}</td>
                <td className="p-2 px-3">{f.cpf}</td>
                <td className="p-2 px-3">{f.cargo}</td>
                <td className="p-2 px-3">{f.escala}</td>
                <td className="p-2 px-3">{f.filial}</td>
                <td className="p-2 px-3">
                  <Badge variant={f.status === "Ativo" ? "default" : "secondary"}>{f.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
