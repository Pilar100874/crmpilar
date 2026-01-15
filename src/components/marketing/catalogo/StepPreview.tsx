import React, { useRef, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, ChevronLeft, ChevronRight, Package, FileText, Phone, Mail, Globe, MapPin, Layers } from 'lucide-react';
import { CatalogConfig, CatalogPage, CatalogProduct, LAYOUT_OPTIONS, ProductGroup, GroupFieldConfig, PRODUCT_FIELDS } from './types';
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

    const groupMap = new Map<string, { id: string; nome: string; products: CatalogProduct[] }>();
    products.forEach(product => {
      const groupName = product.grupo_nome || 'Outros';
      const groupId = product.grupo_id || `outros_${groupName.replace(/\s+/g, '_').toLowerCase()}`;
      
      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, { id: groupId, nome: groupName, products: [] });
      }
      groupMap.get(groupId)!.products.push(product);
    });

    return Array.from(groupMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
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
        <div 
          className="bg-white flex items-end justify-between"
          style={{ padding: '5mm', paddingTop: '0' }}
        >
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

          {/* Website right - from backcover contactInfo */}
          {backcoverPage.contactInfo?.website && (
            <span 
              className="text-[11px] text-gray-400 tracking-[0.35em] uppercase"
              style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 300 }}
            >
              {backcoverPage.contactInfo.website}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Group Header - Full background image with vertical text (matching reference)
  const renderGroupHeader = (groupName: string) => {
    const group = groupedProducts.find(g => g.nome === groupName);
    const groupImage = group ? groupImages[group.id] : undefined;
    
    return (
      <div
        className="w-full h-full bg-white p-[12mm] relative overflow-hidden"
        style={{ fontFamily: config.fontFamily }}
      >
        {/* Image container with white border */}
        <div className="relative w-full h-full overflow-hidden">
          {/* Background Image */}
          {groupImage ? (
            <img 
              src={groupImage} 
              alt={groupName} 
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div 
              className="absolute inset-0"
              style={{ backgroundColor: '#6b7280' }}
            />
          )}

          {/* Vertical Text on Left Side - Full Height */}
          <div 
            className="absolute top-0 bottom-0 flex items-stretch"
            style={{ width: '120px', left: '19px' }}
          >
            <h2 
              className="text-white w-full h-full flex items-center justify-center"
              style={{ 
                writingMode: 'vertical-rl', 
                textOrientation: 'mixed',
                transform: 'rotate(180deg)',
                fontFamily: 'Helvetica Neue, Arial, sans-serif',
              }}
            >
              <span 
                className="whitespace-nowrap"
                style={{ 
                  fontSize: '140px',
                  fontWeight: 300, 
                  color: 'rgba(255,255,255,0.85)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  marginBottom: '20px'
                }}
              >
                Linha
              </span>
              <span 
                className="whitespace-nowrap"
                style={{ 
                  fontSize: '140px',
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  marginTop: '6px',
                  lineHeight: 1
                }}
              >
                {groupName}
              </span>
            </h2>
          </div>

          {/* Small descriptive text on right side */}
          <div 
            className="absolute right-4 bottom-1/3 max-w-[100px] text-right"
          >
            <p 
              className="text-white/70 leading-relaxed"
              style={{ 
                fontFamily: 'Helvetica Neue, Arial, sans-serif', 
                fontWeight: 300,
                fontSize: '7px',
                letterSpacing: '0.02em'
              }}
            >
              {group?.products.length || 0} produtos disponíveis nesta categoria
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Helper to get selected fields for a group, organized by category
  const getGroupFieldsByCategory = (groupName?: string): Record<string, string[]> => {
    const selectedFields = getGroupFields(groupName);
    
    const fieldsByCategory: Record<string, string[]> = {
      'Dados Básicos': [],
      'Dados do Frete': [],
      'Embalagem': [],
    };
    
    PRODUCT_FIELDS.forEach(field => {
      if (selectedFields.includes(field.key)) {
        fieldsByCategory[field.category].push(field.key);
      }
    });
    
    return fieldsByCategory;
  };

  // Helper to get selected fields for a group
  const getGroupFields = (groupName?: string): string[] => {
    if (!groupName || !config.groupFieldConfigs) return ['codigo', 'descricao'];
    
    // Find group by name
    const group = groupedProducts.find(g => g.nome === groupName);
    if (!group) return ['codigo', 'descricao'];
    
    const fieldConfig = config.groupFieldConfigs.find(c => c.groupId === group.id);
    return fieldConfig?.selectedFields || ['codigo', 'descricao'];
  };

  // Helper to get field label
  const getFieldLabel = (key: string): string => {
    const field = PRODUCT_FIELDS.find(f => f.key === key);
    return field?.label || key;
  };

  // Helper to format field value
  const formatFieldValue = (product: CatalogProduct, key: string): string => {
    const value = (product as any)[key];
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (typeof value === 'number') {
      if (key.includes('preco') || key.includes('valor')) {
        return `R$ ${value.toFixed(2)}`;
      }
      return value.toString();
    }
    return String(value);
  };

  // Product Page - Reference design: clean header with "Linha + GroupName", dynamic columns
  const renderProductPage = (pageProducts: typeof products, groupName?: string, pageNumber?: number) => {
    const displayGroupName = groupName || 'Produtos';
    const selectedFields = getGroupFields(groupName);
    const fieldsByCategory = getGroupFieldsByCategory(groupName);
    
    // Check which categories have fields selected
    const hasBasicFields = fieldsByCategory['Dados Básicos'].length > 0;
    const hasFreteFields = fieldsByCategory['Dados do Frete'].length > 0;
    const hasEmbalagemFields = fieldsByCategory['Embalagem'].length > 0;
    
    return (
      <div
        className="w-full h-full flex flex-col bg-white relative overflow-hidden p-[12mm]"
        style={{ fontFamily: config.fontFamily }}
      >
        {/* Header Section */}
        <div className="mb-6">
          <h2 className="text-5xl leading-tight">
            <span 
              className="font-light text-gray-600"
              style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}
            >
              Linha{' '}
            </span>
            <span 
              className="font-bold text-gray-900"
              style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}
            >
              {displayGroupName}
            </span>
          </h2>
        </div>

        {/* Products Grid - Dynamic columns based on layout */}
        <div className="flex-1">
          <div className={cn(
            "grid h-full content-start",
            layout === 'list' && "grid-cols-1 gap-y-3",
            layout === 'grid-2' && "grid-cols-2 gap-x-6 gap-y-6",
            layout === 'grid-3' && "grid-cols-3 gap-x-5 gap-y-5",
            layout === 'grid-4' && "grid-cols-4 gap-x-4 gap-y-4"
          )}>
            {pageProducts.map((product, idx) => (
              <div
                key={product.id}
                className={cn(
                  "flex",
                  layout === 'list' ? "flex-row items-start gap-4 p-3 bg-gray-50 rounded" : "flex-col"
                )}
              >
                {/* Product Image Container */}
                <div className={cn(
                  "relative bg-gray-50 flex items-center justify-center overflow-hidden",
                  layout === 'list' ? "w-20 h-20 flex-shrink-0" : "aspect-square"
                )}>
                  {product.foto_url ? (
                    <img
                      src={product.foto_url}
                      alt={product.nome}
                      className="w-[85%] h-[85%] object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className={cn(
                        "text-gray-300",
                        layout === 'list' ? "h-8 w-8" : "h-10 w-10"
                      )} />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className={cn(
                  "flex-1 min-w-0",
                  layout === 'list' ? "" : "pt-2"
                )}>
                  {/* Product Name - Always shown */}
                  <h4 className={cn(
                    "font-semibold text-gray-800 line-clamp-1",
                    layout === 'list' ? "text-sm" : layout === 'grid-2' ? "text-[11px]" : "text-[9px]"
                  )}>
                    {product.nome}
                  </h4>
                  
                  {/* Dados Básicos Section */}
                  {hasBasicFields && (
                    <div className="mt-1">
                      {layout === 'list' && (
                        <p className="text-[8px] font-semibold text-gray-500 uppercase tracking-wide">Dados Básicos</p>
                      )}
                      <div className={cn(
                        "text-gray-500",
                        layout === 'list' ? "text-xs" : "text-[7px]"
                      )}>
                        {fieldsByCategory['Dados Básicos'].map((fieldKey, i) => {
                          const value = formatFieldValue(product, fieldKey);
                          if (value === '-') return null;
                          return (
                            <span key={fieldKey}>
                              {layout === 'list' && <span className="text-gray-400">{getFieldLabel(fieldKey)}: </span>}
                              {value}
                              {i < fieldsByCategory['Dados Básicos'].length - 1 && ' • '}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Dados do Frete Section */}
                  {hasFreteFields && (
                    <div className="mt-1">
                      {layout === 'list' && (
                        <p className="text-[8px] font-semibold text-gray-500 uppercase tracking-wide">Dados do Frete</p>
                      )}
                      <div className={cn(
                        "text-gray-500",
                        layout === 'list' ? "text-xs" : "text-[7px]"
                      )}>
                        {fieldsByCategory['Dados do Frete'].map((fieldKey, i) => {
                          const value = formatFieldValue(product, fieldKey);
                          if (value === '-') return null;
                          return (
                            <span key={fieldKey}>
                              {layout === 'list' && <span className="text-gray-400">{getFieldLabel(fieldKey)}: </span>}
                              {value}
                              {i < fieldsByCategory['Dados do Frete'].length - 1 && ' • '}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Embalagem Section */}
                  {hasEmbalagemFields && (
                    <div className="mt-1">
                      {layout === 'list' && (
                        <p className="text-[8px] font-semibold text-gray-500 uppercase tracking-wide">Embalagem</p>
                      )}
                      <div className={cn(
                        "text-gray-500",
                        layout === 'list' ? "text-xs" : "text-[7px]"
                      )}>
                        {fieldsByCategory['Embalagem'].map((fieldKey, i) => {
                          const value = formatFieldValue(product, fieldKey);
                          if (value === '-') return null;
                          return (
                            <span key={fieldKey}>
                              {layout === 'list' && <span className="text-gray-400">{getFieldLabel(fieldKey)}: </span>}
                              {value}
                              {i < fieldsByCategory['Embalagem'].length - 1 && ' • '}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer with page number */}
        <div className="flex items-center justify-end pt-4">
          <span className="text-[10px] text-gray-400">
            {String(pageNumber || 1).padStart(2, '0')}
          </span>
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
