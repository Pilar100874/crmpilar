import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Search, 
  Users, 
  ChevronRight, 
  Check, 
  MapPin,
  Database,
  Globe,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Target
} from 'lucide-react';
import ProspeccaoMapView from './ProspeccaoMapView';
import ProspeccaoTableView from './ProspeccaoTableView';
import ProspeccaoConfigView from './ProspeccaoConfigView';
import ProspeccaoGastosView from './ProspeccaoGastosView';
import ProspeccaoDadosAbertosView from './ProspeccaoDadosAbertosView';
import ProspeccaoWebScrapingView from './ProspeccaoWebScrapingView';
import ProspeccaoScrapingDiretoView from './ProspeccaoScrapingDiretoView';
import { useProspeccaoB2B } from './useProspeccaoB2B';
import { cn } from '@/lib/utils';

type Step = 'config' | 'search' | 'manage';

interface StepInfo {
  id: Step;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const steps: StepInfo[] = [
  {
    id: 'config',
    label: 'Configurar',
    icon: <Settings className="h-5 w-5" />,
    description: 'Escolha a fonte de dados e configure as APIs'
  },
  {
    id: 'search',
    label: 'Buscar',
    icon: <Search className="h-5 w-5" />,
    description: 'Encontre empresas para prospectar'
  },
  {
    id: 'manage',
    label: 'Gerenciar',
    icon: <Users className="h-5 w-5" />,
    description: 'Gerencie e exporte seus prospects'
  }
];

const ProspeccaoB2BView: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>('config');
  const [showGastos, setShowGastos] = useState(false);
  const prospeccao = useProspeccaoB2B();
  
  // Verificar fonte de dados configurada
  const fonteDados = (prospeccao.config as any)?.fonte_dados || 'google_places';
  const isGooglePlaces = fonteDados === 'google_places';
  const isDadosAbertos = fonteDados === 'dados_abertos';
  const isWebScraping = fonteDados === 'web_scraping';
  const isScrapingDireto = fonteDados === 'scraping_direto';

  // Verificar se a configuração está completa
  const hasApiKey = isGooglePlaces 
    ? !!(prospeccao.config as any)?.google_places_api_key
    : isWebScraping 
      ? !!(prospeccao.config as any)?.firecrawl_api_key
      : true; // Dados abertos e scraping direto não precisam de API key

  // Verificar parâmetros de busca do Web Scraping ou Scraping Direto
  const wsSearchComplete = (isWebScraping || isScrapingDireto)
    ? !!((prospeccao.config as any)?.ws_termo_busca && 
         (prospeccao.config as any)?.ws_cidade && 
         (prospeccao.config as any)?.ws_uf)
    : true;

  const isConfigComplete = hasApiKey && wsSearchComplete;
  const hasProspects = prospeccao.prospects.length > 0;

  // Obter info de gastos
  const gastosInfo = prospeccao.getGastosInfo();

  // Determinar qual step está disponível
  const getStepStatus = (stepId: Step): 'complete' | 'current' | 'upcoming' | 'available' => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    const currentIndex = steps.findIndex(s => s.id === currentStep);

    if (stepId === currentStep) return 'current';
    if (stepIndex < currentIndex) return 'complete';
    
    // Config sempre disponível
    if (stepId === 'config') return 'available';
    // Search disponível se config completa
    if (stepId === 'search' && isConfigComplete) return 'available';
    // Manage disponível se tem prospects
    if (stepId === 'manage' && hasProspects) return 'available';
    
