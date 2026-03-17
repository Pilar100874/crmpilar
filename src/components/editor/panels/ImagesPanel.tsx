import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useGalleryFolders } from "@/hooks/useGalleryFolders";
import { GalleryFolderTabs } from "@/components/ui/GalleryFolderTabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Upload, ExternalLink, WrapText, Loader2, FolderOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCanvas } from "@/contexts/CanvasContext";
import { FabricImage } from "fabric";
import { toast } from "@/lib/toast-config";
import { applyOffsetWrap } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const ImagesPanel = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("popular");
  const [unsplashImages, setUnsplashImages] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [savedImages, setSavedImages] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { fabricCanvas } = useCanvas();
  const { getFilteredItems, activeFolder, setActiveFolder } = useGalleryFolders();

  const fetchSavedImages = useCallback(async () => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) return;
    setLoadingSaved(true);
    try {
      const { data } = await supabase
        .from('media_gallery')
        .select('*')
        .eq('estabelecimento_id', estabId)
        .in('tipo', ['imagem', 'image', 'gif'])
        .order('created_at', { ascending: false })
        .limit(200);
      setSavedImages(data || []);
    } catch (err) {
      console.error('Erro ao buscar imagens salvas:', err);
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    if (activeCategory === 'saved') {
      fetchSavedImages();
    }
  }, [activeCategory, fetchSavedImages]);

  // Grande biblioteca de imagens HD curadas do Unsplash
  const imageLibrary = {
    popular: [
      { url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800", tags: "montanha paisagem natureza" },
      { url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800", tags: "montanha neve paisagem" },
      { url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800", tags: "natureza verde floresta" },
      { url: "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800", tags: "floresta névoa árvore" },
      { url: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800", tags: "praia oceano pôr do sol" },
      { url: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800", tags: "praia areia mar" },
      { url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800", tags: "natureza campo flores" },
      { url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800", tags: "natureza campo montanha" },
      { url: "https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=800", tags: "cidade urbano noite" },
      { url: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800", tags: "café bebida quente" },
    ],
    nature: [
      { url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800", tags: "floresta natureza árvore verde" },
      { url: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800", tags: "natureza campo flores" },
      { url: "https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=800", tags: "montanha neve inverno" },
      { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800", tags: "montanha paisagem natureza" },
      { url: "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=800", tags: "lago água montanha" },
      { url: "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=800", tags: "natureza campo verde" },
      { url: "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=800", tags: "montanha neve paisagem" },
      { url: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800", tags: "lago reflexo água" },
      { url: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=800", tags: "praia mar oceano" },
      { url: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800", tags: "lago pôr do sol água" },
      { url: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800", tags: "floresta névoa árvore" },
      { url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800", tags: "praia tropical areia" },
      { url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800", tags: "montanha céu natureza" },
      { url: "https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=800", tags: "cachoeira água natureza" },
      { url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800", tags: "campo flores primavera" },
    ],
    food: [
      { url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800", tags: "café bebida quente xícara" },
      { url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800", tags: "café expresso bebida" },
      { url: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=800", tags: "comida prato gourmet" },
      { url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800", tags: "hambúrguer fast food" },
      { url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800", tags: "salada saudável vegetais" },
      { url: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800", tags: "panqueca café da manhã" },
      { url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800", tags: "pizza italiana comida" },
      { url: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800", tags: "salada tigela saudável" },
      { url: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800", tags: "café latte arte" },
      { url: "https://images.unsplash.com/photo-1558818498-28c1e002b655?w=800", tags: "bebida smoothie saudável" },
      { url: "https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=800", tags: "comida japonesa sushi" },
      { url: "https://images.unsplash.com/photo-1481931098730-318b6f776db0?w=800", tags: "chá bebida quente" },
      { url: "https://images.unsplash.com/photo-1497534547324-0ebb3f052e88?w=800", tags: "sobremesa doce bolo" },
      { url: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800", tags: "tacos comida mexicana" },
      { url: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800", tags: "sorvete gelado doce" },
    ],
    business: [
      { url: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800", tags: "escritório negócios trabalho laptop" },
      { url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800", tags: "escritório prédio cidade" },
      { url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800", tags: "reunião negócios trabalho" },
      { url: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800", tags: "equipe trabalho colaboração" },
      { url: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800", tags: "tecnologia código programação" },
      { url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800", tags: "tecnologia laptop trabalho" },
      { url: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800", tags: "negócios reunião escritório" },
      { url: "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800", tags: "escritório moderno trabalho" },
      { url: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800", tags: "startup trabalho equipe" },
      { url: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=800", tags: "conferência evento negócios" },
      { url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800", tags: "notebook trabalho mesa" },
      { url: "https://images.unsplash.com/photo-1542626991-cbc4e32524cc?w=800", tags: "empresário homem negócios" },
      { url: "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800", tags: "empresária mulher negócios" },
      { url: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800", tags: "laptop notebook trabalho" },
      { url: "https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?w=800", tags: "escritório mesa cadeira" },
    ],
    abstract: [
      { url: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800", tags: "abstrato cores pintura" },
      { url: "https://images.unsplash.com/photo-1550859492-d5da9d8e45f3?w=800", tags: "abstrato gradiente cores" },
      { url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800", tags: "arte abstrata moderna" },
      { url: "https://images.unsplash.com/photo-1553356084-58ef4a67b2a7?w=800", tags: "abstrato padrão design" },
      { url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800", tags: "abstrato textura cores" },
      { url: "https://images.unsplash.com/photo-1549317336-206569e8475c?w=800", tags: "abstrato fumaça preto" },
      { url: "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=800", tags: "abstrato líquido cores" },
      { url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800", tags: "abstrato ondas cores" },
      { url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800", tags: "abstrato gradiente azul" },
      { url: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800", tags: "abstrato textura rosa" },
      { url: "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=800", tags: "padrão geométrico abstrato" },
      { url: "https://images.unsplash.com/photo-1561212024-cb9ee82a5e0b?w=800", tags: "abstrato líquido colorido" },
      { url: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=800", tags: "abstrato azul água" },
      { url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800", tags: "abstrato céu cores" },
      { url: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800", tags: "abstrato neon cores" },
    ],
    people: [
      { url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800", tags: "retrato mulher pessoa" },
      { url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800", tags: "retrato mulher sorriso" },
      { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800", tags: "retrato homem pessoa" },
      { url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800", tags: "retrato homem sorriso" },
      { url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800", tags: "retrato mulher jovem" },
      { url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800", tags: "retrato homem jovem" },
      { url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800", tags: "retrato mulher pessoa" },
      { url: "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=800", tags: "retrato mulher profissional" },
      { url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800", tags: "retrato homem profissional" },
      { url: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800", tags: "pessoas grupo amigos" },
      { url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800", tags: "retrato mulher feliz" },
      { url: "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=800", tags: "família pessoas juntos" },
      { url: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=800", tags: "retrato homem barba" },
      { url: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800", tags: "retrato mulher elegante" },
      { url: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800", tags: "retrato homem negócios" },
    ],
    animals: [
      { url: "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=800", tags: "cachorro animal pet" },
      { url: "https://images.unsplash.com/photo-1506755855567-92ff770e8d00?w=800", tags: "gato animal pet" },
      { url: "https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=800", tags: "pássaro animal natureza" },
      { url: "https://images.unsplash.com/photo-1444212477490-ca407925329e?w=800", tags: "cavalo animal campo" },
      { url: "https://images.unsplash.com/photo-1560807707-8cc77767d783?w=800", tags: "cachorro golden retriever" },
      { url: "https://images.unsplash.com/photo-1529778873920-4da4926a72c2?w=800", tags: "gato fofo pet" },
      { url: "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=800", tags: "coelho animal fofo" },
      { url: "https://images.unsplash.com/photo-1520763185298-1b434c919102?w=800", tags: "leão animal selvagem" },
      { url: "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800", tags: "raposa animal natureza" },
      { url: "https://images.unsplash.com/photo-1551717743-49959800b1f6?w=800", tags: "papagaio pássaro cores" },
      { url: "https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?w=800", tags: "cachorro husky pet" },
      { url: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800", tags: "gato persa fofo" },
      { url: "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=800", tags: "borboleta inseto natureza" },
      { url: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800", tags: "elefante animal selvagem" },
      { url: "https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=800", tags: "panda animal fofo" },
    ],
    technology: [
      { url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800", tags: "tecnologia código programação" },
      { url: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800", tags: "laptop computador tecnologia" },
      { url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800", tags: "smartphone telefone tecnologia" },
      { url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800", tags: "matriz código digital" },
      { url: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800", tags: "programação código tela" },
      { url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800", tags: "código desenvolvimento web" },
      { url: "https://images.unsplash.com/photo-1484788984921-03950022c9ef?w=800", tags: "laptop mesa trabalho" },
      { url: "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800", tags: "fone de ouvido áudio tech" },
      { url: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800", tags: "câmera fotografia tecnologia" },
      { url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800", tags: "computador escritório tech" },
      { url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800", tags: "dados análise gráfico" },
      { url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800", tags: "gráfico análise negócios" },
      { url: "https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=800", tags: "computador mesa setup" },
      { url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800", tags: "smartphone app tecnologia" },
      { url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800", tags: "laptop notebook código" },
    ],
  };

  const categories = [
    { id: "saved", label: "📁 Salvas" },
    { id: "popular", label: "Popular" },
    { id: "nature", label: "Natureza" },
    { id: "food", label: "Comida" },
    { id: "business", label: "Negócios" },
    { id: "abstract", label: "Abstrato" },
    { id: "people", label: "Pessoas" },
    { id: "animals", label: "Animais" },
    { id: "technology", label: "Tecnologia" },
  ];

  const searchUnsplash = async (query: string) => {
    if (!query || query.trim().length < 3) {
      setUnsplashImages([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('unsplash-search', {
        body: { query: query.trim(), perPage: 30 }
      });

      if (error) throw error;

      if (data?.images) {
        setUnsplashImages(data.images);
        toast.success(`${data.images.length} imagens encontradas`);
      }
    } catch (error) {
      console.error('Erro ao buscar no Unsplash:', error);
      toast.error('Erro ao buscar imagens');
    } finally {
      setIsSearching(false);
    }
  };

  const filteredImages = useMemo(() => {
    const categoryImages = imageLibrary[activeCategory as keyof typeof imageLibrary] || imageLibrary.popular;
    
    if (searchQuery.length > 2) {
      const query = searchQuery.toLowerCase();
      // Buscar em todas as categorias locais
      const allImages = Object.values(imageLibrary).flat();
      return allImages.filter(img => img.tags.toLowerCase().includes(query));
    }
    
    return categoryImages;
  }, [activeCategory, searchQuery]);

  const addImageToCanvas = (imageUrl: string) => {
    if (!fabricCanvas) return;

    FabricImage.fromURL(imageUrl, {
      crossOrigin: 'anonymous',
    }).then((img) => {
      img.scale(0.5);
      img.set({
        left: 100,
        top: 100,
      });
      fabricCanvas.add(img);
      // NÃO seleciona automaticamente
      fabricCanvas.discardActiveObject();
      fabricCanvas.renderAll();
      toast.success("Imagem adicionada!");
    }).catch(() => {
      toast.error("Erro ao carregar imagem");
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error("Por favor, selecione apenas arquivos de imagem");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setUploadedImages((prev) => [...prev, imageUrl]);
        toast.success("Imagem carregada!");
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full bg-background flex flex-col h-full">
      <div className="px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Imagens HD</h3>
          <a 
            href="https://unsplash.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5"
          >
            Unsplash <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
        
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar imagens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  searchUnsplash(searchQuery);
                }
              }}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Button 
            className="w-full" 
            size="sm"
            onClick={() => searchUnsplash(searchQuery)}
            disabled={isSearching || searchQuery.length < 3}
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Buscar no Unsplash
              </>
            )}
          </Button>
        </div>

        <Button 
          className="w-full" 
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload de Imagens
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      <div className="border-b">
        <div className="grid grid-cols-4 gap-1 p-2">
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={activeCategory === cat.id ? "default" : "ghost"}
              size="sm"
              className="text-xs h-8"
              onClick={() => {
                setActiveCategory(cat.id);
                setSearchQuery("");
              }}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {activeCategory === 'saved' && (
          <div className="px-4 py-3">
            <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
              <FolderOpen className="h-3 w-3" />
              Imagens Salvas ({savedImages.length})
            </h4>
            {loadingSaved ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : savedImages.length > 0 ? (
              <div className="grid grid-cols-3 lg:grid-cols-4 gap-1.5">
                {savedImages.map((img) => (
                  <div
                    key={img.id}
                    className="aspect-square cursor-pointer overflow-hidden rounded border hover:border-primary transition-colors"
                    onClick={() => addImageToCanvas(img.public_url)}
                    title={img.nome}
                  >
                    <img
                      src={img.public_url}
                      alt={img.nome}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-xs">
                Nenhuma imagem salva ainda. Salve imagens no AI Studio para vê-las aqui.
              </div>
            )}
          </div>
        )}
        {unsplashImages.length > 0 && (
          <div className="px-4 py-3">
            <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
              <Search className="h-3 w-3" />
              Unsplash ({unsplashImages.length})
            </h4>
            <div className="grid grid-cols-3 lg:grid-cols-4 gap-1.5">
              {unsplashImages.map((img) => (
                <div
                  key={img.id}
                  className="aspect-square cursor-pointer overflow-hidden rounded border hover:border-primary transition-colors"
                  onClick={() => addImageToCanvas(img.url)}
                >
                  <img
                    src={img.thumb}
                    alt={img.alt}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {uploadedImages.length > 0 && (
          <div className="px-4 py-3 border-t">
            <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
              <Upload className="h-3 w-3" />
              Enviadas ({uploadedImages.length})
            </h4>
            <div className="grid grid-cols-3 lg:grid-cols-4 gap-1.5">
              {uploadedImages.map((url, index) => (
                <div
                  key={`uploaded-${index}`}
                  className="aspect-square rounded overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border"
                  onClick={() => addImageToCanvas(url)}
                >
                  <img
                    src={url}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 py-3 border-t">
          <h4 className="text-xs font-semibold mb-2">
            {searchQuery 
              ? `"${searchQuery}" (${filteredImages.length})` 
              : `${categories.find(c => c.id === activeCategory)?.label}`
            }
          </h4>
          {filteredImages.length > 0 ? (
            <div className="grid grid-cols-3 lg:grid-cols-4 gap-1.5">
              {filteredImages.map((image, index) => (
                <div
                  key={`${activeCategory}-${index}`}
                  className="aspect-square rounded overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border"
                  onClick={() => addImageToCanvas(image.url)}
                >
                  <img
                    src={image.url}
                    alt={image.tags}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-xs">
              Nenhuma imagem
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ImagesPanel;
