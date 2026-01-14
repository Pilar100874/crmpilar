import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, FileText, BookOpen } from 'lucide-react';
import { CatalogConfig, CatalogPage, WIZARD_STEPS } from './types';
import { CatalogWizardSteps } from './CatalogWizardSteps';
import { StepInfo } from './StepInfo';
import { StepCover } from './StepCover';
import { StepProducts } from './StepProducts';
import { StepBackcover } from './StepBackcover';
import { StepPreview } from './StepPreview';

const MarketingCatalogo: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);

  const [config, setConfig] = useState<CatalogConfig>({
    name: '',
    pages: [],
    primaryColor: '#0f172a',
    secondaryColor: '#64748b',
    fontFamily: 'Inter, sans-serif',
    showPrices: true,
    showCodes: true,
  });

  const [coverPage, setCoverPage] = useState<CatalogPage>({
    id: 'cover',
    type: 'cover',
    title: '',
    subtitle: '',
    backgroundColor: '#0f172a',
  });

  // Debug: log coverPage changes
  useEffect(() => {
    console.log('[MarketingCatalogo] coverPage updated:', {
      hasLogoUrl: !!coverPage.logoUrl,
      logoUrlLength: coverPage.logoUrl?.length,
      hasBackgroundImage: !!coverPage.backgroundImage
    });
  }, [coverPage]);

  const [productsPage, setProductsPage] = useState<CatalogPage>({
    id: 'products',
    type: 'products',
    products: [],
    layout: 'grid-3',
  });

  const [backcoverPage, setBackcoverPage] = useState<CatalogPage>({
    id: 'backcover',
    type: 'backcover',
    title: 'Entre em Contato',
    backgroundColor: '#0f172a',
    contactInfo: {},
  });

  useEffect(() => {
    const storedId = localStorage.getItem('estabelecimentoId');
    if (storedId) {
      setEstabelecimentoId(storedId);
    }
  }, []);

  const updateConfig = (updates: Partial<CatalogConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return config.name.trim().length > 0;
      case 1:
        return true;
      case 2:
        return (productsPage.products?.length || 0) > 0;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1 && canProceed()) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepInfo config={config} onChange={updateConfig} />;
      case 1:
        return (
          <StepCover
            page={coverPage}
            onChange={setCoverPage}
            primaryColor={config.primaryColor}
            catalogName={config.name}
            businessType={config.businessType}
            estabelecimentoId={estabelecimentoId}
          />
        );
      case 2:
        return (
          <StepProducts
            page={productsPage}
            onChange={setProductsPage}
            estabelecimentoId={estabelecimentoId}
            showPrices={config.showPrices}
            showCodes={config.showCodes}
          />
        );
      case 3:
        return (
          <StepBackcover
            page={backcoverPage}
            onChange={setBackcoverPage}
            primaryColor={config.primaryColor}
            logoUrl={coverPage.logoUrl}
          />
        );
      case 4:
        return (
          <StepPreview
            config={config}
            coverPage={coverPage}
            productsPage={productsPage}
            backcoverPage={backcoverPage}
          />
        );
      default:
        return null;
    }
  };

  if (!estabelecimentoId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">Nenhum estabelecimento selecionado</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Selecione um estabelecimento para começar a criar catálogos de produtos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Criar Catálogo</h2>
          <p className="text-sm text-muted-foreground">
            Monte seu catálogo de produtos em poucos passos
          </p>
        </div>
      </div>

      {/* Wizard Steps */}
      <CatalogWizardSteps
        currentStep={currentStep}
        onStepClick={setCurrentStep}
      />

      {/* Step Content */}
      <div className="bg-card rounded-2xl border p-6 md:p-8">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="rounded-xl"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        {currentStep < WIZARD_STEPS.length - 1 && (
          <Button 
            onClick={handleNext} 
            disabled={!canProceed()}
            className="rounded-xl"
          >
            Próximo
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default MarketingCatalogo;
