import { Navigate, Outlet } from "react-router-dom";
import { Wallet } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50">
      <span className="flex h-11 w-11 animate-pulse items-center justify-center rounded-xl bg-brand-600">
        <Wallet size={20} className="text-white" strokeWidth={2.25} />
      </span>
    </div>
  );
}

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to="/" replace />;

  return <Outlet />;
}
