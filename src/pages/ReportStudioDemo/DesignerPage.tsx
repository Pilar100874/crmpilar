import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE_URL, updateReport, getReport } from '@/api/reportClient';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function DesignerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [reportName, setReportName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && id !== 'new') {
      loadReportInfo();
    } else {
      setLoading(false);
    }
  }, [id]);

  const loadReportInfo = async () => {
    try {
      const report = await getReport(id!);
      setReportName(report.name);
    } catch (error) {
      console.error('Erro ao carregar informações do relatório:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id || id === 'new') {
      toast.error('Não é possível salvar um novo relatório ainda');
      return;
    }

    try {
      setSaving(true);
      
      // Em uma implementação real, você precisaria obter o conteúdo .frx do iframe
      // Por enquanto, vamos apenas simular o salvamento
      const iframe = document.getElementById('designer-iframe') as HTMLIFrameElement;
      
      if (!iframe || !iframe.contentWindow) {
        throw new Error('Designer não carregado');
      }

      // Aqui você precisaria implementar a comunicação com o iframe
      // para obter o conteúdo .frx atualizado
      // Exemplo: const frxContent = await getDesignerContent(iframe.contentWindow);
      
      // Por enquanto, apenas simula
      await updateReport(id, '<!-- FRX Content -->');
      
      toast.success('Relatório salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar relatório:', error);
      toast.error('Erro ao salvar relatório');
    } finally {
      setSaving(false);
    }
  };

  const designerUrl = id === 'new' 
    ? `${API_BASE_URL}/designer`
    : `${API_BASE_URL}/designer?reportId=${id}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="bg-background border-b px-6 py-4 flex items-center justify-between">
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
            <h1 className="text-xl font-semibold text-foreground">
              {id === 'new' ? 'Novo Relatório' : reportName || `Relatório ${id}`}
            </h1>
            <p className="text-sm text-muted-foreground">Editor FastReport Online</p>
          </div>
        </div>
        
        {id !== 'new' && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        )}
      </div>

      {!API_BASE_URL && (
        <div className="p-6">
          <Alert variant="destructive">
            <AlertDescription>
              <strong>Configuração necessária:</strong> Defina a variável de ambiente{' '}
              <code className="bg-destructive/20 px-1 py-0.5 rounded">VITE_API_BASE_URL</code>{' '}
              apontando para seu backend .NET com FastReport Web Demo.
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex-1 bg-muted/30">
        <iframe
          id="designer-iframe"
          src={designerUrl}
          className="w-full h-full border-0"
          title="FastReport Online Designer"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
