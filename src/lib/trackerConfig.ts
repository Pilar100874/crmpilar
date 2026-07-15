import { supabase } from '@/integrations/supabase/client';

export interface SmsCommand {
  label: string;
  template: string;
  descricao?: string;
}

export interface TrackerModelLite {
  id: string;
  nome: string;
  protocolo: string;
  porta: number;
  host: string | null;
  senha_padrao: string | null;
  apn: string | null;
  apn_user: string | null;
  apn_password: string | null;
  sms_commands: SmsCommand[];
}

export interface ConfigureResult {
  status: 'configurado' | 'falhou' | 'parcial' | 'sem_comandos';
  log: Array<{
    label: string;
    template: string;
    rendered: string;
    ok: boolean;
    provider_message_id?: string | null;
    erro?: string | null;
    at: string;
  }>;
  error?: string;
}

export interface RenderedTrackerCommand extends SmsCommand {
  rendered: string;
}

export function renderTemplate(tpl: string, ctx: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_m, key) => (ctx[key] ?? ''));
}

function buildTrackerTemplateContext(model: TrackerModelLite): Record<string, string> {
  return {
    host: model.host || '',
    port: String(model.porta || ''),
    password: model.senha_padrao || '',
    apn: model.apn || '',
    apn_user: model.apn_user || '',
    apn_password: model.apn_password || '',
  };
}

// Ordem correta de configuração p/ trackers GT06 e similares:
// 1) APN (dados)  2) GPRSON (liga transmissão)  3) SERVER (destino)  4) TIMER (frequência)
// Templates fora dessa lista mantêm a ordem original ao final.
const COMMAND_PRIORITY: Array<RegExp> = [
  /^\s*APN[, ]/i,
  /^\s*GPRSON[, ]/i,
  /^\s*SERVER[, ]/i,
  /^\s*TIMER[, ]/i,
];

function commandPriority(tpl: string): number {
  for (let i = 0; i < COMMAND_PRIORITY.length; i++) {
    if (COMMAND_PRIORITY[i].test(tpl)) return i;
  }
  return COMMAND_PRIORITY.length;
}

// Comandos no padrão GT06/J-series (APN,... / SERVER,... / TIMER,... / GPRSON,... / RELAY,... / STATUS#)
// exigem prefixo da senha do dispositivo: "123456,APN,...". Se o template não já começa com a
// senha, prependa automaticamente para evitar que o rastreador ignore o SMS silenciosamente.
const GT06_KEYWORDS = /^(APN|GPRSON|SERVER|TIMER|RELAY|STATUS|RESET|FACTORY|CENTER|SOS|GMT|SENDSMS|SLEEP|MODE)\b/i;

function applyPasswordPrefix(rendered: string, password: string): string {
  if (!password) return rendered;
  const trimmed = rendered.trimStart();
  if (trimmed.startsWith(password + ',') || trimmed.startsWith(password + ' ')) return rendered;
  if (GT06_KEYWORDS.test(trimmed)) return `${password},${trimmed}`;
  return rendered;
}

export function getTrackerRenderedCommands(model: TrackerModelLite): RenderedTrackerCommand[] {
  const ctx = buildTrackerTemplateContext(model);
  const password = model.senha_padrao || '';
  const cmds = Array.isArray(model.sms_commands) ? model.sms_commands : [];

  return cmds
    .filter((cmd) => !/RELAY,\s*[01]\s*#/i.test(cmd.template))
    .slice()
    .sort((a, b) => commandPriority(a.template) - commandPriority(b.template))
    .map((cmd) => {
      const rendered = applyPasswordPrefix(renderTemplate(cmd.template, ctx), password);
      return { ...cmd, rendered };
    });
}

export function buildTrackerParametersSms(model: TrackerModelLite): string {
  const comandos = getTrackerRenderedCommands(model).map((cmd) => cmd.rendered).filter(Boolean);
  // Insere zero-width space (U+200B) após cada ponto para que o app de SMS/WhatsApp
  // não detecte "crm.pilar.com.br" como URL clicável. Visualmente idêntico ao texto original.
  const texto = `Parametros enviados;\n${comandos.join('\n')}`;
  return texto.replace(/\./g, '.\u200B');
}

/** Configure a physical GPS tracker by sending its SMS commands to the SIM number */
export async function configurarRastreador(params: {
  estabelecimentoId: string;
  veiculoId?: string | null;
  telefone: string;
  model: TrackerModelLite;
  chipType?: 'm2m' | 'normal';
}): Promise<ConfigureResult> {
  const { estabelecimentoId, veiculoId, telefone, model, chipType } = params;
  const cmds = getTrackerRenderedCommands(model);
  if (cmds.length === 0) {
    return { status: 'sem_comandos', log: [] };
  }

  const log: ConfigureResult['log'] = [];
  let okCount = 0;
  let sentAny = false;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  // M2M não tem anti-flood da operadora → 3s basta. Chip normal → 10s.
  const intervalMs = chipType === 'm2m' ? 3000 : 10000;

  for (const cmd of cmds) {
    if (sentAny) await sleep(intervalMs);
    sentAny = true;

    const rendered = cmd.rendered;
    const at = new Date().toISOString();
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          estabelecimento_id: estabelecimentoId,
          destino: telefone,
          mensagem: rendered,
        },
      });
      if (error) throw error;
      const ok = !!(data as any)?.success;
      if (ok) okCount++;
      log.push({
        label: cmd.label,
        template: cmd.template,
        rendered,
        ok,
        provider_message_id: (data as any)?.provider_message_id ?? null,
        erro: ok ? null : ((data as any)?.erro || 'Falha ao enviar SMS'),
        at,
      });
    } catch (e: any) {
      log.push({
        label: cmd.label, template: cmd.template, rendered,
        ok: false, erro: e?.message || 'Erro ao enviar SMS', at,
      });
    }
  }

  const sent = log.length;
  const status: ConfigureResult['status'] =
    sent === 0 ? 'sem_comandos'
    : okCount === sent ? 'configurado'
    : okCount === 0 ? 'falhou'
    : 'parcial';

  if (veiculoId) {
    await supabase
      .from('veiculos')
      .update({
        tracker_model_id: model.id,
        tracker_config_status: status === 'parcial' ? 'falhou' : status,
        tracker_config_at: new Date().toISOString(),
        tracker_config_log: log as any,
        tracker_config_error: status === 'configurado' ? null
          : (log.find(l => !l.ok)?.erro || null),
      } as any)
      .eq('id', veiculoId);
  }

  return { status, log };
}
