import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, ChevronLeft, ChevronRight, Package, FileText, Phone, Mail, Globe, MapPin } from 'lucide-react';
import { CatalogConfig, CatalogPage, LAYOUT_OPTIONS } from './types';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

interface StepPreviewProps {
  config: CatalogConfig;
  coverPage: CatalogPage;
  productsPage: CatalogPage;
  backcoverPage: CatalogPage;
}

export const StepPreview: React.FC<StepPreviewProps> = ({
  config,
  coverPage,
  productsPage,
  backcoverPage,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [generating, setGenerating] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const products = productsPage.products || [];
  const layout = productsPage.layout || 'grid-3';
  const layoutConfig = LAYOUT_OPTIONS.find((l) => l.value === layout) || LAYOUT_OPTIONS[1];
  const productsPerPage = layout === 'list' ? 8 : layoutConfig.cols * 3;
  
  const productPages = Math.ceil(products.length / productsPerPage);
  const totalPages = 2 + productPages;

  const formatPrice = (price?: number) => {
    if (!price) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const generatePDF = async () => {
    if (!pdfRef.current) return;

    setGenerating(true);
    toast.loading('Gerando PDF...', { id: 'pdf-gen' });

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;

      for (let i = 0; i < totalPages; i++) {
        setCurrentPage(i);
        await new Promise((r) => setTimeout(r, 150));

        const canvas = await html2canvas(pdfRef.current, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        if (i > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
      }

      pdf.save(`${config.name || 'catalogo'}.pdf`);
      toast.success('PDF gerado com sucesso!', { id: 'pdf-gen' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF', { id: 'pdf-gen' });
    } finally {
      setGenerating(false);
      setCurrentPage(0);
    }
  };

  const renderCoverPage = () => (
    <div
      className="w-full h-full flex flex-col items-center justify-center p-16 text-center relative"
      style={{
        backgroundColor: coverPage.backgroundColor || config.primaryColor,
        backgroundImage: coverPage.backgroundImage ? `url(${coverPage.backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: config.fontFamily,
      }}
    >
      {coverPage.backgroundImage && (
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/60" />
      )}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {coverPage.logoUrl && (
          <img src={coverPage.logoUrl} alt="Logo" className="h-28 object-contain drop-shadow-lg" />
        )}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-white tracking-tight drop-shadow-lg">
            {coverPage.title || config.name || 'Catálogo'}
          </h1>
          {coverPage.subtitle && (
            <p className="text-xl text-white/80 font-light tracking-wider">{coverPage.subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderProductPage = (pageIndex: number) => {
    const startIdx = pageIndex * productsPerPage;
    const pageProducts = products.slice(startIdx, startIdx + productsPerPage);

    return (
      <div
        className="w-full h-full p-10 bg-white flex flex-col"
        style={{ fontFamily: config.fontFamily }}
      >
        <div
          className={cn(
            "grid gap-5 flex-1 content-start",
            layout === 'grid-2' && "grid-cols-2",
            layout === 'grid-3' && "grid-cols-3",
            layout === 'grid-4' && "grid-cols-4",
            layout === 'list' && "grid-cols-1"
          )}
        >
          {pageProducts.map((product) => (
            <div
              key={product.id}
              className={cn(
                "bg-muted/30 rounded-xl overflow-hidden flex flex-col",
                layout === 'list' && "flex-row items-center"
              )}
            >
              <div
                className={cn(
                  "bg-muted/50 flex items-center justify-center",
                  layout === 'list' ? "w-24 h-24 flex-shrink-0" : "aspect-square"
                )}
              >
                {product.foto_url ? (
                  <img
                    src={product.foto_url}
                    alt={product.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="h-10 w-10 text-muted-foreground/50" />
                )}
              </div>
              <div className={cn("p-4 flex-1", layout === 'list' && "flex flex-col justify-center")}>
                <h3 className="font-semibold text-sm line-clamp-2 mb-1">{product.nome}</h3>
                {config.showCodes && product.codigo && (
                  <p className="text-xs text-muted-foreground mb-1">Cód: {product.codigo}</p>
                )}
                {config.showPrices && product.preco_tabela && (
                  <p
                    className="text-base font-bold"
                    style={{ color: config.primaryColor }}
                  >
                    {formatPrice(product.preco_tabela)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="text-center text-xs text-muted-foreground pt-4 border-t mt-auto">
          Página {pageIndex + 2}
        </div>
      </div>
    );
  };

  const renderBackcoverPage = () => (
    <div
      className="w-full h-full flex flex-col items-center justify-center p-16 text-center"
      style={{
        backgroundColor: backcoverPage.backgroundColor || config.primaryColor,
        fontFamily: config.fontFamily,
      }}
    >
      <div className="flex flex-col items-center gap-10 text-white max-w-md">
        {coverPage.logoUrl && (
          <img src={coverPage.logoUrl} alt="Logo" className="h-24 object-contain drop-shadow-lg opacity-90" />
        )}
        <h2 className="text-3xl font-light tracking-wide">
          {backcoverPage.title || 'Entre em Contato'}
        </h2>
        <div className="w-16 h-px bg-white/30" />
        <div className="space-y-5 text-base">
          {backcoverPage.contactInfo?.phone && (
            <div className="flex items-center gap-4 justify-center text-white/90">
              <Phone className="h-5 w-5" />
              <span>{backcoverPage.contactInfo.phone}</span>
            </div>
          )}
          {backcoverPage.contactInfo?.email && (
            <div className="flex items-center gap-4 justify-center text-white/90">
              <Mail className="h-5 w-5" />
              <span>{backcoverPage.contactInfo.email}</span>
            </div>
          )}
          {backcoverPage.contactInfo?.website && (
            <div className="flex items-center gap-4 justify-center text-white/90">
              <Globe className="h-5 w-5" />
              <span>{backcoverPage.contactInfo.website}</span>
            </div>
          )}
          {backcoverPage.contactInfo?.address && (
            <div className="flex items-center gap-4 justify-center text-white/90">
              <MapPin className="h-5 w-5 flex-shrink-0" />
              <span>{backcoverPage.contactInfo.address}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderCurrentPage = () => {
    if (currentPage === 0) return renderCoverPage();
    if (currentPage === totalPages - 1) return renderBackcoverPage();
    return renderProductPage(currentPage - 1);
  };

  const getPageLabel = () => {
    if (currentPage === 0) return 'Capa';
    if (currentPage === totalPages - 1) return 'Contracapa';
    return `Produtos ${currentPage}/${productPages}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Preview do Catálogo</h3>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="rounded-lg font-normal">
              <FileText className="h-3 w-3 mr-1" />
              {products.length} produtos
            </Badge>
            <Badge variant="secondary" className="rounded-lg font-normal">
              {totalPages} páginas
            </Badge>
          </div>
        </div>
        <Button onClick={generatePDF} disabled={generating} size="lg" className="rounded-xl">
          {generating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Baixar PDF
        </Button>
      </div>

      {/* Main Preview */}
      <div className="rounded-2xl overflow-hidden bg-muted/30 border">
        {/* Navigation */}
        <div className="flex items-center justify-between p-4 bg-muted/50 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0 || generating}
            className="rounded-lg"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <span className="text-sm font-medium">
            {getPageLabel()} <span className="text-muted-foreground">({currentPage + 1}/{totalPages})</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1 || generating}
            className="rounded-lg"
          >
            Próximo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Page View */}
        <div className="flex justify-center p-8 bg-muted/20">
          <div
            ref={pdfRef}
            className="bg-white shadow-2xl rounded-lg overflow-hidden"
            style={{
              width: '210mm',
              height: '297mm',
              maxWidth: '100%',
              aspectRatio: '210/297',
            }}
          >
            {renderCurrentPage()}
          </div>
        </div>
      </div>

      {/* Thumbnails */}
      <ScrollArea className="w-full pb-2">
        <div className="flex gap-3">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              disabled={generating}
              className={cn(
                "flex-shrink-0 w-20 h-28 rounded-xl border-2 overflow-hidden transition-all",
                currentPage === i 
                  ? "border-primary shadow-lg scale-105" 
                  : "border-transparent hover:border-muted-foreground/30"
              )}
            >
              <div 
                className={cn(
                  "w-full h-full flex flex-col items-center justify-center text-xs gap-1",
                  i === 0 || i === totalPages - 1 
                    ? "text-white" 
                    : "bg-muted text-muted-foreground"
                )}
                style={
                  i === 0 || i === totalPages - 1 
                    ? { backgroundColor: config.primaryColor } 
                    : undefined
                }
              >
                {i === 0 ? (
                  <>
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">Capa</span>
                  </>
                ) : i === totalPages - 1 ? (
                  <>
                    <Phone className="h-4 w-4" />
                    <span className="font-medium">Contra</span>
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4" />
                    <span className="font-medium">P{i}</span>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
