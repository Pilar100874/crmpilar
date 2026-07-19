import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import listEmpresasTool from "./tools/list-empresas";
import listProdutosTool from "./tools/list-produtos";
import listSegmentosTool from "./tools/list-segmentos";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "pilar-mcp",
  title: "Pilar CRM MCP",
  version: "0.1.0",
  instructions:
    "Ferramentas do Pilar CRM. Use `whoami` para verificar o usuário autenticado, " +
    "`list_segmentos` para descobrir segmentos disponíveis, `list_empresas` para " +
    "consultar empresas/clientes (com filtros de UF, cidade, segmento, presença de e-mail/WhatsApp) " +
    "e `list_produtos` para consultar o catálogo de produtos. Todas respeitam as permissões (RLS) do usuário.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, listEmpresasTool, listProdutosTool, listSegmentosTool],
});
