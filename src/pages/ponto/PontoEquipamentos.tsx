import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Cpu, Plus, RefreshCcw } from "lucide-react";
import { equipamentos, logsEquip } from "./mock";

export default function PontoEquipamentos() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Equipamentos Control iD</h2>
          <p className="text-sm text-muted-foreground">Relógios iDClass · integração via middleware/API ou IP público</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Adicionar equipamento</Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {equipamentos.map((e) => (
          <Card key={e.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" />
                  <p className="font-medium">{e.nome}</p>
                </div>
                <Badge variant={e.status === "Online" ? "default" : "destructive"}>{e.status}</Badge>
              </div>
              <div className="text-xs space-y-1 text-muted-foreground">
                <div>IP: <span className="font-mono text-foreground">{e.ip}</span></div>
                <div>Última sync: <span className="text-foreground">{e.ultimaSync}</span></div>
                <div>Firmware: <span className="text-foreground">{e.firmware}</span></div>
              </div>
              <Button size="sm" variant="outline" className="w-full"><RefreshCcw className="h-3 w-3 mr-1" /> Sincronizar agora</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Logs recentes</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b">
              <tr><th className="text-left p-2">Equipamento</th><th className="text-left p-2">Horário</th><th className="text-left p-2">Evento</th><th className="text-left p-2">Detalhe</th></tr>
            </thead>
            <tbody>
              {logsEquip.map((l) => (
                <tr key={l.id} className="border-b last:border-0">
                  <td className="p-2">{l.equip}</td><td className="p-2 font-mono text-xs">{l.quando}</td>
                  <td className="p-2"><Badge variant={l.evento === "Sync OK" ? "default" : "destructive"}>{l.evento}</Badge></td>
                  <td className="p-2 text-muted-foreground">{l.detalhe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
