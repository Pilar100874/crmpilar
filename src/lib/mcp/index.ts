import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import listEmpresasTool from "./tools/list-empresas";
import listProdutosTool from "./tools/list-produtos";
import listSegmentosTool from "./tools/list-segmentos";
import addProspeccaoEmpresaTool from "./tools/add-prospeccao-empresa";
import addProspeccaoEmpresasBulkTool from "./tools/add-prospeccao-empresas-bulk";
import consultarTabelaTool from "./tools/consultar-tabela";
import listarTabelasDisponiveisTool from "./tools/listar-tabelas-disponiveis";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "pilar-mcp",
  title: "Pilar CRM MCP",
  version: "0.3.0",
  instructions:
    "Ferramentas do Pilar CRM.\n" +
    "Leitura: `whoami`, `list_segmentos`, `list_empresas` (filtros UF/cidade/segmento/e-mail/WhatsApp), `list_produtos`.\n" +
    "Consulta genérica: `listar_tabelas_disponiveis` mostra as tabelas liberadas pelo administrador, e `consultar_tabela` retorna registros de qualquer uma dessas tabelas (respeitando RLS).\n" +
    "Escrita — Prospecção: `salvar_empresa_prospectada` insere UMA empresa pesquisada na web na tela 'Prospecção Via Cloud Code / Cursor ou ChatGPT'; " +
    "`salvar_empresas_prospectadas` insere um lote (até 100). Use SEMPRE que o usuário pedir para pesquisar empresas na internet " +
    "e trazer os resultados para dentro do Pilar. O usuário depois revisa e importa para o cadastro definitivo. " +
    "Todas as ferramentas respeitam as permissões (RLS) do usuário autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    whoamiTool,
    listEmpresasTool,
    listProdutosTool,
    listSegmentosTool,
    listarTabelasDisponiveisTool,
    consultarTabelaTool,
    addProspeccaoEmpresaTool,
    addProspeccaoEmpresasBulkTool,
  ],
});
