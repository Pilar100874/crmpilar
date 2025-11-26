import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast-config";
import { TrendingUp, TrendingDown, Minus, MessageSquare, Users, Star } from "lucide-react";

interface RespostasPesquisa {
  id: string;
  pesquisa_id: string;
  nota: number;
  comentario?: string;
  classificacao?: string;
  canal: string;
  enviada_em: string;
  respondida_em?: string;
  tempo_resposta_segundos?: number;
  customer_id: string;
  customers?: {
    nome: string;
  };
  pesquisas_satisfacao?: {
    nome: string;
    tipo: string;
  };
}

interface MetricasResumidas {
  total_enviadas: number;
  total_respondidas: number;
  taxa_resposta: number;
  nota_media: number;
  nps_score?: number;
  promotores?: number;
  neutros?: number;
  detratores?: number;
}

interface PesquisasSatisfacaoDashboardProps {
  estabelecimentoId: string;
}

export default function PesquisasSatisfacaoDashboard({ estabelecimentoId }: PesquisasSatisfacaoDashboardProps) {
  const [respostas, setRespostas] = useState<RespostasPesquisa[]>([]);
  const [metricas, setMetricas] = useState<MetricasResumidas | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPesquisa, setSelectedPesquisa] = useState<string>("todas");
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>("30");
  const [pesquisas, setPesquisas] = useState<any[]>([]);

  useEffect(() => {
    loadPesquisas();
  }, [estabelecimentoId]);

  useEffect(() => {
    if (pesquisas.length > 0) {
      loadRespostas();
    }
  }, [selectedPesquisa, selectedPeriodo, estabelecimentoId, pesquisas]);

  const loadPesquisas = async () => {
    try {
      const { data, error } = await supabase
        .from("pesquisas_satisfacao")
        .select("id, nome, tipo")
        .eq("estabelecimento_id", estabelecimentoId);

      if (error) throw error;
      setPesquisas(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar pesquisas:", error);
      toast.error("Erro ao carregar pesquisas");
    }
  };

  const loadRespostas = async () => {
    setIsLoading(true);
    try {
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - parseInt(selectedPeriodo));

      let query = supabase
        .from("pesquisas_respostas")
        .select(`
          *,
          customers(nome),
          pesquisas_satisfacao(nome, tipo)
        `)
        .gte("enviada_em", dataInicio.toISOString())
        .order("enviada_em", { ascending: false });

      // Filtrar por pesquisa específica se não for "todas"
      if (selectedPesquisa !== "todas") {
        query = query.eq("pesquisa_id", selectedPesquisa);
      } else {
        // Filtrar apenas pesquisas do estabelecimento
        const pesquisaIds = pesquisas.map(p => p.id);
        if (pesquisaIds.length > 0) {
          query = query.in("pesquisa_id", pesquisaIds);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const respostasData = (data as any[]) || [];
      setRespostas(respostasData);
      calcularMetricas(respostasData);
    } catch (error: any) {
      console.error("Erro ao carregar respostas:", error);
      toast.error("Erro ao carregar respostas");
    } finally {
      setIsLoading(false);
    }
  };

  const calcularMetricas = (respostasData: any[]) => {
    const totalEnviadas = respostasData.length;
    const respondidas = respostasData.filter(r => r.respondida_em && r.nota >= 0);
    const totalRespondidas = respondidas.length;
    const taxaResposta = totalEnviadas > 0 ? (totalRespondidas / totalEnviadas) * 100 : 0;

    const notasValidas = respondidas.filter(r => r.nota >= 0);
    const notaMedia = notasValidas.length > 0
      ? notasValidas.reduce((acc, r) => acc + r.nota, 0) / notasValidas.length
      : 0;

    // Cálculo de NPS
    const promotores = respondidas.filter(r => r.classificacao === "promotor").length;
    const detratores = respondidas.filter(r => r.classificacao === "detrator").length;
    const neutros = respondidas.filter(r => r.classificacao === "neutro").length;
    
    const npsScore = totalRespondidas > 0
      ? ((promotores - detratores) / totalRespondidas) * 100
      : 0;

    setMetricas({
      total_enviadas: totalEnviadas,
      total_respondidas: totalRespondidas,
      taxa_resposta: taxaResposta,
      nota_media: notaMedia,
      nps_score: npsScore,
      promotores,
      neutros,
      detratores,
    });
  };

  const getTipoLabel = (tipo: string | undefined) => {
    if (!tipo) return "";
    switch (tipo) {
      case "nps": return "NPS";
      case "csat": return "CSAT";
      case "ces": return "CES";
      default: return tipo.toUpperCase();
    }
  };

  const getClassificacaoLabel = (classificacao: string | undefined) => {
    if (!classificacao) return "";
    switch (classificacao) {
      case "promotor": return "Promotor";
      case "neutro": return "Neutro";
      case "detrator": return "Detrator";
      default: return classificacao;
    }
  };

  const formatarTempo = (segundos: number | undefined): string => {
    if (!segundos) return "-";
    
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    
    if (horas > 0) {
      return `${horas}h ${minutos}min`;
    }
    return `${minutos}min`;
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  const semDados = respostas.length === 0;

  return (
    <div className="space-y-6">
      {/* Header com gradiente moderno */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 border shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="relative flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Star className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Dashboard de Satisfação</h2>
              <p className="text-muted-foreground mt-1">
                Acompanhe as métricas de satisfação dos clientes
              </p>
            </div>
          </div>
          <div className="flex gap-4">
          <Select value={selectedPesquisa} onValueChange={setSelectedPesquisa}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Pesquisas</SelectItem>
              {pesquisas.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Mensagem quando não há dados */}
      {semDados && (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum dado disponível</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Ainda não há respostas de pesquisas de satisfação para este estabelecimento no período selecionado.
              Configure pesquisas em Configurações → Estabelecimento Cadastrado → Pesquisas de Satisfação.
            </p>
          </CardContent>
        </Card>
      )}

      {metricas && !semDados && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Enviadas</CardTitle>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <MessageSquare className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas.total_enviadas}</div>
              <p className="text-xs text-muted-foreground">
                {metricas.total_respondidas} respondidas
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Resposta</CardTitle>
              <div className="p-2 rounded-lg bg-green-500/10">
                <Users className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas.taxa_resposta.toFixed(1)}%</div>
              <Progress value={metricas.taxa_resposta} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nota Média</CardTitle>
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Star className="h-4 w-4 text-yellow-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas.nota_media.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">de 10</p>
            </CardContent>
          </Card>

          {metricas.nps_score !== undefined && (
            <Card className="border shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">NPS Score</CardTitle>
                <div className={`p-2 rounded-lg ${
                  metricas.nps_score > 0 ? 'bg-green-500/10' : 
                  metricas.nps_score < 0 ? 'bg-red-500/10' : 
                  'bg-gray-500/10'
                }`}>
                  {metricas.nps_score > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : metricas.nps_score < 0 ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metricas.nps_score.toFixed(0)}</div>
                <p className="text-xs text-muted-foreground">
                  {metricas.promotores} promotores, {metricas.detratores} detratores
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!semDados && (
        <Tabs defaultValue="respostas" className="space-y-4">
          <TabsList>
            <TabsTrigger value="respostas">Respostas</TabsTrigger>
            <TabsTrigger value="comentarios">Comentários</TabsTrigger>
          </TabsList>

          <TabsContent value="respostas" className="space-y-4">
            <Card className="border shadow-sm">
              <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Pesquisa</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Enviada</TableHead>
                    <TableHead>Respondida</TableHead>
                    <TableHead>Tempo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {respostas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Nenhuma resposta encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    respostas.map((resposta: any) => (
                      <TableRow key={resposta.id}>
                        <TableCell>{resposta.customers?.nome || "N/A"}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {resposta.pesquisas_satisfacao?.nome}
                            </div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {getTipoLabel(resposta.pesquisas_satisfacao?.tipo)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {resposta.nota >= 0 ? (
                            <Badge
                              variant={resposta.nota >= 8 ? "default" : resposta.nota >= 5 ? "secondary" : "destructive"}
                            >
                              {resposta.nota}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pendente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="capitalize">{resposta.canal}</TableCell>
                        <TableCell>
                          {new Date(resposta.enviada_em).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          {resposta.respondida_em
                            ? new Date(resposta.respondida_em).toLocaleDateString("pt-BR")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {formatarTempo(resposta.tempo_resposta_segundos)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="comentarios" className="space-y-4">
            <Card className="border shadow-sm">
              <CardContent className="pt-6">
              <div className="space-y-4">
                {respostas
                  .filter((r: any) => r.comentario && r.comentario.trim() !== "")
                  .map((resposta: any) => (
                    <div
                      key={resposta.id}
                      className="border-l-4 border-primary pl-4 py-2"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium">
                            {resposta.customers?.nome || "Cliente"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(resposta.respondida_em!).toLocaleDateString("pt-BR")} •{" "}
                            Nota: {resposta.nota}
                          </div>
                        </div>
                        {resposta.classificacao && (
                          <Badge
                            variant={
                              resposta.classificacao === "promotor"
                                ? "default"
                                : resposta.classificacao === "neutro"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {getClassificacaoLabel(resposta.classificacao)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm">{resposta.comentario}</p>
                    </div>
                  ))}
                {respostas.filter((r: any) => r.comentario && r.comentario.trim() !== "")
                  .length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhum comentário encontrado
                  </div>
                )}
              </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
