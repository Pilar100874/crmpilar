import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { empresasPonto, filiais, departamentos, feriados, escalas } from "./mock";

function Table({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>{headers.map((h) => <th key={h} className="text-left p-2 px-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">{r.map((c, j) => <td key={j} className="p-2 px-3">{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PontoEmpresas() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Empresas do Ponto</h2>
          <p className="text-sm text-muted-foreground">Base separada do CRM · filiais, departamentos, escalas e regras</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Empresa</Button>
      </div>

      <Tabs defaultValue="empresas">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="empresas">Empresas</TabsTrigger>
          <TabsTrigger value="filiais">Filiais</TabsTrigger>
          <TabsTrigger value="deps">Departamentos</TabsTrigger>
          <TabsTrigger value="escalas">Escalas</TabsTrigger>
          <TabsTrigger value="feriados">Feriados</TabsTrigger>
          <TabsTrigger value="regras">Regras de jornada</TabsTrigger>
        </TabsList>

        <TabsContent value="empresas" className="mt-4">
          <Table headers={["Razão social", "CNPJ", "Filiais", "Funcionários"]}
            rows={empresasPonto.map(e => [e.razao, e.cnpj, e.filiais, e.funcionarios])} />
        </TabsContent>
        <TabsContent value="filiais" className="mt-4">
          <Table headers={["Empresa", "Filial", "Cidade", "Funcionários"]}
            rows={filiais.map(f => [f.empresa, f.nome, f.cidade, f.funcionarios])} />
        </TabsContent>
        <TabsContent value="deps" className="mt-4">
          <Table headers={["Departamento", "Filial", "Funcionários"]}
            rows={departamentos.map(d => [d.nome, d.filial, d.funcionarios])} />
        </TabsContent>
        <TabsContent value="escalas" className="mt-4">
          <Table headers={["Nome", "Jornada", "Intervalo", "Carga"]}
            rows={escalas.map(e => [e.nome, e.jornada, e.intervalo, e.carga])} />
        </TabsContent>
        <TabsContent value="feriados" className="mt-4">
          <Table headers={["Data", "Nome", "Tipo"]} rows={feriados.map(f => [f.data, f.nome, f.tipo])} />
        </TabsContent>
        <TabsContent value="regras" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Regras de jornada (padrão CLT)</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Tolerância de atraso</span><Badge variant="secondary">10 min</Badge></div>
              <div className="flex justify-between"><span>Intervalo mínimo (jornada &gt; 6h)</span><Badge variant="secondary">1h</Badge></div>
              <div className="flex justify-between"><span>Adicional noturno</span><Badge variant="secondary">20% · 22h–05h</Badge></div>
              <div className="flex justify-between"><span>Hora extra (primeiras 2h)</span><Badge variant="secondary">+50%</Badge></div>
              <div className="flex justify-between"><span>Hora extra (DSR/feriado)</span><Badge variant="secondary">+100%</Badge></div>
              <div className="flex justify-between"><span>Banco de horas (limite)</span><Badge variant="secondary">±40h</Badge></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
