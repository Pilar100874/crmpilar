import { ScrollArea } from "@/components/ui/scroll-area";
import { useCanvas } from "@/contexts/CanvasContext";
import { Textbox } from "fabric";
import { toast } from "sonner";

interface TextTemplate {
  id: string;
  name: string;
  title: {
    fontFamily: string;
    fontSize: number;
    fontWeight: string | number;
    fill: string;
    text: string;
  };
  subtitle: {
    fontFamily: string;
    fontSize: number;
    fontWeight: string | number;
    fill: string;
    text: string;
  };
  body: {
    fontFamily: string;
    fontSize: number;
    fontWeight: string | number;
    fill: string;
    text: string;
  };
  textAlign: string;
  lineHeight: number;
  charSpacing: number;
}

const TextTemplatesPanel = () => {
  const { fabricCanvas } = useCanvas();

  const textTemplates: TextTemplate[] = [
    {
      id: "heading-bold",
      name: "Título Grande",
      title: { fontFamily: "Montserrat", fontSize: 72, fontWeight: "bold", fill: "#000000", text: "TÍTULO PRINCIPAL" },
      subtitle: { fontFamily: "Montserrat", fontSize: 42, fontWeight: 600, fill: "#4A4A4A", text: "Subtítulo complementar" },
      body: { fontFamily: "Inter", fontSize: 24, fontWeight: "normal", fill: "#666666", text: "Texto descritivo ou informação adicional." },
      textAlign: "center", lineHeight: 1.3, charSpacing: -20,
    },
    {
      id: "heading-elegant",
      name: "Título Elegante",
      title: { fontFamily: "Playfair Display", fontSize: 64, fontWeight: "bold", fill: "#2C2C2C", text: "Título Elegante" },
      subtitle: { fontFamily: "Raleway", fontSize: 36, fontWeight: 300, fill: "#555555", text: "Subtítulo refinado" },
      body: { fontFamily: "Georgia", fontSize: 20, fontWeight: "normal", fill: "#666666", text: "Descrição elegante e sofisticada." },
      textAlign: "center", lineHeight: 1.4, charSpacing: 50,
    },
    {
      id: "modern-minimal",
      name: "Moderno Minimalista",
      title: { fontFamily: "Poppins", fontSize: 56, fontWeight: 600, fill: "#1A1A1A", text: "Design Moderno" },
      subtitle: { fontFamily: "Poppins", fontSize: 32, fontWeight: "normal", fill: "#666666", text: "Simples e direto" },
      body: { fontFamily: "Inter", fontSize: 18, fontWeight: "normal", fill: "#888888", text: "Conteúdo minimalista com foco." },
      textAlign: "left", lineHeight: 1.5, charSpacing: 0,
    },
    {
      id: "retro-bold",
      name: "Retro Negrito",
      title: { fontFamily: "Bebas Neue", fontSize: 80, fontWeight: "normal", fill: "#FF6B6B", text: "RETRO STYLE" },
      subtitle: { fontFamily: "Oswald", fontSize: 40, fontWeight: "bold", fill: "#4ECDC4", text: "Anos 80 e 90" },
      body: { fontFamily: "Arial", fontSize: 22, fontWeight: "normal", fill: "#333333", text: "Inspirado nos estilos vibrantes." },
      textAlign: "center", lineHeight: 1.2, charSpacing: 100,
    },
    {
      id: "corporate-clean",
      name: "Corporativo Limpo",
      title: { fontFamily: "Roboto", fontSize: 60, fontWeight: "bold", fill: "#2D3748", text: "Solução Profissional" },
      subtitle: { fontFamily: "Roboto", fontSize: 34, fontWeight: 400, fill: "#4A5568", text: "Para seu negócio" },
      body: { fontFamily: "Open Sans", fontSize: 20, fontWeight: "normal", fill: "#718096", text: "Apresentação clara e objetiva." },
      textAlign: "left", lineHeight: 1.5, charSpacing: 0,
    },
    {
      id: "creative-fun",
      name: "Criativo Divertido",
      title: { fontFamily: "Pacifico", fontSize: 68, fontWeight: "normal", fill: "#9B59B6", text: "Seja Criativo!" },
      subtitle: { fontFamily: "Dancing Script", fontSize: 44, fontWeight: "normal", fill: "#E74C3C", text: "Deixe sua marca" },
      body: { fontFamily: "Comic Sans MS", fontSize: 24, fontWeight: "normal", fill: "#3498DB", text: "Expressão livre e descontraída." },
      textAlign: "center", lineHeight: 1.4, charSpacing: 0,
    },
    {
      id: "luxury-gold",
      name: "Luxo Dourado",
      title: { fontFamily: "Cinzel", fontSize: 58, fontWeight: "bold", fill: "#D4AF37", text: "EXCLUSIVO" },
      subtitle: { fontFamily: "Cormorant Garamond", fontSize: 38, fontWeight: 600, fill: "#8B7355", text: "Sofisticação Premium" },
      body: { fontFamily: "Crimson Text", fontSize: 22, fontWeight: "normal", fill: "#5A5A5A", text: "Para quem busca distinção." },
      textAlign: "center", lineHeight: 1.4, charSpacing: 80,
    },
    {
      id: "tech-future",
      name: "Tech Futurista",
      title: { fontFamily: "Orbitron", fontSize: 64, fontWeight: "bold", fill: "#00FF88", text: "TECNOLOGIA" },
      subtitle: { fontFamily: "Rajdhani", fontSize: 36, fontWeight: 600, fill: "#00CCFF", text: "Inovação Digital" },
      body: { fontFamily: "Share Tech", fontSize: 20, fontWeight: "normal", fill: "#AAAAAA", text: "O futuro está aqui." },
      textAlign: "left", lineHeight: 1.3, charSpacing: 50,
    },
    {
      id: "handwritten-casual",
      name: "Manuscrito Casual",
      title: { fontFamily: "Permanent Marker", fontSize: 62, fontWeight: "normal", fill: "#FF5733", text: "Feito à Mão" },
      subtitle: { fontFamily: "Indie Flower", fontSize: 40, fontWeight: "normal", fill: "#C70039", text: "Toque pessoal" },
      body: { fontFamily: "Caveat", fontSize: 26, fontWeight: "normal", fill: "#900C3F", text: "Autenticidade e charme." },
      textAlign: "center", lineHeight: 1.5, charSpacing: 0,
    },
    {
      id: "bold-impact",
      name: "Impacto Ousado",
      title: { fontFamily: "Impact", fontSize: 78, fontWeight: "normal", fill: "#FF0000", text: "GRANDE IMPACTO" },
      subtitle: { fontFamily: "Anton", fontSize: 44, fontWeight: "normal", fill: "#CC0000", text: "Mensagem Forte" },
      body: { fontFamily: "Teko", fontSize: 24, fontWeight: "normal", fill: "#990000", text: "Impossível de ignorar." },
      textAlign: "center", lineHeight: 1.2, charSpacing: 120,
    },
    {
      id: "serif-classic",
      name: "Serifado Clássico",
      title: { fontFamily: "Merriweather", fontSize: 54, fontWeight: "bold", fill: "#1C1C1C", text: "Tradição & Classe" },
      subtitle: { fontFamily: "Lora", fontSize: 32, fontWeight: 600, fill: "#3C3C3C", text: "Estilo atemporal" },
      body: { fontFamily: "PT Serif", fontSize: 19, fontWeight: "normal", fill: "#5C5C5C", text: "Elegância que perdura." },
      textAlign: "left", lineHeight: 1.6, charSpacing: 0,
    },
    {
      id: "neon-vibrant",
      name: "Neon Vibrante",
      title: { fontFamily: "Righteous", fontSize: 70, fontWeight: "normal", fill: "#FF00FF", text: "NEON LIGHTS" },
      subtitle: { fontFamily: "Audiowide", fontSize: 40, fontWeight: "normal", fill: "#00FFFF", text: "Brilho Intenso" },
      body: { fontFamily: "Electrolize", fontSize: 22, fontWeight: "normal", fill: "#FFFF00", text: "Energia pura em cada palavra." },
      textAlign: "center", lineHeight: 1.3, charSpacing: 60,
    },
    {
      id: "vintage-retro",
      name: "Vintage Retrô",
      title: { fontFamily: "Abril Fatface", fontSize: 66, fontWeight: "normal", fill: "#8B4513", text: "Vintage Style" },
      subtitle: { fontFamily: "Libre Baskerville", fontSize: 36, fontWeight: 600, fill: "#A0522D", text: "Charme Antigo" },
      body: { fontFamily: "Cardo", fontSize: 21, fontWeight: "normal", fill: "#D2691E", text: "Nostalgia refinada." },
      textAlign: "center", lineHeight: 1.5, charSpacing: 40,
    },
    {
      id: "minimal-swiss",
      name: "Minimalismo Suíço",
      title: { fontFamily: "Helvetica", fontSize: 52, fontWeight: "bold", fill: "#000000", text: "PRECISÃO" },
      subtitle: { fontFamily: "Arial", fontSize: 30, fontWeight: "normal", fill: "#333333", text: "Design Funcional" },
      body: { fontFamily: "Roboto", fontSize: 18, fontWeight: "normal", fill: "#666666", text: "Menos é mais." },
      textAlign: "left", lineHeight: 1.6, charSpacing: 0,
    },
    {
      id: "gothic-dark",
      name: "Gótico Sombrio",
      title: { fontFamily: "UnifrakturMaguntia", fontSize: 60, fontWeight: "normal", fill: "#1A0000", text: "Mistério" },
      subtitle: { fontFamily: "Pirata One", fontSize: 38, fontWeight: "normal", fill: "#330000", text: "Atmosfera Dark" },
      body: { fontFamily: "Crimson Text", fontSize: 20, fontWeight: "normal", fill: "#4D0000", text: "Profundidade e drama." },
      textAlign: "center", lineHeight: 1.4, charSpacing: 30,
    },
    {
      id: "art-deco",
      name: "Art Déco",
      title: { fontFamily: "Poiret One", fontSize: 64, fontWeight: "normal", fill: "#FFD700", text: "GLAMOUR 1920" },
      subtitle: { fontFamily: "Julius Sans One", fontSize: 36, fontWeight: "normal", fill: "#DAA520", text: "Elegância Geométrica" },
      body: { fontFamily: "Philosopher", fontSize: 21, fontWeight: "normal", fill: "#B8860B", text: "Luxo e geometria." },
      textAlign: "center", lineHeight: 1.3, charSpacing: 70,
    },
    {
      id: "brush-script",
      name: "Pincelada Script",
      title: { fontFamily: "Brush Script MT", fontSize: 68, fontWeight: "normal", fill: "#FF1493", text: "Arte em Movimento" },
      subtitle: { fontFamily: "Satisfy", fontSize: 42, fontWeight: "normal", fill: "#C71585", text: "Fluidez Criativa" },
      body: { fontFamily: "Kalam", fontSize: 24, fontWeight: "normal", fill: "#8B008B", text: "Expressão artística livre." },
      textAlign: "center", lineHeight: 1.4, charSpacing: 0,
    },
    {
      id: "geometric-modern",
      name: "Geométrico Moderno",
      title: { fontFamily: "Exo 2", fontSize: 58, fontWeight: "bold", fill: "#FF6347", text: "GEOMETRIA" },
      subtitle: { fontFamily: "Saira", fontSize: 34, fontWeight: 600, fill: "#FF4500", text: "Formas Precisas" },
      body: { fontFamily: "Barlow", fontSize: 19, fontWeight: "normal", fill: "#DC143C", text: "Design estruturado." },
      textAlign: "left", lineHeight: 1.5, charSpacing: 20,
    },
    {
      id: "editorial-magazine",
      name: "Editorial Revista",
      title: { fontFamily: "DM Serif Display", fontSize: 62, fontWeight: "normal", fill: "#2F4F4F", text: "HEADLINE NEWS" },
      subtitle: { fontFamily: "Source Serif Pro", fontSize: 36, fontWeight: 600, fill: "#696969", text: "Estilo Jornalístico" },
      body: { fontFamily: "IBM Plex Serif", fontSize: 20, fontWeight: "normal", fill: "#808080", text: "Informação com elegância." },
      textAlign: "left", lineHeight: 1.6, charSpacing: 0,
    },
    {
      id: "playful-kids",
      name: "Infantil Divertido",
      title: { fontFamily: "Fredoka One", fontSize: 66, fontWeight: "normal", fill: "#FF69B4", text: "Super Legal!" },
      subtitle: { fontFamily: "Bubblegum Sans", fontSize: 40, fontWeight: "normal", fill: "#FFB6C1", text: "Diversão garantida" },
      body: { fontFamily: "Schoolbell", fontSize: 23, fontWeight: "normal", fill: "#FFC0CB", text: "Para todas as idades." },
      textAlign: "center", lineHeight: 1.4, charSpacing: 0,
    },
    {
      id: "steampunk-industrial",
      name: "Steampunk Industrial",
      title: { fontFamily: "Metal Mania", fontSize: 64, fontWeight: "normal", fill: "#8B4000", text: "STEAM POWER" },
      subtitle: { fontFamily: "Special Elite", fontSize: 36, fontWeight: "normal", fill: "#A0522D", text: "Era Vitoriana" },
      body: { fontFamily: "Courier Prime", fontSize: 20, fontWeight: "normal", fill: "#CD853F", text: "Mecânica e vapor." },
      textAlign: "center", lineHeight: 1.3, charSpacing: 50,
    },
    {
      id: "elegant-wedding",
      name: "Casamento Elegante",
      title: { fontFamily: "Great Vibes", fontSize: 70, fontWeight: "normal", fill: "#FFE4E1", text: "Para Sempre" },
      subtitle: { fontFamily: "Italianno", fontSize: 44, fontWeight: "normal", fill: "#FFC0CB", text: "Celebração do Amor" },
      body: { fontFamily: "Cormorant", fontSize: 22, fontWeight: "normal", fill: "#FFB6C1", text: "Um momento especial." },
      textAlign: "center", lineHeight: 1.5, charSpacing: 30,
    },
    {
      id: "sports-dynamic",
      name: "Esportivo Dinâmico",
      title: { fontFamily: "Alfa Slab One", fontSize: 72, fontWeight: "normal", fill: "#FF4500", text: "AÇÃO!" },
      subtitle: { fontFamily: "Teko", fontSize: 42, fontWeight: "bold", fill: "#FF6347", text: "Energia Máxima" },
      body: { fontFamily: "Saira Condensed", fontSize: 24, fontWeight: "normal", fill: "#FF7F50", text: "Velocidade e força." },
      textAlign: "center", lineHeight: 1.2, charSpacing: 100,
    },
    {
      id: "nature-organic",
      name: "Natural Orgânico",
      title: { fontFamily: "Amatic SC", fontSize: 68, fontWeight: "bold", fill: "#228B22", text: "NATUREZA" },
      subtitle: { fontFamily: "Patrick Hand", fontSize: 40, fontWeight: "normal", fill: "#32CD32", text: "Vida Sustentável" },
      body: { fontFamily: "Architects Daughter", fontSize: 23, fontWeight: "normal", fill: "#90EE90", text: "Em harmonia com a Terra." },
      textAlign: "center", lineHeight: 1.5, charSpacing: 0,
    },
    {
      id: "business-formal",
      name: "Negócios Formal",
      title: { fontFamily: "Roboto Slab", fontSize: 56, fontWeight: "bold", fill: "#191970", text: "ESTRATÉGIA" },
      subtitle: { fontFamily: "Noto Sans", fontSize: 32, fontWeight: 600, fill: "#4169E1", text: "Resultados Concretos" },
      body: { fontFamily: "Source Sans Pro", fontSize: 19, fontWeight: "normal", fill: "#6495ED", text: "Excelência corporativa." },
      textAlign: "left", lineHeight: 1.6, charSpacing: 0,
    },
    {
      id: "grunge-rebel",
      name: "Grunge Rebelde",
      title: { fontFamily: "Rock Salt", fontSize: 60, fontWeight: "normal", fill: "#2F2F2F", text: "REBEL SPIRIT" },
      subtitle: { fontFamily: "Covered By Your Grace", fontSize: 38, fontWeight: "normal", fill: "#4F4F4F", text: "Atitude Underground" },
      body: { fontFamily: "Shadows Into Light", fontSize: 22, fontWeight: "normal", fill: "#696969", text: "Contra o sistema." },
      textAlign: "left", lineHeight: 1.4, charSpacing: 0,
    },
    {
      id: "romantic-soft",
      name: "Romântico Suave",
      title: { fontFamily: "Allura", fontSize: 66, fontWeight: "normal", fill: "#DB7093", text: "Romance" },
      subtitle: { fontFamily: "Tangerine", fontSize: 46, fontWeight: "normal", fill: "#C71585", text: "Delicadeza & Amor" },
      body: { fontFamily: "Quicksand", fontSize: 21, fontWeight: "normal", fill: "#FF69B4", text: "Ternura em cada detalhe." },
      textAlign: "center", lineHeight: 1.5, charSpacing: 20,
    },
    {
      id: "science-tech",
      name: "Ciência & Tech",
      title: { fontFamily: "Share Tech Mono", fontSize: 54, fontWeight: "normal", fill: "#00CED1", text: "INNOVATION LAB" },
      subtitle: { fontFamily: "Iceland", fontSize: 34, fontWeight: "normal", fill: "#20B2AA", text: "Pesquisa Avançada" },
      body: { fontFamily: "Chakra Petch", fontSize: 19, fontWeight: "normal", fill: "#48D1CC", text: "Ciência e descoberta." },
      textAlign: "left", lineHeight: 1.5, charSpacing: 40,
    },
    {
      id: "urban-street",
      name: "Urbano Street",
      title: { fontFamily: "Bangers", fontSize: 74, fontWeight: "normal", fill: "#FF8C00", text: "STREET STYLE" },
      subtitle: { fontFamily: "Staatliches", fontSize: 42, fontWeight: "normal", fill: "#FFA500", text: "Cultura de Rua" },
      body: { fontFamily: "Barlow Condensed", fontSize: 23, fontWeight: "normal", fill: "#FFD700", text: "Urbano e autêntico." },
      textAlign: "center", lineHeight: 1.3, charSpacing: 80,
    },
    {
      id: "zen-minimal",
      name: "Zen Minimalista",
      title: { fontFamily: "Zen Antique", fontSize: 58, fontWeight: "normal", fill: "#8FBC8F", text: "Tranquilidade" },
      subtitle: { fontFamily: "Zen Kaku Gothic New", fontSize: 34, fontWeight: 300, fill: "#9ACD32", text: "Equilíbrio Interior" },
      body: { fontFamily: "Noto Serif JP", fontSize: 20, fontWeight: "normal", fill: "#6B8E23", text: "Paz e harmonia." },
      textAlign: "center", lineHeight: 1.6, charSpacing: 0,
    },
    {
      id: "festival-party",
      name: "Festival Party",
      title: { fontFamily: "Shrikhand", fontSize: 68, fontWeight: "normal", fill: "#FF1493", text: "FESTA!" },
      subtitle: { fontFamily: "Lilita One", fontSize: 40, fontWeight: "normal", fill: "#FF69B4", text: "Celebração Total" },
      body: { fontFamily: "Varela Round", fontSize: 23, fontWeight: "normal", fill: "#FFB6C1", text: "Alegria contagiante." },
      textAlign: "center", lineHeight: 1.3, charSpacing: 50,
    },
    {
      id: "travel-adventure",
      name: "Viagem Aventura",
      title: { fontFamily: "Yellowtail", fontSize: 64, fontWeight: "normal", fill: "#4682B4", text: "Explorar o Mundo" },
      subtitle: { fontFamily: "Courgette", fontSize: 38, fontWeight: "normal", fill: "#5F9EA0", text: "Novas Descobertas" },
      body: { fontFamily: "Alike", fontSize: 21, fontWeight: "normal", fill: "#708090", text: "Cada viagem é uma história." },
      textAlign: "center", lineHeight: 1.5, charSpacing: 20,
    },
    {
      id: "food-gourmet",
      name: "Food Gourmet",
      title: { fontFamily: "Lobster Two", fontSize: 62, fontWeight: "bold", fill: "#8B0000", text: "Sabores" },
      subtitle: { fontFamily: "Marck Script", fontSize: 40, fontWeight: "normal", fill: "#A52A2A", text: "Experiência Gastronômica" },
      body: { fontFamily: "Caudex", fontSize: 22, fontWeight: "normal", fill: "#CD5C5C", text: "Arte culinária refinada." },
      textAlign: "center", lineHeight: 1.4, charSpacing: 30,
    },
    {
      id: "cosmic-space",
      name: "Cósmico Espacial",
      title: { fontFamily: "Audiowide", fontSize: 66, fontWeight: "normal", fill: "#9370DB", text: "COSMOS" },
      subtitle: { fontFamily: "Orbitron", fontSize: 38, fontWeight: 600, fill: "#8A2BE2", text: "Além das Estrelas" },
      body: { fontFamily: "Exo", fontSize: 21, fontWeight: "normal", fill: "#9932CC", text: "Infinito e misterioso." },
      textAlign: "center", lineHeight: 1.4, charSpacing: 60,
    },
    {
      id: "fashion-chic",
      name: "Fashion Chic",
      title: { fontFamily: "Oswald", fontSize: 60, fontWeight: 600, fill: "#000000", text: "VOGUE" },
      subtitle: { fontFamily: "Montserrat", fontSize: 36, fontWeight: 300, fill: "#333333", text: "Alta Costura" },
      body: { fontFamily: "Raleway", fontSize: 20, fontWeight: "normal", fill: "#666666", text: "Estilo é eterno." },
      textAlign: "left", lineHeight: 1.5, charSpacing: 100,
    },
    {
      id: "music-rhythm",
      name: "Música Ritmo",
      title: { fontFamily: "Righteous", fontSize: 70, fontWeight: "normal", fill: "#FF00FF", text: "MÚSICA" },
      subtitle: { fontFamily: "Bungee", fontSize: 40, fontWeight: "normal", fill: "#DA70D6", text: "Batida & Melodia" },
      body: { fontFamily: "Ubuntu", fontSize: 22, fontWeight: "normal", fill: "#EE82EE", text: "Sinta o ritmo." },
      textAlign: "center", lineHeight: 1.3, charSpacing: 70,
    },
    {
      id: "fitness-health",
      name: "Fitness Saúde",
      title: { fontFamily: "Bebas Neue", fontSize: 72, fontWeight: "normal", fill: "#FF4500", text: "FIT LIFE" },
      subtitle: { fontFamily: "Oswald", fontSize: 40, fontWeight: 600, fill: "#FF6347", text: "Corpo & Mente" },
      body: { fontFamily: "Lato", fontSize: 21, fontWeight: "normal", fill: "#FF7F50", text: "Seu melhor você." },
      textAlign: "center", lineHeight: 1.3, charSpacing: 90,
    },
    {
      id: "education-academic",
      name: "Educação Acadêmica",
      title: { fontFamily: "EB Garamond", fontSize: 56, fontWeight: "bold", fill: "#2F4F4F", text: "CONHECIMENTO" },
      subtitle: { fontFamily: "Spectral", fontSize: 34, fontWeight: 600, fill: "#556B2F", text: "Aprendizado Contínuo" },
      body: { fontFamily: "Vollkorn", fontSize: 20, fontWeight: "normal", fill: "#6B8E23", text: "Educação transforma." },
      textAlign: "left", lineHeight: 1.6, charSpacing: 0,
    },
    {
      id: "baby-sweet",
      name: "Bebê Doce",
      title: { fontFamily: "Chewy", fontSize: 64, fontWeight: "normal", fill: "#FFB6C1", text: "Baby Love" },
      subtitle: { fontFamily: "Gloria Hallelujah", fontSize: 38, fontWeight: "normal", fill: "#FFC0CB", text: "Momento Especial" },
      body: { fontFamily: "Gochi Hand", fontSize: 22, fontWeight: "normal", fill: "#FFE4E1", text: "Ternura infinita." },
      textAlign: "center", lineHeight: 1.5, charSpacing: 0,
    },
  ];

  const loadGoogleFont = async (fontFamily: string) => {
    const fontId = `gf-${fontFamily.replace(/\s+/g, "-").toLowerCase()}`;
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, "+")}:wght@300;400;600;700&display=swap`;
      document.head.appendChild(link);
      
      try {
        await (document as any).fonts.load(`1rem "${fontFamily}"`);
      } catch (e) {
        console.error("Font load error:", e);
      }
    }
  };

  const addTextTemplate = async (template: TextTemplate) => {
    if (!fabricCanvas) {
      toast.error("Canvas não está pronto");
      return;
    }

    try {
      // Carregar todas as fontes necessárias
      await Promise.all([
        loadGoogleFont(template.title.fontFamily),
        loadGoogleFont(template.subtitle.fontFamily),
        loadGoogleFont(template.body.fontFamily),
      ]);

      const centerX = fabricCanvas.width! / 2;
      const startY = fabricCanvas.height! / 2 - 100;

      // Adicionar título
      const titleText = new Textbox(template.title.text, {
        left: centerX,
        top: startY,
        fontFamily: template.title.fontFamily,
        fontSize: template.title.fontSize,
        fontWeight: template.title.fontWeight as any,
        fill: template.title.fill,
        textAlign: template.textAlign as any,
        lineHeight: template.lineHeight,
        charSpacing: template.charSpacing,
        originX: 'center',
        originY: 'top',
        width: 600,
      });

      // Adicionar subtítulo
      const subtitleText = new Textbox(template.subtitle.text, {
        left: centerX,
        top: startY + template.title.fontSize + 20,
        fontFamily: template.subtitle.fontFamily,
        fontSize: template.subtitle.fontSize,
        fontWeight: template.subtitle.fontWeight as any,
        fill: template.subtitle.fill,
        textAlign: template.textAlign as any,
        lineHeight: template.lineHeight,
        charSpacing: template.charSpacing / 2,
        originX: 'center',
        originY: 'top',
        width: 500,
      });

      // Adicionar corpo de texto
      const bodyText = new Textbox(template.body.text, {
        left: centerX,
        top: startY + template.title.fontSize + template.subtitle.fontSize + 50,
        fontFamily: template.body.fontFamily,
        fontSize: template.body.fontSize,
        fontWeight: template.body.fontWeight as any,
        fill: template.body.fill,
        textAlign: template.textAlign as any,
        lineHeight: template.lineHeight + 0.2,
        charSpacing: 0,
        originX: 'center',
        originY: 'top',
        width: 450,
      });

      fabricCanvas.add(titleText, subtitleText, bodyText);
      fabricCanvas.renderAll();
      
      toast.success(`Modelo "${template.name}" adicionado!`);
    } catch (error) {
      console.error("Error adding text template:", error);
      toast.error("Erro ao adicionar modelo de texto");
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Modelos de Texto</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Escolha um estilo de texto profissional
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {textTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => addTextTemplate(template)}
              className="group relative bg-card hover:bg-accent border border-border rounded-lg p-4 text-left transition-all hover:shadow-md overflow-hidden"
              style={{ minHeight: "100px" }}
            >
              <div className="mb-2">
                <h3 className="font-medium text-sm text-foreground">
                  {template.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  3 elementos de texto
                </p>
              </div>
              
              <div className="space-y-1">
                <div 
                  className="text-center transition-transform group-hover:scale-105"
                  style={{
                    fontFamily: template.title.fontFamily,
                    fontSize: "16px",
                    fontWeight: template.title.fontWeight,
                    color: template.title.fill,
                  }}
                >
                  Título
                </div>
                <div 
                  className="text-center"
                  style={{
                    fontFamily: template.subtitle.fontFamily,
                    fontSize: "11px",
                    fontWeight: template.subtitle.fontWeight,
                    color: template.subtitle.fill,
                  }}
                >
                  Subtítulo
                </div>
                <div 
                  className="text-center"
                  style={{
                    fontFamily: template.body.fontFamily,
                    fontSize: "9px",
                    fontWeight: template.body.fontWeight,
                    color: template.body.fill,
                  }}
                >
                  Texto descritivo
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default TextTemplatesPanel;