import { carregarGerentesEAdministradores } from "@/lib/cadastros/gerentes";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, User, ChevronDown, ChevronRight, UserCog, Truck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface Contato {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  tipo_operador: boolean;
  custom_fields: any;
}

interface Empresa {
  id: string;
  nome_fantasia: string;
  nome: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  bairro: string | null;
  custom_fields?: any;
}

type TipoNo = 'usuario' | 'vendedor' | 'empresa' | 'transportadora' | 'contato';
interface NoArvore { tipo: TipoNo; id: string; nome: string; sub?: string | null; }

const ICONE_NO: Record<TipoNo, React.ReactNode> = {
  usuario: <Users className="w-4 h-4 text-indigo-500" />,
  vendedor: <UserCog className="w-4 h-4 text-emerald-500" />,
  empresa: <Building2 className="w-4 h-4 text-purple-500" />,
  transportadora: <Truck className="w-4 h-4 text-orange-500" />,
  contato: <User className="w-4 h-4 text-blue-500" />,
};
const ROTULO_NO: Record<TipoNo, string> = {
  usuario: 'Gerente', vendedor: 'Vendedor', empresa: 'Empresa', transportadora: 'Transportadora', contato: 'Contato',
};

function ArvoreFilhos({ nos, getFilhos, caminho }: {
  nos: NoArvore[]; getFilhos: (tipo: TipoNo, id: string) => NoArvore[]; caminho: Set<string>;
}) {
  if (nos.length === 0) return null;
  return (
    <ul className="space-y-0.5 border-l border-border/60 ml-3 pl-3">
      {nos.map((no) => <NoItem key={`${no.tipo}-${no.id}`} no={no} getFilhos={getFilhos} caminho={caminho} />)}
    </ul>
  );
}

function NoItem({ no, getFilhos, caminho }: {
  no: NoArvore; getFilhos: (tipo: TipoNo, id: string) => NoArvore[]; caminho: Set<string>;
}) {
  const [aberto, setAberto] = useState(true);
  // Evita repetir tipos já presentes no caminho (cascata sem ciclos, até o último nível)
  const tiposNoCaminho = new Set<string>([...caminho].map((k) => k.split('-')[0]));
  tiposNoCaminho.add(no.tipo);
  const filhos = getFilhos(no.tipo, no.id).filter((f) => !tiposNoCaminho.has(f.tipo));
  const temFilhos = filhos.length > 0;
  const novoCaminho = new Set(caminho); novoCaminho.add(`${no.tipo}-${no.id}`);
  return (
    <li>
      <div className="flex items-center gap-2 text-sm rounded-md px-2 py-1.5 hover:bg-muted/60 transition-colors">
        <button type="button"
          className={`h-5 w-5 flex items-center justify-center rounded ${temFilhos ? 'hover:bg-muted' : 'invisible'}`}
          onClick={() => setAberto((a) => !a)}>
          {aberto ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        {ICONE_NO[no.tipo]}
        <span className="font-medium text-foreground">{no.nome}</span>
        {no.sub && <span className="text-muted-foreground text-xs">({no.sub})</span>}
        <Badge variant="outline" className="rounded-full text-[10px] px-2 py-0 h-5">{ROTULO_NO[no.tipo]}</Badge>
        {temFilhos && <span className="text-xs text-muted-foreground">· {filhos.length}</span>}
      </div>
      {aberto && temFilhos && <ArvoreFilhos nos={filhos} getFilhos={getFilhos} caminho={novoCaminho} />}
    </li>
  );
}

function ListaArvore({ titulo, nos, getFilhos }: {
  titulo: string;
  nos: NoArvore[];
  getFilhos: (tipo: TipoNo, id: string) => NoArvore[];
}) {
  if (nos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Search className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <p className="text-lg font-medium text-muted-foreground mb-1">Nenhum(a) {titulo} encontrado(a)</p>
        <p className="text-sm text-muted-foreground/70">Tente ajustar os filtros de pesquisa</p>
      </div>
    );
  }
  return (
    <div className="bg-card rounded-2xl border border-border/40 shadow-lg p-4 overflow-auto">
      <ArvoreFilhos nos={nos} getFilhos={getFilhos} caminho={new Set()} />
    </div>
  );
}

