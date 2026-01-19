import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Diretórios públicos brasileiros para scraping
const DIRETORIOS = {
  telelistas: {
    nome: 'TeleListas',
    getSearchUrl: (termo: string, cidade: string, uf: string) => 
      `https://www.telelistas.net/busca/${encodeURIComponent(termo)}/${uf.toLowerCase()}/${encodeURIComponent(cidade.toLowerCase().replace(/ /g, '-'))}`,
  },
  guiamais: {
    nome: 'Guia Mais',
    getSearchUrl: (termo: string, cidade: string, uf: string) =>
      `https://www.guiamais.com.br/encontre/${encodeURIComponent(termo.replace(/ /g, '-'))}/${encodeURIComponent(cidade.toLowerCase().replace(/ /g, '-'))}-${uf.toLowerCase()}`,
  },
  apontador: {
    nome: 'Apontador',
    getSearchUrl: (termo: string, cidade: string, uf: string) =>
      `https://www.apontador.com.br/local/${uf.toLowerCase()}/${encodeURIComponent(cidade.toLowerCase().replace(/ /g, '_'))}/busca/${encodeURIComponent(termo.replace(/ /g, '-'))}`,
  }
};

// Padrões regex para extrair informações
const PATTERNS = {
  telefone: /(?:\+55\s?)?(?:\(?\d{2}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}/g,
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  cep: /\d{5}-?\d{3}/g,
};

// Função para limpar HTML e extrair texto
function cleanHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Função para extrair empresas do HTML usando padrões comuns
function extractBusinesses(html: string, source: string): any[] {
  const businesses: any[] = [];
  const text = cleanHtml(html);
  
  // Extrair todos os telefones e emails do texto
  const telefones = text.match(PATTERNS.telefone) || [];
  const emails = text.match(PATTERNS.email) || [];
  
  // Tentar extrair blocos de empresas baseado em padrões comuns
  // Padrão: Nome seguido de endereço e telefone
  
  // Dividir por possíveis separadores de listagem
  const blocks = html.split(/class="[^"]*(?:card|item|result|business|listing)[^"]*"/gi);
  
  for (const block of blocks) {
    if (block.length < 50 || block.length > 5000) continue;
    
    const blockText = cleanHtml(block);
    const blockTelefones = blockText.match(PATTERNS.telefone) || [];
    const blockEmails = blockText.match(PATTERNS.email) || [];
    
    if (blockTelefones.length > 0 || blockEmails.length > 0) {
      // Tentar extrair nome (geralmente em h2, h3, strong, ou link)
      const nomeMatch = block.match(/<(?:h[1-4]|strong|a)[^>]*>([^<]{3,100})<\/(?:h[1-4]|strong|a)>/i);
      const nome = nomeMatch ? cleanHtml(nomeMatch[1]) : null;
      
      // Tentar extrair endereço
      const enderecoMatch = block.match(/(?:endereço|address|rua|av\.|avenida)[:\s]*([^<]{10,200})/i);
      const endereco = enderecoMatch ? cleanHtml(enderecoMatch[1]) : null;
      
      if (nome && nome.length > 2 && nome.length < 100) {
        businesses.push({
          nome: nome.trim(),
          telefone: blockTelefones[0] || null,
          email: blockEmails[0] || null,
          endereco: endereco?.trim() || null,
          fonte: source
        });
      }
    }
  }
  
  return businesses;
}

// Função para fazer fetch com retry e timeout
async function fetchWithRetry(url: string, retries = 2): Promise<string | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return await response.text();
      }
      
      console.log(`Fetch failed for ${url}: ${response.status}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`Fetch error for ${url}: ${errorMessage}`);
      if (i === retries) return null;
      await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
    }
  }
  return null;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { termo, cidade, uf, limit = 50 } = await req.json();

    if (!termo || !cidade || !uf) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Parâmetros obrigatórios: termo, cidade, uf' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Iniciando scraping direto: ${termo} em ${cidade}/${uf}`);
    
    const allBusinesses: any[] = [];
    const errors: string[] = [];
    const sourcesConsulted: string[] = [];

    // Consultar cada diretório
    for (const [key, diretorio] of Object.entries(DIRETORIOS)) {
      try {
        const url = diretorio.getSearchUrl(termo, cidade, uf);
        console.log(`Consultando ${diretorio.nome}: ${url}`);
        sourcesConsulted.push(diretorio.nome);
        
        const html = await fetchWithRetry(url);
        
        if (html) {
          const businesses = extractBusinesses(html, diretorio.nome);
          console.log(`${diretorio.nome}: ${businesses.length} empresas encontradas`);
          allBusinesses.push(...businesses);
        } else {
          errors.push(`${diretorio.nome}: Não foi possível acessar`);
        }
      } catch (error: unknown) {
        console.error(`Erro em ${diretorio.nome}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${diretorio.nome}: ${errorMessage}`);
      }
    }

    // Remover duplicatas baseado no nome normalizado
    const seen = new Set<string>();
    const uniqueBusinesses = allBusinesses.filter(b => {
      const key = b.nome.toLowerCase().replace(/\s+/g, '').substring(0, 30);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Limitar resultados
    const limitedResults = uniqueBusinesses.slice(0, limit);

    console.log(`Scraping direto concluído: ${limitedResults.length} empresas únicas`);

    return new Response(
      JSON.stringify({
        success: true,
        empresas: limitedResults,
        total: limitedResults.length,
        fontes_consultadas: sourcesConsulted,
        erros: errors.length > 0 ? errors : undefined,
        aviso: 'Scraping direto pode ter resultados limitados. Para melhores resultados, considere usar Firecrawl ou Google Places.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Erro no scraping direto:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno no scraping';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
