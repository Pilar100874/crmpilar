// Abertura de portas/portões: valida usuário, permissão, rate limit e registra tudo.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { adminClient, autenticar, ipOrigem } from "../_shared/portaria/auth.ts";
import { shellyPulso } from "../_shared/portaria/shelly.ts";
import { ControlIDService } from "../_shared/portaria/controlid.ts";
import { executarViaColetor } from "../_shared/portaria/coletor.ts";

const BodySchema = z.object({
  access_point_id: z.string().uuid(),
  nonce: z.string().min(8).max(120).optional(),
});

const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" };

function responder(status: number, corpo: unknown) {
  return new Response(JSON.stringify(corpo), { status, headers: JSON_HEADERS });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return responder(405, { error: "Método não permitido" });

  const ctx = await autenticar(req);
  if (!ctx) return responder(401, { error: "Não autenticado" });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return responder(400, { error: parsed.error.flatten().fieldErrors });
  const { access_point_id, nonce } = parsed.data;

  const admin = adminClient();
  const ip = ipOrigem(req);
  const inicio = Date.now();

  const registrar = async (
    resultado: "sucesso" | "erro" | "negado",
    mensagem: string | null,
    deviceId: string | null,
  ) => {
    await admin.from("port_remote_commands").insert({
      access_point_id,
      device_id: deviceId,
      solicitado_por: ctx.userId,
      comando: "abrir",
      resultado,
      latencia_ms: Date.now() - inicio,
      erro: resultado === "sucesso" ? null : mensagem,
      ip_origem: ip,
      nonce: nonce ?? null,
    });
    await admin.from("port_access_events").insert({
      tipo: "abertura_remota",
      auth_user_id: ctx.userId,
      device_id: deviceId,
      access_point_id,
      resultado,
      origem: "app",
      ip_origem: ip,
      mensagem,
    });
  };

  // Proteção contra replay do mesmo comando
  if (nonce) {
    const { data: repetido } = await admin
      .from("port_remote_commands")
      .select("id")
      .eq("nonce", nonce)
      .maybeSingle();
    if (repetido) return responder(409, { error: "Comando duplicado ignorado." });
  }

  // Rate limit: máx. 5 comandos por usuário em 20s
  const desde = new Date(Date.now() - 20000).toISOString();
  const { count } = await admin
    .from("port_remote_commands")
    .select("id", { count: "exact", head: true })
    .eq("solicitado_por", ctx.userId)
    .gte("created_at", desde);
  if ((count ?? 0) >= 5) {
    await registrar("negado", "Limite de acionamentos excedido", null);
    return responder(429, { error: "Muitos acionamentos seguidos. Aguarde alguns segundos." });
  }

  const { data: ponto } = await admin
    .from("port_access_points")
    .select("*, device:port_devices(*)")
    .eq("id", access_point_id)
    .maybeSingle();

  if (!ponto || !ponto.ativo) {
    await registrar("erro", "Ponto de acesso inválido ou inativo", null);
    return responder(404, { error: "Ponto de acesso não encontrado ou inativo." });
  }

  const device = ponto.device as Record<string, unknown> | null;
  if (!device || device.habilitado === false) {
    await registrar("erro", "Dispositivo não configurado ou desabilitado", (device?.id as string) ?? null);
    return responder(400, { error: "Dispositivo não configurado ou desabilitado." });
  }
  const deviceId = device.id as string;

  // RBAC + permissões individuais (revalidado sempre no backend)
  if (!ctx.isStaff) {
    const { data: pessoa } = await admin
      .from("port_people")
      .select("id, ativo, permitir_remoto, valido_de, valido_ate, dias_semana, hora_inicio, hora_fim")
      .eq("auth_user_id", ctx.userId)
      .maybeSingle();

    const negar = async (motivo: string) => {
      await registrar("negado", motivo, deviceId);
      return responder(403, { error: motivo });
    };

    if (!pessoa || !pessoa.ativo) return await negar("Usuário sem cadastro ativo na portaria.");
    if (!pessoa.permitir_remoto) return await negar("Usuário sem permissão de abertura remota.");

    const agora = new Date();
    // Data e dia da semana no fuso de São Paulo (evita virar o dia após 21h BRT).
    const hoje = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).format(agora);
    if (pessoa.valido_de && hoje < pessoa.valido_de) return await negar("Autorização ainda não iniciada.");
    if (pessoa.valido_ate && hoje > pessoa.valido_ate) return await negar("Autorização expirada.");

    const nomeDia = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo", weekday: "short",
    }).format(agora);
    const diaSemana = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(nomeDia);
    const dias = (pessoa.dias_semana as number[]) ?? [];
    if (dias.length && !dias.includes(diaSemana)) return await negar("Fora dos dias permitidos.");

    const hora = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(agora);
    if (pessoa.hora_inicio && hora < String(pessoa.hora_inicio).slice(0, 5)) return await negar("Fora do horário permitido.");
    if (pessoa.hora_fim && hora > String(pessoa.hora_fim).slice(0, 5)) return await negar("Fora do horário permitido.");

    const { data: permissao } = await admin
      .from("port_person_permissions")
      .select("id")
      .eq("person_id", pessoa.id)
      .eq("access_point_id", access_point_id)
      .maybeSingle();
    if (!permissao) return await negar("Usuário sem permissão para este acesso.");
  }

  const { data: cred } = await admin
    .from("port_device_credentials")
    .select("usuario, senha, token")
    .eq("device_id", deviceId)
    .maybeSingle();

  let resultado: { ok: boolean; mensagem?: string; detalhes?: unknown };
  if (device.via_coletor) {
    // Dispositivo em rede local: o Coletor Pilar executa o comando na LAN.
    const canalColetor = ponto.acao != null && ponto.acao !== "" ? Number(ponto.acao) : (device.canal_rele as number);
    const r = await executarViaColetor(admin, {
      device_id: deviceId,
      access_point_id,
      comando: "abrir",
      parametros: { canal: canalColetor, porta: Number(ponto.acao || 1) || 1 },
      solicitado_por: ctx.userId,
    });
    resultado = { ok: r.ok, mensagem: r.mensagem, detalhes: r.dados };
  } else if (device.tipo === "idface") {
    const servico = new ControlIDService(device as never, cred ?? {});
    const porta = Number(ponto.acao || 1) || 1;
    const r = await servico.openDoor(porta);
    resultado = { ok: r.ok, mensagem: r.mensagem, detalhes: r.dados };
  } else {
    const canal = ponto.acao != null && ponto.acao !== "" ? Number(ponto.acao) : (device.canal_rele as number);
    const r = await shellyPulso({ ...(device as never), canal_rele: canal }, cred ?? {});
    resultado = { ok: r.ok, mensagem: r.mensagem, detalhes: r.detalhes };
  }

  await admin
    .from("port_devices")
    .update({ status: resultado.ok ? "online" : "erro", ultima_comunicacao: new Date().toISOString() })
    .eq("id", deviceId);

  await registrar(resultado.ok ? "sucesso" : "erro", resultado.mensagem ?? null, deviceId);

  if (!resultado.ok) {
    return responder(502, { error: resultado.mensagem || "Não foi possível acionar o dispositivo." });
  }
  return responder(200, { ok: true, acesso: ponto.nome, horario: new Date().toISOString() });
});
