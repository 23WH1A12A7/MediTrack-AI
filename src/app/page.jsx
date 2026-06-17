import { AuthProvider } from "@/components/auth-provider";
import { DashboardApp } from "@/components/dashboard-app";

export default function Home() {
  return (
    <AuthProvider>
      <DashboardApp />
    </AuthProvider>
  );
}
