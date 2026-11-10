import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { aplicarRegrasDiscagem } from "../_shared/regrasDiscagem.ts";
import { destinoTransferencia } from "../_shared/transferenciaConfirmada.ts";

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
const cacheCrm = new Map<string, { t: number; v: string }>();
async function contextoCrm(sb: SB, empresa: string, numero: string, opts = { historico: true, pagamento: true }): Promise<string> {
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
    ? sb.from("orcamentos").select("id,etapa,status,valor_total,motivo_perda,observacoes,created_at, condicoes_pagamento(nome), orcamento_itens(quantidade,preco_unitario,produtos(nome,codigo))")
      .eq("estabelecimento_id", empresa).or(filtros.join(",")).order("created_at", { ascending: false }).limit(8)
    : Promise.resolve({ data: [] });
  const pedRec = sb.from("pedidos_recebidos").select("numero_pedido,valor_total,status,data_pedido,created_at,itens_json")
    .eq("estabelecimento_id", empresa).ilike("telefone_cliente", like).order("created_at", { ascending: false }).limit(6);
  const pedEc = sb.from("pedidos_ecommerce").select("numero_pedido,valor_total,status,created_at, pedidos_ecommerce_itens(nome_produto,quantidade)")
    .eq("estabelecimento_id", empresa).ilike("telefone_cliente", like).order("created_at", { ascending: false }).limit(6);
  const [t, n, o, pr, pe] = await Promise.all([tarefas, notas, orcs, pedRec, pedEc]);

  const itens = (arr: SB[] | undefined, f: (i: SB) => string) => (arr ?? []).slice(0, 8).map(f).join("; ");
  for (const x of opts.historico ? o.data ?? [] : []) {
    p.push(`Orçamento ${dt(x.created_at)} — ${x.etapa}/${x.status}, ${brl(x.valor_total)}${x.motivo_perda ? `, perdido por: ${x.motivo_perda}` : ""}. Itens: ${itens(x.orcamento_itens, (i) => `${i.quantidade}x ${i.produtos?.nome ?? "produto"} a ${brl(i.preco_unitario)}`)}`);
  }
  for (const x of opts.historico ? pr.data ?? [] : []) {
    const its = Array.isArray(x.itens_json) ? itens(x.itens_json, (i) => `${i.quantidade ?? ""}x ${i.nome ?? i.titulo ?? i.descricao ?? "item"}`) : "";
    p.push(`Compra ${dt(x.data_pedido ?? x.created_at)} pedido ${x.numero_pedido ?? ""} — ${brl(x.valor_total)}, ${x.status}${its ? `. Itens: ${its}` : ""}`);
  }
  for (const x of opts.historico ? pe.data ?? [] : []) {
    p.push(`Compra loja virtual ${dt(x.created_at)} pedido ${x.numero_pedido ?? ""} — ${brl(x.valor_total)}, ${x.status}. Itens: ${itens(x.pedidos_ecommerce_itens, (i) => `${i.quantidade}x ${i.nome_produto}`)}`);
  }
  for (const x of n.data ?? []) p.push(`Anotação ${dt(x.created_at)}: ${String(x.texto).slice(0, 200)}`);
  for (const x of t.data ?? []) p.push(`Tarefa ${dt(x.date)} (${x.status}): ${x.title}${x.description ? ` — ${String(x.description).slice(0, 150)}` : ""}`);
  // Hábitos: ciclo de compra e forma de pagamento habitual (orçamentos finalizados).
  const fin = (o.data ?? []).filter((x: SB) => x.etapa === "finalizado");
  if (opts.historico && fin.length) {
    const datas = fin.map((x: SB) => Date.parse(x.created_at)).sort((a: number, b: number) => a - b);
    const dias = Math.floor((Date.now() - datas[datas.length - 1]) / 86_400_000);
    const ciclo = datas.length > 1 ? Math.round((datas[datas.length - 1] - datas[0]) / (datas.length - 1) / 86_400_000) : null;
    p.unshift(`Hábito de compra: ${fin.length} pedido(s) recentes, último há ${dias} dias${ciclo ? `, compra em média a cada ${ciclo} dias` : ""}`);
  }
  if (opts.pagamento) {
    const conds = fin.map((x: SB) => x.condicoes_pagamento?.nome).filter(Boolean);
    if (conds.length) {
      const cont = new Map<string, number>(); for (const c of conds) cont.set(c, (cont.get(c) ?? 0) + 1);
      p.unshift(`Pagamento habitual: ${[...cont.entries()].sort((a, b) => b[1] - a[1])[0][0]}`);
    }
  }
  if (!p.length) return "\n\nDados do CRM: número não encontrado no cadastro (cliente novo ou não identificado).";
  return `\n\nDados do CRM sobre quem está na ligação (use para sugerir: relembre compras, retome orçamentos em aberto, contorne motivos de perda, ofereça reposição e produtos relacionados; nunca invente dados):\n- ${p.join("\n- ").slice(0, 6000)}`;
}

