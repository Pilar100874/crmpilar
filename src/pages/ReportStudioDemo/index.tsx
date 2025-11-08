import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileText, Plus, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { API_BASE_URL } from '@/api/reportClient';

export default function ReportStudioDemo() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isReportsPage = location.pathname === '/report-studio/reports';

  return (
    <div className="min-h-screen bg-background">
      {/* Header fixo */}
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Report Studio Demo</h1>
          </div>
          <Button
            onClick={() => navigate('/relatorios')}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Sistema
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-card min-h-[calc(100vh-73px)] p-4">
          <nav className="space-y-2">
            <Button
              onClick={() => navigate('/report-studio/reports')}
              variant={isReportsPage ? 'default' : 'ghost'}
              className="w-full justify-start"
            >
              <FileText className="w-4 h-4 mr-2" />
              Relatórios
            </Button>
            <Button
              onClick={() => navigate('/report-studio/designer/new')}
              variant="ghost"
              className="w-full justify-start"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Relatório
            </Button>
          </nav>

          {/* Informações de configuração */}
          <div className="mt-8 pt-8 border-t">
            <h3 className="text-sm font-semibold text-foreground mb-3">Configuração</h3>
            {!API_BASE_URL || API_BASE_URL === 'http://localhost:5000' ? (
              <Alert>
                <AlertTitle className="text-xs">Atenção</AlertTitle>
                <AlertDescription className="text-xs">
                  Configure <code className="bg-muted px-1 py-0.5 rounded text-[10px]">
                    VITE_API_BASE_URL
                  </code> no arquivo <code className="bg-muted px-1 py-0.5 rounded text-[10px]">
                    .env
                  </code>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">API conectada:</p>
                <p className="break-all">{API_BASE_URL}</p>
              </div>
            )}
          </div>
        </aside>

        {/* Conteúdo principal */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
