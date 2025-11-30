import { supabase } from "@/integrations/supabase/client";
import { BaseMarketplaceService } from "./baseService";

const SUPABASE_URL = "https://ioxugupvxlcdweldocmq.supabase.co";

export class AmericanasService extends BaseMarketplaceService {
  constructor() {
    super("Americanas");
  }

  async conectarConta(contaMarketplaceId: string): Promise<void> {
    console.log(`[${this.marketplaceName}] Iniciando OAuth para conta ${contaMarketplaceId}...`);

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/americanas-auth-start?contaMarketplaceId=${contaMarketplaceId}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao iniciar autenticação");
    }

    const authWindow = window.open(
      data.authUrl,
      "americanas-auth",
      "width=600,height=700,scrollbars=yes"
    );

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        window.removeEventListener("message", messageHandler);
        reject(new Error("Tempo limite excedido. Tente novamente."));
      }, 5 * 60 * 1000);

      const messageHandler = (event: MessageEvent) => {
        if (event.data?.type === "americanas-oauth") {
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

      const checkWindow = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkWindow);
          setTimeout(() => {
            clearTimeout(timeout);
            window.removeEventListener("message", messageHandler);
            resolve();
          }, 2000);
        }
      }, 500);
    });
  }

  async sincronizarProdutos(contaMarketplaceId: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke("americanas-sync", {
      body: { contaMarketplaceId, action: "produtos" },
    });

    if (error) throw new Error(error.message);
    if (data && !data.success) throw new Error(data.error);
  }

  async sincronizarEstoquePrecos(contaMarketplaceId: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke("americanas-sync", {
      body: { contaMarketplaceId, action: "estoque" },
    });

    if (error) throw new Error(error.message);
    if (data && !data.success) throw new Error(data.error);
  }

  async sincronizarPedidos(contaMarketplaceId: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke("americanas-sync", {
      body: { contaMarketplaceId, action: "pedidos" },
    });

    if (error) throw new Error(error.message);
    if (data && !data.success) throw new Error(data.error);
  }
}

export const americanasService = new AmericanasService();