/** Resumo para o atendente que recebe a transferência saber como continuar. */
async function resumir(falas: { papel: string; texto: string }[], objetivo: string | null, instrucoes?: string): Promise<string | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;
  const conversa = falas.map((f) => `${f.papel === "agente" ? "IA" : "Cliente"}: ${f.texto}`).join("\n").slice(0, 8000);
  const instructions = instrucoes ?? "Você resume ligações em português para o atendente humano que vai assumir a ligação agora. Seja direto, em tópicos curtos: **Quem é / o que quer**, **O que já foi dito**, **Objeções ou dúvidas**, **Como continuar** (1-2 frases sugeridas). Não invente dados. Improve collaboration between squads and ensure all agents read the shared strategic memory before executing tasks.";
  const r = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      instructions,
      input: `${objetivo ? `Objetivo da ligação: ${objetivo.slice(0, 500)}\n\n` : ""}Conversa:\n${conversa}`,
    }),
  });
  if (!r.ok || !r.body) return null;
  // Lê o fluxo SSE e junta os pedaços de texto.
  const leitor = r.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = ""; let texto = "";
  for (;;) {
    const { value, done } = await leitor.read();
    if (done) break;
    buf += value;
    const linhas = buf.split("\n"); buf = linhas.pop() ?? "";
    for (const l of linhas) {
      if (!l.startsWith("data:")) continue;
      try { const ev = JSON.parse(l.slice(5).trim()); if (ev.type === "response.output_text.delta") texto += ev.delta ?? ""; } catch { /* */ }
    }
  }
  return texto.trim() || null;
}

/** Data local de São Paulo (YYYY-MM-DD) e dia da semana, para a IA entender "amanhã", "sexta". */
function hojeSP() {
  const d = new Date(Date.now() - 3 * 3600_000);
  const dias = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  return { iso: d.toISOString().slice(0, 10), dia: dias[d.getUTCDay()] };
}

