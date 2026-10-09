import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * Ponte do aplicativo Android "Pilar Voz" com o CRM.
 * O aparelho se identifica pela chave da empresa (app = "voz") e nunca recebe
 * chaves internas: a IA é chamada daqui pela função voz-ia-turno.
 *
 * Ações: config | turno | iniciar | fala | sugestao | finalizar | comandos | comando_status
 */
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// deno-lint-ignore no-explicit-any
type SB = any;
const dig = (s: unknown) => String(s ?? "").replace(/\D/g, "");
const brl = (v: unknown) => `R$ ${Number(v ?? 0).toFixed(2).replace(".", ",")}`;
const dt = (s: unknown) => (s ? String(s).slice(0, 10).split("-").reverse().join("/") : "");

/** Reúne o máximo de informação do CRM sobre o número da ligação para o modo "ajudar o atendente". */
async function contextoCrm(sb: SB, empresa: string, numero: string): Promise<string> {
  const d = dig(numero);
  if (d.length < 8) return "";
  const fim = d.slice(-8);
  const like = `%${fim.slice(0, 4)}%${fim.slice(4)}%`;
  const [{ data: clis }, { data: emps }] = await Promise.all([
    sb.from("customers").select("id,nome,email,telefone,tel,cidade,estado,tags,empresa_id")
      .eq("estabelecimento_id", empresa).or(`telefone.ilike.${like},tel.ilike.${like}`).limit(3),
    sb.from("empresas").select("id,nome_fantasia,nome,cnpj,cidade,estado,status_comercial,tipo_cliente,produtos_interesse,observacoes_internas,segmento_id,porte")
      .eq("estabelecimento_id", empresa).or(`telefone.ilike.${like},whatsapp.ilike.${like},contato_telefone.ilike.${like}`).limit(2),
  ]);
  const cli = (clis ?? []).find((c: SB) => dig(c.telefone).endsWith(fim) || dig(c.tel).endsWith(fim)) ?? clis?.[0];
  let emp = emps?.[0];
  if (!emp && cli?.empresa_id) {
    emp = (await sb.from("empresas").select("id,nome_fantasia,nome,cnpj,cidade,estado,status_comercial,tipo_cliente,produtos_interesse,observacoes_internas,porte").eq("id", cli.empresa_id).maybeSingle()).data;
  }
  const p: string[] = [];
  if (cli) p.push(`Contato: ${cli.nome ?? ""}${cli.email ? `, ${cli.email}` : ""}${cli.cidade ? `, ${cli.cidade}/${cli.estado ?? ""}` : ""}${cli.tags?.length ? `, tags: ${cli.tags.join(", ")}` : ""}`);
  if (emp) p.push(`Empresa: ${emp.nome_fantasia || emp.nome}${emp.cnpj ? ` (CNPJ ${emp.cnpj})` : ""}${emp.cidade ? `, ${emp.cidade}/${emp.estado ?? ""}` : ""}${emp.status_comercial ? `, situação: ${emp.status_comercial}` : ""}${emp.porte ? `, porte: ${emp.porte}` : ""}${emp.produtos_interesse ? `, interesse: ${JSON.stringify(emp.produtos_interesse)}` : ""}${emp.observacoes_internas ? `. Obs.: ${String(emp.observacoes_internas).slice(0, 300)}` : ""}`);

  // Orçamentos (abertos, ganhos e perdidos) com itens
  const filtros: string[] = [];
  if (cli) filtros.push(`cliente_id.eq.${cli.id}`);
  if (emp) filtros.push(`empresa_id.eq.${emp.id}`);
  const tarefas = cli
    ? sb.from("calendario_tarefas").select("title,description,date,status").eq("contact_id", cli.id).order("date", { ascending: false }).limit(6)
    : Promise.resolve({ data: [] });
  const notas = cli
    ? sb.from("anotacoes_ligacao").select("texto,created_at").eq("customer_id", cli.id).order("created_at", { ascending: false }).limit(5)
    : Promise.resolve({ data: [] });
  const orcs = filtros.length
    ? sb.from("orcamentos").select("id,etapa,status,valor_total,motivo_perda,observacoes,created_at, orcamento_itens(quantidade,preco_unitario,produtos(nome,codigo))")
      .eq("estabelecimento_id", empresa).or(filtros.join(",")).order("created_at", { ascending: false }).limit(8)
    : Promise.resolve({ data: [] });
  const pedRec = sb.from("pedidos_recebidos").select("numero_pedido,valor_total,status,data_pedido,created_at,itens_json")
    .eq("estabelecimento_id", empresa).ilike("telefone_cliente", like).order("created_at", { ascending: false }).limit(6);
  const pedEc = sb.from("pedidos_ecommerce").select("numero_pedido,valor_total,status,created_at, pedidos_ecommerce_itens(nome_produto,quantidade)")
    .eq("estabelecimento_id", empresa).ilike("telefone_cliente", like).order("created_at", { ascending: false }).limit(6);
  const [t, n, o, pr, pe] = await Promise.all([tarefas, notas, orcs, pedRec, pedEc]);

  const itens = (arr: SB[] | undefined, f: (i: SB) => string) => (arr ?? []).slice(0, 8).map(f).join("; ");
  for (const x of o.data ?? []) {
    p.push(`Orçamento ${dt(x.created_at)} — ${x.etapa}/${x.status}, ${brl(x.valor_total)}${x.motivo_perda ? `, perdido por: ${x.motivo_perda}` : ""}. Itens: ${itens(x.orcamento_itens, (i) => `${i.quantidade}x ${i.produtos?.nome ?? "produto"} a ${brl(i.preco_unitario)}`)}`);
  }
  for (const x of pr.data ?? []) {
    const its = Array.isArray(x.itens_json) ? itens(x.itens_json, (i) => `${i.quantidade ?? ""}x ${i.nome ?? i.titulo ?? i.descricao ?? "item"}`) : "";
    p.push(`Compra ${dt(x.data_pedido ?? x.created_at)} pedido ${x.numero_pedido ?? ""} — ${brl(x.valor_total)}, ${x.status}${its ? `. Itens: ${its}` : ""}`);
  }
  for (const x of pe.data ?? []) {
    p.push(`Compra loja virtual ${dt(x.created_at)} pedido ${x.numero_pedido ?? ""} — ${brl(x.valor_total)}, ${x.status}. Itens: ${itens(x.pedidos_ecommerce_itens, (i) => `${i.quantidade}x ${i.nome_produto}`)}`);
  }
  for (const x of n.data ?? []) p.push(`Anotação ${dt(x.created_at)}: ${String(x.texto).slice(0, 200)}`);
  for (const x of t.data ?? []) p.push(`Tarefa ${dt(x.date)} (${x.status}): ${x.title}${x.description ? ` — ${String(x.description).slice(0, 150)}` : ""}`);
  if (!p.length) return "\n\nDados do CRM: número não encontrado no cadastro (cliente novo ou não identificado).";
  return `\n\nDados do CRM sobre quem está na ligação (use para sugerir: relembre compras, retome orçamentos em aberto, contorne motivos de perda, ofereça reposição e produtos relacionados; nunca invente dados):\n- ${p.join("\n- ").slice(0, 6000)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const corpo = await req.json().catch(() => ({}));
    const chave = String(corpo?.chave ?? "").trim().toUpperCase();
    const acao = String(corpo?.acao ?? "");
    if (!chave) return json({ error: "chave obrigatória" }, 400);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const { data: reg } = await sb.from("automacao_app_chaves")
      .select("id, estabelecimento_id, bloqueado, app").eq("chave", chave).maybeSingle();
    // Aceita chave do tipo "voz" ou a chave de instalação do Coletor ("coletor"),
    // assim o Coletor desktop usa a mesma chave da instalação, sem segunda chave.
    // Chaves do Coletor ficam gravadas como "coletor" ou "controle" (tipo antigo).
    const APPS_VOZ = ["voz", "coletor", "controle"];
    if (!reg || !APPS_VOZ.includes(String(reg.app ?? ""))) return json({ error: "chave inválida para o Pilar Voz" }, 403);
    if (reg.bloqueado) return json({ error: "chave bloqueada" }, 403);
    const empresa = reg.estabelecimento_id as string;
    await sb.from("automacao_app_chaves").update({ ultima_comunicacao: new Date().toISOString() }).eq("id", reg.id);

    // Usa o agente escolhido (agente_id ou o da chamada); senão, o primeiro ativo.
    const agente = async () => {
      let id = corpo.agente_id ? String(corpo.agente_id) : "";
      if (!id && corpo.chamada_id) {
        id = (await sb.from("voz_chamadas").select("agente_id").eq("id", String(corpo.chamada_id))
          .eq("estabelecimento_id", empresa).maybeSingle()).data?.agente_id ?? "";
      }
      if (id) {
        const esc = (await sb.from("voz_agentes").select("*").eq("id", id).eq("estabelecimento_id", empresa)
          .eq("ativo", true).maybeSingle()).data;
        if (esc) return esc;
      }
      return (await sb.from("voz_agentes").select("*").eq("estabelecimento_id", empresa)
        .eq("ativo", true).order("created_at").limit(1).maybeSingle()).data;
    };

    // Garante que a chamada pertence à empresa da chave.
    const chamadaDaEmpresa = async (id: string) =>
      (await sb.from("voz_chamadas").select("id, transcricao, sugestoes, iniciada_em")
        .eq("id", id).eq("estabelecimento_id", empresa).maybeSingle()).data;

    switch (acao) {
      case "config": {
        const a = await agente();
        if (!a) return json({ error: "Nenhum agente de voz ativo. Cadastre em Agentes de Voz." }, 404);
        return json({ agente: a });
      }
      case "turno": {
        const a = await agente();
        if (!a) return json({ error: "Nenhum agente ativo" }, 404);
        const objetivo = corpo.objetivo ? `\nObjetivo desta ligação: ${corpo.objetivo}` : "";
        let crm = "";
        if ((corpo.modo ?? "receber") === "assistir" || corpo.contexto_crm) {
          let numero = String(corpo.numero ?? "");
          if (!numero && corpo.chamada_id) {
            numero = (await sb.from("voz_chamadas").select("numero").eq("id", String(corpo.chamada_id)).eq("estabelecimento_id", empresa).maybeSingle()).data?.numero ?? "";
          }
          try { crm = await contextoCrm(sb, empresa, numero); } catch (e) { console.error("contexto CRM", e); }
        }
        const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/voz-ia-turno`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-runner-key": Deno.env.get("AIP_RUNNER_KEY") ?? "" },
          body: JSON.stringify({
            audio_wav_b64: corpo.audio_wav_b64 ?? null,
            prompt: (corpo.prompt_extra ? `${corpo.prompt_extra}\n` : "") + (a.prompt ?? "") + objetivo + crm,
            historico: Array.isArray(corpo.historico) ? corpo.historico.slice(-20) : [],
            modo: corpo.modo ?? "receber",
            voz: a.voz || "alloy",
          }),
        });
        return new Response(await r.text(), { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      case "iniciar": {
        const a = await agente();
        if (!a) return json({ error: "Nenhum agente ativo" }, 404);
        const { data, error } = await sb.from("voz_chamadas").insert({
          estabelecimento_id: empresa, agente_id: a.id, modo: corpo.modo ?? "receber",
          numero: corpo.numero ?? null, ramal_monitorado: corpo.ramal ?? null,
        }).select("id").single();
        if (error) return json({ error: error.message }, 500);
        return json({ id: data.id });
      }
      case "fala":
      case "sugestao": {
        const c = await chamadaDaEmpresa(String(corpo.chamada_id ?? ""));
        if (!c) return json({ error: "chamada não encontrada" }, 404);
        const em = new Date().toISOString();
        const texto = String(corpo.texto ?? "").slice(0, 2000);
        const upd = acao === "fala"
          ? { transcricao: [...(c.transcricao as unknown[] ?? []), { papel: corpo.papel === "agente" ? "agente" : "cliente", texto, em }] }
          : { sugestoes: [...(c.sugestoes as unknown[] ?? []), { texto, em }] };
        await sb.from("voz_chamadas").update(upd).eq("id", c.id);
        return json({ ok: true });
      }
      case "finalizar": {
        const c = await chamadaDaEmpresa(String(corpo.chamada_id ?? ""));
        if (!c) return json({ error: "chamada não encontrada" }, 404);
        await sb.from("voz_chamadas").update({
          status: corpo.status === "erro" ? "erro" : "finalizada",
          finalizada_em: new Date().toISOString(),
          duracao_seg: Math.round((Date.now() - new Date(c.iniciada_em as string).getTime()) / 1000),
        }).eq("id", c.id);
        return json({ ok: true });
      }
      case "comandos": {
        const { data } = await sb.from("voz_comandos").select("*").eq("estabelecimento_id", empresa)
          .eq("status", "pendente").order("created_at").limit(1);
        const cmd = data?.[0];
        if (!cmd) return json({ comando: null });
        await sb.from("voz_comandos").update({ status: "executando", processado_em: new Date().toISOString() }).eq("id", cmd.id);
        return json({ comando: cmd });
      }
      case "comando_status": {
        const status = ["concluido", "sem_resposta", "erro"].includes(corpo.status) ? corpo.status : "erro";
        await sb.from("voz_comandos").update({ status, erro: corpo.erro ?? null })
          .eq("id", String(corpo.comando_id ?? "")).eq("estabelecimento_id", empresa);
        return json({ ok: true });
      }
      default:
        return json({ error: `ação desconhecida: ${acao}` }, 400);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
