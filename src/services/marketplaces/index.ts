import { mercadoLivreService } from "./mercadoLivreService";
import { shopeeService } from "./shopeeService";
import { amazonService } from "./amazonService";
import { magaluService } from "./magaluService";
import { googleMerchantService } from "./googleMerchantService";
import { americanasService } from "./americanasService";
import { carrefourService } from "./carrefourService";
import { casasBahiaService } from "./casasBahiaService";
import { olxService } from "./olxService";
import { whatsappCommerceService } from "./whatsappCommerceService";
import { IMarketplaceService } from "./types";

export * from "./types";

// Mapa de serviços por nome do marketplace
const serviceMap: Record<string, IMarketplaceService> = {
  mercado_livre: mercadoLivreService,
  shopee: shopeeService,
  amazon: amazonService,
  magalu: magaluService,
  google_merchant: googleMerchantService,
  americanas: americanasService,
  carrefour: carrefourService,
  casas_bahia: casasBahiaService,
  olx: olxService,
  whatsapp_commerce: whatsappCommerceService,
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
  americanasService,
  carrefourService,
  casasBahiaService,
  olxService,
  whatsappCommerceService,
};
