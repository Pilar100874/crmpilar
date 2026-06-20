import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Paperclip, Check, X } from "lucide-react";
import { ajustes } from "./mock";

export default function PontoAjustes() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold">Ajustes de Ponto</h2>
      <Tabs defaultValue="solicitar">
        <TabsList>
          <TabsTrigger value="solicitar">Solicitar (Funcionário)</TabsTrigger>
          <TabsTrigger value="aprovar">Aprovar (Gestor)</TabsTrigger>
        </TabsList>

        <TabsContent value="solicitar" className="mt-4">
          <Card className="max-w-2xl">
            <CardHeader><CardTitle className="text-base">Nova solicitação de ajuste</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Data</label><Input type="date" /></div>
                <div><label className="text-xs text-muted-foreground">Horário</label><Input type="time" /></div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Justificativa</label>
                <Textarea rows={4} placeholder="Descreva o motivo do ajuste..." className="rounded-2xl" />
              </div>
              <Button variant="outline" size="sm"><Paperclip className="h-4 w-4 mr-1" /> Anexar comprovante</Button>
              <Button className="w-full">Enviar solicitação</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aprovar" className="mt-4">
          <div className="space-y-2">
            {ajustes.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{a.funcionario}</p>
                      <Badge variant="outline">{a.data}</Badge>
                      <Badge variant={a.status === "Aprovado" ? "default" : a.status === "Reprovado" ? "destructive" : "secondary"}>{a.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{a.motivo}</p>
                    <p className="text-xs mt-1 flex items-center gap-1"><Paperclip className="h-3 w-3" /> {a.anexo}</p>
                  </div>
                  {a.status === "Pendente" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline"><X className="h-4 w-4 mr-1" /> Reprovar</Button>
                      <Button size="sm"><Check className="h-4 w-4 mr-1" /> Aprovar</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
