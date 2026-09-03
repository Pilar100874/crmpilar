import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  Handshake,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Tag,
  Truck,
  User,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

export interface ContatoCadastro {
  id: string;
  nome: string;
  numero: string;
  origem: "empresa" | "contato";
  tipo: string | null;
  detalhe?: string;
}

const FILTROS_BASE = [
  { id: "todos", rotulo: "Todos" },
  { id: "empresa", rotulo: "Empresas" },
  { id: "contato", rotulo: "Contatos" },
];

/** Ícone de cada filtro (inclui os tipos de cliente dinâmicos). */
function iconeFiltro(id: string) {
  if (id === "todos") return Users;
  if (id === "empresa") return Building2;
  if (id === "contato") return User;
  const tipo = id.replace("tipo:", "").toLowerCase();
  if (tipo.includes("transport")) return Truck;
  if (tipo.includes("vendedor") || tipo.includes("represent")) return Briefcase;
  if (tipo.includes("b2b") || tipo.includes("parceir")) return Handshake;
  return Tag;
}

function limpar(numero: string) {
  return numero.replace(/\D/g, "");
}


interface Props {
  onLigar: (numero: string, nome?: string) => void;
  onWhatsapp: (contato: ContatoCadastro) => void;
}

/** Agenda geral do CRM: pesquisa em empresas e contatos com filtro por tipo. */
export default function PilarFoneContatos({ onLigar, onWhatsapp }: Props) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [itens, setItens] = useState<ContatoCadastro[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const estabelecimentoId = await getEstabelecimentoId();
    const termo = busca.trim();

    // Escopo: usuário comum vê apenas empresas/contatos vinculados a ele;
    // administrador vê todos os cadastros do estabelecimento.
    let empresaIds: string[] | null = null;
    let contatoIds: string[] | null = null;
    const { data: auth } = await supabase.auth.getUser();
    if (auth?.user) {
      const [{ data: eu }, { data: isAdmin }] = await Promise.all([
        supabase.from("usuarios").select("id").eq("auth_user_id", auth.user.id).maybeSingle(),
        supabase.rpc("has_role", { _user_id: auth.user.id, _role: "admin" }),
      ]);
      const meuId = (eu as { id?: string } | null)?.id;
      if (!isAdmin && meuId) {
        const [vincEmpresas, vincContatos] = await Promise.all([
          supabase.from("empresa_vinculos").select("empresa_id").eq("usuario_id", meuId),
          supabase.from("customer_vinculos").select("customer_id").eq("usuario_id", meuId),
        ]);
        empresaIds = Array.from(new Set((vincEmpresas.data ?? []).map((v) => v.empresa_id as string)));
        contatoIds = Array.from(new Set((vincContatos.data ?? []).map((v) => v.customer_id as string)));
      }
    }

    let qEmpresas = supabase
      .from("empresas")
      .select("id, nome, nome_fantasia, telefone, whatsapp, contato_nome, contato_telefone, tipo_cliente")
      .order("nome")
      .limit(80);
    let qContatos = supabase
      .from("customers")
      .select("id, nome, telefone, empresa_id")
      .not("telefone", "is", null)
      .order("nome")
      .limit(80);

    if (estabelecimentoId) {
      qEmpresas = qEmpresas.eq("estabelecimento_id", estabelecimentoId);
      qContatos = qContatos.eq("estabelecimento_id", estabelecimentoId);
    }
    if (termo) {
      qEmpresas = qEmpresas.or(
        `nome.ilike.%${termo}%,nome_fantasia.ilike.%${termo}%,telefone.ilike.%${termo}%,whatsapp.ilike.%${termo}%,contato_nome.ilike.%${termo}%`,
      );
      qContatos = qContatos.or(`nome.ilike.%${termo}%,telefone.ilike.%${termo}%`);
    }

    const [empresas, contatos] = await Promise.all([qEmpresas, qContatos]);

    const lista: ContatoCadastro[] = [];

    for (const e of empresas.data ?? []) {
      const nome = e.nome_fantasia || e.nome || "Empresa";
      const numeros = [e.telefone, e.whatsapp, e.contato_telefone].filter(Boolean) as string[];
      const unicos = Array.from(new Set(numeros.map((n) => n.trim()).filter((n) => limpar(n).length >= 8)));
      unicos.forEach((numero, i) => {
        lista.push({
          id: `${e.id}-${i}`,
          nome,
          numero,
          origem: "empresa",
          tipo: e.tipo_cliente ?? null,
          detalhe: numero === e.contato_telefone && e.contato_nome ? `Contato: ${e.contato_nome}` : undefined,
        });
      });
    }

    for (const c of contatos.data ?? []) {
      const numero = (c.telefone ?? "").trim();
      if (limpar(numero).length < 8) continue;
      lista.push({ id: c.id, nome: c.nome || "Contato", numero, origem: "contato", tipo: null });
    }

    setItens(lista);
    setCarregando(false);
  }, [busca]);

  useEffect(() => {
    const t = setTimeout(() => void carregar(), 300);
    return () => clearTimeout(t);
  }, [carregar]);

  const filtros = useMemo(() => {
    const tipos = Array.from(new Set(itens.map((i) => i.tipo).filter(Boolean) as string[])).sort();
    return [...FILTROS_BASE, ...tipos.map((t) => ({ id: `tipo:${t}`, rotulo: t }))];
  }, [itens]);

  const aplica = (i: ContatoCadastro, alvo: string) => {
    if (alvo === "todos") return true;
    if (alvo.startsWith("tipo:")) return i.tipo === alvo.slice(5);
    return i.origem === alvo;
  };
  const contarFiltro = (alvo: string) => itens.filter((i) => aplica(i, alvo)).length;
  const visiveis = itens.filter((i) => aplica(i, filtro));

  return (
    <div>
      <div className="sticky top-0 z-10 space-y-2 bg-[#0B141A] px-4 py-3">
        <div className="flex items-center gap-2 rounded-full bg-[#1F2C34] px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-[#8696A0]" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar em empresas e contatos"
            className="w-full bg-transparent text-sm text-[#E9EDEF] outline-none placeholder:text-[#8696A0]"
          />
          <button type="button" aria-label="Atualizar" onClick={() => void carregar()}>
            <RefreshCw className={`h-4 w-4 text-[#8696A0] ${carregando ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filtros.map((f) => {
            const ativo = filtro === f.id;
            const Icone = iconeFiltro(f.id);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltro(f.id)}
                aria-pressed={ativo}
                aria-label={f.rotulo}
                title={`${f.rotulo} (${contarFiltro(f.id)})`}
                className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
                  ativo
                    ? "border-[#00A884] bg-[#00A884] text-[#0B141A] shadow-[0_2px_10px_rgba(0,168,132,0.3)]"
                    : "border-white/10 bg-white/[0.06] text-[#AEBAC1] hover:bg-white/10"
                }`}
              >
                <Icone className="h-[18px] w-[18px]" />
                <span
                  className={`absolute -right-0.5 -top-0.5 min-w-[16px] rounded-full px-1 text-[9px] font-bold leading-4 ${
                    ativo ? "bg-[#0B141A] text-[#00A884]" : "bg-white/15 text-[#8696A0]"
                  }`}
                >
                  {contarFiltro(f.id)}
                </span>
              </button>
            );
          })}
        </div>

      </div>

      {carregando && <p className="px-4 py-6 text-sm text-[#8696A0]">Carregando cadastros...</p>}
      {!carregando && visiveis.length === 0 && (
        <p className="px-4 py-6 text-sm text-[#8696A0]">Nenhum número encontrado.</p>
      )}

      {visiveis.map((c) => (
        <div key={`${c.origem}-${c.id}-${c.numero}`} className="flex items-center gap-3 px-4 py-2.5 active:bg-white/5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10">
            {c.origem === "empresa" ? (
              <Building2 className="h-5 w-5 text-[#53BDEB]" />
            ) : (
              <User className="h-5 w-5 text-[#00A884]" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">{c.nome}</p>
            <p className="truncate text-[13px] text-[#8696A0]">
              {c.numero}
              {c.tipo ? ` · ${c.tipo}` : ""}
              {c.detalhe ? ` · ${c.detalhe}` : ""}
            </p>
          </div>
          <button
            type="button"
            aria-label={`Conversar no WhatsApp com ${c.nome}`}
            onClick={() => onWhatsapp(c)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00A884]/15 text-[#00A884] transition active:scale-95"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label={`Ligar para ${c.nome}`}
            onClick={() => onLigar(limpar(c.numero), c.nome)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[#E9EDEF] transition active:scale-95"
          >
            <Phone className="h-5 w-5" />
          </button>
        </div>
      ))}
    </div>
  );
}
