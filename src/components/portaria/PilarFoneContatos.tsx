import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, MessageCircle, Phone, RefreshCw, Search, User } from "lucide-react";
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

function limpar(numero: string) {
  return numero.replace(/\D/g, "");
}

interface Props {
  onLigar: (numero: string) => void;
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

  const visiveis = itens.filter((i) => {
    if (filtro === "todos") return true;
    if (filtro.startsWith("tipo:")) return i.tipo === filtro.slice(5);
    return i.origem === filtro;
  });

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
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filtros.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                filtro === f.id ? "bg-[#00A884] text-[#0B141A]" : "bg-white/10 text-[#AEBAC1]"
              }`}
            >
              {f.rotulo}
            </button>
          ))}
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
            onClick={() => onLigar(limpar(c.numero))}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[#E9EDEF] transition active:scale-95"
          >
            <Phone className="h-5 w-5" />
          </button>
        </div>
      ))}
    </div>
  );
}
