import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TV_COMMAND_LABELS } from "@/types/tvSignage";
import { enviarComando } from "@/services/tvSignage/tvSignageService";
import { toast } from "sonner";

export default function TvSignageComandos() {
  const [list, setList] = useState<any[]>([]);
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [devices, setDevices] = useState<any[]>([]);
  const [selDevices, setSelDevices] = useState<string>("");
  const [selTipo, setSelTipo] = useState<string>("");

  const carregar = async () => {
    const [{ data: c }, { data: d }] = await Promise.all([
      supabase.from("tv_commands").select("*, device:tv_devices(nome, codigo)").order("created_at", { ascending: false }).limit(200),
      supabase.from("tv_devices").select("id, nome"),
    ]);
    setList(c || []); setDevices(d || []);
  };

  useEffect(() => {
    carregar();
    const ch = supabase.channel("tv-commands-list").on("postgres_changes", { event: "*", schema: "public", table: "tv_commands" }, carregar).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filt = statusFiltro === "todos" ? list : list.filter((c) => c.status === statusFiltro);

  const disparar = async () => {
    if (!selTipo) return;
    if (selDevices === "all") {
      await Promise.all(devices.map((d) => enviarComando(d.id, selTipo as any)));
      toast.success(`Comando enviado para ${devices.length} dispositivos`);
    } else if (selDevices) {
      await enviarComando(selDevices, selTipo as any);
      toast.success("Comando enfileirado");
    }
    setSelTipo(""); setSelDevices("");
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pendente: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      enviado: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      confirmado: "bg-green-500/10 text-green-500 border-green-500/20",
      erro: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return <Badge variant="outline" className={map[s]}>{s}</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="font-medium mb-3">Disparar comando</h2>
        <div className="flex flex-col md:flex-row gap-2">
          <Select value={selDevices} onValueChange={setSelDevices}>
            <SelectTrigger className="md:w-64"><SelectValue placeholder="Escolha o dispositivo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">TODOS os dispositivos</SelectItem>
              {devices.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selTipo} onValueChange={setSelTipo}>
            <SelectTrigger className="md:w-64"><SelectValue placeholder="Tipo de comando" /></SelectTrigger>
            <SelectContent>{Object.entries(TV_COMMAND_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={disparar} disabled={!selTipo || !selDevices}>Enviar</Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Select value={statusFiltro} onValueChange={setStatusFiltro}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="confirmado">Confirmado</SelectItem>
              <SelectItem value="erro">Erro</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={carregar}><RefreshCw className="w-4 h-4" /></Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dispositivo</TableHead>
                <TableHead>Comando</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead>Confirmado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filt.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum comando</TableCell></TableRow>}
              {filt.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.device?.nome} <code className="text-xs text-muted-foreground">{c.device?.codigo}</code></TableCell>
                  <TableCell>{TV_COMMAND_LABELS[c.tipo as keyof typeof TV_COMMAND_LABELS] || c.tipo}</TableCell>
                  <TableCell>{statusBadge(c.status)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.confirmado_em ? formatDistanceToNow(new Date(c.confirmado_em), { addSuffix: true, locale: ptBR }) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
