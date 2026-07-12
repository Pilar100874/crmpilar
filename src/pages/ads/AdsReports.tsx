import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, FileText, Download, Calendar, BarChart3, PieChart, TrendingUp,
  Loader2, Search, Facebook, Music2, ShoppingBag, Package, Clock, Trash2
} from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

const reportTypes = [
  { id: 'performance', label: 'Performance Geral', icon: BarChart3, description: 'Métricas de performance consolidadas' },
  { id: 'campaigns', label: 'Por Campanha', icon: TrendingUp, description: 'Análise detalhada por campanha' },
  { id: 'platforms', label: 'Por Plataforma', icon: PieChart, description: 'Comparativo entre plataformas' },
  { id: 'daily', label: 'Evolução Diária', icon: Calendar, description: 'Métricas dia a dia' },
];

const metrics = [
  { id: 'gastos', label: 'Gastos' },
  { id: 'receita', label: 'Receita' },
  { id: 'roas', label: 'ROAS' },
  { id: 'roi', label: 'ROI' },
  { id: 'cliques', label: 'Cliques' },
  { id: 'impressoes', label: 'Impressões' },
  { id: 'conversoes', label: 'Conversões' },
  { id: 'cpc', label: 'CPC' },
  { id: 'cpm', label: 'CPM' },
  { id: 'ctr', label: 'CTR' },
];

