import { supabase } from "@/integrations/supabase/client";
import { IMarketplaceService } from "./types";

export abstract class BaseMarketplaceService implements IMarketplaceService {
  protected marketplaceName: string;

  constructor(marketplaceName: string) {
    this.marketplaceName = marketplaceName;
  }

  protected async getEstabelecimentoId(): Promise<string> {
    const cached = localStorage.getItem('estabelecimentoId');
    if (cached) return cached;
    
    const { data } = await supabase.from('estabelecimentos').select('id').limit(1).single();
    return data?.id || '';
  }

  protected async criarLog(
    contaMarketplaceId: string,
    tipo: string,
    mensagem: string,
    sucesso: boolean,
    detalhes?: Record<string, any>
  ): Promise<void> {
    const estabelecimentoId = await this.getEstabelecimentoId();
    
    // Buscar marketplace_id da conta
    const { data: conta } = await supabase
      .from('contas_marketplace')
      .select('marketplace_id')
      .eq('id', contaMarketplaceId)
      .single();

    await supabase.from('marketplace_logs').insert({
      estabelecimento_id: estabelecimentoId,
      conta_marketplace_id: contaMarketplaceId,
      marketplace_id: conta?.marketplace_id || null,
      tipo,
      mensagem,
      sucesso,
      detalhes: detalhes || null,
    });
  }

  protected async atualizarStatusConta(
    contaMarketplaceId: string,
    status: string,
    accessToken?: string,
    refreshToken?: string,
    dataExpiracao?: Date
  ): Promise<void> {
    const updateData: Record<string, any> = { status };
    if (accessToken) updateData.access_token = accessToken;
    if (refreshToken) updateData.refresh_token = refreshToken;
    if (dataExpiracao) updateData.data_expiracao_token = dataExpiracao.toISOString();

    await supabase
      .from('contas_marketplace')
      .update(updateData as any)
      .eq('id', contaMarketplaceId);
  }

  abstract conectarConta(contaMarketplaceId: string): Promise<void>;
  abstract sincronizarProdutos(contaMarketplaceId: string): Promise<void>;
  abstract sincronizarEstoquePrecos(contaMarketplaceId: string): Promise<void>;
  abstract sincronizarPedidos(contaMarketplaceId: string): Promise<void>;
}
