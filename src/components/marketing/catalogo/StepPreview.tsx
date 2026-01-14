import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, Loader2, ChevronLeft, ChevronRight, Package } from 'lucide-react';
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
  const totalPages = 2 + productPages; // cover + products + backcover

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

      // Generate each page
      for (let i = 0; i < totalPages; i++) {
        setCurrentPage(i);
        await new Promise((r) => setTimeout(r, 100)); // Wait for render

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
      className="w-full h-full flex flex-col items-center justify-center p-12 text-center relative"
      style={{
        backgroundColor: coverPage.backgroundColor || config.primaryColor,
        backgroundImage: coverPage.backgroundImage ? `url(${coverPage.backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: config.fontFamily,
      }}
    >
      {coverPage.backgroundImage && (
        <div className="absolute inset-0 bg-black/40" />
      )}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {coverPage.logoUrl && (
          <img src={coverPage.logoUrl} alt="Logo" className="h-24 object-contain" />
        )}
        <h1 className="text-4xl font-bold text-white drop-shadow-lg">
          {coverPage.title || config.name || 'Catálogo de Produtos'}
        </h1>
        {coverPage.subtitle && (
          <p className="text-xl text-white/90">{coverPage.subtitle}</p>
        )}
      </div>
    </div>
  );

  const renderProductPage = (pageIndex: number) => {
    const startIdx = pageIndex * productsPerPage;
    const pageProducts = products.slice(startIdx, startIdx + productsPerPage);

    return (
      <div
        className="w-full h-full p-8 bg-white"
        style={{ fontFamily: config.fontFamily }}
      >
        <div
          className={cn(
            "grid gap-4 h-full",
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
                "border rounded-lg overflow-hidden flex flex-col",
                layout === 'list' && "flex-row"
              )}
            >
              <div
                className={cn(
                  "bg-muted flex items-center justify-center",
                  layout === 'list' ? "w-24 h-24" : "aspect-square"
                )}
              >
                {product.foto_url ? (
                  <img
                    src={product.foto_url}
                    alt={product.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className={cn("p-3 flex-1", layout === 'list' && "flex flex-col justify-center")}>
                <h3 className="font-medium text-sm line-clamp-2">{product.nome}</h3>
                {config.showCodes && product.codigo && (
                  <p className="text-xs text-muted-foreground mt-1">Cód: {product.codigo}</p>
                )}
                {config.showPrices && product.preco_tabela && (
                  <p
                    className="text-sm font-bold mt-1"
                    style={{ color: config.primaryColor }}
                  >
                    {formatPrice(product.preco_tabela)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="absolute bottom-4 right-4 text-xs text-muted-foreground">
          Página {pageIndex + 2}
        </div>
      </div>
    );
  };

  const renderBackcoverPage = () => (
    <div
      className="w-full h-full flex flex-col items-center justify-center p-12 text-center"
      style={{
        backgroundColor: backcoverPage.backgroundColor || config.primaryColor,
        fontFamily: config.fontFamily,
      }}
    >
      <div className="flex flex-col items-center gap-8 text-white">
        {coverPage.logoUrl && (
          <img src={coverPage.logoUrl} alt="Logo" className="h-20 object-contain" />
        )}
        <h2 className="text-2xl font-bold">
          {backcoverPage.title || 'Entre em Contato'}
        </h2>
        <div className="space-y-4 text-lg">
          {backcoverPage.contactInfo?.phone && (
            <p>📞 {backcoverPage.contactInfo.phone}</p>
          )}
          {backcoverPage.contactInfo?.email && (
            <p>✉️ {backcoverPage.contactInfo.email}</p>
          )}
          {backcoverPage.contactInfo?.website && (
            <p>🌐 {backcoverPage.contactInfo.website}</p>
          )}
          {backcoverPage.contactInfo?.address && (
            <p>📍 {backcoverPage.contactInfo.address}</p>
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
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {products.length} produtos
          </Badge>
          <Badge variant="outline">
            {totalPages} páginas
          </Badge>
        </div>
        <Button onClick={generatePDF} disabled={generating}>
          {generating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Baixar PDF
        </Button>
      </div>

      {/* Preview */}
      <div className="border rounded-lg overflow-hidden bg-muted/30">
        <div className="flex items-center justify-between p-2 bg-muted border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0 || generating}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {getPageLabel()} ({currentPage + 1}/{totalPages})
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1 || generating}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex justify-center p-4 bg-muted/50">
          <div
            ref={pdfRef}
            className="bg-white shadow-lg overflow-hidden relative"
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

      {/* Page Thumbnails */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              className={cn(
                "flex-shrink-0 w-16 h-20 border rounded overflow-hidden transition-all",
                currentPage === i && "ring-2 ring-primary"
              )}
            >
              <div className="w-full h-full bg-muted flex items-center justify-center text-xs">
                {i === 0 ? 'Capa' : i === totalPages - 1 ? 'Contra' : `P${i}`}
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
