import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle, Loader2, Settings } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function LogsMonitorPreco() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['logs_monitor_preco'],
    queryFn: async () => {
      const estabelecimentoId = await getEstabelecimentoId();
      const { data, error } = await supabase
        .from('logs_monitor_preco')
        .select('*, fonte:fontes_pesquisa_precos(nome_fonte)')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Logs do Monitor de Preços
        </CardTitle>
        <CardDescription>
          Últimas 100 execuções e eventos do robô de preços
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : logs?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum log encontrado. Execute o robô de preços para ver os logs.
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Tipo</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead className="w-[150px]">Data/Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {log.tipo === 'erro' ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Erro
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-green-500 border-green-500/30">
                          <CheckCircle className="h-3 w-3" />
                          Info
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{log.mensagem}</p>
                      {log.detalhes && (
                        <pre className="text-xs text-muted-foreground mt-1 max-w-[400px] truncate">
                          {JSON.stringify(log.detalhes, null, 2)}
                        </pre>
                      )}
                    </TableCell>
                    <TableCell>{log.fonte?.nome_fonte || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
