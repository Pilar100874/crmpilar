import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReports, Report } from '@/api/reportClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, FileEdit, Loader2, Plus } from 'lucide-react';

export default function ReportsList() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await getReports();
      setReports(data);
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
      toast.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie e visualize seus relatórios FastReport
          </p>
        </div>
        <Button onClick={() => navigate('/report-studio/designer/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Relatório
        </Button>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Nenhum relatório encontrado</p>
            <Button onClick={() => navigate('/report-studio/designer/new')} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Relatório
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{report.name}</CardTitle>
                {report.description && (
                  <CardDescription>{report.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    onClick={() => navigate(`/report-studio/designer/${report.id}`)}
                    variant="outline"
                    className="flex-1"
                  >
                    <FileEdit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    onClick={() => navigate(`/report-studio/viewer/${report.id}`)}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar
                  </Button>
                </div>
                {report.updatedAt && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Atualizado em: {new Date(report.updatedAt).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
