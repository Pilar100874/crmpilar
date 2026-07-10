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

export function getTrackerRenderedCommands(model: TrackerModelLite): RenderedTrackerCommand[] {
  const ctx = buildTrackerTemplateContext(model);
  const cmds = Array.isArray(model.sms_commands) ? model.sms_commands : [];

  return cmds
    .filter((cmd) => !/RELAY,\s*[01]\s*#/i.test(cmd.template))
    .map((cmd) => ({ ...cmd, rendered: renderTemplate(cmd.template, ctx) }));
}

export function buildTrackerParametersSms(model: TrackerModelLite): string {
  const comandos = getTrackerRenderedCommands(model).map((cmd) => cmd.rendered).filter(Boolean);
  return `PARAMETROS RASTREADOR ${model.nome}: ${comandos.join(' | ')}`;
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
