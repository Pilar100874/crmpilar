import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, FileText } from 'lucide-react';
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
    primaryColor: '#1a1a1a',
    secondaryColor: '#666666',
    fontFamily: 'Inter, sans-serif',
    showPrices: true,
    showCodes: true,
  });

  const [coverPage, setCoverPage] = useState<CatalogPage>({
    id: 'cover',
    type: 'cover',
    title: '',
    subtitle: '',
    backgroundColor: '#1a1a1a',
  });

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
    backgroundColor: '#1a1a1a',
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
      case 0: // Info
        return config.name.trim().length > 0;
      case 1: // Cover
        return true;
      case 2: // Products
        return (productsPage.products?.length || 0) > 0;
      case 3: // Backcover
        return true;
      case 4: // Preview
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

  return (
    <div className="space-y-6">
      {/* Empty State */}
      {!estabelecimentoId && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Selecione um estabelecimento para criar catálogos</p>
        </div>
      )}

      {estabelecimentoId && (
        <>
          {/* Wizard Steps */}
          <CatalogWizardSteps
            currentStep={currentStep}
            onStepClick={setCurrentStep}
          />

          {/* Step Content */}
          <Card>
            <CardContent className="pt-6">
              {renderStep()}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>

            {currentStep < WIZARD_STEPS.length - 1 && (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MarketingCatalogo;
