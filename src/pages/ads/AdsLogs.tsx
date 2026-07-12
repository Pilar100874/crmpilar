import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, RefreshCw, CheckCircle2, XCircle, AlertCircle, Info,
  Loader2, Calendar, Filter
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

const typeConfig: Record<string, { label: string; color: string; icon: any }> = {
  success: { label: "Sucesso", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle2 },
  error: { label: "Erro", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
  warning: { label: "Aviso", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: AlertCircle },
  info: { label: "Info", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Info },
};

export default function AdsLogs() {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");

  useEffect(() => {
    getEstabelecimentoId().then(setEstabelecimentoId);
  }, []);

  const { data: platforms } = useQuery({
    queryKey: ["ad_platforms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ad_platforms").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["ads_logs", estabelecimentoId, filterType, filterPlatform],
    queryFn: async () => {
      if (!estabelecimentoId) return [];
      
      let query = supabase
        .from("ads_logs_coleta")
        .select("*, plataforma:ad_platforms(*)")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("created_at", { ascending: false })
        .limit(500);
      
      if (filterType !== "all") {
        query = query.eq("tipo", filterType);
      }
      
      if (filterPlatform !== "all") {
        query = query.eq("plataforma_id", filterPlatform);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!estabelecimentoId,
  });

  const filteredLogs = logs?.filter(log => 
    log.mensagem?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.plataforma?.nome_display?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: logs?.length || 0,
    success: logs?.filter(l => l.tipo === "success").length || 0,
    error: logs?.filter(l => l.tipo === "error").length || 0,
    warning: logs?.filter(l => l.tipo === "warning").length || 0,
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Logs de Coleta
            </h1>
            <p className="text-muted-foreground mt-1">
              Histórico de sincronizações e coletas de dados
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Info className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Sucesso</span>
              </div>
              <p className="text-2xl font-bold text-green-500">{stats.success}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Erros</span>
              </div>
              <p className="text-2xl font-bold text-red-500">{stats.error}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-xs text-muted-foreground">Avisos</span>
              </div>
              <p className="text-2xl font-bold text-yellow-500">{stats.warning}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar nos logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos tipos</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                  <SelectItem value="warning">Aviso</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Plataforma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas plataformas</SelectItem>
                  {platforms?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome_display}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Logs</CardTitle>
            <CardDescription>
              {filteredLogs?.length || 0} registros encontrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {filteredLogs?.map(log => {
                    const type = typeConfig[log.tipo] || typeConfig.info;
                    const TypeIcon = type.icon;
                    
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className={`p-2 rounded-full ${type.color}`}>
                          <TypeIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={type.color}>
                              {type.label}
                            </Badge>
                            {log.plataforma && (
                              <Badge variant="secondary" className="text-xs">
                                {log.plataforma.nome_display}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm">{log.mensagem}</p>
                          {log.detalhes && (
                            <pre className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded overflow-x-auto">
                              {JSON.stringify(log.detalhes, null, 2)}
                            </pre>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </div>
                      </div>
                    );
                  })}
                  
                  {filteredLogs?.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Nenhum log encontrado</p>
                      <p className="text-sm">
                        Os logs serão exibidos após a primeira sincronização
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
