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
  AIAgentConfig,
} from './LowCodeBlocks';

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
