// Configuração global do ActiveReportsJS
// Este arquivo configura o idioma padrão para português

export function configureActiveReportsLocale() {
  if (typeof window !== 'undefined') {
    try {
      // Tentar configurar o locale como pt-BR
      // O pacote @grapecity/activereports-localization deve incluir suporte
      // @ts-ignore
      if (window.GC?.ActiveReports?.Core) {
        // @ts-ignore
        const Core = window.GC.ActiveReports.Core;
        
        // Configurar locale para português ou inglês como fallback
        if (Core.setCurrentCulture) {
          try {
            Core.setCurrentCulture('pt-BR');
            console.log('ActiveReports locale set to pt-BR');
          } catch (e) {
            console.log('pt-BR locale not available, trying pt');
            try {
              Core.setCurrentCulture('pt');
            } catch (e2) {
              console.log('Portuguese locale not available, using default');
            }
          }
        }
      }
    } catch (error) {
      console.log('Could not configure ActiveReports locale:', error);
    }
  }
}

// Executar configuração quando o módulo for carregado
if (typeof window !== 'undefined') {
  // Aguardar o DOM e os scripts estarem prontos
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(configureActiveReportsLocale, 100);
    });
  } else {
    setTimeout(configureActiveReportsLocale, 100);
  }
}
