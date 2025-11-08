import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { renderReport, getReport, Report } from '@/api/reportClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';

export default function ViewerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  
  // Parâmetros do relatório
  const [parameters, setParameters] = useState({
    categoriaId: '',
    dataInicial: '',
    dataFinal: '',
  });

  useEffect(() => {
    if (id) {
      loadReport();
    }
  }, [id]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await getReport(id!);
      setReport(data);
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
      toast.error('Erro ao carregar relatório');
      navigate('/report-studio/reports');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      setGenerating(true);
      
      const blob = await renderReport(id!, 'pdf', parameters);
      
      // Cria um link temporário para download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report?.name || 'relatorio'}_${new Date().getTime()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          onClick={() => navigate('/report-studio/reports')}
          variant="ghost"
          size="sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {report?.name || 'Visualizar Relatório'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure os parâmetros e gere o relatório em PDF
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parâmetros do Relatório</CardTitle>
          <CardDescription>
            Preencha os parâmetros necessários para gerar o relatório
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoriaId">Categoria ID</Label>
              <Input
                id="categoriaId"
                placeholder="Digite o ID da categoria"
                value={parameters.categoriaId}
                onChange={(e) =>
                  setParameters({ ...parameters, categoriaId: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataInicial">Data Inicial</Label>
              <Input
                id="dataInicial"
                type="date"
                value={parameters.dataInicial}
                onChange={(e) =>
                  setParameters({ ...parameters, dataInicial: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataFinal">Data Final</Label>
              <Input
                id="dataFinal"
                type="date"
                value={parameters.dataFinal}
                onChange={(e) =>
                  setParameters({ ...parameters, dataFinal: e.target.value })
                }
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button
              onClick={() => navigate(`/report-studio/designer/${id}`)}
              variant="outline"
            >
              Editar Relatório
            </Button>
            <Button onClick={handleGeneratePDF} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Gerar PDF
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {report?.description && (
        <Card>
          <CardHeader>
            <CardTitle>Descrição</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{report.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
