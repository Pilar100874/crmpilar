import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const dig = (s?: string | null) => (s ?? "").replace(/\D/g, "");
const r2 = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;
const Body = z.object({
  acao: z.enum(["emitir", "consultar", "cancelar", "arquivo"]),
  nota_id: z.string().uuid(),
  justificativa: z.string().min(15).max(255).optional(),
  tipo: z.enum(["xml", "danfe"]).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = Deno.env.get("FOCUS_NFE_TOKEN");
    if (!token) return json({ error: "Token do Focus NFe não configurado" }, 400);
    const producao = (Deno.env.get("FOCUS_NFE_AMBIENTE") ?? "homologacao") === "producao";
    const BASE = producao ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: claims, error: authErr } = await sb.auth.getClaims(auth.replace("Bearer ", ""));
    if (authErr || !claims?.claims?.sub) return json({ error: "Não autenticado" }, 401);
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { acao, nota_id, justificativa, tipo } = parsed.data;

    // Leitura pelo próprio usuário: as regras de acesso garantem que a nota é da empresa dele.
    const { data: nota, error } = await sb.from("notas_fiscais").select("*, notas_fiscais_itens(*, produtos(codigo, origem)), unidades(*), empresas(*)").eq("id", nota_id).single();
    if (error || !nota) return json({ error: "Nota não encontrada" }, 404);
    if (nota.tipo !== "saida") return json({ error: "Somente notas de saída são emitidas" }, 400);
    const focus = (path: string, init: RequestInit = {}) => fetch(BASE + path, { ...init, headers: { Authorization: "Basic " + btoa(token + ":"), "Content-Type": "application/json", ...(init.headers ?? {}) } });
    const upd = (c: Record<string, unknown>) => sb.from("notas_fiscais").update({ ...c, updated_at: new Date().toISOString() }).eq("id", nota_id);

    const aplicarRetorno = async (r: any) => {
      const c: Record<string, unknown> = { status_sefaz: r.status, mensagem_sefaz: r.mensagem_sefaz ?? r.mensagem ?? null };
      if (r.status === "autorizado") Object.assign(c, { status: "emitida", chave: r.chave_nfe ?? nota.chave, numero: r.numero, serie: r.serie, protocolo: r.protocolo, caminho_xml: r.caminho_xml_nota_fiscal, caminho_danfe: r.caminho_danfe, emitida_em: new Date().toISOString() });
      if (r.status === "cancelado") Object.assign(c, { status: "cancelada" });
      await upd(c);
      return c;
    };

    if (acao === "emitir") {
      if (nota.status === "emitida") return json({ error: "Nota já autorizada" }, 400);
      const un = nota.unidades, dest = nota.empresas;
      const faltas: string[] = [];
      if (!un) faltas.push("unidade emissora");
      if (un && dig(un.cnpj).length !== 14) faltas.push("CNPJ da unidade");
      if (un && !un.regime_tributario) faltas.push("regime tributário da unidade");
      if (!dest) faltas.push("cliente da nota");
      if (dest && ![11, 14].includes(dig(dest.cnpj).length)) faltas.push("CNPJ/CPF do cliente");
      if (dest && (!dest.endereco || !dest.cidade || !dest.estado || dig(dest.cep).length !== 8)) faltas.push("endereço completo do cliente (rua, cidade, UF e CEP)");
      const semNcm = nota.notas_fiscais_itens.filter((i: any) => dig(i.ncm).length !== 8).map((i: any) => i.descricao);
      if (semNcm.length) faltas.push(`NCM com 8 dígitos em: ${semNcm.join(", ")}`);
      if (faltas.length) return json({ error: "Faltam dados para emitir: " + faltas.join("; ") }, 400);

      const simples = ["simples_nacional", "mei"].includes(un.regime_tributario);
      const ie = dig(dest.inscricao_estadual);
      const docDest = dig(dest.cnpj);
      const homolog = !producao;
      const ref = nota.ref_externa ?? `nf-${nota.id}`;
      const itens = nota.notas_fiscais_itens.map((i: any, k: number) => {
        const valor = r2(i.valor_total);
        const it: Record<string, unknown> = {
          numero_item: k + 1, codigo_produto: i.produtos?.codigo || i.codigo_origem || `P${k + 1}`, descricao: i.descricao,
          cfop: i.cfop, codigo_ncm: dig(i.ncm), unidade_comercial: i.unidade || "UN", quantidade_comercial: Number(i.quantidade),
          valor_unitario_comercial: Number(i.valor_unitario), unidade_tributavel: i.unidade || "UN", quantidade_tributavel: Number(i.quantidade),
          valor_unitario_tributavel: Number(i.valor_unitario), valor_bruto: valor, icms_origem: /^[0-8]$/.test(String(i.produtos?.origem ?? "")) ? Number(i.produtos.origem) : 0,
          inclui_no_total: 1,
        };
        if (simples) Object.assign(it, { icms_situacao_tributaria: i.cst || "102", pis_situacao_tributaria: "49", cofins_situacao_tributaria: "49" });
        else Object.assign(it, {
          icms_situacao_tributaria: i.cst || "00", icms_modalidade_base_calculo: 3, icms_base_calculo: valor, icms_aliquota: Number(i.aliq_icms), icms_valor: r2(i.valor_icms),
          pis_situacao_tributaria: "01", pis_base_calculo: valor, pis_aliquota_porcentual: Number(i.aliq_pis), pis_valor: r2(i.valor_pis),
          cofins_situacao_tributaria: "01", cofins_base_calculo: valor, cofins_aliquota_porcentual: Number(i.aliq_cofins), cofins_valor: r2(i.valor_cofins),
        });
        if (Number(i.aliq_ipi) > 0) Object.assign(it, { ipi_situacao_tributaria: "50", ipi_codigo_enquadramento_legal: "999", ipi_base_calculo: valor, ipi_aliquota: Number(i.aliq_ipi), ipi_valor: r2(i.valor_ipi) });
        return it;
      });
      const payload = {
        natureza_operacao: nota.natureza_operacao || "Venda de mercadoria", data_emissao: new Date().toISOString(), tipo_documento: 1, finalidade_emissao: 1,
        cnpj_emitente: dig(un.cnpj), local_destino: dest.estado?.toUpperCase() === un.uf?.toUpperCase() ? 1 : 2,
        [docDest.length === 14 ? "cnpj_destinatario" : "cpf_destinatario"]: docDest,
        nome_destinatario: homolog ? "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL" : (dest.nome || dest.nome_fantasia),
        logradouro_destinatario: dest.endereco, numero_destinatario: dest.numero || "S/N", complemento_destinatario: dest.complemento || undefined,
        bairro_destinatario: dest.bairro || "Centro", municipio_destinatario: dest.cidade, uf_destinatario: dest.estado.toUpperCase(), cep_destinatario: dig(dest.cep), pais_destinatario: "Brasil",
        indicador_inscricao_estadual_destinatario: ie ? 1 : 9, inscricao_estadual_destinatario: ie || undefined,
        consumidor_final: ie ? 0 : 1, presenca_comprador: 9, modalidade_frete: 9,
        valor_frete: r2(nota.valor_frete), valor_desconto: r2(nota.valor_desconto), items: itens,
      };
      const resp = await focus(`/v2/nfe?ref=${encodeURIComponent(ref)}`, { method: "POST", body: JSON.stringify(payload) });
      const txt = await resp.text(); let r: any = {}; try { r = JSON.parse(txt); } catch { r = { mensagem: txt }; }
      await upd({ ref_externa: ref, ambiente: producao ? "producao" : "homologacao", status_sefaz: r.status ?? (resp.ok ? "processando_autorizacao" : "erro"), mensagem_sefaz: r.mensagem ?? (r.erros ? JSON.stringify(r.erros) : null) });
      if (!resp.ok) { console.error(`Focus emitir [${resp.status}]: ${txt}`); return json({ error: r.mensagem || "Recusado pelo serviço de emissão", detalhes: r.erros ?? txt, status: resp.status }, 422); }
      return json({ ok: true, status: r.status ?? "processando_autorizacao" });
    }

    if (!nota.ref_externa) return json({ error: "Nota ainda não foi enviada para emissão" }, 400);
    const ref = encodeURIComponent(nota.ref_externa);

    if (acao === "consultar") {
      const resp = await focus(`/v2/nfe/${ref}?completa=0`);
      const txt = await resp.text();
      if (!resp.ok) { console.error(`Focus consultar [${resp.status}]: ${txt}`); return json({ error: "Falha ao consultar", detalhes: txt }, resp.status); }
      const r = JSON.parse(txt);
      const c = await aplicarRetorno(r);
      return json({ ok: true, ...c, erros: r.erros ?? null });
    }

    if (acao === "cancelar") {
      if (!justificativa) return json({ error: "Justificativa de 15 a 255 caracteres é obrigatória" }, 400);
      const resp = await focus(`/v2/nfe/${ref}`, { method: "DELETE", body: JSON.stringify({ justificativa }) });
      const txt = await resp.text(); let r: any = {}; try { r = JSON.parse(txt); } catch { r = { mensagem: txt }; }
      if (!resp.ok || (r.status && r.status !== "cancelado")) { console.error(`Focus cancelar [${resp.status}]: ${txt}`); return json({ error: r.mensagem_sefaz || r.mensagem || "Cancelamento recusado", detalhes: r }, 422); }
      await upd({ status: "cancelada", status_sefaz: "cancelado", mensagem_sefaz: r.mensagem_sefaz ?? null });
      return json({ ok: true });
    }

    // arquivo: XML autorizado ou DANFE em PDF
    const caminho = tipo === "danfe" ? nota.caminho_danfe : nota.caminho_xml;
    if (!caminho) return json({ error: "Arquivo ainda não disponível" }, 404);
    const resp = await fetch(caminho.startsWith("http") ? caminho : BASE + caminho, { headers: { Authorization: "Basic " + btoa(token + ":") } });
    if (!resp.ok) return json({ error: "Falha ao baixar arquivo", status: resp.status }, resp.status);
    return new Response(await resp.arrayBuffer(), { headers: { ...corsHeaders, "Content-Type": tipo === "danfe" ? "application/pdf" : "application/xml" } });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
