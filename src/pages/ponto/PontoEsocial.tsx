import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileCode } from "lucide-react";

export default function PontoEsocial() {
  const [eventos, setEventos] = useState<any[]>([]);
  const [xml, setXml] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("ponto_esocial_eventos").select("*, ponto_funcionarios(nome)")
      .order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setEventos(data || []));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileCode className="w-6 h-6" /> eSocial</h1>
        <p className="text-muted-foreground text-sm">Eventos S-2230 (afastamento), S-2240 (condições) e demais</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Eventos</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Data</TableHead><TableHead>Evento</TableHead>
              <TableHead>Funcionário</TableHead><TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {eventos.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{new Date(e.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell><Badge variant="outline">{e.evento}</Badge></TableCell>
                  <TableCell>{e.ponto_funcionarios?.nome || "-"}</TableCell>
                  <TableCell><Badge>{e.status}</Badge></TableCell>
                  <TableCell>
                    {e.xml && <Button size="sm" variant="outline" onClick={() => setXml(e.xml)}>Ver XML</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!xml} onOpenChange={() => setXml(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>XML do Evento</DialogTitle></DialogHeader>
          <ScrollArea className="h-[60vh]"><pre className="text-xs">{xml}</pre></ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