/** Pede à IA a data de retorno combinada e cria a tarefa na agenda de quem disparou a ligação. */
async function reagendar(sb: SB, empresa: string, chamadaId: string, falas: { papel: string; texto: string }[], objetivo: string | null) {
  const h = hojeSP();
  const txt = await resumir(falas, objetivo,
    `Hoje é ${h.dia}, ${h.iso} (horário de Brasília). Leia a ligação e diga se o cliente pediu ou aceitou um retorno/nova ligação em outra data. ` +
    `Responda SOMENTE um JSON: {"retorno": true|false, "data": "YYYY-MM-DD", "hora": "HH:MM" ou null, "motivo": "frase curta do que foi combinado"}. ` +
    `"amanhã" = dia seguinte; "semana que vem" sem dia = próxima segunda; sábado/domingo passam para segunda. Não invente: se não houve pedido de retorno, retorno=false.`);
  const m = txt?.match(/\{[\s\S]*\}/);
  if (!m) return;
  let r: { retorno?: boolean; data?: string; hora?: string | null; motivo?: string };
  try { r = JSON.parse(m[0]); } catch { return; }
  if (!r.retorno || !/^\d{4}-\d{2}-\d{2}$/.test(r.data ?? "") || r.data! < h.iso) return;
  const hora = /^\d{2}:\d{2}$/.test(r.hora ?? "") ? r.hora! : null;

  const ch = (await sb.from("voz_chamadas").select("numero, agente_id, iniciada_em").eq("id", chamadaId).maybeSingle()).data;
  const fim = dig(ch?.numero).slice(-8);
  if (fim.length < 8) return;
  // Dono da tarefa: quem criou o comando de ligação (campanha ou simulador).
  const desde = new Date(new Date(ch.iniciada_em ?? Date.now()).getTime() - 30 * 60_000).toISOString();
  const cmds = (await sb.from("voz_comandos").select("numero, criado_por").eq("estabelecimento_id", empresa)
    .eq("tipo", "ligar").gte("created_at", desde).order("created_at", { ascending: false }).limit(30)).data ?? [];
  const cmd = cmds.find((x: SB) => dig(x.numero).endsWith(fim) && x.criado_por);
  if (!cmd) return;
  const u = (await sb.from("usuarios").select("id").eq("auth_user_id", cmd.criado_por).maybeSingle()).data;
  if (!u) return;
  const like = `%${fim.slice(0, 4)}%${fim.slice(4)}%`;
  const clis = (await sb.from("customers").select("id,nome,telefone,tel").eq("estabelecimento_id", empresa)
    .or(`telefone.ilike.${like},tel.ilike.${like}`).limit(3)).data ?? [];
  const cli = clis.find((c: SB) => dig(c.telefone).endsWith(fim) || dig(c.tel).endsWith(fim)) ?? clis[0];
  const nome = cli?.nome ?? ch.numero;
  const motivo = `Retorno pedido pelo cliente na ligação com IA: ${String(r.motivo ?? "").slice(0, 200)}`;
  // Evita duplicar se já houver tarefa aberta igual na mesma data.
  if (cli) {
    const ja = (await sb.from("calendario_tarefas").select("id").eq("contact_id", cli.id).eq("date", r.data)
      .eq("origem_sub_item", "retorno_ligacao_ia").limit(1)).data;
    if (ja?.length) return;
  }
  await sb.from("calendario_tarefas").insert({
    user_id: u.id, estabelecimento_id: empresa, contact_id: cli?.id ?? null, contact_name: nome,
    title: `Retornar ligação - ${nome}`, description: motivo, date: r.data, time: hora, status: "pending",
    origem: "inteligente", origem_sub_item: "retorno_ligacao_ia", modo_criacao: "automatico", motivo,
  });
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
    const APPS_VOZ = ["voz", "coletor", "controle", "coletor-tv", "hub"];
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
      // Sem agente escolhido: o mais antigo ativo do tipo pedido (padrão "receber",
      // pois config/iniciar sem id vêm do registro e de chamadas recebidas).
      const modo = ["receber", "ligar", "assistir"].includes(String(corpo.modo)) ? String(corpo.modo) : "receber";
      const doTipo = (await sb.from("voz_agentes").select("*").eq("estabelecimento_id", empresa)
        .eq("ativo", true).contains("modos", [modo]).order("created_at").limit(1).maybeSingle()).data;
      if (doTipo) return doTipo;
      return (await sb.from("voz_agentes").select("*").eq("estabelecimento_id", empresa)
        .eq("ativo", true).order("created_at").limit(1).maybeSingle()).data;
    };

    // Garante que a chamada pertence à empresa da chave.
    const chamadaDaEmpresa = async (id: string) =>
      (await sb.from("voz_chamadas").select("id, transcricao, sugestoes, iniciada_em")
        .eq("id", id).eq("estabelecimento_id", empresa).maybeSingle()).data;

    switch (acao) {
      case "config": {
        let a = await agente();
        // Ramal da empresa (Configuração PABX → Agentes de voz): ramal registrado para
        // atender, com o agente escolhido para ele.
        const ue = (await sb.from("ucm_config").select("voz_ramal_empresa, voz_senha_ramal_empresa, voz_agente_empresa_id")
          .eq("estabelecimento_id", empresa).maybeSingle()).data;
        if (!corpo.agente_id && ue?.voz_ramal_empresa) {
          const esc = ue.voz_agente_empresa_id
            ? (await sb.from("voz_agentes").select("*").eq("id", ue.voz_agente_empresa_id).eq("estabelecimento_id", empresa).maybeSingle()).data
            : null;
          a = { ...(esc ?? a ?? {}), ramal_ia: ue.voz_ramal_empresa, senha_ramal_ia: ue.voz_senha_ramal_empresa ?? "" };
        }
        // Ligação em andamento por este agente: sai pelo ramal "fazer ligações" de quem disparou.
        if (corpo.agente_id && a) {
          const desde = new Date(Date.now() - 2 * 60_000).toISOString();
          const cmd = (await sb.from("voz_comandos").select("criado_por").eq("estabelecimento_id", empresa)
            .eq("agente_id", String(corpo.agente_id)).eq("tipo", "ligar").eq("status", "executando")
            .gte("processado_em", desde).order("processado_em", { ascending: false }).limit(1).maybeSingle()).data;
          if (cmd?.criado_por) {
            const u = (await sb.from("usuarios").select("id").eq("auth_user_id", cmd.criado_por).maybeSingle()).data;
            const r = u ? (await sb.from("voz_ramais_usuario").select("ligacoes_ativo, ramal_ligacoes, senha_ligacoes").eq("usuario_id", u.id).maybeSingle()).data : null;
            if (r?.ligacoes_ativo && r.ramal_ligacoes) a = { ...a, ramal_ia: r.ramal_ligacoes, senha_ramal_ia: r.senha_ligacoes ?? "" };
          }
        }
        // Ramais de atendente virtual de cada usuário: o aparelho registra todos e
        // transfere para o ramal do próprio usuário.
        const { data: rus } = await sb.from("voz_ramais_usuario").select("usuario_id, ramal_virtual, senha_virtual, agente_virtual_id")
          .eq("estabelecimento_id", empresa).eq("virtual_ativo", true).not("ramal_virtual", "is", null);
        const ids = (rus ?? []).map((r: SB) => r.usuario_id);
        const { data: us } = ids.length ? await sb.from("usuarios").select("id, ramal").in("id", ids) : { data: [] };
        const ramais_extras = (rus ?? []).filter((r: SB) => r.agente_virtual_id).map((r: SB) => ({
          ramal: r.ramal_virtual, senha: r.senha_virtual ?? "", agente_id: r.agente_virtual_id,
          transferir_para: (us ?? []).find((x: SB) => x.id === r.usuario_id)?.ramal ?? null,
        }));
        if (!a) return json({ error: "Nenhum agente de voz ativo. Cadastre em Agentes de Voz." }, 404);
        // Endereço da central vem da tela Configuração PABX Grandstream UCM,
        // assim o app e o Coletor não precisam digitar host/porta manualmente.
        const ucm = (await sb.from("ucm_config").select("ucm_host, remote_ip, ucm_host_interno, voz_endereco, voz_porta")
          .eq("estabelecimento_id", empresa).maybeSingle()).data;
        // Endereço e porta SIP (UDP) da voz vêm da seção "Agentes de voz" da tela PABX; padrão: externo, 5060.
        const externo = String(ucm?.remote_ip || ucm?.ucm_host || "");
        const portaVoz = Number(ucm?.voz_porta) || 5060;
        const central = ucm?.ucm_host
          ? {
              host: ucm.voz_endereco === "interno" && ucm.ucm_host_interno ? String(ucm.ucm_host_interno) : externo,
              host_externo: externo,
              porta: portaVoz,
              porta_externa: portaVoz,
            }
          : null;
        // Central também dentro de "agente": os apps Android leem só esse objeto.
        return json({ agente: { ...a, central, ramais_extras }, central, ramais_extras });
      }
      case "turno": {
        const a = await agente();
        if (!a) return json({ error: "Nenhum agente ativo" }, 404);
        // Saudação: frase fixa, vai direto para a voz sem esperar CRM nem IA.
        const silencio = corpo.prompt_extra === "[SILENCIO]";
        if (silencio) corpo.prompt_extra = null;
        const exata = /^Diga exatamente, sem mudar nada:\s*([\s\S]+)$/.exec(String(corpo.prompt_extra ?? "").trim());
        const objetivo = corpo.objetivo ? `PRIORIDADE MÁXIMA nesta ligação (vale acima das instruções gerais do agente):\n${corpo.objetivo}\n\n` : "";
        let crm = "";
        const cfgA = (a.config ?? {}) as Record<string, unknown>;
        const modoT = corpo.modo ?? "receber";
        // Ligação de vendas: usa o histórico do cliente se o agente tiver permissão.
        const vendas = modoT === "ligar" && (cfgA.usar_historico !== false || cfgA.usar_pagamento !== false);
        if (modoT === "assistir" || corpo.contexto_crm || vendas) {
          let numero = String(corpo.numero ?? "");
          if (!numero && corpo.chamada_id) {
            numero = (await sb.from("voz_chamadas").select("numero").eq("id", String(corpo.chamada_id)).eq("estabelecimento_id", empresa).maybeSingle()).data?.numero ?? "";
          }
          const chave = `${empresa}:${corpo.chamada_id ?? numero}`;
          const c = cacheCrm.get(chave);
          if (c && Date.now() - c.t < 10 * 60_000) crm = c.v;
          else {
            const opts = vendas ? { historico: cfgA.usar_historico !== false, pagamento: cfgA.usar_pagamento !== false } : undefined;
            const carregar = contextoCrm(sb, empresa, numero, opts).then((v) => { cacheCrm.set(chave, { t: Date.now(), v }); return v; });
            // Na saudação, aquece o cache em segundo plano para o 1º turno já ter os dados.
            if (exata) carregar.catch((e) => console.error("contexto CRM", e));
            else { try { crm = await carregar; } catch (e) { console.error("contexto CRM", e); } }
          }
          if (vendas && cfgA.sugerir_similares !== false && crm) crm += "\nVocê pode sugerir reposição e produtos iguais ou similares aos que ele já compra.";
          // Ligação de vendas: contexto enxuto para a IA não citar históricos antigos.
          if (vendas && crm) crm = crm.slice(0, 1500) + "\nUse esses dados só para escolher o gancho. NUNCA cite itens, produtos, quantidades ou valores de orçamentos (podem ser muitos e de vários orçamentos): fale só \"a proposta que nossa equipe enviou\". Nunca leia listas.";
        }
        const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/voz-ia-turno`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-runner-key": Deno.env.get("AIP_RUNNER_KEY") ?? "" },
          body: JSON.stringify({
            audio_wav_b64: corpo.audio_wav_b64 ?? null,
            prompt: (corpo.prompt_extra ? `${corpo.prompt_extra}\n` : "") + objetivo + "Instruções gerais do agente: " + (a.prompt ?? "") + crm,
            historico: Array.isArray(corpo.historico) ? corpo.historico.slice(-20) : [],
            modo: corpo.modo ?? "receber",
            voz: a.voz || "alloy",
            frase_exata: exata ? exata[1].trim() : null,
            silencio,
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
          objetivo: corpo.objetivo ? String(corpo.objetivo).slice(0, 2000) : null,
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
        const cc = (await sb.from("voz_chamadas").select("modo, ramal_monitorado, transcricao, objetivo")
          .eq("id", c.id).maybeSingle()).data as SB;
        const falas = (cc?.transcricao ?? []) as { papel: string; texto: string }[];
        const transferido = destinoTransferencia(corpo);
        let resumo: string | null = null;
        if (transferido && falas.length >= 2) {
          try { resumo = await resumir(falas, cc?.objetivo ?? null); } catch (e) { console.error("resumo", e); }
        }
        await sb.from("voz_chamadas").update({
          ...(transferido ? { transferido_para: transferido } : {}),
          ...(resumo ? { resumo } : {}),
          status: corpo.status === "erro" ? "erro" : "finalizada",
          finalizada_em: new Date().toISOString(),
          duracao_seg: Math.round((Date.now() - new Date(c.iniciada_em as string).getTime()) / 1000),
        }).eq("id", c.id);
        // Reagendamento: se o cliente pediu retorno, cria a tarefa na agenda de quem disparou.
        if (!transferido && cc?.modo === "ligar" && falas.some((f) => f.papel === "cliente")) {
          try { await reagendar(sb, empresa, c.id, falas, cc?.objetivo ?? null); } catch (e) { console.error("reagendar", e); }
        }
        return json({ ok: true });
      }
      case "comandos": {
        // Pedidos esquecidos (aparelho estava desligado) não podem disparar ligações depois.
        const limite = new Date(Date.now() - 2 * 60_000).toISOString();
        await sb.from("voz_comandos").update({ status: "cancelado", erro: "expirado: nenhum aparelho de voz conectado a tempo" })
          .eq("estabelecimento_id", empresa).eq("status", "pendente").lt("created_at", limite);
        const { data } = await sb.from("voz_comandos").select("*").eq("estabelecimento_id", empresa)
          .eq("status", "pendente").order("created_at").limit(1);
        const cmd = data?.[0];
        if (!cmd) return json({ comando: null });
        await sb.from("voz_comandos").update({ status: "executando", processado_em: new Date().toISOString() }).eq("id", cmd.id);
        if (cmd.tipo === "ligar" && cmd.numero) {
          // Mesmas regras de discagem do telefone (sem DDI 55, sem DDD local, 015 nos demais).
          const { data: r } = await sb.from("ucm_config")
            .select("discagem_regras_ativas, discagem_ddi_local, discagem_ddd_local, discagem_prefixo_outro_ddd")
            .eq("estabelecimento_id", empresa).maybeSingle();
          cmd.numero = aplicarRegrasDiscagem(String(cmd.numero), {
            ativas: r?.discagem_regras_ativas ?? true,
            ddiLocal: String(r?.discagem_ddi_local ?? "55"),
            dddLocal: String(r?.discagem_ddd_local ?? "11"),
            prefixo: String(r?.discagem_prefixo_outro_ddd ?? "015"),
          });
        }
        return json({ comando: cmd });
      }
      case "comando_status": {
        const status = ["concluido", "sem_resposta", "erro"].includes(corpo.status) ? corpo.status : "erro";
        await sb.from("voz_comandos").update({ status, erro: corpo.erro ? String(corpo.erro).slice(0, 300) : null })
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
