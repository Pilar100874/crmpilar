import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, FileDown } from "lucide-react";

const mapaRubricas = [
  { evento: "Hora extra 50%", rubrica: "001", descricao: "HE 50%" },
  { evento: "Hora extra 100%", rubrica: "002", descricao: "HE 100% (DSR/Feriado)" },
  { evento: "Adicional noturno", rubrica: "010", descricao: "Ad. Noturno 20%" },
  { evento: "Falta", rubrica: "100", descricao: "Falta injustificada" },
  { evento: "Atraso", rubrica: "101", descricao: "Atraso em minutos" },
  { evento: "Banco de horas (+)", rubrica: "200", descricao: "Crédito banco" },
  { evento: "Banco de horas (-)", rubrica: "201", descricao: "Débito banco" },
];

export default function PontoExportacao() {
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">Exportação · Domínio Sistemas</h2>
        <p className="text-sm text-muted-foreground">Gera arquivo TXT com eventos do período mapeados em rubricas</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Gerar arquivo</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          <div><label className="text-xs text-muted-foreground">De</label><Input type="date" /></div>
          <div><label className="text-xs text-muted-foreground">Até</label><Input type="date" /></div>
          <div className="flex items-end"><Button className="w-full"><FileDown className="h-4 w-4 mr-1" /> Exportar TXT</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Mapeamento de eventos → rubricas</span>
            <Button size="sm" variant="outline">Editar</Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b">
              <tr><th className="text-left p-2">Evento</th><th className="text-left p-2">Rubrica</th><th className="text-left p-2">Descrição Domínio</th></tr>
            </thead>
            <tbody>
              {mapaRubricas.map((m) => (
                <tr key={m.rubrica} className="border-b last:border-0">
                  <td className="p-2">{m.evento}</td>
                  <td className="p-2"><Badge variant="secondary" className="font-mono">{m.rubrica}</Badge></td>
                  <td className="p-2 text-muted-foreground">{m.descricao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Últimos arquivos gerados</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {["dominio_2026-05.txt", "dominio_2026-04.txt", "dominio_2026-03.txt"].map((f) => (
            <div key={f} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
              <span className="font-mono">{f}</span>
              <Button size="sm" variant="ghost"><Download className="h-3 w-3 mr-1" /> Baixar</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
