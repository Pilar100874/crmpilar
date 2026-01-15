import React, { useRef, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, ChevronLeft, ChevronRight, Package, FileText, Phone, Mail, Globe, MapPin, Layers } from 'lucide-react';
import { CatalogConfig, CatalogPage, CatalogProduct, LAYOUT_OPTIONS, ProductGroup } from './types';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

interface StepPreviewProps {
  config: CatalogConfig;
  coverPage: CatalogPage;
  productsPage: CatalogPage;
  backcoverPage: CatalogPage;
  groupImages?: Record<string, string>;
}

interface PageInfo {
  type: 'cover' | 'group-header' | 'products' | 'backcover';
  groupName?: string;
  products?: CatalogProduct[];
  startIdx?: number;
  pageNumber?: number;
}

export const StepPreview: React.FC<StepPreviewProps> = ({
  config,
  coverPage,
  productsPage,
  backcoverPage,
  groupImages = {},
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [generating, setGenerating] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const products = productsPage.products || [];
  const layout = productsPage.layout || 'grid-3';
  const layoutConfig = LAYOUT_OPTIONS.find((l) => l.value === layout) || LAYOUT_OPTIONS[1];
  const productsPerPage = layout === 'list' ? 4 : layoutConfig.cols * 2;
  const groupByCategory = productsPage.groupByCategory ?? true;

  // Group products
  const groupedProducts = useMemo((): ProductGroup[] => {
    if (!groupByCategory) {
      return [{ id: 'all', nome: 'Todos os Produtos', products }];
    }

    const groupMap = new Map<string, typeof products>();
    products.forEach(product => {
      const groupName = product.grupo_nome || 'Outros';
      const groupId = product.grupo_id || 'outros';
      const key = `${groupId}__${groupName}`;
      
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(product);
    });

    return Array.from(groupMap.entries()).map(([key, prods]) => {
      const [id, nome] = key.split('__');
      return { id, nome, products: prods };
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [products, groupByCategory]);

  // Build pages array
  const pages = useMemo((): PageInfo[] => {
    const result: PageInfo[] = [{ type: 'cover', pageNumber: 1 }];
    let pageNum = 2;

    groupedProducts.forEach(group => {
      if (groupByCategory && groupedProducts.length > 1) {
        result.push({ type: 'group-header', groupName: group.nome, pageNumber: pageNum++ });
      }
      
      const totalProductPages = Math.ceil(group.products.length / productsPerPage);
      for (let i = 0; i < totalProductPages; i++) {
        result.push({
          type: 'products',
          groupName: group.nome,
          products: group.products.slice(i * productsPerPage, (i + 1) * productsPerPage),
          startIdx: i * productsPerPage,
          pageNumber: pageNum++,
        });
      }
    });

    result.push({ type: 'backcover', pageNumber: pageNum });
    return result;
  }, [groupedProducts, productsPerPage, groupByCategory]);

  const totalPages = pages.length;
  const currentYear = new Date().getFullYear();

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
        await new Promise((r) => setTimeout(r, 200));

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

  // Cover Page - Exactly matching reference design
  const renderCoverPage = () => {
    // Debug log
    console.log('[StepPreview] Rendering cover page, backgroundImage:', coverPage.backgroundImage ? `${coverPage.backgroundImage.substring(0, 50)}...` : 'none');
    
    return (
      <div
        className="w-full h-full flex flex-col relative overflow-hidden bg-white"
      >
        {/* Top White Header Section */}
        <div className="bg-white px-8 pt-28 pb-0 text-center">
          <h1 
            className="text-5xl text-gray-900 tracking-[0.15em] uppercase"
            style={{ fontFamily: 'Times New Roman, Times, serif', fontWeight: 700 }}
          >
            {coverPage.title || config.name || 'CATALOG'}
          </h1>
          {coverPage.subtitle && (
            <p 
              className="text-[11px] text-gray-400 tracking-[0.35em] uppercase mt-4"
              style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 300 }}
            >
              {coverPage.subtitle}
            </p>
          )}
          {/* Year with decorative lines */}
          <div className="flex items-center justify-center gap-4 mt-5">
            <div className="w-14 h-px bg-gray-400" />
            <span 
              className="text-base text-gray-600 tracking-[0.2em]"
              style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 300 }}
            >
              {currentYear}
            </span>
            <div className="w-14 h-px bg-gray-400" />
          </div>
        </div>

        {/* Main Image Area: 5mm sides, 1cm (10mm) from texts above, 4cm (40mm) from bottom */}
        <div 
          className="relative overflow-hidden bg-gray-200"
          style={{ 
            margin: '10mm 5mm 40mm 5mm',
            flex: 1,
            minHeight: 0
          }}
        >
          {coverPage.backgroundImage ? (
            <img 
              key={`cover-bg-${coverPage.backgroundImage.length}`}
              src={coverPage.backgroundImage}
              alt="Cover"
              className="absolute top-0 left-0 w-full h-full object-cover object-top"
              onError={(e) => {
                console.error('[StepPreview] Failed to load background image');
                e.currentTarget.style.display = 'none';
              }}
              onLoad={() => {
                console.log('[StepPreview] Background image loaded successfully');
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
              <span className="text-gray-500 text-sm">Sem imagem de fundo</span>
            </div>
          )}
        </div>

        {/* Bottom Footer Section */}
        <div className="bg-white px-6 py-4 flex items-center justify-between">
          {/* Logo bottom left - 3x3 cm */}
          <div className="flex items-center">
            {coverPage.logoUrl ? (
              <img 
                key={coverPage.logoUrl.substring(0, 100)}
                src={coverPage.logoUrl} 
                alt="Logo" 
                style={{ width: '30mm', height: '30mm', objectFit: 'contain' }}
              />
            ) : (
              <div 
                className="border border-gray-300 rounded flex items-center justify-center"
                style={{ width: '30mm', height: '30mm' }}
              >
                <span className="text-[8px] text-gray-400 uppercase">Logo</span>
              </div>
            )}
          </div>

          {/* Website right */}
          <span 
            className="text-2xl text-gray-500 tracking-wider"
            style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 300 }}
          >
            www.pilar.com.br
          </span>
        </div>
      </div>
    );
  };

  // Group Header - Split design with image and text (matching reference)
  const renderGroupHeader = (groupName: string) => {
    const group = groupedProducts.find(g => g.nome === groupName);
    const groupImage = group ? groupImages[group.id] : undefined;

    return (
      <div
        className="w-full h-full flex relative overflow-hidden"
        style={{ fontFamily: config.fontFamily }}
      >
        {/* Left side - Dark with vertical text */}
        <div 
          className="w-[35%] flex flex-col justify-center items-center relative"
          style={{ backgroundColor: '#2a2a2a' }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <h2 
              className="text-5xl text-white tracking-wide"
              style={{ 
                writingMode: 'vertical-rl', 
                textOrientation: 'mixed',
                transform: 'rotate(180deg)',
                fontFamily: 'Georgia, serif'
              }}
            >
              <span className="font-light italic text-white/70">{groupName.split(' ')[0]}</span>
              {groupName.split(' ').length > 1 && (
                <span className="font-bold ml-2">{groupName.split(' ').slice(1).join(' ')}</span>
              )}
            </h2>
          </div>
        </div>

        {/* Right side - AI Generated Image or Product showcase */}
        <div className="w-[65%] relative">
          {groupImage ? (
            <img 
              src={groupImage} 
              alt={groupName} 
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div 
              className="w-full h-full flex items-center justify-center p-8"
              style={{ backgroundColor: '#f5f5f5' }}
            >
              <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                {group?.products.slice(0, 4).map((product, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "aspect-square rounded-xl overflow-hidden shadow-lg",
                      i === 0 && "col-span-2"
                    )}
                  >
                    {product.foto_url ? (
                      <img src={product.foto_url} alt={product.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <Package className="h-10 w-10 text-gray-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Product Page - Reference design following the image: gold accent, clean header, product grid
  const renderProductPage = (pageProducts: typeof products, groupName?: string, pageNumber?: number) => {
    const displayGroupName = groupName || 'NEW';
    
    return (
      <div
        className="w-full h-full flex flex-col bg-white relative overflow-hidden"
        style={{ fontFamily: config.fontFamily }}
      >
        {/* Left gold accent bar */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-[12%]"
          style={{ 
            background: `linear-gradient(180deg, ${config.primaryColor || '#C9A961'} 0%, ${config.primaryColor || '#C9A961'}dd 100%)`
          }}
        />

        {/* Main content area */}
        <div className="relative z-10 flex-1 flex flex-col ml-[12%]">
          {/* Header Section with Group Title */}
          <div className="px-6 pt-8 pb-4">
            {/* Group Title - Large and prominent */}
            <h2 className="text-2xl leading-tight">
              <span 
                className="font-light uppercase text-gray-800 tracking-wide"
                style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}
              >
                {displayGroupName.toUpperCase()}
              </span>
              <br />
              <span 
                className="font-bold uppercase text-gray-900 text-3xl tracking-tight"
                style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}
              >
                COLLECTION
              </span>
            </h2>
            
            {/* Description text */}
            <p className="mt-3 text-[9px] text-gray-500 leading-relaxed max-w-[95%]">
              Lorem ipsum dolor sit amet, cons ectetur adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nost rud exerci tation ullamcorper.
            </p>
          </div>

          {/* Products Grid */}
          <div className="flex-1 px-6 pb-4 pt-2">
            <div
              className={cn(
                "grid gap-x-4 gap-y-6 h-full content-start",
                layout === 'grid-2' && "grid-cols-2",
                layout === 'grid-3' && "grid-cols-3",
                layout === 'grid-4' && "grid-cols-4",
                layout === 'list' && "grid-cols-1"
              )}
            >
              {pageProducts.map((product, idx) => (
                <div
                  key={product.id}
                  className={cn(
                    "flex flex-col",
                    layout === 'list' && "flex-row items-center gap-6 p-4 bg-gray-50 rounded-xl"
                  )}
                >
                  {/* Product Image - Clean with shadow */}
                  <div
                    className={cn(
                      "relative overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center",
                      layout === 'list' ? "w-24 h-24 flex-shrink-0 rounded-lg" : "aspect-[4/5] rounded-sm"
                    )}
                    style={{ 
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                    }}
                  >
                    {product.foto_url ? (
                      <img
                        src={product.foto_url}
                        alt={product.nome}
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Product Info - Following reference design */}
                  <div className={cn("pt-3 space-y-1", layout === 'list' && "pt-0 flex-1")}>
                    {/* Product Name with icon */}
                    <div className="flex items-center gap-1.5">
                      <svg 
                        className="h-3 w-3 flex-shrink-0" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                        style={{ color: config.primaryColor || '#C9A961' }}
                      >
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <path d="M16 10a4 4 0 0 1-8 0" />
                      </svg>
                      <h4 className="font-semibold text-[11px] text-gray-800 line-clamp-1">
                        {product.nome}
                      </h4>
                    </div>
                    
                    {/* Price - Gold/Yellow color like reference */}
                    {config.showPrices && product.preco_tabela ? (
                      <p 
                        className="text-base font-bold"
                        style={{ color: config.primaryColor || '#C9A961' }}
                      >
                        {formatPrice(product.preco_tabela)}
                      </p>
                    ) : (
                      <p 
                        className="text-base font-bold"
                        style={{ color: config.primaryColor || '#C9A961' }}
                      >
                        Consulte
                      </p>
                    )}
                    
                    {/* Product description or code */}
                    <p className="text-[8px] text-gray-400 leading-relaxed line-clamp-3">
                      {product.descricao || (config.showCodes && product.codigo ? `Ref: ${product.codigo}` : 'Produto de alta qualidade desenvolvido para atender às suas necessidades.')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
            {coverPage.logoUrl && (
              <img src={coverPage.logoUrl} alt="Logo" className="h-5 object-contain opacity-50" />
            )}
            <span className="text-[10px] text-gray-400">
              {String(pageNumber || 1).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Back Cover - Clean contact page
  const renderBackcoverPage = () => (
    <div
      className="w-full h-full flex relative overflow-hidden"
      style={{ fontFamily: config.fontFamily }}
    >
      {/* Background */}
      {backcoverPage.backgroundImage ? (
        <>
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${backcoverPage.backgroundImage})` }}
          />
          <div className="absolute inset-0 bg-black/60" />
        </>
      ) : (
        <div 
          className="absolute inset-0"
          style={{ backgroundColor: backcoverPage.backgroundColor || '#1a1a1a' }}
        />
      )}

      {/* Left Side - Decorative */}
      <div className="relative z-10 w-1/2 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-5xl font-light text-white/20 uppercase tracking-widest">
            <span className="font-serif italic block">{currentYear}</span>
          </h2>
          <div className="mt-8">
            {coverPage.logoUrl && (
              <img src={coverPage.logoUrl} alt="Logo" className="h-16 object-contain mx-auto opacity-80" />
            )}
          </div>
        </div>
      </div>

      {/* Right Side - Contact Info */}
      <div className="relative z-10 w-1/2 flex flex-col justify-center p-12 bg-white/5 backdrop-blur-sm">
        <div className="space-y-8">
          <div className="space-y-2">
            <h3 className="text-3xl font-light text-white">
              <span className="font-serif italic text-white/60">Product</span>
              {' '}
              <span className="font-bold uppercase">CATALOG</span>
            </h3>
            <div className="w-16 h-0.5 bg-white/30" />
          </div>

          <div className="space-y-4">
            <p className="text-sm text-white/60 uppercase tracking-wider">
              {backcoverPage.title || 'Contact us'}
            </p>
            
            <div className="space-y-3">
              {backcoverPage.contactInfo?.phone && (
                <div className="flex items-center gap-3 text-white/80">
                  <Phone className="h-4 w-4 text-white/40" />
                  <span className="text-sm">{backcoverPage.contactInfo.phone}</span>
                </div>
              )}
              {backcoverPage.contactInfo?.email && (
                <div className="flex items-center gap-3 text-white/80">
                  <Mail className="h-4 w-4 text-white/40" />
                  <span className="text-sm">{backcoverPage.contactInfo.email}</span>
                </div>
              )}
              {backcoverPage.contactInfo?.website && (
                <div className="flex items-center gap-3 text-white/80">
                  <Globe className="h-4 w-4 text-white/40" />
                  <span className="text-sm">{backcoverPage.contactInfo.website}</span>
                </div>
              )}
              {backcoverPage.contactInfo?.address && (
                <div className="flex items-start gap-3 text-white/80">
                  <MapPin className="h-4 w-4 text-white/40 mt-0.5" />
                  <span className="text-sm">{backcoverPage.contactInfo.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCurrentPage = () => {
    const pageInfo = pages[currentPage];
    
    switch (pageInfo.type) {
      case 'cover':
        return renderCoverPage();
      case 'group-header':
        return renderGroupHeader(pageInfo.groupName!);
      case 'products':
        return renderProductPage(pageInfo.products!, pageInfo.groupName, pageInfo.pageNumber);
      case 'backcover':
        return renderBackcoverPage();
      default:
        return null;
    }
  };

  const getPageLabel = () => {
    const pageInfo = pages[currentPage];
    switch (pageInfo.type) {
      case 'cover': return 'Capa';
      case 'group-header': return `Seção: ${pageInfo.groupName}`;
      case 'products': return pageInfo.groupName || 'Produtos';
      case 'backcover': return 'Contracapa';
      default: return '';
    }
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
              <Layers className="h-3 w-3 mr-1" />
              {groupedProducts.length} grupo{groupedProducts.length !== 1 ? 's' : ''}
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
          {pages.map((pageInfo, i) => (
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
                  "w-full h-full flex flex-col items-center justify-center text-xs gap-1 p-1",
                  (pageInfo.type === 'cover' || pageInfo.type === 'backcover' || pageInfo.type === 'group-header')
                    ? "text-white bg-gray-900" 
                    : "bg-white text-gray-600 border"
                )}
              >
                {pageInfo.type === 'cover' ? (
                  <>
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">Capa</span>
                  </>
                ) : pageInfo.type === 'backcover' ? (
                  <>
                    <Phone className="h-4 w-4" />
                    <span className="font-medium">Contra</span>
                  </>
                ) : pageInfo.type === 'group-header' ? (
                  <>
                    <Layers className="h-4 w-4" />
                    <span className="font-medium text-center line-clamp-2">{pageInfo.groupName}</span>
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4" />
                    <span className="font-medium text-center line-clamp-2">{pageInfo.groupName}</span>
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
