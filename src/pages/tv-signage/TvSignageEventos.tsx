import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TvSignageEventos() {
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("tv_events").select("*, device:tv_devices(nome, codigo)").order("created_at", { ascending: false }).limit(300);
      setList(data || []);
    };
    load();
    const ch = supabase.channel("tv-events-list").on("postgres_changes", { event: "*", schema: "public", table: "tv_events" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const nivelBadge = (n: string) => {
    const map: Record<string, string> = {
      info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      warn: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      error: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return <Badge variant="outline" className={map[n] || map.info}>{n}</Badge>;
  };

  return (
    <Card className="p-4 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dispositivo</TableHead>
            <TableHead>Nível</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Mensagem</TableHead>
            <TableHead>Quando</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum evento</TableCell></TableRow>}
          {list.map((e) => (
            <TableRow key={e.id}>
              <TableCell>{e.device?.nome || "—"} <code className="text-xs text-muted-foreground">{e.device?.codigo}</code></TableCell>
              <TableCell>{nivelBadge(e.nivel)}</TableCell>
              <TableCell className="text-sm">{e.tipo || "—"}</TableCell>
              <TableCell className="text-sm">{e.mensagem || "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: ptBR })}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
