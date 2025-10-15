// Exportar todos os componentes de configuração de blocos

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
} from './QuestionBlocks';

// Button Blocks
export { ReplyButtonsConfig, ListButtonsConfig } from './ButtonBlocks';

// WhatsApp Blocks
export {
  KeywordOptionsConfig,
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
  N8nConfig,
  TriggerAutomationConfig,
  DynamicDataConfig,
  AIAgentConfig,
} from './LowCodeBlocks';
