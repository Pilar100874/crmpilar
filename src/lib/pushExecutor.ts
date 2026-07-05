// Executor unificado do bloco "Disparar Push" usado pelos 4 workflows:
// Bot (omnichannel), Logística e-commerce, Automações de Vendas, Automações de Anúncios.

import { supabase } from "@/integrations/supabase/client";

export type PushDestinatarioTipo =
  | "usuario"          // usuários internos específicos
  | "contato"          // contatos/clientes específicos
  | "todos_usuarios"   // broadcast interno
  | "todos_contatos"   // broadcast clientes
  | "variavel";        // resolve por variável do fluxo (ex: {{contato.id}})

export interface PushBlockConfig {
  destinatario_tipo: PushDestinatarioTipo;
  usuario_ids?: string[];
  contato_ids?: string[];
  variavel_destinatario?: string;   // ex "contato.id" ou "usuario.id"
  variavel_tipo?: "usuario" | "contato";
  titulo: string;
  corpo?: string;
  url?: string;
  icone?: string;
  imagem?: string;
}

export interface PushExecContext {
  variaveis?: Record<string, any>;
  workflow_id?: string;
  workflow_tipo?: "bot" | "logistica" | "vendas" | "ads";
  origem?: string;
}

function interpolar(str: string | undefined, vars: Record<string, any> = {}): string | undefined {
  if (!str) return str;
  return str.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const parts = path.split(".");
    let v: any = vars;
    for (const p of parts) v = v?.[p];
    return v == null ? "" : String(v);
  });
}

function resolveVarPath(path: string, vars: Record<string, any>): any {
  const parts = path.replace(/[{}\s]/g, "").split(".");
  let v: any = vars;
  for (const p of parts) v = v?.[p];
  return v;
}

export async function executarBlocoPush(
  config: PushBlockConfig,
  ctx: PushExecContext = {},
): Promise<{ ok: boolean; enviados: number; falhou: number; erro?: string }> {
  const vars = ctx.variaveis || {};
  const titulo = interpolar(config.titulo, vars) || "Notificação";
  const corpo = interpolar(config.corpo, vars);
  const url = interpolar(config.url, vars);

  let payload: any = {
    titulo, corpo, url, icone: config.icone,
    workflow_id: ctx.workflow_id,
    workflow_tipo: ctx.workflow_tipo,
    origem: ctx.origem || ctx.workflow_tipo || "workflow",
  };

  switch (config.destinatario_tipo) {
    case "todos_usuarios":
    case "todos_contatos":
      payload.destinatario_tipo = config.destinatario_tipo;
      break;
    case "usuario":
      payload.destinatario_tipo = "usuario";
      payload.usuario_ids = config.usuario_ids || [];
      break;
    case "contato":
      payload.destinatario_tipo = "contato";
      payload.contato_ids = config.contato_ids || [];
      break;
    case "variavel": {
      const id = resolveVarPath(config.variavel_destinatario || "", vars);
      if (!id) return { ok: false, enviados: 0, falhou: 0, erro: "Variável de destinatário vazia" };
      if (config.variavel_tipo === "usuario") {
        payload.destinatario_tipo = "usuario";
        payload.usuario_ids = [String(id)];
      } else {
        payload.destinatario_tipo = "contato";
        payload.contato_ids = [String(id)];
      }
      break;
    }
  }

  const { data, error } = await supabase.functions.invoke("push-send", { body: payload });
  if (error) return { ok: false, enviados: 0, falhou: 0, erro: error.message };
  return { ok: true, enviados: data?.enviados ?? 0, falhou: data?.falhou ?? 0 };
}