export default function AdsReports() {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newReport, setNewReport] = useState({
    name: '',
    type: 'performance',
    period: '30d',
    platforms: [] as string[],
    metrics: ['gastos', 'receita', 'roas', 'conversoes'] as string[],
  });
  const [generatingReport, setGeneratingReport] = useState(false);
  const [savedReports, setSavedReports] = useState<any[]>([]);

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

  const { data: insights } = useQuery({
    queryKey: ["ad_insights_reports", estabelecimentoId],
    queryFn: async () => {
      if (!estabelecimentoId) return [];
      const { data, error } = await supabase
        .from("ad_insights")
        .select("*, plataforma:ad_platforms(*)")
        .eq("estabelecimento_id", estabelecimentoId)
        .gte("data", format(subDays(new Date(), 90), "yyyy-MM-dd"))
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!estabelecimentoId,
  });

  const handleGenerateReport = async () => {
    if (!newReport.name.trim()) {
      toast.error("Nome do relatório é obrigatório");
      return;
    }

    setGeneratingReport(true);
    
    try {
      // Simular geração de relatório
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const report = {
        id: Date.now().toString(),
        name: newReport.name,
        type: newReport.type,
        period: newReport.period,
        platforms: newReport.platforms,
        metrics: newReport.metrics,
        createdAt: new Date().toISOString(),
        status: 'completed',
      };
      
      setSavedReports(prev => [report, ...prev]);
      setShowCreateDialog(false);
      setNewReport({
        name: '',
        type: 'performance',
        period: '30d',
        platforms: [],
        metrics: ['gastos', 'receita', 'roas', 'conversoes'],
      });
      toast.success("Relatório gerado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar relatório");
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleExportReport = (report: any) => {
    // Preparar dados para exportação
    const totals = insights?.reduce((acc, item) => ({
      gastos: acc.gastos + Number(item.gastos || 0),
      receita: acc.receita + Number(item.receita || 0),
      cliques: acc.cliques + (item.cliques || 0),
      impressoes: acc.impressoes + (item.impressoes || 0),
      conversoes: acc.conversoes + (item.conversoes || 0),
    }), { gastos: 0, receita: 0, cliques: 0, impressoes: 0, conversoes: 0 }) || { gastos: 0, receita: 0, cliques: 0, impressoes: 0, conversoes: 0 };

    const csvContent = [
      ["Métrica", "Valor"],
      ["Gastos", `R$ ${totals.gastos.toFixed(2)}`],
      ["Receita", `R$ ${totals.receita.toFixed(2)}`],
      ["ROAS", `${(totals.gastos > 0 ? totals.receita / totals.gastos : 0).toFixed(2)}x`],
      ["Cliques", totals.cliques.toString()],
      ["Impressões", totals.impressoes.toString()],
      ["Conversões", totals.conversoes.toString()],
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success("Relatório exportado!");
  };

  const handleDeleteReport = (reportId: string) => {
    setSavedReports(prev => prev.filter(r => r.id !== reportId));
    toast.success("Relatório excluído");
  };

  const togglePlatform = (platformId: string) => {
    setNewReport(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter(p => p !== platformId)
        : [...prev.platforms, platformId]
    }));
  };

  const toggleMetric = (metricId: string) => {
    setNewReport(prev => ({
      ...prev,
      metrics: prev.metrics.includes(metricId)
        ? prev.metrics.filter(m => m !== metricId)
        : [...prev.metrics, metricId]
    }));
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Relatórios
            </h1>
            <p className="text-muted-foreground mt-1">
              Gere e exporte relatórios personalizados
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Relatório
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Relatório</DialogTitle>
                <DialogDescription>Configure as opções do relatório</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-6 p-1">
                  {/* Nome */}
                  <div className="space-y-2">
                    <Label>Nome do Relatório</Label>
                    <Input
                      placeholder="Ex: Relatório Mensal de Performance"
                      value={newReport.name}
                      onChange={(e) => setNewReport(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  {/* Tipo */}
                  <div className="space-y-2">
                    <Label>Tipo de Relatório</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {reportTypes.map(type => {
                        const Icon = type.icon;
                        return (
                          <Card
                            key={type.id}
                            className={`cursor-pointer transition-all ${
                              newReport.type === type.id 
                                ? 'border-primary ring-2 ring-primary/20' 
                                : 'hover:border-primary/50'
                            }`}
                            onClick={() => setNewReport(prev => ({ ...prev, type: type.id }))}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <Icon className="h-5 w-5 text-primary" />
                                <div>
                                  <p className="font-medium text-sm">{type.label}</p>
                                  <p className="text-xs text-muted-foreground">{type.description}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Período */}
                  <div className="space-y-2">
                    <Label>Período</Label>
                    <Select
                      value={newReport.period}
                      onValueChange={(v) => setNewReport(prev => ({ ...prev, period: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7d">Últimos 7 dias</SelectItem>
                        <SelectItem value="30d">Últimos 30 dias</SelectItem>
                        <SelectItem value="60d">Últimos 60 dias</SelectItem>
                        <SelectItem value="90d">Últimos 90 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Plataformas */}
                  <div className="space-y-2">
                    <Label>Plataformas (deixe vazio para todas)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {platforms?.map(platform => (
                        <div key={platform.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={platform.id}
                            checked={newReport.platforms.includes(platform.id)}
                            onCheckedChange={() => togglePlatform(platform.id)}
                          />
                          <Label htmlFor={platform.id} className="text-sm font-normal">
                            {platform.nome_display}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Métricas */}
                  <div className="space-y-2">
                    <Label>Métricas a Incluir</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {metrics.map(metric => (
                        <div key={metric.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={metric.id}
                            checked={newReport.metrics.includes(metric.id)}
                            onCheckedChange={() => toggleMetric(metric.id)}
                          />
                          <Label htmlFor={metric.id} className="text-sm font-normal">
                            {metric.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleGenerateReport} disabled={generatingReport}>
                  {generatingReport && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Gerar Relatório
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Quick Reports */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportTypes.map(type => {
            const Icon = type.icon;
            return (
              <Card 
                key={type.id} 
                className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50"
                onClick={() => {
                  setNewReport(prev => ({ ...prev, type: type.id, name: type.label }));
                  setShowCreateDialog(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Saved Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Relatórios Salvos</CardTitle>
            <CardDescription>{savedReports.length} relatórios gerados</CardDescription>
          </CardHeader>
          <CardContent>
            {savedReports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhum relatório gerado</p>
                <p className="text-sm">Crie seu primeiro relatório personalizado</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {savedReports.map(report => {
                    const typeConfig = reportTypes.find(t => t.id === report.type);
                    const Icon = typeConfig?.icon || FileText;
                    
                    return (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{report.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="secondary" className="text-xs">
                                {typeConfig?.label}
                              </Badge>
                              <span>•</span>
                              <Clock className="h-3 w-3" />
                              {format(new Date(report.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExportReport(report)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Exportar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteReport(report.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
