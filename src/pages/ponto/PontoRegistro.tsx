import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, MapPin, Smartphone, ShieldCheck, Clock } from "lucide-react";
import { registros } from "./mock";

export default function PontoRegistro() {
  return (
    <div className="grid lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Smartphone className="h-4 w-4" /> Registro via App</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border-2 border-dashed bg-muted/30 aspect-square flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Camera className="h-10 w-10 mx-auto mb-2" />
              <p className="text-xs">Preview selfie / câmera frontal</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-600" /><span>GPS: -23.5505, -46.6333</span></div>
            <div className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-emerald-600" /><span>Dispositivo autorizado</span></div>
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /><span>Score antifraude: 8 / 100</span></div>
            <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><span>14:23:05 · Hoje</span></div>
          </div>
          <Button className="w-full" size="lg">Bater Ponto</Button>
          <p className="text-[11px] text-muted-foreground text-center">Foto, GPS, dispositivo e score são registrados a cada batida.</p>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Últimas batidas</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b">
              <tr><th className="text-left p-2">Funcionário</th><th className="text-left p-2">Data</th><th className="text-left p-2">Entrada</th><th className="text-left p-2">Int.</th><th className="text-left p-2">Ret.</th><th className="text-left p-2">Saída</th><th className="text-left p-2">Disp.</th><th className="text-left p-2">Score</th></tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-2 font-medium">{r.funcionario}</td>
                  <td className="p-2">{r.data}</td>
                  <td className="p-2">{r.entrada}</td>
                  <td className="p-2">{r.saidaIntervalo}</td>
                  <td className="p-2">{r.retornoIntervalo}</td>
                  <td className="p-2">{r.saida}</td>
                  <td className="p-2 text-xs">{r.dispositivo}</td>
                  <td className="p-2"><Badge variant={r.score > 50 ? "destructive" : r.score > 20 ? "default" : "secondary"}>{r.score}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