    return 'upcoming';
  };

  const canGoToStep = (stepId: Step): boolean => {
    const status = getStepStatus(stepId);
    return status !== 'upcoming';
  };

  const getSourceIcon = () => {
    if (isDadosAbertos) return <Database className="h-4 w-4" />;
    if (isWebScraping) return <Globe className="h-4 w-4" />;
    if (isScrapingDireto) return <Search className="h-4 w-4" />;
    return <MapPin className="h-4 w-4" />;
  };

  const getSourceLabel = () => {
    if (isDadosAbertos) return 'Dados Abertos (Grátis)';
    if (isWebScraping) return 'Web Scraping + IA';
    if (isScrapingDireto) return 'Scraping Direto (Grátis)';
    return 'Google Places (Pago)';
  };

  const getSourceColor = () => {
    if (isDadosAbertos) return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    if (isWebScraping) return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    if (isScrapingDireto) return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
  };

  const renderStepContent = () => {
    if (showGastos) {
      return <ProspeccaoGastosView {...prospeccao} />;
    }

    switch (currentStep) {
      case 'config':
        return <ProspeccaoConfigView {...prospeccao} />;
      case 'search':
        if (isDadosAbertos) {
          return (
            <ProspeccaoDadosAbertosView 
              estabelecimentoId={prospeccao.estabelecimentoId}
              onProspectsFound={() => prospeccao.loadProspects()}
            />
          );
        }
        if (isWebScraping) {
          return (
            <ProspeccaoWebScrapingView 
              estabelecimentoId={prospeccao.estabelecimentoId}
              config={prospeccao.config}
              onProspectsFound={() => prospeccao.loadProspects()}
            />
          );
        }
        if (isScrapingDireto) {
          return (
            <ProspeccaoScrapingDiretoView 
              estabelecimentoId={prospeccao.estabelecimentoId}
              config={prospeccao.config}
              onProspectsFound={() => prospeccao.loadProspects()}
            />
          );
        }
        return <ProspeccaoMapView {...prospeccao} />;
      case 'manage':
        return <ProspeccaoTableView {...prospeccao} />;
      default:
        return null;
    }
  };

  const goToNextStep = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1].id;
      if (canGoToStep(nextStep)) {
        setCurrentStep(nextStep);
      }
    }
  };

  const goToPrevStep = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header com título e resumo */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Prospecção B2B
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Encontre empresas para prospectar usando diferentes fontes de dados
          </p>
        </div>

        {/* Resumo rápido */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className={cn("flex items-center gap-1", getSourceColor())}>
            {getSourceIcon()}
            {getSourceLabel()}
          </Badge>
          
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {prospeccao.prospects.length} prospects
          </Badge>

          {isGooglePlaces && (
            <Badge 
              variant="outline" 
              className={cn(
                "flex items-center gap-1 cursor-pointer hover:bg-muted",
                gastosInfo.limiteAtingido && "border-destructive text-destructive"
              )}
              onClick={() => setShowGastos(!showGastos)}
            >
              <DollarSign className="h-3 w-3" />
              ${gastosInfo.custoMensal.toFixed(2)}
              {gastosInfo.limiteAtingido && <AlertTriangle className="h-3 w-3" />}
            </Badge>
          )}
        </div>
      </div>

      {/* Stepper horizontal */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const status = getStepStatus(step.id);
              const isClickable = canGoToStep(step.id);
              
              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => isClickable && !showGastos && setCurrentStep(step.id)}
                    disabled={!isClickable || showGastos}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-all flex-1 max-w-xs",
                      status === 'current' && !showGastos && "bg-primary/10 border-2 border-primary",
                      status === 'complete' && "bg-green-50 dark:bg-green-950",
                      status === 'available' && "hover:bg-muted cursor-pointer",
                      status === 'upcoming' && "opacity-50 cursor-not-allowed",
                      showGastos && "opacity-50"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center h-10 w-10 rounded-full shrink-0",
                      status === 'current' && !showGastos && "bg-primary text-primary-foreground",
                      status === 'complete' && "bg-green-500 text-white",
                      status === 'available' && "bg-muted-foreground/20 text-muted-foreground",
                      status === 'upcoming' && "bg-muted text-muted-foreground"
                    )}>
                      {status === 'complete' ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        step.icon
                      )}
                    </div>
                    <div className="text-left hidden sm:block">
                      <div className="font-medium text-sm">{step.label}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {step.description}
                      </div>
                    </div>
                  </button>

                  {index < steps.length - 1 && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mx-2 hidden md:block" />
                  )}
                </React.Fragment>
              );
            })}

            {/* Botão de Gastos */}
            {isGooglePlaces && (
              <>
                <Separator orientation="vertical" className="h-10 mx-4 hidden lg:block" />
                <button
                  onClick={() => setShowGastos(!showGastos)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-all",
                    showGastos && "bg-primary/10 border-2 border-primary",
                    !showGastos && "hover:bg-muted"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center h-10 w-10 rounded-full shrink-0",
                    showGastos ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground"
                  )}>
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div className="text-left hidden lg:block">
                    <div className="font-medium text-sm">Gastos</div>
                    <div className="text-xs text-muted-foreground">
                      Monitorar custos
                    </div>
                  </div>
                </button>
              </>
            )}
          </div>

          {/* Dicas contextuais */}
          <div className="mt-4">
            {currentStep === 'config' && !showGastos && (
              <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
                <Settings className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
                  <strong>Etapa 1:</strong> Escolha sua fonte de dados preferida. 
                  {!isGooglePlaces && !isWebScraping && " Fontes gratuitas não precisam de API key."}
                  {isGooglePlaces && !hasApiKey && " Configure sua API Key do Google Places para continuar."}
                  {isGooglePlaces && hasApiKey && " API configurada! Você pode avançar para buscar empresas."}
                  {isWebScraping && !hasApiKey && " Configure sua API Key do Firecrawl para continuar."}
                  {isWebScraping && hasApiKey && !wsSearchComplete && " Configure os parâmetros de busca (termo, cidade, UF)."}
                  {isWebScraping && hasApiKey && wsSearchComplete && " Tudo configurado! Avance para executar a busca."}
                </AlertDescription>
              </Alert>
            )}
            
            {currentStep === 'search' && !showGastos && (
              <Alert className="bg-green-50 dark:bg-green-950 border-green-200">
                <Search className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-300 text-sm">
                  <strong>Etapa 2:</strong> 
                  {isGooglePlaces && " Desenhe uma área no mapa ou selecione uma cidade para buscar empresas."}
                  {isDadosAbertos && " Selecione estado e município para buscar empresas na base de CNPJs."}
                  {isWebScraping && " Clique no botão para executar a busca com os parâmetros configurados."}
                </AlertDescription>
              </Alert>
            )}
            
            {currentStep === 'manage' && !showGastos && (
              <Alert className="bg-purple-50 dark:bg-purple-950 border-purple-200">
                <Users className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-purple-700 dark:text-purple-300 text-sm">
                  <strong>Etapa 3:</strong> Gerencie seus {prospeccao.prospects.length} prospects. 
                  Atualize status, exporte para Excel/CSV ou envie para webhooks.
                </AlertDescription>
              </Alert>
            )}

            {showGastos && (
              <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200">
                <BarChart3 className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
                  <strong>Monitoramento de Gastos:</strong> Acompanhe seus custos com a API do Google Places.
                  {gastosInfo.limiteAtingido && " ⚠️ Limite mensal atingido!"}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo principal */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="pr-4">
            {renderStepContent()}
          </div>
        </ScrollArea>
      </div>

      {/* Footer com navegação */}
      {!showGastos && (
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={goToPrevStep}
            disabled={currentStep === 'config'}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          <div className="flex gap-2">
            {currentStep === 'config' && !isConfigComplete && (
              <span className="text-sm text-muted-foreground self-center">
                Configure a fonte de dados para continuar
              </span>
            )}
          </div>

          <Button
            onClick={goToNextStep}
            disabled={
              (currentStep === 'config' && !isConfigComplete) ||
              (currentStep === 'search' && !hasProspects) ||
              currentStep === 'manage'
            }
          >
            {currentStep === 'manage' ? 'Concluído' : 'Próximo'}
            {currentStep !== 'manage' && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>
      )}

      {showGastos && (
        <div className="flex items-center justify-center pt-4 border-t">
          <Button variant="outline" onClick={() => setShowGastos(false)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar às etapas
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProspeccaoB2BView;
