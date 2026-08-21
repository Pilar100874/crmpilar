import { Outlet } from "react-router-dom";
import { AuthProvider } from "@/hooks/ferramentas/useAuth";
import { MainLayout } from "@/components/ferramentas/layout/MainLayout";

export default function FerrLayout() {
  return (
    <AuthProvider>
      <MainLayout>
        <Outlet />
      </MainLayout>
    </AuthProvider>
  );
}