export default function Todos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [vendedores, setVendedores] = useState<Empresa[]>([]);
  const [transportadoras, setTransportadoras] = useState<Empresa[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [vendedorEmpresas, setVendedorEmpresas] = useState<Record<string, any[]>>({});
  const [usuarioEmpresas, setUsuarioEmpresas] = useState<Record<string, any[]>>({});
  const [contatoEmpresas, setContatoEmpresas] = useState<Record<string, any[]>>({});
  const [empresaContatos, setEmpresaContatos] = useState<Record<string, any[]>>({});

  useEffect(() => {
    const fetchData = async () => {
      const estabId = await getEstabelecimentoId();
      if (!estabId) return;

      const { data: contatosData } = await supabase
        .from('customers')
        .select('*')
        .eq('estabelecimento_id', estabId)
        .order('nome');

      if (contatosData) setContatos(contatosData);

      const { data: empresasData } = await supabase
        .from('empresas')
        .select('*')
        .eq('estabelecimento_id', estabId)
        .order('nome_fantasia');

      if (empresasData) {
        const clientes = empresasData.filter((e: any) => !['vendedor', 'transportadora'].includes(e.tipo_cliente));
        const vends = empresasData.filter((e: any) => e.tipo_cliente === 'vendedor');
        const transps = empresasData.filter((e: any) => e.tipo_cliente === 'transportadora');
        setEmpresas(clientes);
        setVendedores(vends);
        setTransportadoras(transps);
      }

      try { setUsuarios((await carregarGerentesEAdministradores(estabId)) as any); } catch (e) { console.error(e); }

      const { data: vinculosEmp } = await supabase
        .from('empresa_vinculos')
        .select('empresa_id, usuario_id, vendedor_id, empresas:empresa_id (id, nome_fantasia, cnpj)');

      if (vinculosEmp) {
        const vendMap: Record<string, any[]> = {};
        const userMap: Record<string, any[]> = {};
        vinculosEmp.forEach((v: any) => {
          if (v.vendedor_id && v.empresas) {
            (vendMap[v.vendedor_id] ||= []).push(v.empresas);
          }
          if (v.usuario_id && v.empresas) {
            (userMap[v.usuario_id] ||= []).push(v.empresas);
          }
        });
        setVendedorEmpresas(vendMap);
        setUsuarioEmpresas(userMap);
      }

      const { data: vinculos } = await supabase
        .from('customer_empresas')
        .select(`
          customer_id,
          empresa_id,
          empresas (
            id,
            nome_fantasia,
            cnpj,
            custom_fields
          )
        `);

      if (vinculos) {
        const contatoEmpresasMap: Record<string, any[]> = {};
        vinculos.forEach((v: any) => {
          if (!contatoEmpresasMap[v.customer_id]) {
            contatoEmpresasMap[v.customer_id] = [];
          }
          if (v.empresas) {
            contatoEmpresasMap[v.customer_id].push(v.empresas);
          }
        });
        setContatoEmpresas(contatoEmpresasMap);

        const empresaContatosMap: Record<string, any[]> = {};
        vinculos.forEach((v: any) => {
          if (!empresaContatosMap[v.empresa_id]) {
            empresaContatosMap[v.empresa_id] = [];
          }
          const contato = contatosData?.find(c => c.id === v.customer_id);
          if (contato) {
            empresaContatosMap[v.empresa_id].push(contato);
          }
        });
        setEmpresaContatos(empresaContatosMap);
      }
    };

    fetchData();
  }, []);

  const termo = searchTerm.toLowerCase();

  const filteredContatos = contatos.filter(c =>
    c.nome?.toLowerCase().includes(termo) ||
    c.email?.toLowerCase().includes(termo) ||
    c.telefone?.includes(searchTerm)
  );

  const matchTexto = (e: Empresa) =>
    e.nome_fantasia?.toLowerCase().includes(termo) ||
    e.nome?.toLowerCase().includes(termo) ||
    e.cnpj?.includes(searchTerm) ||
    e.email?.toLowerCase().includes(termo);

  const filteredEmpresas = empresas.filter(matchTexto);
  const filteredVendedores = vendedores.filter(matchTexto);
  const filteredTransportadoras = transportadoras.filter(matchTexto);
  const filteredUsuarios = usuarios.filter((u: any) =>
    u.nome?.toLowerCase().includes(termo) ||
    u.email?.toLowerCase().includes(termo) ||
    u.telefone?.includes(searchTerm)
  );

  const vendIdSet = new Set(vendedores.map(v => v.id));
  const transpIdSet = new Set(transportadoras.map(t => t.id));
  const noEmpresa = (e: any): NoArvore => ({
    tipo: vendIdSet.has(e.id) ? 'vendedor' : transpIdSet.has(e.id) ? 'transportadora' : 'empresa',
    id: e.id, nome: e.nome_fantasia || e.nome || '-', sub: e.cnpj || null,
  });
  const noContato = (c: any): NoArvore => ({
    tipo: 'contato', id: c.id, nome: c.nome || '-',
    sub: c.custom_fields?.cpf || c.custom_fields?.cpf_cnpj || null,
  });
  const noUsuario = (u: any): NoArvore => ({ tipo: 'usuario', id: u.id, nome: u.nome || '-', sub: null });

  const unicos = (arr: NoArvore[]) => { const s = new Set<string>(); return arr.filter(n => (s.has(`${n.tipo}-${n.id}`) ? false : (s.add(`${n.tipo}-${n.id}`), true))); };

  // Mapas inversos: empresa → vendedores / gerentes
  const empresaVendedores: Record<string, any[]> = {};
  Object.entries(vendedorEmpresas).forEach(([vid, emps]) => {
    const vend = vendedores.find(v => v.id === vid);
    if (vend) (emps as any[]).forEach((e: any) => (empresaVendedores[e.id] ||= []).push(vend));
  });
  const empresaGerentes: Record<string, any[]> = {};
  Object.entries(usuarioEmpresas).forEach(([uid, emps]) => {
    const u = usuarios.find((x: any) => x.id === uid);
    if (u) (emps as any[]).forEach((e: any) => (empresaGerentes[e.id] ||= []).push(u));
  });

  const getFilhos = (tipo: TipoNo, id: string): NoArvore[] => {
    if (tipo === 'usuario') {
      const links = usuarioEmpresas[id] || [];
      const vends = links.filter((e: any) => vendIdSet.has(e.id));
      const atendidas = new Set<string>();
      vends.forEach((v: any) => (vendedorEmpresas[v.id] || []).forEach((e: any) => atendidas.add(e.id)));
      const diretas = links.filter((e: any) => !vendIdSet.has(e.id) && !atendidas.has(e.id));
      return unicos([...vends.map(noEmpresa), ...diretas.map(noEmpresa)]);
    }
    if (tipo === 'vendedor') return unicos([
      ...(empresaGerentes[id] || []).map(noUsuario),
      ...(vendedorEmpresas[id] || []).map(noEmpresa),
      ...(empresaContatos[id] || []).map(noContato),
    ]);
    if (tipo === 'empresa' || tipo === 'transportadora') {
      return unicos([
        ...(empresaGerentes[id] || []).map(noUsuario),
        ...(empresaVendedores[id] || []).map((v: any) => ({ ...noEmpresa(v), tipo: 'vendedor' as TipoNo })),
        ...(empresaContatos[id] || []).map(noContato),
      ]);
    }
    if (tipo === 'contato') return unicos((contatoEmpresas[id] || []).map(noEmpresa));
    return [];
  };

  const ordenar = (arr: NoArvore[]) => [...arr].sort((a, b) => a.nome.localeCompare(b.nome));

  const nosTodos = ordenar(unicos([
    ...filteredUsuarios.map(noUsuario),
    ...filteredVendedores.map((v: any) => ({ ...noEmpresa(v), tipo: 'vendedor' as TipoNo })),
    ...filteredTransportadoras.map((t: any) => ({ ...noEmpresa(t), tipo: 'transportadora' as TipoNo })),
    ...filteredEmpresas.map(noEmpresa),
    ...filteredContatos.map(noContato),
  ]));
  const nosContatos = ordenar(filteredContatos.map(noContato));
  const nosEmpresas = ordenar(filteredEmpresas.map(noEmpresa));
  const nosVendedores = ordenar(filteredVendedores.map((v: any) => ({ ...noEmpresa(v), tipo: 'vendedor' as TipoNo })));
  const nosTransportadoras = ordenar(filteredTransportadoras.map((t: any) => ({ ...noEmpresa(t), tipo: 'transportadora' as TipoNo })));
  const nosGerentes = ordenar(filteredUsuarios.map(noUsuario));

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-background to-muted/20">
      <div className="border-b border-border/40 bg-card/80 backdrop-blur-sm px-8 py-6">
        <div className="mb-4">
          <h1 className="text-3xl font-light tracking-tight text-foreground">
            Todos os Contatos e Empresas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize todos os registros do sistema em árvore
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contatos e empresas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 border-border/40 focus-visible:ring-1 bg-background/50"
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="flex-1 flex flex-col">
        <div className="border-b border-border/40 bg-card/50 backdrop-blur-sm px-8">
          <TabsList className="bg-transparent h-auto p-0 gap-6">
            <TabsTrigger
              value="all"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 font-medium"
            >
              Todos ({nosTodos.length})
            </TabsTrigger>
            <TabsTrigger
              value="contacts"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 font-medium"
            >
              Contatos ({nosContatos.length})
            </TabsTrigger>
            <TabsTrigger
              value="companies"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 font-medium"
            >
              Empresas ({nosEmpresas.length})
            </TabsTrigger>
            <TabsTrigger
              value="vendedores"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 font-medium"
            >
              Vendedores ({nosVendedores.length})
            </TabsTrigger>
            <TabsTrigger
              value="transportadoras"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 font-medium"
            >
              Transportadoras ({nosTransportadoras.length})
            </TabsTrigger>
            <TabsTrigger
              value="usuarios"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 font-medium"
            >
              Gerentes ({nosGerentes.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="flex-1 p-8 overflow-auto">
          <ListaArvore titulo="registro" nos={nosTodos} getFilhos={getFilhos} />
        </TabsContent>

        <TabsContent value="contacts" className="flex-1 p-8 overflow-auto">
          <ListaArvore titulo="contato" nos={nosContatos} getFilhos={getFilhos} />
        </TabsContent>

        <TabsContent value="companies" className="flex-1 p-8 overflow-auto">
          <ListaArvore titulo="empresa" nos={nosEmpresas} getFilhos={getFilhos} />
        </TabsContent>

        <TabsContent value="vendedores" className="flex-1 p-8 overflow-auto">
          <ListaArvore titulo="vendedor" nos={nosVendedores} getFilhos={getFilhos} />
        </TabsContent>

        <TabsContent value="transportadoras" className="flex-1 p-8 overflow-auto">
          <ListaArvore titulo="transportadora" nos={nosTransportadoras} getFilhos={getFilhos} />
        </TabsContent>

        <TabsContent value="usuarios" className="flex-1 p-8 overflow-auto">
          <ListaArvore titulo="gerente" nos={nosGerentes} getFilhos={getFilhos} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
