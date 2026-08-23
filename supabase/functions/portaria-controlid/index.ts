// Sincronização de pessoas e faces com o Control iD iDFace Max (somente gestores).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { adminClient, autenticar } from "../_shared/portaria/auth.ts";
import { ControlIDService } from "../_shared/portaria/controlid.ts";

const BodySchema = z.object({
  acao: z.enum(["sync_pessoa", "remover_pessoa", "enroll_face", "revoke_face", "sync_todos", "logs", "status"]),
  device_id: z.string().uuid(),
  person_id: z.string().uuid().optional(),
  imagem_base64: z.string().max(8_000_000).optional(),
});

const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" };
const responder = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: JSON_HEADERS });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return responder(405, { error: "Método não permitido" });

  const ctx = await autenticar(req);
  if (!ctx) return responder(401, { error: "Não autenticado" });
  if (!ctx.isGestor) return responder(403, { error: "Somente administradores da portaria." });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return responder(400, { error: parsed.error.flatten().fieldErrors });
  const { acao, device_id, person_id, imagem_base64 } = parsed.data;

  const admin = adminClient();
  const { data: device } = await admin.from("port_devices").select("*").eq("id", device_id).maybeSingle();
  if (!device || device.tipo !== "idface") return responder(404, { error: "Dispositivo iDFace não encontrado." });

  const { data: cred } = await admin
    .from("port_device_credentials")
    .select("usuario, senha, token")
    .eq("device_id", device_id)
    .maybeSingle();

  const servico = new ControlIDService(device as never, cred ?? {});

  const marcar = async (id: string, campos: Record<string, unknown>) => {
    await admin.from("port_people").update(campos).eq("id", id);
  };

  const sincronizarPessoa = async (pessoa: Record<string, unknown>) => {
    const begin = pessoa.valido_de ? Math.floor(new Date(`${pessoa.valido_de}T00:00:00Z`).getTime() / 1000) : 0;
    const end = pessoa.valido_ate ? Math.floor(new Date(`${pessoa.valido_ate}T23:59:59Z`).getTime() / 1000) : 0;

    if (pessoa.controlid_user_id) {
      const r = await servico.updateUser(pessoa.controlid_user_id as string, {
        name: pessoa.nome, registration: pessoa.documento ?? "", begin_time: begin, end_time: end,
      });
      await marcar(pessoa.id as string, {
        sync_erro: r.ok ? null : (r.mensagem ?? "Falha na sincronização"),
        face_status: r.ok ? (pessoa.face_status as string) : "erro",
      });
      return r;
    }

    const r = await servico.createUser({
      name: String(pessoa.nome),
      registration: (pessoa.documento as string) ?? "",
      begin_time: begin,
      end_time: end,
    });
    const ids = (r.dados as { ids?: number[] } | null)?.ids;
    await marcar(pessoa.id as string, {
      controlid_user_id: r.ok && ids?.length ? String(ids[0]) : null,
      sync_erro: r.ok ? null : (r.mensagem ?? "Falha ao criar usuário no iDFace"),
      face_status: r.ok ? "pendente" : "erro",
    });
    return r;
  };

  if (acao === "status") {
    const r = await servico.getDeviceStatus();
    await admin.from("port_devices").update({
      status: r.ok ? "online" : "erro",
      ultima_comunicacao: new Date().toISOString(),
    }).eq("id", device_id);
    return responder(r.ok ? 200 : 502, { ok: r.ok, dados: r.dados, mensagem: r.mensagem ?? null });
  }

  if (acao === "logs") {
    const r = await servico.getAccessLogs(100);
    return responder(r.ok ? 200 : 502, { ok: r.ok, dados: r.dados, mensagem: r.mensagem ?? null });
  }

  if (acao === "sync_todos") {
    const { data: pessoas } = await admin
      .from("port_people")
      .select("*")
      .eq("ativo", true)
      .eq("permitir_facial", true);
    let sucesso = 0, falhas = 0;
    for (const p of pessoas ?? []) {
      const r = await sincronizarPessoa(p as Record<string, unknown>);
      r.ok ? sucesso++ : falhas++;
    }
    return responder(200, { ok: true, sucesso, falhas });
  }

  if (!person_id) return responder(400, { error: "person_id é obrigatório." });
  const { data: pessoa } = await admin.from("port_people").select("*").eq("id", person_id).maybeSingle();
  if (!pessoa) return responder(404, { error: "Pessoa não encontrada." });

  if (acao === "sync_pessoa") {
    const r = await sincronizarPessoa(pessoa as Record<string, unknown>);
    return responder(r.ok ? 200 : 502, { ok: r.ok, mensagem: r.mensagem ?? null, dados: r.dados });
  }

  if (acao === "remover_pessoa") {
    if (!pessoa.controlid_user_id) return responder(200, { ok: true });
    const r = await servico.deleteUser(pessoa.controlid_user_id);
    if (r.ok) await marcar(person_id, { controlid_user_id: null, face_status: "pendente", sync_erro: null });
    return responder(r.ok ? 200 : 502, { ok: r.ok, mensagem: r.mensagem ?? null });
  }

  if (acao === "revoke_face") {
    if (!pessoa.controlid_user_id) return responder(400, { error: "Pessoa não sincronizada com o iDFace." });
    const r = await servico.revokeFace(pessoa.controlid_user_id);
    if (r.ok) await marcar(person_id, { face_status: "pendente" });
    return responder(r.ok ? 200 : 502, { ok: r.ok, mensagem: r.mensagem ?? null });
  }

  // enroll_face
  if (!imagem_base64) return responder(400, { error: "Imagem facial é obrigatória." });
  let controlIdUserId = pessoa.controlid_user_id as string | null;
  if (!controlIdUserId) {
    const criado = await sincronizarPessoa(pessoa as Record<string, unknown>);
    if (!criado.ok) return responder(502, { ok: false, mensagem: criado.mensagem ?? "Falha ao criar usuário no iDFace." });
    const { data: atualizada } = await admin.from("port_people").select("controlid_user_id").eq("id", person_id).maybeSingle();
    controlIdUserId = atualizada?.controlid_user_id ?? null;
  }
  if (!controlIdUserId) return responder(502, { error: "Não foi possível obter o ID do usuário no iDFace." });

  const r = await servico.enrollFace(controlIdUserId, imagem_base64);
  await marcar(person_id, {
    face_status: r.ok ? "cadastrada" : "erro",
    sync_erro: r.ok ? null : (r.mensagem ?? "Falha ao enviar a face"),
  });
  return responder(r.ok ? 200 : 502, { ok: r.ok, mensagem: r.mensagem ?? null });
});
