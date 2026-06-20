import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { tratamento } from "./mock";

export default function PontoTratamento() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Tratamento de Ponto</h2>
          <p className="text-sm text-muted-foreground">Cálculo diário: atraso, falta, saída antecipada, intervalo, hora extra, adicional noturno e banco de horas</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">Recalcular</Button>
          <Button size="sm">Fechar período</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Apuração diária</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b">
              <tr>
                <th className="text-left p-2">Funcionário</th>
                <th className="text-left p-2">Data</th>
                <th className="text-left p-2">Atraso</th>
                <th className="text-left p-2">Falta</th>
                <th className="text-left p-2">Saída antec.</th>
                <th className="text-left p-2">Extra</th>
                <th className="text-left p-2">Adic. noturno</th>
                <th className="text-left p-2">Banco</th>
              </tr>
            </thead>
            <tbody>
              {tratamento.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="p-2 font-medium">{t.funcionario}</td>
                  <td className="p-2">{t.data}</td>
                  <td className="p-2">{t.atraso}</td>
                  <td className="p-2">{t.falta}</td>
                  <td className="p-2">{t.saidaAntec}</td>
                  <td className="p-2">{t.extra}</td>
                  <td className="p-2">{t.noturno}</td>
                  <td className="p-2 font-semibold">{t.saldoBanco}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
