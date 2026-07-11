// Exportar todos os componentes de configuração de blocos

// Componentes reutilizáveis
export * from './ConfigField';

// Message Blocks
export { SendMessageConfig, MediaConfig, GoodbyeConfig } from './MessageBlocks';

// Question Blocks
export {
  AskNameConfig,
  AskQuestionConfig,
  AskEmailConfig,
  AskNumberConfig,
  AskPhoneConfig,
  AskDateConfig,
  AskFileConfig,
  AskAddressConfig,
  AskUrlConfig,
  AskCNPJConfig,
  AskCEPConfig,
} from './QuestionBlocks';

// Button Blocks
export { ReplyButtonsConfig, ListButtonsConfig } from './ButtonBlocks';

// WhatsApp Blocks
export {
  MessageTemplateConfig,
  OptInOutConfig,
  OptInCheckConfig,
  AudienceConfig,
} from './WhatsAppBlocks';

// Logic Blocks
export {
  ConditionConfig,
  SetFieldConfig,
  KeywordJumpConfig,
  GlobalKeywordsConfig,
  FormulasConfig,
  JumpToConfig,
  LeadScoringConfig,
  GoalConfig,
} from './LogicBlocks';

// Low Code Blocks
export {
  WebhookConfig,
  TriggerAutomationConfig,
  AIAgentConfig,
} from './LowCodeBlocks';

// CRM Blocks
export {
  CRMCadastroEmpresaConfig,
} from './CRMBlocks';

export {
  CRMGerarRelatorioConfig,
} from './CRMGerarRelatorioConfig';

export { AgendaRapidaConfig } from './AgendaRapidaConfig';

// Anexar Catálogo (PDF)
export { AttachCatalogConfig } from './AttachCatalogConfig';

// Additional Blocks
export { ABTestConfig } from './ABTestConfig';
export { BotJumpConfig } from './BotJumpConfig';
export { CollectIntentConfig } from './CollectIntentConfig';
export { ConditionsConfigNew } from './ConditionsConfigNew';
export { DynamicDataConfig } from './DynamicDataConfig';
export { KeywordOptionsConfig } from './KeywordOptionsConfig';
export { ListButtonsConfigNew } from './ListButtonsConfigNew';
export { ReplyButtonsConfigNew } from './ReplyButtonsConfigNew';
export { OptInOutConfigNew } from './OptInOutConfigNew';
export { SetFieldConfigNew } from './SetFieldConfigNew';
export { WebhookConfigNew } from './WebhookConfigNew';
export { TriggerAutomationConfigNew } from './TriggerAutomationConfigNew';
export { FormulasConfigNew } from './FormulasConfigNew';
export { GlobalKeywordsConfigNew } from './GlobalKeywordsConfigNew';
export { GlobalRedirectConfig } from './GlobalRedirectConfig';
export { GoalConfigNew } from './GoalConfigNew';
export { GoodbyeConfigNew } from './GoodbyeConfigNew';
export { KeywordJumpConfigNew } from './KeywordJumpConfigNew';
export { LeadScoringConfigNew } from './LeadScoringConfigNew';
export { MessageTemplateConfigNew } from './MessageTemplateConfigNew';

// Routing Blocks
export {
  TransferirOmnichannelConfig,
  EnviarFilaConfig,
  AtribuirAtendenteConfig,
  DefinirPrioridadeConfig,
} from './RoutingBlocks';

// Chat e Avisos Blocks
export { EnviarAvisoSistemaConfig } from './EnviarAvisoSistemaConfig';
export { EnviarMensagemInternaConfig } from './EnviarMensagemInternaConfig';

// Redes Sociais
export { PublishSocialPostConfig } from './PublishSocialPostConfig';

// IA - Geração de Mídia
export { GenerateAIMediaConfig } from './GenerateAIMediaConfig';

// Disparo direto / Loops
export { SendWhatsappToNumberConfig } from './SendWhatsappToNumberConfig';
export { SendSmsConfig } from './SendSmsConfig';
export { ApiLoopConfig } from './ApiLoopConfig';

// Catálogo de produtos
export { ProductSearchSelectConfig } from './ProductSearchSelectConfig';

// Conteúdo de Texto (para Gerar Mídia IA)
export { TextContentConfig } from './TextContentConfig';

// Tipo de Conteúdo (Divulgação / Promoção / Institucional...)
export { ContentTypeConfig } from './ContentTypeConfig';

// Influencer (pergunta + upload de referência)
export { AskInfluencerConfig } from './AskInfluencerConfig';

// Imagem do Produto (pergunta + 3 opções + confirmação)
export { AskProductImageConfig } from './AskProductImageConfig';

// Disparar outro workflow (cross-module)
export { TriggerWorkflowConfig } from './TriggerWorkflowConfig';

// Retornar Resposta (modo síncrono)
export { ReturnResponseConfig } from './ReturnResponseConfig';

// ============= Evolution-only blocks =============
export {
  ButtonUrlConfig,
  ButtonCopyConfig,
  ButtonCallConfig,
  ButtonPixConfig,
  ButtonsMixedConfig,
  ButtonsMediaConfig,
  CarouselConfig,
} from './EvolutionButtonsBlocks';




