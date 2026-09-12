import { Navigate } from "react-router-dom";

/** As chaves dos aplicativos foram centralizadas em Admin → Apps. */
export default function AutomacaoChavesApp() {
  return <Navigate to="/admin/apps" replace />;
}
