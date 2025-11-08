import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { updateReport, getReport } from '@/api/reportClient';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { FastReportDesigner } from '@/components/fastreport/FastReportDesigner';

export default function DesignerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [reportName, setReportName] = useState('');
  const [reportContent, setReportContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
    try {
      setLoading(true);
      
      if (id && id !== 'new') {
        const report = await getReport(id);
        setReportName(report.name);
        // Assumindo que o backend retorna o conteúdo .frx em um campo
        setReportContent(report.description || ''); // Ajuste conforme sua API
      } else {
        setReportName('Novo Relatório');
        setReportContent('');
      }
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
      toast.error('Erro ao carregar relatório');
      navigate('/report-studio/reports');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (frxContent: string) => {
    if (!id || id === 'new') {
      toast.error('Para criar um novo relatório, use a lista de relatórios');
      return;
    }

    try {
      await updateReport(id, frxContent);
      toast.success('Relatório salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar relatório:', error);
      toast.error('Erro ao salvar relatório');
      throw error;
    }
  };

  const handleClose = () => {
    navigate('/report-studio/reports');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <div className="bg-background border-b px-6 py-3 flex items-center gap-4">
        <Button
          onClick={handleClose}
          variant="ghost"
          size="sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-foreground">{reportName}</h1>
          <p className="text-xs text-muted-foreground">Editor FastReport integrado</p>
        </div>
      </div>

      <div className="h-[calc(100%-60px)]">
        <FastReportDesigner
          reportId={id || null}
          initialReport={reportContent}
          onSave={handleSave}
          onClose={handleClose}
        />
      </div>
    </div>
  );
}
