import { supabase } from "@/integrations/supabase/client";
import { BaseMarketplaceService } from "./baseService";

const SUPABASE_URL = "https://ioxugupvxlcdweldocmq.supabase.co";

export class MercadoLivreService extends BaseMarketplaceService {
  constructor() {
    super("Mercado Livre");
  }

  /**
   * Inicia o fluxo OAuth do Mercado Livre
   */
  async conectarConta(contaMarketplaceId: string): Promise<void> {
    console.log(`[${this.marketplaceName}] Iniciando OAuth para conta ${contaMarketplaceId}...`);

    // Chamar edge function para obter URL de autorização
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/mercadolivre-auth-start?contaMarketplaceId=${contaMarketplaceId}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao iniciar autenticação");
    }

    // Abrir janela de autorização
    const authWindow = window.open(
      data.authUrl,
      "mercadolivre-auth",
      "width=600,height=700,scrollbars=yes"
    );

    // Listener para mensagem de retorno
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        window.removeEventListener("message", messageHandler);
        reject(new Error("Tempo limite excedido. Tente novamente."));
      }, 5 * 60 * 1000); // 5 minutos

      const messageHandler = (event: MessageEvent) => {
        if (event.data?.type === "mercadolivre-oauth") {
          clearTimeout(timeout);
          window.removeEventListener("message", messageHandler);
          
          if (event.data.success) {
            resolve();
          } else {
            reject(new Error(event.data.message || "Erro na autorização"));
          }
        }
      };

      window.addEventListener("message", messageHandler);

      // Verificar periodicamente se a janela foi fechada
      const checkWindow = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkWindow);
          // Dar um tempo para a mensagem chegar antes de resolver
          setTimeout(() => {
            clearTimeout(timeout);
            window.removeEventListener("message", messageHandler);
            resolve(); // Resolve mesmo se fechou - pode ter sido sucesso
          }, 2000);
        }
      }, 500);
    });
  }

  /**
   * Sincroniza produtos do Mercado Livre
   */
  async sincronizarProdutos(contaMarketplaceId: string): Promise<void> {
    console.log(`[${this.marketplaceName}] Sincronizando produtos para conta ${contaMarketplaceId}...`);

    const { data, error } = await supabase.functions.invoke("mercadolivre-sync", {
      body: { contaMarketplaceId, action: "produtos" },
    });

    if (error) {
      throw new Error(error.message || "Erro ao sincronizar produtos");
    }

    if (data && !data.success) {
      throw new Error(data.error || "Falha na sincronização de produtos");
    }

    console.log(`[${this.marketplaceName}] Produtos sincronizados: ${data?.synced || 0}/${data?.total || 0}`);
  }

  /**
   * Sincroniza estoque e preços com o Mercado Livre
   */
  async sincronizarEstoquePrecos(contaMarketplaceId: string): Promise<void> {
    console.log(`[${this.marketplaceName}] Sincronizando estoque/preços para conta ${contaMarketplaceId}...`);

    const { data, error } = await supabase.functions.invoke("mercadolivre-sync", {
      body: { contaMarketplaceId, action: "estoque" },
    });

    if (error) {
      throw new Error(error.message || "Erro ao sincronizar estoque/preços");
    }

    if (data && !data.success) {
      throw new Error(data.error || "Falha na sincronização de estoque/preços");
    }

    console.log(`[${this.marketplaceName}] Estoque/preços sincronizados: ${data?.synced || 0}/${data?.total || 0}`);
  }

  /**
   * Sincroniza pedidos do Mercado Livre
   */
  async sincronizarPedidos(contaMarketplaceId: string): Promise<void> {
    console.log(`[${this.marketplaceName}] Sincronizando pedidos para conta ${contaMarketplaceId}...`);

    const { data, error } = await supabase.functions.invoke("mercadolivre-sync", {
      body: { contaMarketplaceId, action: "pedidos" },
    });

    if (error) {
      throw new Error(error.message || "Erro ao sincronizar pedidos");
    }

    if (data && !data.success) {
      throw new Error(data.error || "Falha na sincronização de pedidos");
    }

    console.log(`[${this.marketplaceName}] Pedidos sincronizados: ${data?.synced || 0}/${data?.total || 0}`);
  }
}

export const mercadoLivreService = new MercadoLivreService();
