import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import listEmpresasTool from "./tools/list-empresas";
import listProdutosTool from "./tools/list-produtos";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "pilar-mcp",
  title: "Pilar CRM MCP",
  version: "0.1.0",
  instructions:
    "Ferramentas do Pilar CRM. Use `whoami` para verificar o usuário autenticado, " +
    "`list_empresas` para consultar empresas/clientes cadastrados e `list_produtos` " +
    "para consultar o catálogo de produtos. Todas respeitam as permissões do usuário.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, listEmpresasTool, listProdutosTool],
});
