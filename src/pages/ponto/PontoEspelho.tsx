import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSignature, Download } from "lucide-react";
import { tratamento } from "./mock";

export default function PontoEspelho() {
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Espelho de Ponto</h2>
          <p className="text-sm text-muted-foreground">Visualização mensal · assinatura digital pelo funcionário</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline"><Download className="h-4 w-4 mr-1" /> PDF</Button>
          <Button size="sm"><FileSignature className="h-4 w-4 mr-1" /> Assinar digitalmente</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
            <span>Ana Souza · Junho/2026</span>
            <Badge variant="secondary">Aguardando assinatura</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b">
              <tr><th className="text-left p-2">Dia</th><th className="text-left p-2">Entrada</th><th className="text-left p-2">Saída Int.</th><th className="text-left p-2">Retorno</th><th className="text-left p-2">Saída</th><th className="text-left p-2">Saldo</th></tr>
            </thead>
            <tbody>
              {tratamento.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="p-2">{t.data}</td><td className="p-2">08:02</td><td className="p-2">12:00</td><td className="p-2">13:01</td><td className="p-2">18:05</td><td className="p-2 font-semibold">{t.saldoBanco}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-6 p-4 rounded-md border-2 border-dashed bg-muted/30 text-center text-sm text-muted-foreground">
            Ao clicar em <b>Assinar digitalmente</b>, o funcionário concorda com o espelho via certificado/OTP (mock).
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
