import { Outlet } from "react-router-dom";
import { AuthProvider } from "@/hooks/operacional-hub/useAuth";
import { EstablishmentProvider } from "@/hooks/operacional-hub/useEstablishment";
import { AppLayout } from "@/components/operacional-hub/layout/AppLayout";

export default function OpLayout() {
  return (
    <AuthProvider>
      <EstablishmentProvider>
        <AppLayout>
          <Outlet />
        </AppLayout>
      </EstablishmentProvider>
    </AuthProvider>
  );
}
