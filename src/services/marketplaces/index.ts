import { mercadoLivreService } from "./mercadoLivreService";
import { shopeeService } from "./shopeeService";
import { amazonService } from "./amazonService";
import { magaluService } from "./magaluService";
import { googleMerchantService } from "./googleMerchantService";
import { IMarketplaceService } from "./types";

export * from "./types";

// Mapa de serviços por nome do marketplace
const serviceMap: Record<string, IMarketplaceService> = {
  mercado_livre: mercadoLivreService,
  shopee: shopeeService,
  amazon: amazonService,
  magalu: magaluService,
  google_merchant: googleMerchantService,
};

export function getMarketplaceService(marketplaceNome: string): IMarketplaceService | null {
  return serviceMap[marketplaceNome] || null;
}

export {
  mercadoLivreService,
  shopeeService,
  amazonService,
  magaluService,
  googleMerchantService,
};
